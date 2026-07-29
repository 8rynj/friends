-- Knowable — schema extension to close gaps between the live baseline
-- (0001_baseline.sql) and the app's full data model (src/data/types.ts,
-- src/store/useStore.ts Settings). Additive and re-runnable — doesn't touch
-- existing rows, RLS, or functions beyond what's listed below.

-- Profile facets that didn't have columns yet.
-- `handles` is stored whole here (source/value/shared/dataPulled, see
-- src/data/types.ts Handle) rather than normalized into the public.handles
-- table (service+handle only, no shared/dataPulled) — that table is for
-- cross-user visibility once real handle-sharing between two real accounts
-- is wired up; until then this is simpler and lossless.
alter table public.profiles
  add column if not exists interests text[] not null default '{}',
  add column if not exists top_hobbies text[] not null default '{}',
  add column if not exists certifications text[] not null default '{}',
  add column if not exists handles jsonb not null default '[]',
  add column if not exists pulled jsonb,
  add column if not exists recently_added text[];

-- Settings facets beyond searchable/nfc_enabled (src/store/useStore.ts Settings).
alter table public.profiles
  add column if not exists push_nudges boolean not null default true,
  add column if not exists push_updates boolean not null default true,
  add column if not exists email_fallback boolean not null default false,
  add column if not exists default_cadence text not null default 'monthly';

-- V2 "not interested" archive — per-viewer, so it belongs on connection_members
-- (src/data/types.ts Connection.archived).
alter table public.connection_members
  add column if not exists archived boolean not null default false;

-- Structured met_context ({location?, event?}, src/data/types.ts MetContext)
-- instead of flat text. Existing text values are preserved as the "event" field.
alter table public.connections
  alter column met_context type jsonb using (
    case when met_context is null then null else jsonb_build_object('event', met_context) end
  );

alter table public.pending_connections
  add column if not exists met_context jsonb,
  add column if not exists name text;

-- How the connection was first captured (src/data/types.ts ConnectionMethod)
-- — a shared fact about the pair, so it lives on connections, not per-side.
alter table public.connections
  add column if not exists method text not null default 'search';

-- Search connect-requests (Spec §5B Method 3): outgoing (owner_id) / incoming
-- (target_id) — a request/accept handshake, distinct from pending_connections
-- (the SMS-invite flow) and from confirm_connection() (instant mutual connect
-- for NFC/claim, where consent is already established).
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  attempts integer not null default 1,
  status text not null default 'pending' check (status in ('pending', 'ignored', 'blocked', 'accepted')),
  created_at timestamptz not null default now(),
  unique (owner_id, target_id)
);
create index if not exists requests_owner_id_idx on public.requests(owner_id);
create index if not exists requests_target_id_idx on public.requests(target_id);

alter table public.requests enable row level security;

drop policy if exists "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select using (owner_id = auth.uid() or target_id = auth.uid());

drop policy if exists "requests_insert" on public.requests;
create policy "requests_insert" on public.requests
  for insert with check (owner_id = auth.uid());

drop policy if exists "requests_update" on public.requests;
create policy "requests_update" on public.requests
  for update using (owner_id = auth.uid() or target_id = auth.uid());

drop policy if exists "requests_delete" on public.requests;
create policy "requests_delete" on public.requests
  for delete using (owner_id = auth.uid());

-- Accept an incoming request: creates the connection via confirm_connection
-- (0001_baseline.sql — seeds nudges, sets up both connection_members sides)
-- and marks the request accepted. Only the target of the request may accept it.
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

  conn := public.confirm_connection(req.owner_id, my_shares);
  update public.requests set status = 'accepted' where id = p_request;
  return conn;
end;
$function$;

-- Extend log_outreach (0001_baseline.sql) to also advance next_nudge from the
-- caller's chosen cadence, matching the app's CADENCE_DAYS (src/store/useStore.ts).
create or replace function public.log_outreach(p_connection uuid, p_what text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me      uuid := auth.uid();
  cadence text;
  days    int;
begin
  if me is null then raise exception 'not authenticated'; end if;
  insert into public.contact_log (connection_id, user_id, what) values (p_connection, me, p_what);

  select nudge_freq into cadence from public.connection_members
   where connection_id = p_connection and user_id = me;

  days := case cadence when 'weekly' then 7 when 'quarterly' then 90 when 'never' then null else 30 end;

  update public.connection_members
     set last_contacted = now(),
         next_nudge = case when days is null then null else now() + make_interval(days => days) end
   where connection_id = p_connection and user_id = me;
end;
$function$;
