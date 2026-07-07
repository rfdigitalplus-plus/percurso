-- ============================================================
-- PERCURSO — Migração 03: Deteção de despesas por IA
-- Corre isto no SQL Editor do Supabase, depois das migrações 01/02
-- ============================================================

-- Bucket privado para fotos/PDFs de faturas
insert into storage.buckets (id, name, public)
values ('faturas', 'faturas', false)
on conflict (id) do nothing;

-- RLS no storage: cada utilizador só acede à sua própria pasta
-- (ficheiros guardados como "{user_id}/nome-do-ficheiro.ext")
drop policy if exists "faturas_select_own" on storage.objects;
create policy "faturas_select_own" on storage.objects
  for select using (
    bucket_id = 'faturas' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "faturas_insert_own" on storage.objects;
create policy "faturas_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'faturas' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "faturas_delete_own" on storage.objects;
create policy "faturas_delete_own" on storage.objects
  for delete using (
    bucket_id = 'faturas' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nota: a coluna "confirmado" em despesas já existe desde o schema.sql.
-- As despesas detetadas por IA são inseridas com confirmado = false,
-- e só contam para os totais depois de o utilizador as rever.
