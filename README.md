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

## 🛠️ Stack

| Camada    | Tecnologias                                            |
|-----------|--------------------------------------------------------|
| Frontend  | React 19 + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend   | Node.js + Express + TypeScript (Vercel Serverless)     |
| Banco     | PostgreSQL via Prisma (Neon / Vercel Postgres)         |
| Auth      | JWT + bcrypt                                           |
| Deploy    | Vercel (frontend + API) + Neon (banco de dados)        |

---

## 🚀 Deploy na Vercel (passo a passo)

### 1. Crie o banco de dados no Neon (gratuito)

1. Acesse **https://neon.tech** e crie uma conta gratuita
2. Clique em **"New Project"**
3. Dê um nome: `casalfinan`
4. Copie a **Connection String** (começa com `postgresql://...`)

### 2. Faça o deploy na Vercel

1. Acesse **https://vercel.com** e faça login com GitHub
2. Clique em **"Add New > Project"**
3. Importe o repositório `casalfinan`
4. **NÃO altere** as configurações de build (o `vercel.json` já cuida disso)
5. Na seção **"Environment Variables"**, adicione:

   | Nome | Valor |
   |------|-------|
   | `DATABASE_URL` | `postgresql://...` (string do Neon) |
   | `JWT_SECRET` | Uma senha longa e aleatória |
   | `NODE_ENV` | `production` |

6. Clique em **"Deploy"**

### 3. Crie as tabelas no banco

Após o primeiro deploy, abra o terminal e rode:

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Ou use **Prisma Studio** / o painel do Neon para confirmar que as tabelas foram criadas.

> **Alternativa mais simples:** use `npx prisma db push` para sincronizar o schema sem migrations.

---

## 💻 Desenvolvimento local

### Pré-requisitos
- Node.js 18+
- PostgreSQL local (ou use o Neon mesmo para dev)

### Instalação

```bash
# Backend
cd backend
cp .env.example .env
# Edite .env e configure DATABASE_URL
npm install
npx prisma migrate dev --name init

# Frontend
cd ../frontend
npm install
```

### Executando

```bash
# Terminal 1 — Backend (porta 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (porta 5173)
cd frontend && npm run dev
```

Acesse: **http://localhost:5173**

---

## 📱 Fluxo de uso

1. Crie sua conta em `/register`
2. Crie um "casal" → receba o **código de convite** (8 caracteres)
3. Seu parceiro(a) entra com o código em `/couple`
4. Ambos lançam receitas e despesas, compartilhados no dashboard! 🎉

---

## 📁 Estrutura

```
casalfinan/
├── api/
│   └── index.ts              # Entry point Vercel (serverless)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos do banco (PostgreSQL)
│   │   └── migrations/       # SQL migrations
│   └── src/
│       ├── app.ts            # Express app (sem listen — para Vercel)
│       ├── index.ts          # Entry local (com listen)
│       ├── routes/           # Rotas da API REST
│       ├── middlewares/      # Auth JWT
│       └── utils/            # Prisma client, categorias padrão
├── frontend/
│   └── src/
│       ├── components/       # UI reutilizável
│       ├── pages/            # Páginas da app
│       ├── stores/           # Zustand
│       ├── services/         # Axios
│       └── types/            # TypeScript types
└── vercel.json               # Configuração Vercel
```

---

Feito com ❤️ para casais que querem organizar as finanças juntos.
