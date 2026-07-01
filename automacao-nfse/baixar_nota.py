"""
Módulo: baixa XML e PDF da NFS-e na tela de confirmação e salva localmente.
"""

import logging
import re
from datetime import date
from pathlib import Path

logger = logging.getLogger(__name__)


def _nome_seguro(texto: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "_", texto).strip()


def baixar_nota(page, resultado: dict, fluxo_num: int) -> dict:
    """
    Baixa PDF e XML da tela de confirmação da NFS-e.
    Deve ser chamado com o page ainda aberto na tela pós-emissão.
    """
    if "erro" in resultado:
        resultado.setdefault("caminho_pdf", None)
        resultado.setdefault("caminho_xml", None)
        return resultado

    pasta = Path(f"./notas/fluxo{fluxo_num}/{date.today().strftime('%Y-%m')}")
    pasta.mkdir(parents=True, exist_ok=True)

    prefixo = f"{_nome_seguro(resultado['cliente_nome'])}_{resultado.get('numero', 'ND')}"
    caminho_pdf = pasta / f"{prefixo}.pdf"
    caminho_xml = pasta / f"{prefixo}.xml"

    # PDF
    try:
        with page.expect_download(timeout=30000) as dl:
            page.get_by_role("button", name="PDF").click()
        dl.value.save_as(str(caminho_pdf))
        logger.info("PDF salvo: %s", caminho_pdf)
        resultado["caminho_pdf"] = str(caminho_pdf)
    except Exception as e:
        logger.error("Erro ao baixar PDF para %s: %s", resultado["cliente_nome"], e)
        resultado["caminho_pdf"] = None

    # XML
    try:
        with page.expect_download(timeout=30000) as dl:
            page.get_by_role("button", name="XML").click()
        dl.value.save_as(str(caminho_xml))
        logger.info("XML salvo: %s", caminho_xml)
        resultado["caminho_xml"] = str(caminho_xml)
    except Exception as e:
        logger.error("Erro ao baixar XML para %s: %s", resultado["cliente_nome"], e)
        resultado["caminho_xml"] = None

    return resultado
