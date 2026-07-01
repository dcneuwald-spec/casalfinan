"""
Módulo: lança dados da NFS-e emitida no Google Sheets.
Colunas: Data Emissão | Nota Fiscal | Cliente | CNPJ | Valor
"""

import logging
import re
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from config import SHEET_ABA, SHEET_ID

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
TOKEN_FILE = Path("token.json")
CREDENTIALS_FILE = Path("credentials.json")


def _extrair_sheet_id(url_ou_id: str) -> str:
    """Extrai o ID da planilha de uma URL do Google Sheets ou retorna o valor direto."""
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url_ou_id)
    return match.group(1) if match else url_ou_id


def _credenciais() -> Credentials:
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())
    return creds


def validar_conexao():
    """Testa conexão com o Google Sheets."""
    try:
        creds = _credenciais()
        service = build("sheets", "v4", credentials=creds)
        sheet_id = _extrair_sheet_id(SHEET_ID)
        service.spreadsheets().get(spreadsheetId=sheet_id).execute()
        logger.info("Conexão com Google Sheets validada.")
    except Exception as e:
        logger.error("Falha ao conectar no Google Sheets: %s", e)
        raise


def lancar_nota(resultado: dict) -> bool:
    """
    Adiciona uma linha na planilha com os dados da nota fiscal.
    Retorna True se lançado com sucesso.
    """
    if "erro" in resultado:
        logger.warning("Pulando lançamento para %s (nota não emitida)", resultado["cliente_nome"])
        return False

    linha = [
        resultado.get("data_emissao", ""),
        resultado.get("numero", ""),
        resultado.get("cliente_nome", ""),
        resultado.get("cliente_cnpj", ""),
        resultado.get("valor", ""),
    ]

    try:
        creds = _credenciais()
        service = build("sheets", "v4", credentials=creds)
        sheet_id = _extrair_sheet_id(SHEET_ID)

        service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range=f"'{SHEET_ABA}'!A:E",
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": [linha]},
        ).execute()

        logger.info("Nota lançada na planilha: %s — %s", resultado["cliente_nome"], resultado.get("numero"))
        return True
    except Exception as e:
        logger.error("Falha ao lançar na planilha para %s: %s", resultado["cliente_nome"], e)
        return False
