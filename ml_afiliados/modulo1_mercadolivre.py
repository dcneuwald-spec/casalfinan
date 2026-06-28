"""
MÓDULO 1 – Integração Mercado Livre e Busca de Produtos
Busca os produtos mais vendidos nas categorias configuradas,
filtra por comissão mínima e salva em produtos_ativos.json.
"""

import requests
from datetime import datetime, timedelta
from utils import log, salvar_json, carregar_json
from config import (
    ML_ACCESS_TOKEN, ML_CLIENT_ID, ML_CLIENT_SECRET,
    CATEGORIAS, COMISSAO_MINIMA_PCT, QUANTIDADE_PRODUTOS, DIAS_HISTORICO,
)

ML_BASE = "https://api.mercadolibre.com"


# ── Autenticação ──────────────────────────────────────────────────────────────

def _headers() -> dict:
    return {
        "Authorization": f"Bearer {ML_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }


def renovar_token(refresh_token: str) -> str:
    """Renova o access token usando o refresh token quando necessário."""
    resp = requests.post(
        f"{ML_BASE}/oauth/token",
        data={
            "grant_type": "refresh_token",
            "client_id": ML_CLIENT_ID,
            "client_secret": ML_CLIENT_SECRET,
            "refresh_token": refresh_token,
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


# ── Busca de produtos ─────────────────────────────────────────────────────────

def buscar_produtos_categoria(categoria_id: str, limite: int = 50) -> list[dict]:
    """Retorna itens mais vendidos de uma categoria."""
    resp = requests.get(
        f"{ML_BASE}/sites/MLB/search",
        headers=_headers(),
        params={
            "category": categoria_id,
            "sort": "sold_quantity_7d",   # ordenar por vendas 7 dias
            "limit": limite,
        },
        timeout=15,
    )
    if resp.status_code != 200:
        log.warning("Erro ao buscar categoria %s: %s", categoria_id, resp.text[:200])
        return []
    return resp.json().get("results", [])


def obter_detalhes_produto(item_id: str) -> dict:
    """Detalha um item específico (vendas, avaliação, comissão)."""
    resp = requests.get(
        f"{ML_BASE}/items/{item_id}",
        headers=_headers(),
        timeout=15,
    )
    if resp.status_code != 200:
        return {}
    return resp.json()


def obter_comissao_produto(item_id: str) -> float:
    """Tenta obter a comissão de afiliado disponível pro produto."""
    try:
        resp = requests.get(
            f"{ML_BASE}/affiliate/programs/MLB/items/{item_id}",
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code == 200:
            return float(resp.json().get("commission_rate", 0) * 100)
    except Exception:
        pass
    # fallback: comissão padrão estimada de 30 % pra eletrônicos/casa
    return 30.0


# ── Filtragem e seleção ───────────────────────────────────────────────────────

def _ids_historico() -> set:
    historico = carregar_json("historico.json", {"items": []})
    corte = datetime.now() - timedelta(days=DIAS_HISTORICO)
    recentes = [
        h["id"] for h in historico["items"]
        if datetime.fromisoformat(h["data"]) > corte
    ]
    return set(recentes)


def _atualizar_historico(novos_ids: list[str]):
    historico = carregar_json("historico.json", {"items": []})
    for id_ in novos_ids:
        historico["items"].append({"id": id_, "data": datetime.now().isoformat()})
    salvar_json("historico.json", historico)


def selecionar_melhores_produtos() -> list[dict]:
    """Coleta, filtra e retorna os melhores produtos do dia."""
    log.info("Iniciando busca de produtos no Mercado Livre…")
    vistos = _ids_historico()
    candidatos = []

    for cat in CATEGORIAS:
        log.info("Buscando categoria %s…", cat)
        itens = buscar_produtos_categoria(cat)
        for item in itens:
            item_id = item.get("id", "")
            if item_id in vistos:
                continue
            comissao = obter_comissao_produto(item_id)
            if comissao < COMISSAO_MINIMA_PCT:
                continue

            detalhes = obter_detalhes_produto(item_id)
            vendas_7d = detalhes.get("sold_quantity", 0)
            avaliacao = (
                detalhes.get("reviews", {}).get("rating_average", 0.0)
                if isinstance(detalhes.get("reviews"), dict)
                else 0.0
            )

            candidatos.append({
                "id": item_id,
                "nome": item.get("title", ""),
                "preco": float(item.get("price", 0)),
                "link_original": item.get("permalink", ""),
                "categoria": cat,
                "comissao_pct": comissao,
                "vendas_7d": vendas_7d,
                "avaliacao": avaliacao,
                "descricao": detalhes.get("subtitle") or detalhes.get("title", ""),
                "buscado_em": datetime.now().isoformat(),
            })

    # ordenar por vendas × comissão (proxy de potencial)
    candidatos.sort(key=lambda p: p["vendas_7d"] * p["comissao_pct"], reverse=True)
    selecionados = candidatos[:QUANTIDADE_PRODUTOS]

    salvar_json("produtos_ativos.json", selecionados)
    _atualizar_historico([p["id"] for p in selecionados])

    log.info(
        "Produtos encontrados: %d | Selecionados: %d | Comissão média: %.1f%%",
        len(candidatos),
        len(selecionados),
        sum(p["comissao_pct"] for p in selecionados) / max(len(selecionados), 1),
    )
    return selecionados


if __name__ == "__main__":
    produtos = selecionar_melhores_produtos()
    print(f"\n{len(produtos)} produto(s) salvo(s) em produtos_ativos.json")
