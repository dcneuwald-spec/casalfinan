import os
from dotenv import load_dotenv

load_dotenv()

GOVBR_EMAIL = os.getenv("GOVBR_EMAIL", "")
GOVBR_SENHA = os.getenv("GOVBR_SENHA", "")

PASTA_NOTAS = os.getenv("PASTA_NOTAS", "./notas")

SHEET_ID = os.getenv("SHEET_ID", "")
SHEET_ABA = os.getenv("SHEET_ABA", "Notas Fiscais e Recebimento")

EMAIL_REMETENTE = os.getenv("EMAIL_REMETENTE", "")
EMAIL_ASSUNTO = os.getenv("EMAIL_ASSUNTO", "Nota Fiscal de Serviço - DANIEL CALVO NEUWALD")
