# Automação de Emissão de NFS-e — Gov.br

Sistema Python para emissão automática de Notas Fiscais de Serviço Eletrônicas (NFS-e) pelo portal nacional do Gov.br, com download dos arquivos, envio por e-mail e lançamento no Google Sheets.

## Fluxos

| Fluxo | Disparo | Arquivo de clientes | Referência do mês |
|-------|---------|---------------------|-------------------|
| **1** | Automático — dia 29 | `clientes_fluxo1.json` | Mês atual |
| **2** | Automático — dia 1° | `clientes_fluxo2.json` | Mês anterior |
| **3** | Manual | `clientes_fluxo3.json` | Mês anterior |

---

## Pré-requisitos

- Python 3.11+
- Google Chrome instalado
- Certificado Digital A3 instalado no computador (para login no Gov.br)
- Conta Google com acesso ao projeto OAuth2 (para Gmail + Sheets)

---

## Instalação

```bash
# 1. Clone o repositório e entre na pasta
cd automacao-nfse

# 2. Crie e ative um ambiente virtual
python -m venv .venv
.venv\Scripts\activate   # Windows

# 3. Instale as dependências
pip install -r requirements.txt
playwright install chromium

# 4. Configure as variáveis de ambiente
copy .env.example .env
# Edite o .env com seus dados reais

# 5. Coloque o arquivo credentials.json do Google Cloud na pasta raiz
#    (gerado no Console do Google Cloud > APIs & Serviços > Credenciais > OAuth 2.0)
```

### Obter `credentials.json` do Google

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Ative as APIs: **Gmail API** e **Google Sheets API**
4. Em *Credenciais*, crie uma **ID do cliente OAuth 2.0** do tipo *Aplicativo para computador*
5. Baixe o JSON e salve como `credentials.json` na pasta `automacao-nfse/`

---

## Setup inicial (primeira execução)

```bash
python main.py --setup
```

Isso irá:
1. Abrir o Chrome para login manual no Gov.br com seu **Certificado Digital** → salva `session.json`
2. Abrir o navegador para autorizar o Google OAuth2 → salva `token.json`
3. Validar a conexão com o Google Sheets
4. Registrar os Fluxos 1 e 2 no Agendador de Tarefas do Windows

> **Atenção:** execute o setup com o mesmo usuário Windows que rodará as tarefas agendadas.

---

## Como usar

### Disparo manual do Fluxo 3

Via Claude Code:
```
Execute o fluxo 3 de emissão de notas fiscais
```

Ou diretamente:
```bash
python main.py --fluxo 3
```

Ou dê duplo clique em `executar_fluxo3.bat`.

### Disparar qualquer fluxo manualmente

```bash
python main.py --fluxo 1
python main.py --fluxo 2
python main.py --fluxo 3
```

### Agendamento automático

Os Fluxos 1 e 2 são registrados no Windows Task Scheduler pelo setup. Para registrá-los manualmente:

```powershell
# Execute o PowerShell como Administrador
powershell -ExecutionPolicy Bypass -File configurar_agendador.ps1
```

---

## Estrutura de arquivos

```
automacao-nfse/
├── main.py                  # Orquestrador
├── fluxo1.py / fluxo2.py / fluxo3.py
├── emitir_nfse.py           # Automação Playwright no Gov.br
├── baixar_nota.py           # Download de PDF e XML
├── enviar_email.py          # Envio via Gmail API
├── lancar_planilha.py       # Lançamento no Google Sheets
├── config.py                # Carrega variáveis do .env
├── clientes_fluxo1.json     # Clientes e configurações do Fluxo 1
├── clientes_fluxo2.json     # Clientes e configurações do Fluxo 2
├── clientes_fluxo3.json     # Clientes e configurações do Fluxo 3
├── executar_fluxo1.bat      # Atalho Windows — Fluxo 1
├── executar_fluxo2.bat      # Atalho Windows — Fluxo 2
├── executar_fluxo3.bat      # Atalho Windows — Fluxo 3 (manual)
├── configurar_agendador.ps1 # Registra Fluxos 1 e 2 no Task Scheduler
├── requirements.txt
├── .env.example             # Modelo do arquivo .env
├── .gitignore
├── notas/                   # PDFs e XMLs baixados (ignorado pelo git)
│   ├── fluxo1/AAAA-MM/
│   ├── fluxo2/AAAA-MM/
│   └── fluxo3/AAAA-MM/
└── logs/                    # Logs diários (ignorado pelo git)
```

---

## Configuração dos clientes (`clientes_fluxoN.json`)

```json
{
  "valor": 5000.00,
  "descricao_servico": "Prestação de serviços de consultoria referente ao mês de {MES_ANO}",
  "codigo_servico": "170601",
  "clientes": [
    {
      "nome": "Nome da Empresa LTDA",
      "cnpj": "00.000.000/0001-00",
      "email": "financeiro@empresa.com.br"
    }
  ]
}
```

Variáveis dinâmicas:
- `{MES_ANO}` → mês atual (ex: `junho/2026`)
- `{MESANTERIOR_ANO}` → mês anterior (ex: `maio/2026`)

---

## Logs

Logs detalhados são salvos em `./logs/AAAA-MM-DD.log` e também exibidos no terminal.

---

## Segurança

Os arquivos `.env`, `credentials.json`, `token.json` e `session.json` estão no `.gitignore` e **nunca devem ser commitados**.
