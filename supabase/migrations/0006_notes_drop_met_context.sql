-- Knowable — private notes replace "where you met"; connect-request `note`
-- becomes `message`. Run after 0001–0005.
--
-- 1. Private notes (`connection_notes`): a user's own memory aid about a
--    connection. Owner-only by RLS — unlike `connection_members`, whose
--    select policy also lets the *other* side read a member row, nothing here
--    is ever visible to the counterpart. No security-definer function reads
--    this table; keep it that way (see CLAUDE.md "Private notes are private").
-- 2. "Where you met" is no longer collected: drop `met_context` from
--    connections, requests, and pending_connections, and recreate the RPCs
--    that read or wrote it. DESTRUCTIVE — existing met_context values are
--    deleted.
-- 3. `requests.note` → `requests.message`, so "note" only ever means private
--    notes.

-- 1. Private notes ----------------------------------------------------------

create table if not exists public.connection_notes (
  connection_id uuid not null references public.connections(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (connection_id, owner_id)
);

alter table public.connection_notes enable row level security;

-- Owner can read/write only their own notes, and only on a connection they're
-- actually a member of. There is deliberately no policy for the other side.
drop policy if exists "notes_owner" on public.connection_notes;
create policy "notes_owner" on public.connection_notes
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.connection_members m
      where m.connection_id = connection_notes.connection_id and m.user_id = auth.uid()
    )
  );

-- 2. Drop "where you met" ---------------------------------------------------

-- confirm_connection loses p_met_context. Body is otherwise identical to
-- 0004's (including the new-connection push dispatch).
drop function if exists public.confirm_connection(uuid, text[], text, jsonb);

create or replace function public.confirm_connection(
  other uuid,
  my_shares text[] default '{}'::text[],
  p_method text default 'search'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me     uuid := auth.uid();
  a      uuid;
  b      uuid;
  conn   uuid;
  is_new boolean := false;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other is null or other = me then raise exception 'invalid counterpart'; end if;

  a := least(me, other);
  b := greatest(me, other);

  select id into conn from public.connections where user_a = a and user_b = b;
  if conn is null then
    insert into public.connections (user_a, user_b, method)
    values (a, b, coalesce(p_method, 'search'))
    returning id into conn;
    is_new := true;
  end if;

  insert into public.connection_members (connection_id, user_id, other_id, shares, next_nudge)
  values (conn, me, other, coalesce(my_shares, '{}'), now() + interval '1 day')
  on conflict (connection_id, user_id)
  do update set shares = excluded.shares;

  insert into public.connection_members (connection_id, user_id, other_id, next_nudge)
  values (conn, other, me, now() + interval '1 day')
  on conflict (connection_id, user_id) do nothing;

  if is_new then
    perform public.seed_nudges(conn, me);
    perform public._dispatch_push('connection', conn, other);
  end if;

  return conn;
end;
$function$;

create or replace function public.accept_request(p_request uuid, my_shares text[] default '{}'::text[])
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me   uuid := auth.uid();
  req  public.requests;
  conn uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into req from public.requests where id = p_request and target_id = me;
  if req is null then raise exception 'request not found'; end if;

  conn := public.confirm_connection(req.owner_id, my_shares, 'search');
  update public.requests set status = 'accepted' where id = p_request;
  return conn;
end;
$function$;

create or replace function public.claim_pending_connection(p_token text, my_shares text[] default '{}'::text[])
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me   uuid := auth.uid();
  pc   public.pending_connections;
  conn uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into pc from public.pending_connections where token = p_token;
  if pc is null then raise exception 'invite not found'; end if;
  if pc.claimed_by is not null then raise exception 'invite already claimed'; end if;
  if pc.expires_at < now() then raise exception 'invite expired'; end if;
  if pc.inviter_id = me then raise exception 'cannot claim your own invite'; end if;

  conn := public.confirm_connection(pc.inviter_id, my_shares, 'sms');

  update public.pending_connections
     set claimed_by = me, claimed_at = now()
   where id = pc.id;

  return conn;
end;
$function$;

-- Return type changes (met_context gone, note → message), so drop + create.
drop function if exists public.list_incoming_requests();

alter table public.connections drop column if exists met_context;
alter table public.requests drop column if exists met_context;
alter table public.pending_connections drop column if exists met_context;

-- 3. requests.note → requests.message -------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'note'
  ) then
    alter table public.requests rename column note to message;
  end if;
end $$;

create or replace function public.list_incoming_requests()
returns table(
  id uuid, owner_id uuid, name text, avatar_bg text, photo_url text,
  message text, created_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $function$
  select r.id, r.owner_id, p.name, p.avatar_bg, p.photo_url, r.message, r.created_at
  from public.requests r
  join public.profiles p on p.id = r.owner_id
  where r.target_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc;
$function$;
