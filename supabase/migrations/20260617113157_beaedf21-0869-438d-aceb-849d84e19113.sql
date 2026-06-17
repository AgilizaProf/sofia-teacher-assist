drop function if exists public.redeem_promo_code(text);

create table if not exists public.promo_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text,
  url_mensal  text,
  url_anual   text,
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    integer,
  used_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint promo_codes_has_link check (url_mensal is not null or url_anual is not null)
);

grant select, insert, update, delete on public.promo_codes to authenticated;
grant all on public.promo_codes to service_role;

alter table public.promo_codes enable row level security;

drop policy if exists "admins manage promo_codes" on public.promo_codes;
create policy "admins manage promo_codes"
  on public.promo_codes
  for all
  to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role::text = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role::text = 'admin'
  ));

create or replace function public.redeem_promo_code(p_code text)
returns table (url_mensal text, url_anual text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.promo_codes%rowtype;
begin
  select * into v
    from public.promo_codes
   where lower(code) = lower(trim(p_code))
     and active = true
   limit 1;

  if not found then
    return;
  end if;

  if v.expires_at is not null and v.expires_at < now() then
    return;
  end if;

  if v.max_uses is not null and v.used_count >= v.max_uses then
    return;
  end if;

  update public.promo_codes
     set used_count = used_count + 1
   where id = v.id;

  url_mensal := v.url_mensal;
  url_anual  := v.url_anual;
  return next;
end;
$$;

grant execute on function public.redeem_promo_code(text) to authenticated, anon;