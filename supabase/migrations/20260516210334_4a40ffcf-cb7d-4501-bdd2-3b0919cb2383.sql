create table public.documentos_planejamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  turma_id uuid,
  tipo text not null check (tipo in ('atividades','pcd','trilhas','sofia')),
  escola text,
  professor text,
  data_inicio date not null,
  data_fim date not null,
  modo text not null check (modo in ('completo','simplificado')),
  conteudo jsonb not null,
  leis text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documentos_planejamento enable row level security;

create policy "docs own select" on public.documentos_planejamento
  for select using (auth.uid() = user_id);
create policy "docs own insert" on public.documentos_planejamento
  for insert with check (auth.uid() = user_id);
create policy "docs own update" on public.documentos_planejamento
  for update using (auth.uid() = user_id);
create policy "docs own delete" on public.documentos_planejamento
  for delete using (auth.uid() = user_id);

create trigger documentos_planejamento_updated_at
  before update on public.documentos_planejamento
  for each row execute function public.update_updated_at_column();

create index documentos_planejamento_user_turma_inicio_idx
  on public.documentos_planejamento (user_id, turma_id, data_inicio desc);