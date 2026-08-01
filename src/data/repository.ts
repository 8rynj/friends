/**
 * Supabase repository — the data layer behind `useStore`, targeting the real
 * multi-user schema in supabase/migrations/ (profiles, connections,
 * connection_members, contact_log, handles, nudges, pending_connections,
 * requests).
 *
 * Unlike the old single-tenant design, sync here is scoped to a real
 * `auth.uid()` — see `useStore.ts`'s `startSupabaseSync`/`stopSupabaseSync`,
 * called from the root layout once a phone-auth session exists. There is no
 * "seed a fresh project from mock data" path anymore: `connections`, `nudges`,
 * and `contact_log` can only be populated by a real counterpart going through
 * `confirm_connection` (RPC, see the migrations), so this repository reads
 * them, and writes only the mutable per-side fields (cadence, type, archived)
 * plus outreach/response actions — it never manufactures connections or
 * nudges out of local/mock state.
 *
 * `profiles` (this user's own row) is the exception: it's pushed on every
 * change and upserted on first load, same as before, since RLS lets a user
 * freely write their own row.
 *
 * NFC bump, Search (send/accept a request), and SMS-invite claim resolve
 * against the real directory via `search_profiles`/`get_profile_preview`,
 * the `requests` table + `accept_request`, and `pending_connections.token` +
 * `claim_pending_connection` (see supabase/migrations/0003_connect_creation.sql)
 * whenever a real backend is signed in — `src/store/useStore.ts` falls back
 * to the local mock candidate pool (`src/data/mock.ts`) only when it isn't.
 */
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Settings } from '../store/useStore';
import { nudgeCopy } from '../engine/nudges';
import {
  Connection,
  ContactLogEntry,
  Handle,
  IncomingRequest,
  MetContext,
  Nudge,
  NudgeCadence,
  OutgoingRequest,
  PendingConnection,
  PulledData,
  User,
} from './types';

/** The slice of store state that gets hydrated from / pushed to Supabase. */
export interface SyncableState {
  user: User;
  settings: Settings;
  connections: Connection[];
  nudges: Nudge[];
  pendingConnections: PendingConnection[];
  incomingRequests: IncomingRequest[];
  outgoingRequests: OutgoingRequest[];
  /** Only meaningful on first load: false when the remote profile looks unfilled. */
  onboarded?: boolean;
}

function logSyncError(what: string, error: unknown) {
  console.warn(`[supabase] ${what} failed`, error);
}

/** Mirrors src/components/Avatar.tsx's convention so avatars match locally and after sync. */
function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

// --- profiles ---------------------------------------------------------

interface ProfileRow {
  id: string;
  phone: string | null;
  name: string;
  avatar_bg: string | null;
  photo_url: string | null;
  hobbies: string[];
  bucket_list: string[];
  places: string[];
  life_experiences: string[];
  interests: string[];
  top_hobbies: string[];
  certifications: string[];
  handles: Handle[];
  pulled: PulledData | null;
  recently_added: string[] | null;
  searchable: boolean;
  nfc_enabled: boolean;
  push_nudges: boolean;
  push_updates: boolean;
  email_fallback: boolean;
  default_cadence: NudgeCadence;
}

function userToProfileRow(user: User, settings: Settings): ProfileRow {
  return {
    id: user.id,
    phone: user.phone ?? null,
    name: user.name,
    avatar_bg: user.avatarColor ?? null,
    photo_url: user.photo ?? null,
    hobbies: user.hobbies,
    bucket_list: user.bucketList,
    places: user.travel,
    life_experiences: user.lifeExperiences,
    interests: user.interests,
    top_hobbies: user.topHobbies,
    certifications: user.certifications,
    handles: user.handles,
    pulled: user.pulled ?? null,
    recently_added: user.recentlyAdded ?? null,
    searchable: settings.searchable,
    nfc_enabled: settings.nfcEnabled,
    push_nudges: settings.pushNudges,
    push_updates: settings.pushUpdates,
    email_fallback: settings.emailFallback,
    default_cadence: settings.defaultCadence,
  };
}

/** profileCompletion isn't stored (it's a pure function of the rest) — the caller recomputes it. */
function rowToUser(row: ProfileRow): Omit<User, 'profileCompletion'> {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    photo: row.photo_url ?? undefined,
    avatarColor: row.avatar_bg ?? undefined,
    interests: row.interests ?? [],
    hobbies: row.hobbies ?? [],
    topHobbies: row.top_hobbies ?? [],
    bucketList: row.bucket_list ?? [],
    certifications: row.certifications ?? [],
    travel: row.places ?? [],
    lifeExperiences: row.life_experiences ?? [],
    handles: row.handles ?? [],
    pulled: row.pulled ?? undefined,
    recentlyAdded: row.recently_added ?? undefined,
  };
}

function rowToSettings(row: ProfileRow): Settings {
  return {
    nfcEnabled: row.nfc_enabled,
    searchable: row.searchable,
    pushNudges: row.push_nudges,
    pushUpdates: row.push_updates,
    emailFallback: row.email_fallback,
    defaultCadence: row.default_cadence,
  };
}

/** Never throws — sync calls are fire-and-forget background pushes. */
export async function saveProfile(user: User, settings: Settings) {
  if (!supabase) return;
  try {
    const row = userToProfileRow(user, settings);
    const { error } = await supabase.from('profiles').upsert({ ...row, initials: initialsOf(user.name) });
    if (error) logSyncError('profiles upsert', error);
  } catch (error) {
    logSyncError('profiles upsert', error);
  }
}

// --- push_tokens --------------------------------------------------------

/**
 * Registers (or clears) this device's Expo push token so the send-push edge
 * function (supabase/functions/send-push/, called from
 * supabase/migrations/0004_push_notifications.sql) has somewhere to look it
 * up. `token: null` clears this device's prior token (Settings toggles both
 * off, or sign-out) rather than leaving a stale row a former owner can no
 * longer see (RLS) but that would still receive pushes.
 */
export async function savePushTokenRemote(ownerId: string, token: string | null, previousToken: string | null) {
  if (!supabase) return;
  try {
    if (previousToken && previousToken !== token) {
      const { error } = await supabase.from('push_tokens').delete().eq('token', previousToken);
      if (error) logSyncError('push_tokens delete', error);
    }
    if (token) {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({ owner_id: ownerId, token, platform: Platform.OS, updated_at: new Date().toISOString() }, { onConflict: 'token' });
      if (error) logSyncError('push_tokens upsert', error);
    }
  } catch (error) {
    logSyncError('push_tokens sync', error);
  }
}

// --- connections / connection_members ----------------------------------

interface MemberRow {
  connection_id: string;
  user_id: string;
  other_id: string;
  connection_type: Connection['connectionType'];
  shares: string[];
  nudge_freq: NudgeCadence;
  last_contacted: string | null;
  next_nudge: string | null;
  archived: boolean;
}

interface ConnectionRow {
  id: string;
  method: Connection['method'];
  met_context: MetContext | null;
}

interface ContactLogRow {
  id: string;
  connection_id: string;
  what: string;
  created_at: string;
}

/**
 * Reads this user's connections (real ones only — see module docs). Pass
 * `onlyConnectionId` to scope the query to a single just-created connection
 * (NFC bump / accept request / SMS claim) instead of refetching everything.
 */
export async function loadConnections(ownerId: string, onlyConnectionId?: string): Promise<Connection[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('connection_members').select('*').eq('user_id', ownerId);
    if (onlyConnectionId) query = query.eq('connection_id', onlyConnectionId);
    const { data: members, error: membersError } = await query;
    if (membersError) throw membersError;
    const memberRows = (members ?? []) as MemberRow[];
    if (memberRows.length === 0) return [];

    const connectionIds = memberRows.map((m) => m.connection_id);
    const otherIds = memberRows.map((m) => m.other_id);

    const [connsRes, profilesRes, logRes] = await Promise.all([
      supabase.from('connections').select('id, method, met_context').in('id', connectionIds),
      supabase.from('profiles').select('*').in('id', otherIds),
      supabase.from('contact_log').select('id, connection_id, what, created_at')
        .eq('user_id', ownerId).in('connection_id', connectionIds),
    ]);
    if (connsRes.error) throw connsRes.error;
    if (profilesRes.error) throw profilesRes.error;
    if (logRes.error) throw logRes.error;

    const connById = new Map((connsRes.data as ConnectionRow[]).map((c) => [c.id, c]));
    const profileById = new Map((profilesRes.data as ProfileRow[]).map((p) => [p.id, p]));
    const logByConnection = new Map<string, ContactLogEntry[]>();
    for (const row of (logRes.data as ContactLogRow[])) {
      const entry: ContactLogEntry = { id: row.id, date: row.created_at.slice(0, 10), via: row.what as ContactLogEntry['via'] };
      const list = logByConnection.get(row.connection_id) ?? [];
      list.push(entry);
      logByConnection.set(row.connection_id, list);
    }

    return memberRows
      .map((m): Connection | null => {
        const conn = connById.get(m.connection_id);
        const profile = profileById.get(m.other_id);
        if (!conn || !profile) return null;
        return {
          id: m.connection_id,
          user: { ...rowToUser(profile), profileCompletion: 0 },
          method: conn.method,
          connectionType: m.connection_type,
          metContext: conn.met_context ?? undefined,
          sharedContactInfo: (m.shares ?? []) as Connection['sharedContactInfo'],
          nudgeCadence: m.nudge_freq,
          lastContacted: m.last_contacted ? m.last_contacted.slice(0, 10) : null,
          nextNudge: m.next_nudge ? m.next_nudge.slice(0, 10) : null,
          contactHistory: logByConnection.get(m.connection_id) ?? [],
          archived: m.archived,
        };
      })
      .filter((c): c is Connection => c !== null);
  } catch (error) {
    logSyncError('loadConnections', error);
    return [];
  }
}

/** Pushes a connection's mutable per-side fields. No-ops (0 rows) for connections that aren't real yet. */
export async function updateConnectionMember(ownerId: string, connection: Connection) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('connection_members')
      .update({
        connection_type: connection.connectionType,
        nudge_freq: connection.nudgeCadence,
        archived: connection.archived ?? false,
      })
      .eq('connection_id', connection.id)
      .eq('user_id', ownerId);
    if (error) logSyncError('connection_members update', error);
  } catch (error) {
    logSyncError('connection_members update', error);
  }
}

/** Logging outreach is a multi-table invariant (contact_log insert + next_nudge advance) — goes through the RPC. */
export async function logOutreachRemote(connectionId: string, via: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc('log_outreach', { p_connection: connectionId, p_what: via });
    if (error) logSyncError('log_outreach', error);
  } catch (error) {
    logSyncError('log_outreach', error);
  }
}

// --- nudges -------------------------------------------------------------

interface NudgeRow {
  id: string;
  connection_id: string;
  trigger_type: string;
  scheduled_for: string;
  responded: string | null;
}

/** Reads this user's nudges, regenerating display copy from the (already-loaded) connections. */
export async function loadNudges(ownerId: string, connections: Connection[]): Promise<Nudge[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('nudges')
      .select('id, connection_id, trigger_type, scheduled_for, responded')
      .eq('user_id', ownerId);
    if (error) throw error;
    const connById = new Map(connections.map((c) => [c.id, c]));
    const now = new Date();
    return (data as NudgeRow[])
      .map((row): Nudge | null => {
        const connection = connById.get(row.connection_id);
        if (!connection) return null;
        const response = row.responded === 'reached_out' || row.responded === 'not_yet' ? row.responded : null;
        return {
          id: row.id,
          connectionId: row.connection_id,
          trigger: row.trigger_type === 'event' ? 'event' : 'time',
          message: nudgeCopy(connection.connectionType, connection.user.name),
          scheduledDate: row.scheduled_for.slice(0, 10),
          response,
          due: response === null && new Date(row.scheduled_for) <= now,
        };
      })
      .filter((n): n is Nudge => n !== null);
  } catch (error) {
    logSyncError('loadNudges', error);
    return [];
  }
}

export async function respondToNudgeRemote(nudgeId: string, response: 'reached_out' | 'not_yet') {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('nudges')
      .update({ responded: response, responded_at: new Date().toISOString() })
      .eq('id', nudgeId);
    if (error) logSyncError('nudges update', error);
  } catch (error) {
    logSyncError('nudges update', error);
  }
}

// --- pending_connections (invites this user sent) ------------------------

interface PendingRow {
  id: string;
  invitee_phone: string;
  name: string | null;
  expires_at: string;
  created_at: string;
  met_context: MetContext | null;
  token: string;
}

export async function loadPendingConnections(ownerId: string): Promise<PendingConnection[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pending_connections')
      .select('id, invitee_phone, name, expires_at, created_at, met_context, token')
      .eq('inviter_id', ownerId)
      .is('claimed_by', null);
    if (error) throw error;
    return (data as PendingRow[]).map((row) => ({
      id: row.id,
      phone: row.invitee_phone,
      name: row.name ?? undefined,
      createdAt: row.created_at.slice(0, 10),
      expiresAt: row.expires_at.slice(0, 10),
      method: 'sms',
      metContext: row.met_context ?? undefined,
      token: row.token,
    }));
  } catch (error) {
    logSyncError('loadPendingConnections', error);
    return [];
  }
}

/** `pending.token` is generated client-side (useStore's `createPendingInvite`) so the same value is usable as the shareable claim link before this push resolves. */
export async function createPendingInviteRemote(ownerId: string, pending: PendingConnection) {
  if (!supabase || !pending.token) return;
  try {
    const { error } = await supabase.from('pending_connections').insert({
      id: pending.id,
      inviter_id: ownerId,
      invitee_phone: pending.phone,
      name: pending.name ?? null,
      token: pending.token,
      expires_at: pending.expiresAt,
      met_context: pending.metContext ?? null,
    });
    if (error) logSyncError('pending_connections insert', error);
  } catch (error) {
    logSyncError('pending_connections insert', error);
  }
}

export async function deletePendingInviteRemote(pendingId: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('pending_connections').delete().eq('id', pendingId);
    if (error) logSyncError('pending_connections delete', error);
  } catch (error) {
    logSyncError('pending_connections delete', error);
  }
}

/** Public preview of an invite by claim-link token — reachable while signed out (Spec §5C). Null when the token doesn't exist. */
export async function previewPendingByToken(token: string): Promise<{
  inviterId: string;
  inviterName: string;
  inviterAvatarColor?: string;
  inviterPhoto?: string;
  inviterTopHobbies: string[];
  inviterHobbies: string[];
  inviteeName?: string;
  expiresAt: string;
  claimed: boolean;
} | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('preview_pending_connection', { p_token: token }).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as {
      inviter_id: string; inviter_name: string; inviter_avatar_bg: string | null;
      inviter_photo_url: string | null; inviter_top_hobbies: string[]; inviter_hobbies: string[];
      invitee_name: string | null; expires_at: string; claimed: boolean;
    };
    return {
      inviterId: row.inviter_id,
      inviterName: row.inviter_name,
      inviterAvatarColor: row.inviter_avatar_bg ?? undefined,
      inviterPhoto: row.inviter_photo_url ?? undefined,
      inviterTopHobbies: row.inviter_top_hobbies ?? [],
      inviterHobbies: row.inviter_hobbies ?? [],
      inviteeName: row.invitee_name ?? undefined,
      expiresAt: row.expires_at,
      claimed: row.claimed,
    };
  } catch (error) {
    logSyncError('preview_pending_connection', error);
    return null;
  }
}

/** Claims a pending invite by token → a real connection. Throws on failure (already claimed/expired/etc.) so the caller can surface why. */
export async function claimPendingRemote(token: string, myShares: string[] = []): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('claim_pending_connection', { p_token: token, my_shares: myShares });
  if (error) throw error;
  return data as string;
}

// --- directory search + profile previews (NFC bump, Search — Spec §5B) ----

export interface DirectoryResult {
  id: string;
  name: string;
  avatarColor?: string;
  photo?: string;
}

export interface ProfilePreview extends DirectoryResult {
  topHobbies: string[];
  hobbies: string[];
}

/** Searches discoverable (`profiles.searchable`) users by name (Spec §5B Method 3). */
export async function searchProfilesRemote(query: string): Promise<DirectoryResult[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('search_profiles', { q: query });
    if (error) throw error;
    return (data as { id: string; name: string; avatar_bg: string | null; photo_url: string | null }[]).map((r) => ({
      id: r.id,
      name: r.name,
      avatarColor: r.avatar_bg ?? undefined,
      photo: r.photo_url ?? undefined,
    }));
  } catch (error) {
    logSyncError('search_profiles', error);
    return [];
  }
}

/** Looks up an arbitrary profile by id (NFC bump) — bypasses the normal "self or already-connected" profiles RLS via a security-definer RPC. Null when the id isn't a real profile. */
export async function getProfilePreview(id: string): Promise<ProfilePreview | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_profile_preview', { p_id: id }).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as { id: string; name: string; avatar_bg: string | null; photo_url: string | null; top_hobbies: string[]; hobbies: string[] };
    return {
      id: row.id,
      name: row.name,
      avatarColor: row.avatar_bg ?? undefined,
      photo: row.photo_url ?? undefined,
      topHobbies: row.top_hobbies ?? [],
      hobbies: row.hobbies ?? [],
    };
  } catch (error) {
    logSyncError('get_profile_preview', error);
    return null;
  }
}

/** Creates a connection directly (NFC bump — consent is already established by the physical tap, Spec §5B Method 1). Throws on failure. */
export async function confirmConnectionRemote(otherId: string, method: 'nfc' | 'search' = 'nfc', metContext?: MetContext): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('confirm_connection', {
    other: otherId,
    my_shares: [],
    p_method: method,
    p_met_context: metContext ?? null,
  });
  if (error) throw error;
  return data as string;
}

// --- requests (Search send/accept — Spec §5B Method 3) ---------------------

interface RequestRow {
  id: string;
  owner_id: string;
  target_id: string;
  note: string | null;
  attempts: number;
  status: 'pending' | 'ignored' | 'blocked' | 'accepted';
}

export type SendRequestOutcome = 'pending' | 'blocked' | 'already';

/** Sends (or re-sends) a connect request. Upserts on the (owner_id, target_id) unique pair so a resend after an ignore bumps `attempts` instead of erroring. Throws on failure. */
export async function sendConnectRequestRemote(
  ownerId: string,
  targetId: string,
  note: string | undefined,
  met: MetContext | undefined,
): Promise<SendRequestOutcome> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data: existing, error: readError } = await supabase
    .from('requests')
    .select('id, attempts, status')
    .eq('owner_id', ownerId)
    .eq('target_id', targetId)
    .maybeSingle();
  if (readError) throw readError;
  const row = existing as Pick<RequestRow, 'id' | 'attempts' | 'status'> | null;
  if (row?.status === 'blocked') return 'blocked';
  if (row?.status === 'accepted') return 'already';

  const attempts = row?.status === 'ignored' ? row.attempts + 1 : row?.attempts ?? 1;
  const status: 'pending' | 'blocked' = attempts >= 3 && row?.status === 'ignored' ? 'blocked' : 'pending';

  const { error: writeError } = await supabase.from('requests').upsert(
    {
      id: row?.id,
      owner_id: ownerId,
      target_id: targetId,
      note: note ?? null,
      met_context: met ?? null,
      attempts,
      status,
    },
    { onConflict: 'owner_id,target_id' },
  );
  if (writeError) throw writeError;
  return status;
}

/** This user's outgoing requests, for the Find screen's per-person status label. */
export async function loadOutgoingRequests(ownerId: string): Promise<OutgoingRequest[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('requests')
      .select('id, target_id, note, attempts, status')
      .eq('owner_id', ownerId);
    if (error) throw error;
    return (data as Pick<RequestRow, 'id' | 'target_id' | 'note' | 'attempts' | 'status'>[]).map((r) => ({
      id: r.id,
      personId: r.target_id,
      note: r.note ?? undefined,
      attempts: r.attempts,
      status: r.status,
    }));
  } catch (error) {
    logSyncError('loadOutgoingRequests', error);
    return [];
  }
}

/** This user's incoming requests, joined with the sender's preview (Home's "wants to connect" card). */
export async function loadIncomingRequests(): Promise<{ id: string; note?: string; connection: Connection }[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('list_incoming_requests');
    if (error) throw error;
    return (data as { id: string; owner_id: string; name: string; avatar_bg: string | null; photo_url: string | null; note: string | null; met_context: MetContext | null }[]).map((r) => ({
      id: r.id,
      note: r.note ?? undefined,
      connection: {
        id: r.owner_id,
        user: {
          id: r.owner_id,
          name: r.name,
          avatarColor: r.avatar_bg ?? undefined,
          photo: r.photo_url ?? undefined,
          interests: [],
          hobbies: [],
          topHobbies: [],
          bucketList: [],
          certifications: [],
          travel: [],
          lifeExperiences: [],
          handles: [],
          profileCompletion: 0,
        },
        method: 'search',
        connectionType: 'friend',
        metContext: r.met_context ?? undefined,
        sharedContactInfo: [],
        nudgeCadence: 'monthly',
        lastContacted: null,
        nextNudge: null,
        contactHistory: [],
      },
    }));
  } catch (error) {
    logSyncError('loadIncomingRequests', error);
    return [];
  }
}

/** Accepts an incoming request → a real connection. Throws on failure. */
export async function acceptRequestRemote(requestId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('accept_request', { p_request: requestId, my_shares: [] });
  if (error) throw error;
  return data as string;
}

/** Ignores an incoming request (target-side status update — allowed by the `requests_update` RLS policy). */
export async function ignoreRequestRemote(requestId: string) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('requests').update({ status: 'ignored' }).eq('id', requestId);
    if (error) logSyncError('requests ignore', error);
  } catch (error) {
    logSyncError('requests ignore', error);
  }
}

// --- initial load ---------------------------------------------------------

/**
 * Loads (and upserts-if-missing) the signed-in user's remote state. Returns
 * null (keep local state as-is) when Supabase isn't configured or the fetch
 * fails — local AsyncStorage state is always the fallback.
 */
export async function loadOrSeedRemoteState(local: SyncableState, ownerId: string): Promise<SyncableState | null> {
  if (!supabase) return null;
  try {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ownerId)
      .maybeSingle();
    if (profileError) throw profileError;

    let user: SyncableState['user'];
    let settings: SyncableState['settings'];
    let onboarded: boolean;

    if (!profileRow) {
      // First sign-in on this project: push the local profile as the seed.
      const seeded = { ...local.user, id: ownerId };
      await saveProfile(seeded, local.settings);
      user = seeded;
      settings = local.settings;
      onboarded = local.onboarded ?? true;
    } else {
      const row = profileRow as ProfileRow;
      user = { ...rowToUser(row), profileCompletion: 0 };
      settings = rowToSettings(row);
      onboarded = !!row.name;
    }

    const connections = await loadConnections(ownerId);
    const [nudges, pendingConnections, incomingRequests, outgoingRequests] = await Promise.all([
      loadNudges(ownerId, connections),
      loadPendingConnections(ownerId),
      loadIncomingRequests(),
      loadOutgoingRequests(ownerId),
    ]);

    return { user, settings, connections, nudges, pendingConnections, incomingRequests, outgoingRequests, onboarded };
  } catch (error) {
    logSyncError('loadOrSeedRemoteState', error);
    return null;
  }
}
