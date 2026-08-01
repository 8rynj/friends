-- Knowable — schema extension for real connect-CREATION flows (NFC bump,
-- Search send/accept, SMS-invite claim) against the live directory instead
-- of the local mock candidate pool (src/data/mock.ts). Additive/re-runnable
-- like the prior migrations; run after 0001_baseline.sql and 0002_extend.sql.

-- requests gains structured met-context, captured by the sender at send time
-- (Spec §5B Method 3's "where'd you meet" fields) and carried onto the
-- connection when the target accepts (see accept_request below).
alter table public.requests
  add column if not exists met_context jsonb;

-- confirm_connection gains method/met_context so NFC bump and SMS-invite
-- claim (below) tag the resulting connection correctly — previously every
-- connection created through it defaulted to connections.method = 'search'
-- regardless of how it was actually made. Dropped and recreated (rather than
-- create-or-replace) since the parameter list is changing.
drop function if exists public.confirm_connection(uuid, text[]);

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
  end if;

  return conn;
end;
$function$;

-- accept_request now forwards the request's captured met_context so the
-- resulting connection carries it (previously dropped on the floor).
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

  conn := public.confirm_connection(req.owner_id, my_shares, 'search', req.met_context);
  update public.requests set status = 'accepted' where id = p_request;
  return conn;
end;
$function$;

-- Public preview of an arbitrary profile by id — used by NFC bump, where the
-- id comes from a physical tag tap (proof of presence) rather than a search,
-- so the normal profiles RLS (self or already-connected only) doesn't apply
-- yet. Deliberately minimal: no handles/pulled data, matching "name + photo
-- only until connected" (Spec §5B).
create or replace function public.get_profile_preview(p_id uuid)
returns table(id uuid, name text, avatar_bg text, photo_url text, top_hobbies text[], hobbies text[])
language sql
security definer
set search_path to 'public'
as $function$
  select p.id, p.name, p.avatar_bg, p.photo_url, p.top_hobbies, p.hobbies
  from public.profiles p
  where p.id = p_id;
$function$;

-- Incoming connect requests (Search — Spec §5B Method 3), joined with the
-- sender's preview info so Home can render them without a separate profile
-- fetch per row (the sender isn't a connection yet, so plain profiles RLS
-- wouldn't allow that join client-side).
create or replace function public.list_incoming_requests()
returns table(
  id uuid, owner_id uuid, name text, avatar_bg text, photo_url text,
  note text, met_context jsonb, created_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $function$
  select r.id, r.owner_id, p.name, p.avatar_bg, p.photo_url, r.note, r.met_context, r.created_at
  from public.requests r
  join public.profiles p on p.id = r.owner_id
  where r.target_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc;
$function$;

-- Public preview of a pending SMS invite by token (Spec §5C — "no account
-- needed to preview"), so the claim screen can show who invited you and a
-- teaser before you've signed in. Deliberately doesn't require auth.uid().
create or replace function public.preview_pending_connection(p_token text)
returns table(
  inviter_id uuid, inviter_name text, inviter_avatar_bg text, inviter_photo_url text,
  inviter_top_hobbies text[], inviter_hobbies text[], invitee_name text,
  expires_at timestamptz, claimed boolean
)
language sql
security definer
set search_path to 'public'
as $function$
  select p.id, p.name, p.avatar_bg, p.photo_url, p.top_hobbies, p.hobbies,
         pc.name, pc.expires_at, (pc.claimed_by is not null)
  from public.pending_connections pc
  join public.profiles p on p.id = pc.inviter_id
  where pc.token = p_token;
$function$;

-- Claim a pending SMS invite by token: verifies it's unclaimed and
-- unexpired, creates the connection via confirm_connection (tagged
-- method='sms', carrying the inviter's met_context), and marks it claimed.
-- Requires the claimant to already be signed in (Spec §5C — only the claim
-- action itself needs an account).
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

  conn := public.confirm_connection(pc.inviter_id, my_shares, 'sms', pc.met_context);

  update public.pending_connections
     set claimed_by = me, claimed_at = now()
   where id = pc.id;

  return conn;
end;
$function$;
