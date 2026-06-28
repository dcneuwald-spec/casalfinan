# Sistema Automático de Afiliação Mercado Livre com IA

Pipeline completo que busca produtos, gera conteúdo viral com Claude e publica no TikTok e Instagram.

## Instalação

```bash
cd ml_afiliados
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## Configuração (único passo manual)

Abra `config.py` e preencha as credenciais:

| Variável | Onde obter |
|---|---|
| `ML_CLIENT_ID` / `ML_CLIENT_SECRET` | [developers.mercadolibre.com](https://developers.mercadolibre.com) |
| `ML_ACCESS_TOKEN` | OAuth do Mercado Livre |
| `ML_AFFILIATE_ID` | Painel de Afiliados ML |
| `CLAUDE_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `TIKTOK_ACCESS_TOKEN` | TikTok for Developers → Content Posting API |
| `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_PAGE_ID` | Meta Business Suite |

## Uso manual

```bash
# Pipeline completo (busca + conteúdo + agendamento)
python main.py

# Publicar conteúdos do horário atual
python main.py --publicar

# Ver último relatório
python main.py --relatorio
```

## Agendamento automático (Windows Task Scheduler)

### Tarefa 1 – Pipeline às 07h (Ter–Sex)
1. Abra **Agendador de Tarefas** → *Criar Tarefa Básica*
2. Nome: `ML Afiliados - Pipeline`
3. Gatilho: Diariamente → 07:00 → Repetir Ter a Sex
4. Ação: *Iniciar um programa* → `executar_sistema.bat`

### Tarefa 2 – Publicação às 16h (Ter–Sex)
1. Mesmos passos, horário 16:00
2. Ação: `executar_publicar.bat`

## Arquivos gerados

| Arquivo | Conteúdo |
|---|---|
| `data/produtos_ativos.json` | 10 produtos do dia com links e margens |
| `data/roteiros_gerados.json` | 50 roteiros (5 por produto) |
| `data/conteudo_agendado.json` | Roteiros + legendas + horários |
| `data/historico.json` | IDs publicados (30 dias) |
| `logs/links_gerados.txt` | Links de afiliado e margens |
| `logs/publicacoes_log.txt` | Registro de cada publicação |
| `logs/relatorio_diario.txt` | Relatório da última execução |
| `logs/erros.txt` | Erros registrados |

## Fluxo de execução

```
main.py
  ├─ Módulo 1 → Busca produtos ML (filtra comissão ≥ 30%)
  ├─ Módulo 2 → Gera links de afiliado + calcula margem
  ├─ Módulo 3 → 5 roteiros por produto (Claude API)
  ├─ Módulo 4 → Legendas TikTok/Instagram + agendamento
  └─ Módulo 5 → Relatório + loop de publicação
       └─ Módulo 6 → Publica via TikTok API e Meta Graph API
```

## Observações sobre publicação de vídeos

Os módulos 5 e 6 publicam vídeos já renderizados. O campo `video_url` em cada item de `conteudo_agendado.json` deve ser preenchido com a URL pública do vídeo MP4 antes de rodar `--publicar`. Você pode adicionar essa URL manualmente ou integrá-la a uma ferramenta de renderização de vídeo.
