# Extrator Greenn → Google Sheets

## 1. Instalar dependências

```bash
pip install playwright gspread google-auth
playwright install chromium
```

## 2. Configurar Google Sheets

### Criar credenciais de Service Account

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Crie um projeto (ou use um existente)
3. No menu lateral: **APIs e serviços > Biblioteca**
   - Ative **Google Sheets API**
   - Ative **Google Drive API**
4. **APIs e serviços > Credenciais > Criar credenciais > Conta de serviço**
   - Dê um nome qualquer (ex: `greenn-extractor`)
   - Clique em **Concluído**
5. Clique na conta de serviço criada > aba **Chaves** > **Adicionar chave > JSON**
6. Salve o arquivo baixado como **`google_credentials.json`** na pasta `scripts/`

### Compartilhar a planilha (se for usar uma existente)

- Abra a planilha no Google Sheets
- Clique em **Compartilhar**
- Adicione o e-mail da service account (ex: `greenn-extractor@seu-projeto.iam.gserviceaccount.com`)
- Permissão: **Editor**

## 3. Configurar o script

Edite `greenn_to_sheets.py` e ajuste:

```python
SPREADSHEET_ID = "1BxiM..."   # ID da planilha existente (da URL do Google Sheets)
                               # ou deixe vazio "" para criar uma nova automaticamente
SHEET_NAME     = "Membros Greenn"  # nome da aba
```

## 4. Executar

```bash
# Opção A: digitar login interativamente
python greenn_to_sheets.py

# Opção B: via variáveis de ambiente (mais seguro)
GREENN_EMAIL="seu@email.com" GREENN_PASSWORD="sua_senha" python greenn_to_sheets.py
```

O script abrirá uma janela do Chrome, fará login, percorrerá todas as páginas de membros,
clicará em "Gerenciar" em cada um para capturar o telefone, e salvará tudo na planilha.

## Resultado esperado na planilha

| Nome | E-mail | Telefone |
|------|--------|----------|
| João Silva | joao@exemplo.com | +55 11 99999-9999 |
| Maria Souza | maria@exemplo.com | (21) 98888-8888 |

## Problemas comuns

| Erro | Solução |
|------|---------|
| `playwright install` falha | Rode `python -m playwright install chromium` |
| Nenhum membro encontrado | O site pode ter mudado o HTML — abra um issue |
| Erro de autenticação Google | Verifique se as APIs estão ativadas e o JSON está correto |
