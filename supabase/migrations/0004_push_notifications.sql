-- Knowable — push notifications wiring (2B): device token registry + a
-- server-driven dispatch path for the three push kinds already scaffolded on
-- the client (src/notifications/, server/sendPush.ts, Spec §8):
--   * nudge        — time-based reconnect reminder (§5D)
--   * connection   — a connect request/invite was accepted (§5B/§5C)
--   * commonality  — a connection added something you both have (§6 V1.5)
--
-- The actual HTTP call to the Expo Push API happens in an Edge Function
-- (supabase/functions/send-push/) — Postgres can't call Expo directly, so
-- triggers/cron here hand off to it via pg_net (async, non-blocking, won't
-- roll back the write that triggered it). Additive/re-runnable like the
-- prior migrations; run after 0001–0003.
--
-- **Manual setup after running this file** (needs a live project — nothing
-- in this repo can do it, same shape of gap as 2A's `eas init`): deploy the
-- edge function (`npx supabase functions deploy send-push`) and store two
-- Vault secrets so `_dispatch_push` below knows where to send requests —
-- see CLAUDE.md "Push notifications (server-driven)" for the exact steps.
-- Until those secrets exist, `_dispatch_push` no-ops (skips silently) rather
-- than failing the write that triggered it.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Device push tokens, one row per (device, current owner) — a device can
-- only ever belong to whoever is currently signed into it, so re-registering
-- an existing token reassigns ownership instead of erroring.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_owner_id_idx on public.push_tokens(owner_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_owner" on public.push_tokens;
create policy "push_tokens_owner" on public.push_tokens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Marks when a nudge's push has been sent, so the cron dispatcher (below)
-- doesn't re-send it every time it runs.
alter table public.nudges
  add column if not exists pushed_at timestamptz;

-- Fire-and-forget POST to the send-push edge function. security definer so
-- trigger contexts (which run as their table's actor) can still call it;
-- never raises — a push failing must not roll back the profile/connection
-- write that triggered it.
create or replace function public._dispatch_push(
  p_kind text,
  p_connection_id uuid,
  p_recipient_id uuid,
  p_extra jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  base_url text;
  svc_key  text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'edge_function_base_url';
  select decrypted_secret into svc_key  from vault.decrypted_secrets where name = 'edge_function_service_key';
  if base_url is null or svc_key is null then
    return; -- Vault secrets not set up yet — see this file's header comment.
  end if;

  perform net.http_post(
    url := base_url || '/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
    body := jsonb_build_object(
      'kind', p_kind,
      'connectionId', p_connection_id,
      'recipientId', p_recipient_id
    ) || p_extra
  );
exception when others then
  raise warning 'push dispatch (%, connection=%, recipient=%) failed: %', p_kind, p_connection_id, p_recipient_id, sqlerrm;
end;
$function$;

-- confirm_connection (0001/0003) gains a push dispatch on genuine new
-- connections, notifying `other` — the counterpart who didn't just call this
-- function (the original NFC/search-request/SMS-invite sender), matching
-- server/sendPush.ts's sendConnectionPush ("You and {first} are connected").
-- Recreated (not create-or-replace) only because it's identical to 0003's
-- version plus the one dispatch line — no signature change.
drop function if exists public.confirm_connection(uuid, text[], text, jsonb);

create or replace function public.confirm_connection(
  other uuid,
  my_shares text[] default '{}'::text[],
  p_method text default 'search',
  p_met_context jsonb default null
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
    insert into public.connections (user_a, user_b, method, met_context)
    values (a, b, coalesce(p_method, 'search'), p_met_context)
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

-- New-commonality push (§6 V1.5): after a profile's self-reported facets
-- change, diff old vs new to find newly-added items, then for each of this
-- user's connections, check whether the OTHER side already has one of those
-- items — if so, notify them. Deliberately scoped to the plain self-reported
-- facets (hobbies/top_hobbies/bucket_list/certifications/life_experiences/
-- places), same set src/engine/nudges.ts's generateEventNudges checks
-- client-side — `profiles.pulled` (V1.5 data-pull artists/films/books/
-- activities) is left out since data-pull itself is still simulated
-- (ROADMAP 3A/3B), not real data worth pushing about yet.
create or replace function public.notify_new_commonalities()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_items text[] := coalesce(new.hobbies, '{}') || coalesce(new.top_hobbies, '{}')
    || coalesce(new.bucket_list, '{}') || coalesce(new.certifications, '{}')
    || coalesce(new.life_experiences, '{}') || coalesce(new.places, '{}');
  old_items text[] := coalesce(old.hobbies, '{}') || coalesce(old.top_hobbies, '{}')
    || coalesce(old.bucket_list, '{}') || coalesce(old.certifications, '{}')
    || coalesce(old.life_experiences, '{}') || coalesce(old.places, '{}');
  added text[];
  cm record;
  other_items text[];
  shared text;
begin
  added := array(select unnest(new_items) except select unnest(old_items));
  if added is null or array_length(added, 1) is null then
    return new;
  end if;

  for cm in
    select connection_id, user_id as recipient_id
    from public.connection_members
    where other_id = new.id
  loop
    select coalesce(hobbies, '{}') || coalesce(top_hobbies, '{}') || coalesce(bucket_list, '{}')
        || coalesce(certifications, '{}') || coalesce(life_experiences, '{}') || coalesce(places, '{}')
      into other_items
    from public.profiles where id = cm.recipient_id;

    select x into shared from unnest(added) as x where x = any(other_items) limit 1;
    if shared is not null then
      perform public._dispatch_push('commonality', cm.connection_id, cm.recipient_id, jsonb_build_object('item', shared));
    end if;
  end loop;

  return new;
end;
$function$;

drop trigger if exists profiles_notify_commonalities on public.profiles;
create trigger profiles_notify_commonalities
  after update on public.profiles
  for each row
  when (
    new.hobbies is distinct from old.hobbies
    or new.top_hobbies is distinct from old.top_hobbies
    or new.bucket_list is distinct from old.bucket_list
    or new.certifications is distinct from old.certifications
    or new.life_experiences is distinct from old.life_experiences
    or new.places is distinct from old.places
  )
  execute function public.notify_new_commonalities();

-- Time-based nudge push (§5D): a scheduled job (below) calls this every 15
-- minutes to push any nudge whose scheduled_for has arrived and hasn't been
-- pushed yet. Recipient is the nudge's own user_id — the person being
-- reminded to reach out — matching server/sendPush.ts's sendNudgePush.
create or replace function public.dispatch_due_nudges()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n record;
begin
  for n in
    select id, connection_id, user_id
    from public.nudges
    where scheduled_for <= now()
      and responded is null
      and pushed_at is null
    order by scheduled_for
    limit 200
  loop
    perform public._dispatch_push('nudge', n.connection_id, n.user_id, jsonb_build_object('nudgeId', n.id));
    update public.nudges set pushed_at = now() where id = n.id;
  end loop;
end;
$function$;

select cron.schedule(
  'dispatch-due-nudges',
  '*/15 * * * *',
  $$select public.dispatch_due_nudges();$$
)
where not exists (select 1 from cron.job where jobname = 'dispatch-due-nudges');
