create table if not exists public.trilhas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text,
  turma text,
  ano_escolar text,
  disciplina text,
  semestre text,
  ano_letivo integer,
  tema_central text,
  justificativa text,
  contexto_adicional text,
  status text not null default 'rascunho',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists idx_trilhas_user on public.trilhas(user_id);
alter table public.trilhas enable row level security;
create policy "trilhas own select" on public.trilhas for select using (auth.uid() = user_id);
create policy "trilhas own insert" on public.trilhas for insert with check (auth.uid() = user_id);
create policy "trilhas own update" on public.trilhas for update using (auth.uid() = user_id);
create policy "trilhas own delete" on public.trilhas for delete using (auth.uid() = user_id);
create trigger trilhas_set_updated before update on public.trilhas
  for each row execute function public.update_updated_at_column();

create table if not exists public.trilha_semanas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trilha_id uuid not null references public.trilhas(id) on delete cascade,
  semana integer not null,
  titulo text,
  habilidades_bncc jsonb not null default '[]'::jsonb,
  tipo_atividade text,
  conecta_anterior text,
  prepara_proxima text,
  status text not null default 'futura',
  plano_gerado jsonb,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trilha_id, semana)
);
create index if not exists idx_trilha_semanas_user on public.trilha_semanas(user_id);
create index if not exists idx_trilha_semanas_trilha on public.trilha_semanas(trilha_id);
alter table public.trilha_semanas enable row level security;
create policy "tsem own select" on public.trilha_semanas for select using (auth.uid() = user_id);
create policy "tsem own insert" on public.trilha_semanas for insert with check (auth.uid() = user_id);
create policy "tsem own update" on public.trilha_semanas for update using (auth.uid() = user_id);
create policy "tsem own delete" on public.trilha_semanas for delete using (auth.uid() = user_id);
create trigger trilha_semanas_set_updated before update on public.trilha_semanas
  for each row execute function public.update_updated_at_column();

create table if not exists public.progressao_alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trilha_id uuid not null references public.trilhas(id) on delete cascade,
  aluno_id uuid,
  aluno_nome text not null,
  habilidade_bncc text not null,
  habilidade_descricao text,
  status text not null default 'nao_iniciada',
  evidencia text,
  atualizado_em timestamptz not null default now(),
  unique (trilha_id, aluno_nome, habilidade_bncc)
);
create index if not exists idx_progressao_user on public.progressao_alunos(user_id);
create index if not exists idx_progressao_trilha on public.progressao_alunos(trilha_id);
alter table public.progressao_alunos enable row level security;
create policy "prog own select" on public.progressao_alunos for select using (auth.uid() = user_id);
create policy "prog own insert" on public.progressao_alunos for insert with check (auth.uid() = user_id);
create policy "prog own update" on public.progressao_alunos for update using (auth.uid() = user_id);
create policy "prog own delete" on public.progressao_alunos for delete using (auth.uid() = user_id);

create table if not exists public.defasagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trilha_id uuid not null references public.trilhas(id) on delete cascade,
  aluno_id uuid,
  aluno_nome text not null,
  habilidade_prerequisito jsonb not null,
  habilidade_trilha jsonb not null,
  urgencia text not null default 'media',
  sugestao_retomada text,
  status text not null default 'ativa',
  detectada_em timestamptz not null default now()
);
create index if not exists idx_defasagens_user on public.defasagens(user_id);
create index if not exists idx_defasagens_trilha on public.defasagens(trilha_id);
alter table public.defasagens enable row level security;
create policy "defas own select" on public.defasagens for select using (auth.uid() = user_id);
create policy "defas own insert" on public.defasagens for insert with check (auth.uid() = user_id);
create policy "defas own update" on public.defasagens for update using (auth.uid() = user_id);
create policy "defas own delete" on public.defasagens for delete using (auth.uid() = user_id);