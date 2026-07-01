"""
Fluxo 1 — Emissão automática todo dia 29.
Referência: mês atual (ex: junho/2026)
"""

import json
import logging
from datetime import date
from pathlib import Path

from baixar_nota import baixar_nota
from emitir_nfse import emitir_notas
from enviar_email import enviar_email
from lancar_planilha import lancar_nota

logger = logging.getLogger(__name__)
FLUXO_NUM = 1

_MESES = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def _mes_ano() -> str:
    hoje = date.today()
    return f"{_MESES[hoje.month]}/{hoje.year}"


def _pos_emissao(page, resultado: dict, fluxo_num: int):
    baixar_nota(page, resultado, fluxo_num)


def executar():
    logger.info("=== FLUXO 1 INICIADO ===")

    dados = json.loads(Path("clientes_fluxo1.json").read_text(encoding="utf-8"))
    mes_ano = _mes_ano()
    config = {
        "valor": dados["valor"],
        "descricao": dados["descricao_servico"].replace("{MES_ANO}", mes_ano),
        "codigo_servico": dados["codigo_servico"],
    }

    resultados = emitir_notas(dados["clientes"], config, FLUXO_NUM, _pos_emissao)

    for res in resultados:
        enviar_email(res, mes_ano)
        lancar_nota(res)

    logger.info("=== FLUXO 1 CONCLUÍDO ===")
