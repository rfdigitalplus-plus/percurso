-- ============================================================
-- PERCURSO — Schema Supabase (Fase 1)
-- App de km/despesas para freelancers e trabalhadores independentes (PT)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PROFILES
-- Um perfil por utilizador autenticado (auth.users).
-- Criado automaticamente via trigger (ver mais abaixo) para
-- evitar erros de foreign key ao inserir viaturas/deslocações
-- antes de o perfil existir.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  nif text,
  whatsapp_number text,
  regime_fiscal text default 'simplificado', -- 'simplificado' | 'contabilidade_organizada'
  valor_km_padrao numeric(10,4) default 0.36, -- valor de referência por km; confirmar sempre com a tabela em vigor
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- VEICULOS
-- ------------------------------------------------------------
create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  matricula text,
  marca_modelo text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- DESLOCACOES (trips / mapa de km)
-- ------------------------------------------------------------
create table if not exists public.deslocacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  veiculo_id uuid references public.veiculos(id) on delete set null,
  data date not null default current_date,
  origem text not null,
  destino text not null,
  motivo text,
  cliente text,
  km numeric(10,2) not null default 0,
  valor_km numeric(10,4) not null default 0.36,
  valor_total numeric(10,2) generated always as (km * valor_km) stored,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- DESPESAS (expenses — manuais ou detetadas por IA)
-- ------------------------------------------------------------
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  data date not null default current_date,
  categoria text not null default 'outro', -- combustivel | portagens | refeicoes | estacionamento | outro
  descricao text,
  valor numeric(10,2) not null default 0,
  fatura_path text, -- caminho no Supabase Storage para a foto/PDF da fatura
  deteccao_ia boolean not null default false,
  confirmado boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices úteis para dashboards e relatórios mensais
-- ------------------------------------------------------------
create index if not exists idx_deslocacoes_user_data on public.deslocacoes(user_id, data);
create index if not exists idx_despesas_user_data on public.despesas(user_id, data);
create index if not exists idx_veiculos_user on public.veiculos(user_id);

-- ============================================================
-- TRIGGER: cria automaticamente um profile ao registar um utilizador
-- (evita o erro de FK "profiles row must exist first")
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.veiculos enable row level security;
alter table public.deslocacoes enable row level security;
alter table public.despesas enable row level security;

-- PROFILES: cada utilizador só vê/edita o seu próprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- VEICULOS
drop policy if exists "veiculos_all_own" on public.veiculos;
create policy "veiculos_all_own" on public.veiculos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DESLOCACOES
drop policy if exists "deslocacoes_all_own" on public.deslocacoes;
create policy "deslocacoes_all_own" on public.deslocacoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DESPESAS
drop policy if exists "despesas_all_own" on public.despesas;
create policy "despesas_all_own" on public.despesas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- NOTA: valor_km_padrao / valor_km são valores de referência editáveis.
-- Confirmar sempre o valor em vigor nas tabelas de ajudas de custo
-- antes de gerar relatórios oficiais — não codificar como definitivo.
-- ============================================================
