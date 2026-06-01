"""
Extrai membros do app.greenn.club e salva no Google Sheets.

Pré-requisitos (rode uma vez):
  pip install playwright gspread google-auth
  playwright install chromium

Configuração do Google Sheets:
  1. Acesse https://console.cloud.google.com/
  2. Crie um projeto > Ative "Google Sheets API" e "Google Drive API"
  3. Crie uma Service Account > baixe o JSON de credenciais
  4. Salve o JSON como 'google_credentials.json' na mesma pasta deste script
  5. Abra a planilha no Google Sheets > compartilhe com o e-mail da service account

Uso:
  python greenn_to_sheets.py
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright
import gspread
from google.oauth2.service_account import Credentials

# ── Configurações ────────────────────────────────────────────────
GREENN_EMAIL    = os.environ.get("GREENN_EMAIL", "")      # ou coloque aqui: "seu@email.com"
GREENN_PASSWORD = os.environ.get("GREENN_PASSWORD", "")   # ou coloque aqui: "sua_senha"
GREENN_URL      = "https://app.greenn.club/members"

SHEET_NAME      = "Membros Greenn"   # nome da aba/planilha no Google Sheets
SPREADSHEET_ID  = ""                 # deixe vazio para criar nova, ou coloque o ID da planilha existente

CREDENTIALS_FILE = Path(__file__).parent / "google_credentials.json"
# ─────────────────────────────────────────────────────────────────


async def login(page, email: str, password: str):
    print("🔐 Fazendo login...")
    await page.goto("https://app.greenn.club/login", wait_until="networkidle")

    # Tenta os seletores mais comuns de login
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail" i]', email)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")')

    await page.wait_for_url(re.compile(r"greenn\.club/(?!login)"), timeout=15000)
    print("✅ Login realizado")


async def get_all_members(page) -> list[dict]:
    print(f"📋 Acessando {GREENN_URL} ...")
    await page.goto(GREENN_URL, wait_until="networkidle")

    members = []
    page_num = 1

    while True:
        print(f"   Página {page_num}...")
        await page.wait_for_selector("table tbody tr, [class*='member'], [class*='row']", timeout=10000)

        rows = await page.query_selector_all("table tbody tr")
        if not rows:
            # Tenta estrutura alternativa (cards/divs)
            rows = await page.query_selector_all("[class*='member-row'], [class*='MemberItem']")

        for row in rows:
            member = await extract_member_row(page, row)
            if member:
                members.append(member)
                print(f"   → {member.get('nome', '?')} | {member.get('email', '?')} | {member.get('telefone', '?')}")

        # Paginação: tenta clicar em "Próximo" ou ">"
        next_btn = await page.query_selector(
            'button[aria-label*="próxima" i], button[aria-label*="next" i], '
            'a:has-text("Próximo"), button:has-text(">"), [class*="pagination"] button:last-child'
        )
        if next_btn:
            is_disabled = await next_btn.get_attribute("disabled")
            if is_disabled is not None:
                break
            await next_btn.click()
            await page.wait_for_load_state("networkidle")
            page_num += 1
        else:
            break

    return members


async def extract_member_row(page, row) -> dict | None:
    """Extrai nome, email e telefone de uma linha/card de membro."""
    try:
        text = await row.inner_text()
        if not text.strip():
            return None

        # Extrai nome e email do texto da linha
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        nome  = lines[0] if lines else ""
        email = next((l for l in lines if "@" in l), "")

        # Tenta achar botão "Gerenciar" na linha
        gerenciar_btn = await row.query_selector(
            'button:has-text("Gerenciar"), a:has-text("Gerenciar"), '
            'button:has-text("gerenciar"), a:has-text("gerenciar")'
        )

        telefone = ""
        if gerenciar_btn:
            async with page.expect_popup() as popup_info:
                try:
                    await gerenciar_btn.click()
                    popup = await popup_info.value
                    await popup.wait_for_load_state("networkidle")
                    telefone = await extract_phone_from_page(popup)
                    await popup.close()
                except Exception:
                    pass

            # Se não abriu popup, pode ter navegado na mesma página
            if not telefone:
                await gerenciar_btn.click()
                await page.wait_for_load_state("networkidle")
                telefone = await extract_phone_from_page(page)
                await page.go_back(wait_until="networkidle")

        return {"nome": nome, "email": email, "telefone": telefone}

    except Exception as e:
        print(f"   ⚠️  Erro ao extrair linha: {e}")
        return None


async def extract_phone_from_page(page) -> str:
    """Busca telefone no formato +55... ou (xx)... na página de detalhes."""
    content = await page.content()
    # Padrões: +55 11 99999-9999 ou (11) 99999-9999
    match = re.search(
        r'(\+55[\s\-\.]?\(?\d{2}\)?[\s\-\.]?\d{4,5}[\s\-\.]?\d{4}'
        r'|\(\d{2}\)[\s\-\.]?\d{4,5}[\s\-\.]?\d{4})',
        content
    )
    if match:
        return match.group(1).strip()

    # Busca campo com label "telefone" / "phone" / "celular"
    phone_field = await page.query_selector(
        '[data-field*="phone" i], [class*="phone" i], '
        'label:has-text("Telefone") + *, label:has-text("Celular") + *'
    )
    if phone_field:
        return (await phone_field.inner_text()).strip()

    return ""


def save_to_sheets(members: list[dict]):
    print("\n📊 Conectando ao Google Sheets...")
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(str(CREDENTIALS_FILE), scopes=scopes)
    gc = gspread.authorize(creds)

    if SPREADSHEET_ID:
        sh = gc.open_by_key(SPREADSHEET_ID)
        try:
            ws = sh.worksheet(SHEET_NAME)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=SHEET_NAME, rows=1000, cols=10)
    else:
        sh = gc.create(SHEET_NAME)
        sh.share("", perm_type="anyone", role="writer")   # opcional: torna acessível
        ws = sh.sheet1
        ws.update_title(SHEET_NAME)
        print(f"   Planilha criada! URL: https://docs.google.com/spreadsheets/d/{sh.id}")

    # Limpa e escreve cabeçalho + dados
    ws.clear()
    header = ["Nome", "E-mail", "Telefone"]
    rows = [header] + [[m["nome"], m["email"], m["telefone"]] for m in members]
    ws.update(rows, "A1")

    print(f"✅ {len(members)} membros salvos na planilha '{SHEET_NAME}'")
    print(f"   🔗 https://docs.google.com/spreadsheets/d/{sh.id}")


async def main():
    email    = GREENN_EMAIL    or input("E-mail Greenn: ").strip()
    password = GREENN_PASSWORD or input("Senha Greenn: ").strip()

    if not CREDENTIALS_FILE.exists():
        print(f"\n❌ Arquivo de credenciais não encontrado: {CREDENTIALS_FILE}")
        print("   Siga as instruções no topo do script para criar o google_credentials.json")
        sys.exit(1)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page    = await context.new_page()

            try:
                await login(page, email, password)
                members = await get_all_members(page)
            finally:
                await browser.close()

        if not members:
            print("⚠️  Nenhum membro encontrado. Verifique os seletores no script.")
            input("\nPressione Enter para fechar...")
            sys.exit(1)

        print(f"\n📦 Total encontrado: {len(members)} membros")
        save_to_sheets(members)
        print("\n✅ Concluído!")

    except Exception as e:
        import traceback
        print("\n" + "="*60)
        print("❌ ERRO:")
        traceback.print_exc()
        print("="*60)

    input("\nPressione Enter para fechar...")


if __name__ == "__main__":
    asyncio.run(main())
