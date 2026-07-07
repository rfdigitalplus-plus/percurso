-- ============================================================
-- PERCURSO — Migração 04: Assinatura Premium via Stripe
-- Corre isto no SQL Editor do Supabase, depois das migrações anteriores
-- ============================================================

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists premium_desde timestamptz,
  add column if not exists premium_ate timestamptz;

-- premium_ate ajuda a lidar com falhas de pagamento com tolerância
-- (ex: mostrar aviso antes de desativar o Premium de vez).
