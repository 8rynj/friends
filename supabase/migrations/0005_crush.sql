-- Knowable — crush mechanic (4B): mutual opt-in, neither side notified
-- unless both match.
--
-- Deliberately its own table rather than a column on `connection_members`:
-- `connection_members`' existing `members_select` policy lets a user read
-- BOTH sides of a connection (`user_id = auth.uid() or other_id =
-- auth.uid()`), which is fine for shares/cadence/type but would leak a
-- one-sided crush straight through a direct client read. `crushes` instead
-- only allows a user to select their OWN row — the only thing that ever sees
-- both sides is `toggle_crush` below (security definer, like every other
-- multi-row invariant in this schema — see confirm_connection/log_outreach).
-- Additive/re-runnable like the prior migrations; run after 0001–0004.

create table if not exists public.crushes (
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  crushed boolean not null default false,
  matched_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (connection_id, user_id)
);

alter table public.crushes enable row level security;

-- No insert/update/delete policy: all writes go through toggle_crush (security
-- definer), which bypasses RLS the same way confirm_connection's inserts into
-- connection_members do. Select is intentionally narrower than
-- connection_members — own row only, never the other side's.
drop policy if exists "crushes_owner_select" on public.crushes;
create policy "crushes_owner_select" on public.crushes
  for select using (user_id = auth.uid());

-- Flips the caller's crush state on a connection, checks whether the other
-- side has also opted in, and — only on a genuine mutual match — stamps
-- matched_at on both rows and dispatches a 'crush_match' push to both.
-- Un-crushing ends an existing match for both sides (a match requires both;
-- losing one side loses it). Returns the caller's own resulting state.
create or replace function public.toggle_crush(p_connection uuid)
returns table(crushed boolean, matched boolean, matched_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := auth.uid();
  other uuid;
  my_crushed boolean;
  other_crushed boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select other_id into other from public.connection_members
    where connection_id = p_connection and user_id = me;
  if other is null then raise exception 'not a member of this connection'; end if;

  insert into public.crushes (connection_id, user_id, crushed, updated_at)
  values (p_connection, me, true, now())
  on conflict (connection_id, user_id)
  do update set crushed = not public.crushes.crushed, updated_at = now()
  returning public.crushes.crushed into my_crushed;

  select c.crushed into other_crushed from public.crushes c
    where c.connection_id = p_connection and c.user_id = other;
  other_crushed := coalesce(other_crushed, false);

  if my_crushed and other_crushed then
    update public.crushes set matched_at = coalesce(matched_at, now())
      where connection_id = p_connection and user_id in (me, other) and matched_at is null;
    perform public._dispatch_push('crush_match', p_connection, me);
    perform public._dispatch_push('crush_match', p_connection, other);
  elsif not my_crushed then
    update public.crushes set matched_at = null
      where connection_id = p_connection and user_id in (me, other) and matched_at is not null;
  end if;

  return query
    select cr.crushed, cr.matched_at is not null, cr.matched_at
    from public.crushes cr
    where cr.connection_id = p_connection and cr.user_id = me;
end;
$function$;
