-- Knowable — Supabase schema, baseline snapshot.
--
-- This reconstructs the real multi-user schema already live in the project
-- (applied ad hoc by an earlier session, never previously committed here) so
-- a fresh project can be brought up from scratch. If you're pointing at the
-- existing project, this file is documentation — it's already applied.
--
-- Design: normalized around Supabase Auth (`profiles.id = auth.uid()`), a
-- canonical `connections` row per pair (user_a < user_b), and a
-- `connection_members` row per side for the asymmetric stuff (type, cadence,
-- what's shared, archive state — see 0002_extend.sql for `archived`).
-- Multi-table invariants (creating a connection + seeding its nudges,
-- logging outreach + advancing next_nudge) go through SECURITY DEFINER RPCs
-- rather than raw client-side multi-table writes — see confirm_connection,
-- log_outreach, seed_nudges below.
--
-- Apply with the Supabase SQL editor, or `supabase db push` if you use the CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  name text not null default '',
  initials text not null default '',
  avatar_bg text not null default 'bg-navy',
  photo_url text,
  hobbies text[] not null default '{}',
  bucket_list text[] not null default '{}',
  places text[] not null default '{}',
  life_experiences text[] not null default '{}',
  searchable boolean not null default true,
  nfc_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  met_context text,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

-- Per-side view of a connection: type/cadence/sharing/outreach state as this
-- user sees it, so e.g. one side can call it "professional" while the other
-- calls it "friend", each shares different handles, etc.
create table if not exists public.connection_members (
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  other_id uuid not null references public.profiles(id) on delete cascade,
  connection_type text not null default 'friend',
  shares text[] not null default '{}',
  nudge_freq text not null default 'monthly',
  last_contacted timestamptz,
  next_nudge timestamptz,
  primary key (connection_id, user_id)
);
create index if not exists connection_members_user_id_idx on public.connection_members(user_id);

create table if not exists public.contact_log (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  what text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.handles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  service text not null,
  handle text,
  unique (profile_id, service)
);

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trigger_type text not null default 'spaced_repetition',
  scheduled_for timestamptz not null,
  responded text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists nudges_user_id_scheduled_for_idx on public.nudges(user_id, scheduled_for);

create table if not exists public.pending_connections (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_phone text not null,
  token text not null unique,
  shares text[] not null default '{}',
  claimed_by uuid references public.profiles(id),
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create index if not exists pending_connections_invitee_phone_idx on public.pending_connections(invitee_phone);

-- Row Level Security ---------------------------------------------------

alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.connection_members enable row level security;
alter table public.contact_log enable row level security;
alter table public.handles enable row level security;
alter table public.nudges enable row level security;
alter table public.pending_connections enable row level security;

create or replace function public.are_connected(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.connections c
    where (c.user_a = a and c.user_b = b)
       or (c.user_a = b and c.user_b = a)
  );
$function$;

drop policy if exists "profiles_select_self_or_connected" on public.profiles;
create policy "profiles_select_self_or_connected" on public.profiles
  for select using (id = auth.uid() or are_connected(auth.uid(), id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "connections_select" on public.connections;
create policy "connections_select" on public.connections
  for select using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "members_select" on public.connection_members;
create policy "members_select" on public.connection_members
  for select using (user_id = auth.uid() or other_id = auth.uid());

drop policy if exists "members_update" on public.connection_members;
create policy "members_update" on public.connection_members
  for update using (user_id = auth.uid());

drop policy if exists "log_owner" on public.contact_log;
create policy "log_owner" on public.contact_log
  for all using (user_id = auth.uid());

drop policy if exists "handles_select" on public.handles;
create policy "handles_select" on public.handles
  for select using (profile_id = auth.uid() or are_connected(auth.uid(), profile_id));

drop policy if exists "handles_modify" on public.handles;
create policy "handles_modify" on public.handles
  for all using (profile_id = auth.uid());

drop policy if exists "nudges_owner" on public.nudges;
create policy "nudges_owner" on public.nudges
  for all using (user_id = auth.uid());

drop policy if exists "pending_owner" on public.pending_connections;
create policy "pending_owner" on public.pending_connections
  for all using (inviter_id = auth.uid());

-- Functions & triggers ---------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $function$
begin new.updated_at = now(); return new; end;
$function$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a stub profile row when someone signs up via phone auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.seed_nudges(p_connection uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare d int;
begin
  foreach d in array array[1, 3, 7, 30, 90] loop
    insert into public.nudges (connection_id, user_id, trigger_type, scheduled_for)
    values (p_connection, p_user, 'spaced_repetition', now() + make_interval(days => d));
  end loop;
end;
$function$;

-- Canonical way to create a connection: orders the pair, upserts both sides'
-- connection_members rows (caller's shares now, counterpart's populated when
-- they confirm), and seeds the initial nudge sequence once per connection.
create or replace function public.confirm_connection(other uuid, my_shares text[] default '{}'::text[])
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
    insert into public.connections (user_a, user_b) values (a, b) returning id into conn;
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
  end if;

  return conn;
end;
$function$;

create or replace function public.log_outreach(p_connection uuid, p_what text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  insert into public.contact_log (connection_id, user_id, what) values (p_connection, me, p_what);
  update public.connection_members
     set last_contacted = now()
   where connection_id = p_connection and user_id = me;
end;
$function$;

create or replace function public.search_profiles(q text)
returns table(id uuid, name text, initials text, avatar_bg text, photo_url text)
language sql
security definer
set search_path to 'public'
as $function$
  select p.id, p.name, p.initials, p.avatar_bg, p.photo_url
  from public.profiles p
  where p.searchable
    and p.id <> auth.uid()
    and p.name ilike '%' || q || '%'
  limit 20;
$function$;
