"""
MÓDULO 2 – Geração de Links de Afiliado e Análise de Margem
Gera o link rastreável de afiliado pra cada produto e calcula
a margem real de lucro. Salva em links_gerados.txt.
"""

import os
import requests
from utils import log, carregar_json, salvar_json, append_txt
from config import ML_ACCESS_TOKEN, ML_AFFILIATE_ID, MARGEM_MINIMA_BRL, CUSTO_TRAFEGO_BRL, LOGS_DIR

ML_BASE = "https://api.mercadolibre.com"


def _headers() -> dict:
    return {"Authorization": f"Bearer {ML_ACCESS_TOKEN}"}


# ── Geração de link ───────────────────────────────────────────────────────────

def gerar_link_afiliado(item_id: str, permalink: str) -> str:
    """
    Tenta usar a API de afiliados do ML; cai no padrão
    de URL rastreável se o endpoint não estiver disponível.
    """
    try:
        resp = requests.post(
            f"{ML_BASE}/affiliate/programs/MLB/links",
            headers={**_headers(), "Content-Type": "application/json"},
            json={"item_id": item_id, "affiliate_id": ML_AFFILIATE_ID},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("short_url", "")
    except Exception as exc:
        log.debug("Endpoint afiliado indisponível: %s", exc)

    # fallback: parâmetro de rastreamento na URL original
    sep = "&" if "?" in permalink else "?"
    return f"{permalink}{sep}affiliate_id={ML_AFFILIATE_ID}"


# ── Cálculo de margem ─────────────────────────────────────────────────────────

def calcular_margem(preco: float, comissao_pct: float) -> dict:
    receita_bruta = preco * (comissao_pct / 100)
    margem_liq    = receita_bruta - CUSTO_TRAFEGO_BRL
    return {
        "receita_bruta_brl": round(receita_bruta, 2),
        "custo_trafego_brl": CUSTO_TRAFEGO_BRL,
        "margem_liquida_brl": round(margem_liq, 2),
        "lucrativo": margem_liq >= MARGEM_MINIMA_BRL,
    }


# ── Processamento principal ───────────────────────────────────────────────────

def processar_links() -> list[dict]:
    produtos = carregar_json("produtos_ativos.json", [])
    if not produtos:
        log.warning("produtos_ativos.json vazio – rode o Módulo 1 primeiro.")
        return []

    resultado = []
    linhas_txt = ["=== LINKS DE AFILIADO GERADOS ===\n"]

    for p in produtos:
        link = gerar_link_afiliado(p["id"], p["link_original"])
        margem = calcular_margem(p["preco"], p["comissao_pct"])

        entrada = {**p, "link_afiliado": link, **margem}
        resultado.append(entrada)

        linhas_txt.append(
            f"Produto : {p['nome']}\n"
            f"Preço   : R$ {p['preco']:.2f}\n"
            f"Comissão: {p['comissao_pct']:.0f}%\n"
            f"Margem  : R$ {margem['margem_liquida_brl']:.2f} "
            f"({'OK' if margem['lucrativo'] else 'ABAIXO DO MÍNIMO'})\n"
            f"Link    : {link}\n"
            f"{'-'*60}\n"
        )

    # salva JSON atualizado
    salvar_json("produtos_ativos.json", resultado)

    # salva TXT legível
    caminho_txt = os.path.join(LOGS_DIR, "links_gerados.txt")
    with open(caminho_txt, "w", encoding="utf-8") as f:
        f.writelines(linhas_txt)

    margem_media = sum(r["margem_liquida_brl"] for r in resultado) / max(len(resultado), 1)
    melhor = max(resultado, key=lambda r: r["margem_liquida_brl"], default={})

    log.info(
        "Links gerados: %d | Margem média: R$ %.2f | Melhor produto: %s (R$ %.2f)",
        len(resultado),
        margem_media,
        melhor.get("nome", "–")[:50],
        melhor.get("margem_liquida_brl", 0),
    )
    return resultado


if __name__ == "__main__":
    links = processar_links()
    print(f"\n{len(links)} link(s) gerado(s) – veja logs/links_gerados.txt")
