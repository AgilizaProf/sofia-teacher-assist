create table if not exists public.password_reset_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pra_email_time on public.password_reset_attempts (lower(email), created_at desc);
create index if not exists idx_pra_ip_time on public.password_reset_attempts (ip, created_at desc);
alter table public.password_reset_attempts enable row level security;
-- Sem políticas: apenas service role pode ler/escrever.