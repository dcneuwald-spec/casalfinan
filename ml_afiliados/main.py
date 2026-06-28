"""
SISTEMA AUTOMÁTICO DE AFILIAÇÃO MERCADO LIVRE COM IA
=====================================================
Ponto de entrada principal. Orquestra todos os 6 módulos
em sequência e gera o relatório final da execução.

Uso:
  python main.py               → executa o pipeline completo (busca + conteúdo)
  python main.py --publicar    → publica conteúdos com horário dentro da janela
  python main.py --relatorio   → apenas exibe o último relatório
"""

import sys
from utils import log, carregar_json, timestamp

MODO_COMPLETO   = "--publicar" not in sys.argv and "--relatorio" not in sys.argv
MODO_PUBLICAR   = "--publicar"   in sys.argv
MODO_RELATORIO  = "--relatorio"  in sys.argv


def pipeline_completo():
    log.info("══════════════════════════════════════════")
    log.info("  INICIANDO PIPELINE COMPLETO – %s", timestamp())
    log.info("══════════════════════════════════════════")

    # ── Módulo 1: busca de produtos ──────────────────────────────────────────
    from modulo1_mercadolivre import selecionar_melhores_produtos
    produtos = selecionar_melhores_produtos()
    if not produtos:
        log.error("Nenhum produto encontrado. Abortando.")
        return

    # ── Módulo 2: links de afiliado ──────────────────────────────────────────
    from modulo2_links_afiliado import processar_links
    produtos = processar_links()

    # ── Módulo 3: roteiros com IA ────────────────────────────────────────────
    from modulo3_conteudo_ia import gerar_todos_roteiros
    roteiros = gerar_todos_roteiros()
    if not roteiros:
        log.error("Nenhum roteiro gerado. Verifique a chave do Claude.")
        return

    # ── Módulo 4: legendas e agendamento ────────────────────────────────────
    from modulo4_legendas_agendamento import montar_conteudo_agendado
    agendados = montar_conteudo_agendado()

    # ── Relatório final ──────────────────────────────────────────────────────
    from modulo5_scheduler import gerar_relatorio
    gerar_relatorio(produtos, roteiros, agendados)

    log.info("Pipeline completo finalizado com sucesso.")


def pipeline_publicar():
    log.info("══════════════════════════════════════════")
    log.info("  PUBLICANDO CONTEÚDOS AGENDADOS – %s", timestamp())
    log.info("══════════════════════════════════════════")
    from modulo5_scheduler import executar_publicacoes_pendentes
    executar_publicacoes_pendentes()


def exibir_relatorio():
    from utils import carregar_json
    import os
    from config import LOGS_DIR
    rel = os.path.join(LOGS_DIR, "relatorio_diario.txt")
    if os.path.exists(rel):
        with open(rel, encoding="utf-8") as f:
            print(f.read())
    else:
        print("Nenhum relatório encontrado. Execute o pipeline primeiro.")


if __name__ == "__main__":
    try:
        if MODO_RELATORIO:
            exibir_relatorio()
        elif MODO_PUBLICAR:
            pipeline_publicar()
        else:
            pipeline_completo()
    except KeyboardInterrupt:
        log.info("Execução interrompida pelo usuário.")
    except Exception as exc:
        log.exception("Erro fatal no pipeline: %s", exc)
        sys.exit(1)
