"""
MÓDULO 4 – Legendas Otimizadas e Agendamento Inteligente
Gera legendas para TikTok e Instagram com hashtags virais,
define os horários de publicação e salva conteudo_agendado.json.
"""

import anthropic
from datetime import datetime, timedelta
from utils import log, carregar_json, salvar_json
from config import CLAUDE_API_KEY, CLAUDE_MODEL, HORARIOS_PUBLICACAO, DIAS_PUBLICACAO

client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

HASHTAGS_BASE = {
    "unboxing":         "#unboxing #primeirasimpressoes #review #viral #compras",
    "problema_real":    "#dicadecompra #produtobom #vale #vidafacil #testei",
    "comparacao":       "#economize #custobenefico #dicadevida #gastosmart #review",
    "dica_rapida":      "#dicarapida #sabia #produtoutil #viral #aprenda",
    "historia_emocional": "#historia #vida #transformacao #humor #relatable",
}


def _prompt_legenda(roteiro: dict, plataforma: str) -> str:
    limite_chars = 2200 if plataforma == "instagram" else 150
    return f"""
Você é um especialista em social media brasileiro.
Crie UMA legenda otimizada para {plataforma.upper()} para o roteiro abaixo.

PRODUTO: {roteiro['produto_nome']}
TIPO DE CONTEÚDO: {roteiro['descricao_tipo']}
LINK AFILIADO: {roteiro['link_afiliado']}
RESUMO DO ROTEIRO:
{roteiro['roteiro'][:400]}

REGRAS:
- Máximo {limite_chars} caracteres
- Começa com hook poderoso (1ª linha = parar o scroll)
- Inclui pergunta engajadora no meio
- CTA claro no final com referência ao link na bio
- Linguagem casual, brasileira, autêntica
- NÃO use markdown ou asteriscos
- Termine com 5 hashtags altamente relevantes

Retorne APENAS a legenda, sem explicações.
"""


def gerar_legenda(roteiro: dict, plataforma: str) -> str:
    try:
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": _prompt_legenda(roteiro, plataforma)}],
        )
        return msg.content[0].text.strip()
    except Exception as exc:
        log.error("Erro ao gerar legenda %s: %s", plataforma, exc)
        return f"Produto incrível! {roteiro['produto_nome']} – Link na bio! #viral #compras"


def _proximo_horario_publicacao(indice: int) -> str:
    """Distribui as publicações nos próximos 7 dias nos horários configurados."""
    agora = datetime.now()
    slots_por_dia = len(HORARIOS_PUBLICACAO)
    dia_offset = indice // slots_por_dia
    slot_idx   = indice % slots_por_dia

    # pula dias não configurados
    data_alvo = agora + timedelta(days=1)
    dias_adicionados = 0
    while dias_adicionados <= dia_offset:
        if data_alvo.weekday() in DIAS_PUBLICACAO:
            dias_adicionados += 1
        if dias_adicionados <= dia_offset:
            data_alvo += timedelta(days=1)

    hora_str = HORARIOS_PUBLICACAO[slot_idx]
    hora, minuto = map(int, hora_str.split(":"))
    return data_alvo.replace(hour=hora, minute=minuto, second=0, microsecond=0).isoformat()


def montar_conteudo_agendado() -> list[dict]:
    roteiros = carregar_json("roteiros_gerados.json", [])
    if not roteiros:
        log.warning("roteiros_gerados.json vazio – rode o Módulo 3 primeiro.")
        return []

    log.info("Gerando legendas e agendamento para %d roteiros…", len(roteiros))
    agendados = []

    for idx, roteiro in enumerate(roteiros):
        log.info("[%d/%d] Legendas – %s", idx + 1, len(roteiros), roteiro["produto_nome"][:40])

        legenda_tiktok    = gerar_legenda(roteiro, "tiktok")
        legenda_instagram = gerar_legenda(roteiro, "instagram")
        hashtags_extras   = HASHTAGS_BASE.get(roteiro["tipo"], "#compras #viral")

        agendados.append({
            "produto_id":        roteiro["produto_id"],
            "produto_nome":      roteiro["produto_nome"],
            "tipo_roteiro":      roteiro["tipo"],
            "roteiro":           roteiro["roteiro"],
            "legenda_tiktok":    f"{legenda_tiktok}\n{hashtags_extras}",
            "legenda_instagram": f"{legenda_instagram}\n{hashtags_extras}",
            "hashtags":          hashtags_extras,
            "horario_publicacao": _proximo_horario_publicacao(idx),
            "link_afiliado":     roteiro["link_afiliado"],
            "publicado_tiktok":    False,
            "publicado_instagram": False,
        })

    salvar_json("conteudo_agendado.json", agendados)

    # ── Cronograma no console ────────────────────────────────────────
    log.info("\n── CRONOGRAMA DOS PRÓXIMOS 7 DIAS ──")
    for a in agendados[:14]:
        log.info("  %s | %-12s | %s", a["horario_publicacao"], a["tipo_roteiro"], a["produto_nome"][:35])

    return agendados


if __name__ == "__main__":
    c = montar_conteudo_agendado()
    print(f"\n{len(c)} publicação(ões) agendada(s) em data/conteudo_agendado.json")
