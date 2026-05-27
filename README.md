# 💑 CasalFinan

Sistema de gestão financeira pessoal para casais — inspirado no Mobills.

## ✨ Funcionalidades

- 👫 **Contas de casal** — dois usuários vinculados por código de convite
- 📊 **Dashboard** — visão geral com gráficos e resumo mensal
- 💸 **Lançamentos** — receitas e despesas com categorias, recorrência e status de pagamento
- 💳 **Cartões de crédito** — cadastro de cartões com fechamento e vencimento
- 📋 **Contas fixas** — assinaturas e despesas recorrentes
- 🎯 **Orçamentos** — metas de gasto por categoria com acompanhamento em tempo real
- 🏷️ **Categorias** — personalizáveis com ícones e cores
- 📈 **Relatórios** — análise anual e por categoria com gráficos
- 🔐 **Autenticação** — JWT com perfis individuais por parceiro

## 🛠️ Stack

| Camada    | Tecnologias                                          |
|-----------|------------------------------------------------------|
| Frontend  | React 19 + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend   | Node.js + Express + TypeScript + Prisma (SQLite)    |
| Auth      | JWT + bcrypt                                         |
| Validação | Zod                                                  |
| Estado    | Zustand + React Hook Form                            |

## 🚀 Rodando localmente

### Pré-requisitos
- Node.js 18+
- npm 8+

### Instalação

```bash
# 1. Clone o repositório
git clone <repo>
cd casalfinan

# 2. Configure o backend
cd backend
npm install
cp .env.example .env   # ajuste se necessário
npx prisma migrate dev --name init

# 3. Configure o frontend
cd ../frontend
npm install
```

### Executando

```bash
# Terminal 1 — Backend (porta 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (porta 5173)
cd frontend
npm run dev
```

Acesse: **http://localhost:5173**

## 📱 Fluxo de uso

1. Crie sua conta em `/register`
2. Crie um "casal" e compartilhe o **código de convite** com seu parceiro(a)
3. Seu parceiro(a) entra com o código em `/couple`
4. Ambos já podem lançar receitas, despesas e ver os dados compartilhados no dashboard!

## 📁 Estrutura

```
casalfinan/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # Modelos do banco de dados
│   └── src/
│       ├── routes/           # Rotas da API REST
│       ├── middlewares/      # Auth JWT
│       └── utils/            # Prisma client, categorias padrão
└── frontend/
    └── src/
        ├── components/       # UI components reutilizáveis
        ├── pages/            # Páginas da aplicação
        ├── stores/           # Estado global (Zustand)
        ├── services/         # API client (Axios)
        └── types/            # Tipos TypeScript
```

## 🗄️ Modelos de dados

- **User** — usuário com email/senha
- **Couple** — grupo de 2 usuários com código de convite
- **Category** — categorias personalizadas por casal
- **Transaction** — lançamentos de receita/despesa
- **CreditCard** — cartões de crédito
- **Bill** — contas fixas/recorrentes
- **Budget** — metas de orçamento por categoria/mês

---

Feito com ❤️ para casais que querem organizar as finanças juntos.
