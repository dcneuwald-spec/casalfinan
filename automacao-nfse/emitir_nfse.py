"""
Módulo Playwright: acessa Gov.br e emite NFS-e para cada cliente do fluxo.
Login é feito via Certificado Digital instalado no Chrome do usuário.
A sessão é salva em session.json após o primeiro login para reuso.
"""

import logging
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)

SESSION_FILE = Path("session.json")
NFSE_URL = "https://www.nfse.gov.br"


def salvar_sessao():
    """Abre Chrome para login manual com Certificado Digital e salva a sessão."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="chrome")
        context = browser.new_context()
        page = context.new_page()
        page.goto(NFSE_URL)
        input(
            "\n>>> Faça login no Gov.br com seu Certificado Digital no navegador aberto.\n"
            ">>> Quando estiver na tela inicial do portal NFS-e, pressione ENTER aqui: "
        )
        context.storage_state(path=str(SESSION_FILE))
        logger.info("Sessão salva em %s", SESSION_FILE)
        browser.close()


def _data_hoje() -> str:
    return date.today().strftime("%d/%m/%Y")


def _tentar_clicar(page, seletor: str, descricao: str = "", timeout: int = 5000):
    try:
        el = page.locator(seletor).first
        el.wait_for(state="visible", timeout=timeout)
        el.click()
        logger.debug("Clicou em: %s", descricao or seletor)
    except Exception:
        pass


def _select_opcao(page, seletor: str, label: str):
    try:
        page.locator(seletor).first.select_option(label=label)
    except Exception:
        pass


def _emitir_para_cliente(page, cliente: dict, config: dict) -> dict:
    """Preenche o formulário e emite a NFS-e para um cliente."""
    nome = cliente["nome"]
    cnpj = cliente["cnpj"]
    valor = config["valor"]
    descricao = config["descricao"]
    codigo_servico = config["codigo_servico"]

    logger.info("Emitindo NFS-e para %s (%s)", nome, cnpj)

    # Navegar até emissão
    page.goto(f"{NFSE_URL}/contribuinte/emissao")
    page.wait_for_load_state("networkidle", timeout=30000)

    try:
        page.get_by_text("Emissão completa", exact=False).first.click()
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass

    # ── PESSOAS ──────────────────────────────────────────────────────────────────
    # Data de competência
    try:
        campo_data = page.locator("input[type='date'], input[placeholder*='data'], input[name*='data']").first
        campo_data.fill(_data_hoje())
    except Exception:
        pass

    # Regime tributário — Simples Nacional
    try:
        page.get_by_text("Simples Nacional", exact=False).first.click()
    except Exception:
        _select_opcao(page, "select[name*='regime'], select[id*='regime']", "Simples Nacional")

    # Exibir detalhes do emitente (botão opcional)
    _tentar_clicar(page, "button:has-text('Exibir detalhes')", "exibir detalhes emitente")

    # Tomador — localização Brasil
    try:
        page.get_by_label("Brasil").check(timeout=5000)
    except Exception:
        _tentar_clicar(page, "label:has-text('Brasil'), option[value='BR']", "localização Brasil")

    # CNPJ do tomador
    cnpj_limpo = "".join(filter(str.isdigit, cnpj))
    try:
        campo_cnpj = page.locator(
            "input[placeholder*='CNPJ'], input[name*='cnpj'], input[id*='cnpj']"
        ).first
        campo_cnpj.fill(cnpj_limpo)
        campo_cnpj.press("Tab")
        page.wait_for_timeout(2000)
    except Exception:
        pass

    # Confirmar alertas de duplicidade
    for texto in ["OK", "Confirmar", "Continuar"]:
        try:
            page.get_by_role("button", name=texto).click(timeout=2000)
        except Exception:
            pass

    # Intermediário não informado
    _select_opcao(
        page,
        "select[name*='intermediario'], select[id*='intermediario']",
        "Intermediário não informado",
    )

    page.get_by_role("button", name="Próximo").click()
    page.wait_for_load_state("networkidle", timeout=20000)

    # ── SERVIÇO ───────────────────────────────────────────────────────────────────
    # Município — São Leopoldo (preencher somente se vazio)
    try:
        campo_mun = page.locator("input[name*='municipio'], input[id*='municipio']").first
        if not campo_mun.input_value():
            campo_mun.fill("São Leopoldo")
            page.wait_for_timeout(1000)
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")
    except Exception:
        pass

    # Código NBS
    try:
        campo_cod = page.locator(
            "input[name*='codigoServico'], input[id*='codigoServico'], "
            "input[name*='nbs'], input[id*='nbs'], input[placeholder*='código']"
        ).first
        campo_cod.fill(codigo_servico)
        page.wait_for_timeout(1000)
        page.keyboard.press("ArrowDown")
        page.keyboard.press("Enter")
    except Exception:
        pass

    # Isenção ISSQN — Não
    _select_opcao(page, "select[name*='isencao'], select[id*='isencao']", "Não")

    # Descrição
    try:
        campo_desc = page.locator(
            "textarea[name*='descricao'], textarea[id*='descricao'], textarea"
        ).first
        campo_desc.fill(descricao)
    except Exception:
        pass

    page.get_by_role("button", name="Próximo").click()
    page.wait_for_load_state("networkidle", timeout=20000)

    # ── VALORES ───────────────────────────────────────────────────────────────────
    valor_str = f"{valor:.2f}".replace(".", ",")
    try:
        campo_valor = page.locator(
            "input[name*='valorServico'], input[id*='valorServico'], "
            "input[name*='valor'], input[id*='valor']"
        ).first
        campo_valor.fill(valor_str)
    except Exception:
        pass

    # Tributação municipal — Operação Tributável
    _select_opcao(
        page,
        "select[name*='tributacaoISSQN'], select[id*='tributacao']",
        "Operação Tributável",
    )

    # Regime Especial — Nenhum
    _select_opcao(page, "select[name*='regimeEspecial'], select[id*='regimeEspecial']", "Nenhum")

    # Exigibilidade suspensa — Não
    _select_opcao(page, "select[name*='exigibilidade'], select[id*='exigibilidade']", "Não")

    # Retenção ISSQN — Não
    _select_opcao(page, "select[name*='retencaoISSQN'], select[id*='retencao']", "Não")

    # Benefício municipal — Não
    _select_opcao(page, "select[name*='beneficio'], select[id*='beneficio']", "Não")

    # Dedução/Redução — Não
    _select_opcao(page, "select[name*='deducao'], select[id*='deducao']", "Não")

    # PIS/COFINS — 00 - Nenhum (primeiro índice)
    try:
        page.locator("select[name*='pis'], select[id*='pis']").first.select_option(index=0)
    except Exception:
        pass

    # ── EMITIR ────────────────────────────────────────────────────────────────────
    page.get_by_role("button", name="Emitir").click()
    page.wait_for_load_state("networkidle", timeout=30000)
    page.wait_for_timeout(3000)

    numero = _extrair_numero(page)
    logger.info("NFS-e emitida: número %s para %s", numero, nome)

    return {
        "numero": numero,
        "data_emissao": _data_hoje(),
        "cliente_nome": nome,
        "cliente_cnpj": cnpj,
        "cliente_email": cliente["email"],
        "valor": valor,
        "descricao": descricao,
    }


def _extrair_numero(page) -> str:
    for seletor in ["[class*='numero']", "[id*='numero']", "strong", "h2", "h3"]:
        try:
            for el in page.locator(seletor).all():
                texto = (el.text_content() or "").strip()
                if texto.isdigit() or (len(texto) < 20 and any(c.isdigit() for c in texto)):
                    return texto
        except Exception:
            pass
    return "N/D"


def emitir_notas(clientes: list, config: dict, fluxo_num: int, callback_pos_emissao=None) -> list:
    """
    Emite NFS-e para todos os clientes.
    callback_pos_emissao(page, resultado) é chamado logo após cada emissão (para download).
    Retorna lista de resultados.
    """
    resultados = []

    with sync_playwright() as p:
        storage = str(SESSION_FILE) if SESSION_FILE.exists() else None
        browser = p.chromium.launch(headless=False, channel="chrome")
        context = browser.new_context(storage_state=storage)
        page = context.new_page()

        # Verificar validade da sessão
        page.goto(NFSE_URL)
        page.wait_for_load_state("networkidle", timeout=20000)
        if "login" in page.url.lower():
            browser.close()
            logger.warning("Sessão expirada — realizando novo login.")
            salvar_sessao()
            return emitir_notas(clientes, config, fluxo_num, callback_pos_emissao)

        for cliente in clientes:
            try:
                res = _emitir_para_cliente(page, cliente, config)
                if callback_pos_emissao:
                    callback_pos_emissao(page, res, fluxo_num)
                resultados.append(res)
            except Exception as e:
                logger.error("Erro ao emitir para %s: %s", cliente["nome"], e)
                resultados.append({
                    "cliente_nome": cliente["nome"],
                    "cliente_cnpj": cliente["cnpj"],
                    "cliente_email": cliente["email"],
                    "erro": str(e),
                })

        browser.close()

    return resultados
