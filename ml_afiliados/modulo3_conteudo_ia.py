"""
MÓDULO 3 – Criação Inteligente de Conteúdo com Claude API
Gera 5 roteiros virais diferentes para cada produto usando
claude-sonnet-4-6 e salva em roteiros_gerados.json.
"""

import anthropic
from utils import log, carregar_json, salvar_json
from config import CLAUDE_API_KEY, CLAUDE_MODEL

client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# ── Templates de roteiro ──────────────────────────────────────────────────────

TEMPLATES = [
    {
        "tipo": "unboxing",
        "hook": "não esperava isso do {nome}",
        "duracao": "30 segundos",
        "foco": "mostrar qualidade, embalagem, detalhes do produto",
        "descricao": "Unboxing e primeiras impressões",
    },
    {
        "tipo": "problema_real",
        "hook": "esse produto resolveu meu problema com {categoria}",
        "duracao": "45 segundos",
        "foco": "antes e depois, transformação na vida do usuário",
        "descricao": "Resolvendo um problema real",
    },
    {
        "tipo": "comparacao",
        "hook": "paguei menos e funciona igual ao mais caro",
        "duracao": "30 segundos",
        "foco": "custo-benefício, economia, qualidade equivalente",
        "descricao": "Comparação com alternativa mais cara",
    },
    {
        "tipo": "dica_rapida",
        "hook": "poucos sabem disso sobre {nome}",
        "duracao": "20 segundos",
        "foco": "educação, valor, utilidade prática",
        "descricao": "Dica rápida e útil",
    },
    {
        "tipo": "historia_emocional",
        "hook": "minha vida mudou com esse produto",
        "duracao": "50 segundos",
        "foco": "conexão emocional, humor, situação relatable",
        "descricao": "História emocional ou humorística",
    },
]


def _prompt_roteiro(produto: dict, template: dict) -> str:
    hook = template["hook"].format(
        nome=produto["nome"][:40],
        categoria=produto["categoria"],
    )
    return f"""
Você é um criador de conteúdo viral para TikTok e Instagram Reels.
Crie um roteiro completo em português brasileiro para o seguinte produto:

PRODUTO: {produto['nome']}
PREÇO: R$ {produto['preco']:.2f}
DESCRIÇÃO: {produto.get('descricao', produto['nome'])}
LINK AFILIADO: {produto.get('link_afiliado', produto['link_original'])}

TIPO DE ROTEIRO: {template['descricao']}
HOOK INICIAL: "{hook}"
DURAÇÃO ALVO: {template['duracao']}
FOCO: {template['foco']}

O roteiro deve conter:
1. GANCHO (hook) — primeira frase impactante pra prender atenção (máx 2s)
2. CENAS DETALHADAS — o que mostrar em cada momento com tempo estimado
3. NARRAÇÃO — texto exato a ser falado em cada cena
4. TRANSIÇÕES — efeito ou corte sugerido entre cenas
5. CTA FINAL — chamada pra ação clara com o link do produto
6. DURAÇÃO TOTAL estimada

Formato de saída: estruturado por seção, sem markdown excessivo.
Seja criativo, autêntico e otimizado pro algoritmo de recomendação.
"""


def gerar_roteiro(produto: dict, template: dict) -> dict:
    """Chama o Claude e retorna o roteiro gerado."""
    try:
        mensagem = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": _prompt_roteiro(produto, template)}],
        )
        conteudo = mensagem.content[0].text
        return {
            "produto_id": produto["id"],
            "produto_nome": produto["nome"],
            "tipo": template["tipo"],
            "descricao_tipo": template["descricao"],
            "duracao": template["duracao"],
            "roteiro": conteudo,
            "link_afiliado": produto.get("link_afiliado", produto["link_original"]),
            "preco": produto["preco"],
        }
    except Exception as exc:
        log.error("Erro ao gerar roteiro '%s' p/ %s: %s", template["tipo"], produto["id"], exc)
        return {}


def gerar_todos_roteiros() -> list[dict]:
    produtos = carregar_json("produtos_ativos.json", [])
    if not produtos:
        log.warning("produtos_ativos.json vazio – rode os Módulos 1 e 2 primeiro.")
        return []

    roteiros = []
    total = len(produtos) * len(TEMPLATES)
    log.info("Gerando %d roteiros para %d produtos…", total, len(produtos))

    for i, produto in enumerate(produtos, 1):
        for template in TEMPLATES:
            log.info(
                "[%d/%d] Roteiro '%s' – %s",
                (i - 1) * len(TEMPLATES) + TEMPLATES.index(template) + 1,
                total,
                template["tipo"],
                produto["nome"][:40],
            )
            roteiro = gerar_roteiro(produto, template)
            if roteiro:
                roteiros.append(roteiro)

    salvar_json("roteiros_gerados.json", roteiros)
    log.info("Total de roteiros gerados: %d / %d", len(roteiros), total)
    return roteiros


if __name__ == "__main__":
    r = gerar_todos_roteiros()
    print(f"\n{len(r)} roteiro(s) salvo(s) em data/roteiros_gerados.json")
