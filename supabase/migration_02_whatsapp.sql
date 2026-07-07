-- ============================================================
-- PERCURSO — Migração 02: Alertas WhatsApp (CallMeBot)
-- Corre isto no SQL Editor do Supabase, depois do schema.sql
-- ============================================================

alter table public.profiles
  add column if not exists callmebot_apikey text,
  add column if not exists whatsapp_ativo boolean not null default false,
  add column if not exists ultimo_lembrete_em date,
  add column if not exists ultimo_resumo_em date;

-- ultimo_lembrete_em / ultimo_resumo_em evitam enviar o mesmo alerta
-- duas vezes no mesmo dia/mês caso o cron corra mais do que uma vez.
