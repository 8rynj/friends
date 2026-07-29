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
 * NFC bump, Search (send/accept a request), and SMS-invite claim still
 * resolve against the local mock candidate pool (src/data/mock.ts) rather
 * than calling `confirm_connection`/the `requests` table/`claim`, since
 * there's no real directory of other signed-up users to connect with yet —
 * see CLAUDE.md "Not built yet".
 */
import { supabase } from '../lib/supabase';
import type { Settings } from '../store/useStore';
import { nudgeCopy } from '../engine/nudges';
import {
  Connection,
  ContactLogEntry,
  Handle,
  MetContext,
  Nudge,
  NudgeCadence,
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

/** Reads this user's connections (real ones only — see module docs). */
export async function loadConnections(ownerId: string): Promise<Connection[]> {
  if (!supabase) return [];
  try {
    const { data: members, error: membersError } = await supabase
      .from('connection_members')
      .select('*')
      .eq('user_id', ownerId);
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
}

function genToken(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadPendingConnections(ownerId: string): Promise<PendingConnection[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pending_connections')
      .select('id, invitee_phone, name, expires_at, created_at, met_context')
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
    }));
  } catch (error) {
    logSyncError('loadPendingConnections', error);
    return [];
  }
}

export async function createPendingInviteRemote(ownerId: string, pending: PendingConnection) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('pending_connections').insert({
      id: pending.id,
      inviter_id: ownerId,
      invitee_phone: pending.phone,
      name: pending.name ?? null,
      token: genToken(),
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
    const [nudges, pendingConnections] = await Promise.all([
      loadNudges(ownerId, connections),
      loadPendingConnections(ownerId),
    ]);

    return { user, settings, connections, nudges, pendingConnections, onboarded };
  } catch (error) {
    logSyncError('loadOrSeedRemoteState', error);
    return null;
  }
}
