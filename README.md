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

## Fase 2 — Alertas WhatsApp (já incluída)

Envia lembretes de registo (3+ dias sem atividade) e um resumo no dia 1 de
cada mês, via CallMeBot. **É uma funcionalidade Premium** — só é enviada a
utilizadores com `is_premium = true`.

### Configurar

1. Corre `supabase/migration_02_whatsapp.sql` no SQL Editor do Supabase
   (depois do `schema.sql`).
2. No Vercel, adiciona duas variáveis de ambiente novas (**sem** prefixo
   `VITE_`, para nunca irem parar ao código do browser):
   - `SUPABASE_SERVICE_ROLE_KEY` — em Supabase: Project Settings > API >
     `service_role` key (secreta, nunca a partilhes nem a uses no frontend)
   - `CRON_SECRET` — qualquer string aleatória à tua escolha; o Vercel
     usa-a automaticamente para autenticar o próprio cron
3. Faz redeploy. O `vercel.json` já define o cron para correr todos os dias
   às 8h UTC (~8h/9h em Lisboa, consoante a hora de verão — o Vercel Cron
   não ajusta sozinho ao horário de Portugal).
4. Cada utilizador ativa os alertas em **Definições**, dentro da app: adiciona
   o contacto do CallMeBot no WhatsApp, envia a mensagem de ativação, e cola
   a apikey recebida.
5. Para testares, marca o teu próprio perfil como `is_premium = true`
   diretamente na tabela `profiles` do Supabase (o paywall real vem na Fase 4).

## Fase 3 — Deteção de despesas por IA (já incluída)

Upload de foto/PDF de fatura → Claude lê o documento e preenche automaticamente
valor, data, categoria e descrição. Fica como "pendente" até confirmares —
só conta para os totais (incluindo o resumo mensal do WhatsApp) depois disso.

### Configurar

1. Corre `supabase/migration_03_ia_despesas.sql` no SQL Editor do Supabase
   (cria o bucket de storage `faturas` e as políticas de acesso).
2. No Vercel, adiciona a variável de ambiente `ANTHROPIC_API_KEY` (sem
   prefixo `VITE_`) — obténs a tua chave em console.anthropic.com.
3. Redeploy.
4. Na app, vai a **Despesas** → "Enviar fatura (foto ou PDF)". A despesa
   aparece em "Por confirmar" com os campos preenchidos; revê e confirma
   (ou edita/elimina) antes de contar como despesa real.

### Nota de custo

Cada fatura processada é uma chamada à API da Anthropic (paga por uso,
não por assinatura). Para um número pequeno de utilizadores o custo é
residual, mas convém teres isso em mente ao dimensionar o preço do plano
Premium.

## Fase 4a — Paywall Premium via Stripe (já incluída)

O pagamento acontece **só na versão web** — a app empacotada (Capacitor) nunca
mostra um botão de compra, só verifica o estado `is_premium`. Isto evita o
cenário mais arriscado com as regras da Apple sobre compras dentro da app.

### Configurar

1. Corre `supabase/migration_04_stripe.sql` no SQL Editor do Supabase.
2. Cria uma conta Stripe (ou usa a que já tenhas) em stripe.com.
3. Em **Product catalog**, cria um produto "Percurso Premium" com um preço
   recorrente (mensal). Copia o **Price ID** (começa por `price_`).
4. No Vercel, adiciona estas variáveis de ambiente (sem prefixo `VITE_`):
   - `STRIPE_SECRET_KEY` — Stripe: Developers > API keys > Secret key
   - `STRIPE_PRICE_ID` — o Price ID do passo 3
   - `STRIPE_WEBHOOK_SECRET` — vê o passo 6
5. Redeploy.
6. No Stripe, vai a **Developers > Webhooks > Add endpoint**:
   - URL: `https://<o-teu-dominio-vercel>/api/stripe-webhook`
   - Eventos a subscrever: `checkout.session.completed`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copia o **Signing secret** gerado e usa-o como `STRIPE_WEBHOOK_SECRET`
     (passo 4), depois faz redeploy outra vez.
7. Testa em modo de teste do Stripe primeiro (cartão de teste `4242 4242 4242 4242`)
   antes de ativares os pagamentos reais.

### Como funciona

- A app tem uma página **Premium** (`/premium`). Na web, mostra "Assinar
  Premium" que abre o Checkout do Stripe. Dentro da app nativa, mostra só uma
  mensagem a indicar o site.
- Quando o pagamento é confirmado, o webhook do Stripe marca `is_premium =
  true` automaticamente no Supabase — os alertas WhatsApp e a IA passam a
  funcionar sem precisares de tocar em nada manualmente.
- Se a assinatura for cancelada ou falhar o pagamento, o webhook volta a pôr
  `is_premium = false`.

## Próximas fases

- **Fase 4b:** anúncios (AdMob) no plano grátis.
- **Fase 4c:** empacotamento com Capacitor para Play Store e App Store.

## Nota fiscal

O valor por km (`valor_km_padrao` em `profiles`, `valor_km` em `deslocacoes`)
é apenas um valor de referência editável. Confirma sempre o valor em vigor
nas tabelas de ajudas de custo antes de gerar relatórios oficiais — não o
trates como definitivo no código.
