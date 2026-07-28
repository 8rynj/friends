-- Knowable — Supabase schema
--
-- Backs src/data/repository.ts, which src/store/useStore.ts hydrates from and
-- syncs to. Mirrors the store's shape closely rather than a fully normalized
-- relational model: a connection's `profile` (the other person, embedded as
-- `Connection.user` in src/data/types.ts) is stored as jsonb, since this app
-- has no auth/real accounts yet and connections aren't necessarily linked to
-- another row in `users`.
--
-- Apply with the Supabase SQL editor, or `supabase db push` if you use the CLI.

create table if not exists public.users (
  id text primary key,
  name text not null,
  photo text,
  avatar_color text,
  interests jsonb not null default '[]',
  hobbies jsonb not null default '[]',
  top_hobbies jsonb not null default '[]',
  bucket_list jsonb not null default '[]',
  certifications jsonb not null default '[]',
  travel jsonb not null default '[]',
  life_experiences jsonb not null default '[]',
  handles jsonb not null default '[]',
  pulled jsonb,
  recently_added jsonb,
  profile_completion integer not null default 0,
  onboarded boolean not null default false,
  -- App settings & privacy preferences (src/store/useStore.ts `Settings`).
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connections (
  id text primary key,
  owner_id text not null references public.users(id) on delete cascade,
  -- Embedded snapshot of the other person's profile (User shape).
  profile jsonb not null,
  method text not null,
  connection_type text not null,
  -- Structured { location?, event? } (src/data/types.ts MetContext), or null.
  met_context jsonb,
  shared_contact_info jsonb default '[]',
  nudge_cadence text not null default 'monthly',
  last_contacted date,
  next_nudge date,
  contact_history jsonb not null default '[]',
  -- "Not interested" archive (V2) — hidden but reversible, see src/data/types.ts.
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists connections_owner_id_idx on public.connections(owner_id);

create table if not exists public.nudges (
  id text primary key,
  owner_id text not null references public.users(id) on delete cascade,
  connection_id text not null,
  trigger text not null,
  message text not null,
  scheduled_date date not null,
  response text,
  due boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists nudges_owner_id_idx on public.nudges(owner_id);

create table if not exists public.pending_connections (
  id text primary key,
  owner_id text not null references public.users(id) on delete cascade,
  phone text not null,
  name text,
  method text not null default 'sms',
  created_at date not null,
  expires_at date not null
);
create index if not exists pending_connections_owner_id_idx on public.pending_connections(owner_id);

-- Both outgoing (Search — Spec §5B Method 3) and incoming connect requests,
-- distinguished by `direction`. Incoming requests carry a full embedded
-- `connection_snapshot` (matching IncomingRequest.connection in types.ts);
-- outgoing requests use `person_id` + `status`/`attempts`.
create table if not exists public.requests (
  id text primary key,
  owner_id text not null references public.users(id) on delete cascade,
  direction text not null check (direction in ('outgoing', 'incoming')),
  person_id text,
  note text,
  attempts integer not null default 0,
  status text,
  connection_snapshot jsonb,
  created_at timestamptz not null default now()
);
create index if not exists requests_owner_id_idx on public.requests(owner_id);

-- Row Level Security ---------------------------------------------------
--
-- There's no Supabase Auth in this app yet (see CLAUDE.md "Not built yet"), so
-- there's no auth.uid() to scope policies to. RLS is enabled with permissive
-- policies so the anon key (used from the client) can read/write freely —
-- this is fine for solo/dev use but is NOT tenant isolation. Before shipping
-- with real users, add Supabase Auth and replace these with owner-scoped
-- policies, e.g. `using (owner_id = auth.uid())`.

alter table public.users enable row level security;
alter table public.connections enable row level security;
alter table public.nudges enable row level security;
alter table public.pending_connections enable row level security;
alter table public.requests enable row level security;

-- Postgres has no `create policy if not exists`; drop-then-create keeps this
-- script re-runnable.
drop policy if exists "dev: allow all users" on public.users;
create policy "dev: allow all users" on public.users for all using (true) with check (true);

drop policy if exists "dev: allow all connections" on public.connections;
create policy "dev: allow all connections" on public.connections for all using (true) with check (true);

drop policy if exists "dev: allow all nudges" on public.nudges;
create policy "dev: allow all nudges" on public.nudges for all using (true) with check (true);

drop policy if exists "dev: allow all pending_connections" on public.pending_connections;
create policy "dev: allow all pending_connections" on public.pending_connections for all using (true) with check (true);

drop policy if exists "dev: allow all requests" on public.requests;
create policy "dev: allow all requests" on public.requests for all using (true) with check (true);
