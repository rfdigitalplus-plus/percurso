# Percurso

App de km e despesas para freelancers e trabalhadores independentes em Portugal.
Fase 1: schema da base de dados + estrutura do projeto (auth funcional, dashboard placeholder).

## Stack

- React + Vite
- Supabase (auth + Postgres)
- React Router
- lucide-react (ícones)

## Como configurar

### 1. Criar o projeto Supabase

1. Cria um novo projeto em [supabase.com](https://supabase.com).
2. Vai a **SQL Editor** e corre o conteúdo de `supabase/schema.sql`.
   Isto cria as tabelas (`profiles`, `veiculos`, `deslocacoes`, `despesas`),
   as políticas de RLS, e o trigger que cria automaticamente um `profile`
   assim que alguém se regista (evita o erro de foreign key que já
   apanhámos no ApoliceDesk).
3. Em **Project Settings > API**, copia o `Project URL` e a `anon public key`.

### 2. Configurar variáveis de ambiente

Copia `.env.example` para `.env` e preenche:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

⚠️ O URL tem de terminar em `.co`, sem barra final — já sabes como isto dá erro.

### 3. Instalar e correr localmente

```
npm install
npm run dev
```

### 4. Publicar no GitHub

Cria o repositório (ex: `percurso`) e faz upload de todos estes ficheiros
pela interface web do GitHub, tal como fazes nos outros projetos.

### 5. Deploy no Vercel

Liga o repositório ao Vercel e define as duas variáveis de ambiente
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) no dashboard do projeto.

## Estrutura

```
src/
  lib/supabaseClient.js       cliente Supabase
  contexts/AuthContext.jsx    sessão, signUp/signIn/signOut
  components/ProtectedRoute.jsx
  pages/Login.jsx
  pages/Signup.jsx
  pages/Dashboard.jsx         placeholder — próxima fase
supabase/schema.sql           schema completo + RLS + trigger
```

## Identidade visual

- Cor de fundo neutra (`--paper`), tinta quase-preta (`--ink`), acento âmbar
  de marcação de estrada (`--accent`) e um verde-azulado de linha de rota
  (`--route`).
- Tipografia: Space Grotesk (títulos), IBM Plex Sans (corpo), IBM Plex Mono
  (valores/dados — km, €, datas).
- Elemento de assinatura: a "linha de percurso" (`.route-line`) — dois pontos
  ligados por um traço tracejado, usada no logótipo e cabeçalhos. Reflete a
  função real da app (calcular rotas entre pontos).

## Próximas fases

- **Fase 2:** alertas WhatsApp (CallMeBot) para lembretes de registo e resumo mensal.
- **Fase 3:** deteção automática de despesas por IA a partir de fotos/PDFs de faturas.
- **Fase 4:** paywall premium, anúncios no plano grátis, empacotamento com
  Capacitor para publicação na Play Store.

## Nota fiscal

O valor por km (`valor_km_padrao` em `profiles`, `valor_km` em `deslocacoes`)
é apenas um valor de referência editável. Confirma sempre o valor em vigor
nas tabelas de ajudas de custo antes de gerar relatórios oficiais — não o
trates como definitivo no código.
