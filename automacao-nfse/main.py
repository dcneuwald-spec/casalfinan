import sys
import logging
from datetime import date
import calendar
from pathlib import Path

Path("logs").mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(f"logs/{date.today().isoformat()}.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def qual_fluxo_hoje():
    hoje = date.today()
    ultimo_dia = calendar.monthrange(hoje.year, hoje.month)[1]

    if hoje.day == 29 or (hoje.day == ultimo_dia and ultimo_dia < 29):
        return "fluxo1"
    elif hoje.day == 1:
        return "fluxo2"
    return None


def setup():
    logger.info("=== MODO SETUP ===")
    from emitir_nfse import salvar_sessao
    salvar_sessao()
    from enviar_email import autorizar_google
    autorizar_google()
    from lancar_planilha import validar_conexao
    validar_conexao()
    import subprocess
    subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", "configurar_agendador.ps1"], check=False)
    logger.info("Setup concluído.")


if __name__ == "__main__":
    args = sys.argv[1:]

    if "--setup" in args:
        setup()
        sys.exit(0)

    if "--fluxo" in args:
        idx = args.index("--fluxo")
        fluxo = f"fluxo{args[idx + 1]}"
    else:
        fluxo = qual_fluxo_hoje()

    if fluxo == "fluxo1":
        logger.info("Iniciando Fluxo 1")
        from fluxo1 import executar
        executar()
    elif fluxo == "fluxo2":
        logger.info("Iniciando Fluxo 2")
        from fluxo2 import executar
        executar()
    elif fluxo == "fluxo3":
        logger.info("Iniciando Fluxo 3")
        from fluxo3 import executar
        executar()
    else:
        print("Hoje não há fluxo programado. Use --fluxo 3 para disparo manual.")
        logger.info("Nenhum fluxo programado para hoje.")
