"""Utilitários de log, arquivo e formatação compartilhados entre módulos."""

import os
import json
import logging
from datetime import datetime
from config import DATA_DIR, LOGS_DIR

# ── Garante que as pastas existam ──────────────────────────────────────────────
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)


def _setup_logger() -> logging.Logger:
    logger = logging.getLogger("ml_afiliados")
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s",
                            datefmt="%Y-%m-%d %H:%M:%S")

    # arquivo de log geral
    fh = logging.FileHandler(os.path.join(LOGS_DIR, "logs.txt"), encoding="utf-8")
    fh.setFormatter(fmt)
    fh.setLevel(logging.INFO)

    # arquivo só de erros
    eh = logging.FileHandler(os.path.join(LOGS_DIR, "erros.txt"), encoding="utf-8")
    eh.setFormatter(fmt)
    eh.setLevel(logging.ERROR)

    # console
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    ch.setLevel(logging.INFO)

    logger.addHandler(fh)
    logger.addHandler(eh)
    logger.addHandler(ch)
    return logger


log = _setup_logger()


# ── Helpers de arquivo ─────────────────────────────────────────────────────────

def salvar_json(nome: str, dados: object) -> str:
    caminho = os.path.join(DATA_DIR, nome)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    return caminho


def carregar_json(nome: str, padrao=None):
    caminho = os.path.join(DATA_DIR, nome)
    if not os.path.exists(caminho):
        return padrao
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def append_txt(nome: str, linha: str):
    caminho = os.path.join(LOGS_DIR, nome)
    with open(caminho, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {linha}\n")


def timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
