"""
Módulo: envia e-mail com a NFS-e (PDF + XML) para o cliente via Gmail API.
"""

import base64
import logging
import mimetypes
import os
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from config import EMAIL_ASSUNTO, EMAIL_REMETENTE

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
TOKEN_FILE = Path("token.json")
CREDENTIALS_FILE = Path("credentials.json")


def autorizar_google() -> Credentials:
    """Retorna credenciais OAuth2 válidas, executando o fluxo se necessário."""
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


def _construir_mensagem(destinatario: str, assunto: str, corpo: str, anexos: list) -> dict:
    """Monta MIMEMultipart com corpo HTML e anexos."""
    msg = MIMEMultipart()
    msg["to"] = destinatario
    msg["from"] = EMAIL_REMETENTE
    msg["subject"] = assunto
    msg.attach(MIMEText(corpo, "plain", "utf-8"))

    for caminho in anexos:
        if not caminho or not Path(caminho).exists():
            continue
        tipo, _ = mimetypes.guess_type(caminho)
        subtipo = tipo.split("/")[1] if tipo else "octet-stream"
        with open(caminho, "rb") as f:
            parte = MIMEApplication(f.read(), _subtype=subtipo)
        parte.add_header("Content-Disposition", "attachment", filename=Path(caminho).name)
        msg.attach(parte)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


def enviar_email(resultado: dict, mes_ano: str) -> bool:
    """
    Envia e-mail com PDF e XML da NFS-e para o cliente.
    Retorna True se enviado com sucesso.
    """
    if "erro" in resultado:
        logger.warning("Pulando envio de e-mail para %s (nota não emitida)", resultado["cliente_nome"])
        return False

    destinatario = resultado["cliente_email"]
    assunto = f"{EMAIL_ASSUNTO} — {mes_ano}"
    corpo = (
        f"Prezado(a),\n\n"
        f"Segue em anexo a Nota Fiscal de Serviço referente ao mês de {mes_ano}.\n\n"
        f"Qualquer dúvida, estamos à disposição.\n\n"
        f"Atenciosamente,\nDaniel"
    )
    anexos = [resultado.get("caminho_pdf"), resultado.get("caminho_xml")]

    try:
        creds = autorizar_google()
        service = build("gmail", "v1", credentials=creds)
        mensagem = _construir_mensagem(destinatario, assunto, corpo, anexos)
        service.users().messages().send(userId="me", body=mensagem).execute()
        logger.info("E-mail enviado para %s (%s)", resultado["cliente_nome"], destinatario)
        return True
    except Exception as e:
        logger.error("Falha ao enviar e-mail para %s: %s", resultado["cliente_nome"], e)
        return False
