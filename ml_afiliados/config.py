"""
=============================================================
  CONFIGURAÇÕES DO SISTEMA - PREENCHA ANTES DE RODAR
=============================================================
  Edite apenas esta seção. O resto roda automaticamente.
=============================================================
"""

# ── MERCADO LIVRE ─────────────────────────────────────────
ML_CLIENT_ID     = "SEU_CLIENT_ID_AQUI"
ML_CLIENT_SECRET = "SEU_CLIENT_SECRET_AQUI"
ML_ACCESS_TOKEN  = "SEU_ACCESS_TOKEN_AQUI"
ML_AFFILIATE_ID  = "SEU_ID_DE_AFILIADO_AQUI"   # ex: "partner123"

# ── CLAUDE API (Anthropic) ────────────────────────────────
CLAUDE_API_KEY   = "sk-ant-SEU_TOKEN_AQUI"
CLAUDE_MODEL     = "claude-sonnet-4-6"

# ── TIKTOK ───────────────────────────────────────────────
TIKTOK_ACCESS_TOKEN = "SEU_TIKTOK_TOKEN_AQUI"

# ── INSTAGRAM (Meta Graph API) ────────────────────────────
INSTAGRAM_ACCESS_TOKEN = "SEU_INSTAGRAM_TOKEN_AQUI"
INSTAGRAM_PAGE_ID      = "SEU_PAGE_ID_AQUI"

# ── DIRETÓRIOS ────────────────────────────────────────────
import os
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")
LOGS_DIR  = os.path.join(BASE_DIR, "logs")

# ── PARÂMETROS DE NEGÓCIO ─────────────────────────────────
COMISSAO_MINIMA_PCT     = 30    # % mínima de comissão
MARGEM_MINIMA_BRL       = 20.0  # R$ mínimos de lucro por venda
CUSTO_TRAFEGO_BRL       = 5.0   # custo estimado por venda gerada
QUANTIDADE_PRODUTOS     = 10    # produtos buscados por execução
DIAS_HISTORICO          = 30    # dias pra evitar repetição

# ── CATEGORIAS ML ─────────────────────────────────────────
CATEGORIAS = [
    "MLB1051",   # Eletrônicos e Tecnologia (BR)
    "MLB5726",   # Acessórios para Veículos
    "MLB1574",   # Casa, Móveis e Decoração
]

# ── HORÁRIOS DE PUBLICAÇÃO (24h) ─────────────────────────
HORARIOS_PUBLICACAO = ["07:00", "16:00"]
DIAS_PUBLICACAO     = [1, 2, 3, 4, 5]  # Seg=0 … Sex=4 → Ter-Sex = 1-4
