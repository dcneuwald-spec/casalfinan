"""
MÓDULO 5 – Agendamento e Execução via Windows Task Scheduler
Contém o loop de publicação agendada e funções de log/relatório.
Este arquivo também pode ser chamado diretamente para publicar
conteúdos cujo horário já passou ou está dentro da janela de 5 min.
"""

import os
import time
from datetime import datetime, timedelta
from utils import log, carregar_json, salvar_json, append_txt, timestamp
from modulo6_redes_sociais import publicar_tiktok, publicar_instagram

JANELA_MINUTOS = 5   # publica se estiver até N minutos do horário agendado


def _dentro_da_janela(horario_iso: str) -> bool:
    agendado = datetime.fromisoformat(horario_iso)
    agora    = datetime.now()
    delta    = abs((agendado - agora).total_seconds())
    return delta <= JANELA_MINUTOS * 60


def executar_publicacoes_pendentes():
    """Publica conteúdos cujo horário está dentro da janela atual."""
    conteudos = carregar_json("conteudo_agendado.json", [])
    if not conteudos:
        log.warning("conteudo_agendado.json vazio – rode os módulos anteriores.")
        return

    publicados = 0
    for item in conteudos:
        if not _dentro_da_janela(item["horario_publicacao"]):
            continue

        produto = item["produto_nome"][:40]

        if not item.get("publicado_tiktok"):
            ok = publicar_tiktok(item)
            if ok:
                item["publicado_tiktok"] = True
                append_txt("publicacoes_log.txt",
                           f"TIKTOK OK | {produto} | {item['link_afiliado']}")
                publicados += 1

        if not item.get("publicado_instagram"):
            ok = publicar_instagram(item)
            if ok:
                item["publicado_instagram"] = True
                append_txt("publicacoes_log.txt",
                           f"INSTAGRAM OK | {produto} | {item['link_afiliado']}")
                publicados += 1

    salvar_json("conteudo_agendado.json", conteudos)
    log.info("Publicações executadas nesta rodada: %d", publicados)


def gerar_relatorio(produtos: list, roteiros: list, agendados: list):
    """Imprime e registra o relatório diário de execução."""
    linhas = [
        "=" * 60,
        f"  RELATÓRIO DIÁRIO – {timestamp()}",
        "=" * 60,
        f"  Produtos processados : {len(produtos)}",
        f"  Roteiros criados     : {len(roteiros)}",
        f"  Publicações agendadas: {len(agendados)}",
    ]
    if produtos:
        margem_media = sum(p.get("margem_liquida_brl", 0) for p in produtos) / len(produtos)
        melhor = max(produtos, key=lambda p: p.get("margem_liquida_brl", 0))
        linhas += [
            f"  Margem média         : R$ {margem_media:.2f}",
            f"  Melhor produto       : {melhor.get('nome','–')[:45]}",
            f"  Margem do melhor     : R$ {melhor.get('margem_liquida_brl',0):.2f}",
        ]
    linhas.append("=" * 60)

    for l in linhas:
        print(l)
        log.info(l)

    append_txt("relatorio_diario.txt", "\n".join(linhas))


if __name__ == "__main__":
    log.info("=== Módulo 5: verificando publicações pendentes ===")
    executar_publicacoes_pendentes()
