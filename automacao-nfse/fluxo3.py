"""
Fluxo 3 — Disparo manual via Claude Code ou .bat.
Referência: mês anterior (ex: maio/2026)
"""

import json
import logging
from datetime import date
from pathlib import Path

from dateutil.relativedelta import relativedelta

from baixar_nota import baixar_nota
from emitir_nfse import emitir_notas
from enviar_email import enviar_email
from lancar_planilha import lancar_nota

logger = logging.getLogger(__name__)
FLUXO_NUM = 3

_MESES = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def _mes_anterior_ano() -> str:
    ant = date.today() - relativedelta(months=1)
    return f"{_MESES[ant.month]}/{ant.year}"


def _pos_emissao(page, resultado: dict, fluxo_num: int):
    baixar_nota(page, resultado, fluxo_num)


def executar():
    logger.info("=== FLUXO 3 INICIADO (manual) ===")

    dados = json.loads(Path("clientes_fluxo3.json").read_text(encoding="utf-8"))
    mes_ano = _mes_anterior_ano()
    config = {
        "valor": dados["valor"],
        "descricao": dados["descricao_servico"].replace("{MESANTERIOR_ANO}", mes_ano),
        "codigo_servico": dados["codigo_servico"],
    }

    resultados = emitir_notas(dados["clientes"], config, FLUXO_NUM, _pos_emissao)

    for res in resultados:
        enviar_email(res, mes_ano)
        lancar_nota(res)

    logger.info("=== FLUXO 3 CONCLUÍDO ===")
