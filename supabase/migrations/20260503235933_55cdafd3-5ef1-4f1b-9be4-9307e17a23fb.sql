
create table public.sofia_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Conversa com a Sofia',
  origin_route text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sofia_conversations_user_idx on public.sofia_conversations(user_id, updated_at desc);

create table public.sofia_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.sofia_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  issues jsonb,
  created_at timestamptz not null default now()
);
create index sofia_messages_conv_idx on public.sofia_messages(conversation_id, created_at);

alter table public.sofia_conversations enable row level security;
alter table public.sofia_messages enable row level security;

create policy "own conversations select" on public.sofia_conversations for select using (auth.uid() = user_id);
create policy "own conversations insert" on public.sofia_conversations for insert with check (auth.uid() = user_id);
create policy "own conversations update" on public.sofia_conversations for update using (auth.uid() = user_id);
create policy "own conversations delete" on public.sofia_conversations for delete using (auth.uid() = user_id);

create policy "own messages select" on public.sofia_messages for select using (auth.uid() = user_id);
create policy "own messages insert" on public.sofia_messages for insert with check (auth.uid() = user_id);
create policy "own messages delete" on public.sofia_messages for delete using (auth.uid() = user_id);

create or replace function public.touch_sofia_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.sofia_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end; $$;

create trigger sofia_messages_touch
after insert on public.sofia_messages
for each row execute function public.touch_sofia_conversation();
