create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  model text not null,
  task text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_brl numeric(10,6) not null default 0,
  month text not null default to_char(now(), 'YYYY-MM'),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_user_month on public.ai_usage (user_id, month);
create index if not exists idx_ai_usage_created on public.ai_usage (created_at desc);

alter table public.ai_usage enable row level security;

-- Usuário lê o próprio consumo. Admin lê tudo.
create policy "ai_usage own select"
  on public.ai_usage for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Sem policies de insert/update/delete: somente service_role grava.

-- Função: total gasto (BRL) no mês corrente para o usuário informado.
create or replace function public.ai_month_usage_brl(_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_brl), 0)::numeric
    from public.ai_usage
   where user_id = _user_id
     and month = to_char(now(), 'YYYY-MM');
$$;

revoke all on function public.ai_month_usage_brl(uuid) from public, anon;
grant execute on function public.ai_month_usage_brl(uuid) to authenticated, service_role;