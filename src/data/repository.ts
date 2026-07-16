/**
 * Supabase repository — the data layer behind `useStore`.
 *
 * Screens and store actions never call this directly; `src/store/useStore.ts`
 * hydrates from it once at startup and syncs to it on every state change via
 * `useStore.subscribe`. When `isSupabaseConfigured` is false (no project/keys
 * configured, e.g. local dev or CI) every function here is a no-op and the
 * store runs exactly as before — mock seed + AsyncStorage persistence only.
 *
 * Tables mirror the store's shape closely (see supabase/schema.sql):
 * users, connections, nudges, pending_connections, requests. A `Connection`'s
 * embedded `user` (the other person's profile) is stored as-is in a `profile`
 * jsonb column rather than normalized — this app has no auth/real accounts
 * yet, so connections aren't necessarily linked to another row in `users`.
 */
import { supabase } from '../lib/supabase';
import type { Settings } from '../store/useStore';
import {
  Connection,
  ConnectionMethod,
  ConnectionType,
  ContactLogEntry,
  HandleSource,
  IncomingRequest,
  Nudge,
  NudgeCadence,
  NudgeResponse,
  NudgeTrigger,
  OutgoingRequest,
  PendingConnection,
  PulledData,
  RequestStatus,
  User,
} from './types';

/** The slice of store state that gets hydrated from / synced to Supabase. */
export interface SyncableState {
  onboarded: boolean;
  user: User;
  connections: Connection[];
  nudges: Nudge[];
  outgoingRequests: OutgoingRequest[];
  incomingRequests: IncomingRequest[];
  pendingConnections: PendingConnection[];
  settings: Settings;
}

// --- Row <-> domain-type mapping -------------------------------------------

interface UserRow {
  id: string;
  name: string;
  photo: string | null;
  avatar_color: string | null;
  interests: string[];
  hobbies: string[];
  top_hobbies: string[];
  bucket_list: string[];
  certifications: string[];
  travel: string[];
  life_experiences: string[];
  handles: User['handles'];
  pulled: PulledData | null;
  recently_added: string[] | null;
  profile_completion: number;
  onboarded: boolean;
  settings: Settings;
}

function userToRow(user: User, onboarded: boolean, settings: Settings): UserRow {
  return {
    id: user.id,
    name: user.name,
    photo: user.photo ?? null,
    avatar_color: user.avatarColor ?? null,
    interests: user.interests,
    hobbies: user.hobbies,
    top_hobbies: user.topHobbies,
    bucket_list: user.bucketList,
    certifications: user.certifications,
    travel: user.travel,
    life_experiences: user.lifeExperiences,
    handles: user.handles,
    pulled: user.pulled ?? null,
    recently_added: user.recentlyAdded ?? null,
    profile_completion: user.profileCompletion,
    onboarded,
    settings,
  };
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    photo: row.photo ?? undefined,
    avatarColor: row.avatar_color ?? undefined,
    interests: row.interests ?? [],
    hobbies: row.hobbies ?? [],
    topHobbies: row.top_hobbies ?? [],
    bucketList: row.bucket_list ?? [],
    certifications: row.certifications ?? [],
    travel: row.travel ?? [],
    lifeExperiences: row.life_experiences ?? [],
    handles: row.handles ?? [],
    pulled: row.pulled ?? undefined,
    recentlyAdded: row.recently_added ?? undefined,
    profileCompletion: row.profile_completion ?? 0,
  };
}

interface ConnectionRow {
  id: string;
  owner_id: string;
  profile: User;
  method: ConnectionMethod;
  connection_type: ConnectionType;
  met_context: string | null;
  mutuals: string[] | null;
  shared_contact_info: HandleSource[] | null;
  nudge_cadence: NudgeCadence;
  last_contacted: string | null;
  next_nudge: string | null;
  contact_history: ContactLogEntry[];
}

function connectionToRow(ownerId: string, c: Connection): ConnectionRow {
  return {
    id: c.id,
    owner_id: ownerId,
    profile: c.user,
    method: c.method,
    connection_type: c.connectionType,
    met_context: c.metContext ?? null,
    mutuals: c.mutuals ?? null,
    shared_contact_info: c.sharedContactInfo,
    nudge_cadence: c.nudgeCadence,
    last_contacted: c.lastContacted,
    next_nudge: c.nextNudge,
    contact_history: c.contactHistory,
  };
}

function rowToConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    user: row.profile,
    method: row.method,
    connectionType: row.connection_type,
    metContext: row.met_context ?? undefined,
    mutuals: row.mutuals ?? undefined,
    sharedContactInfo: row.shared_contact_info ?? [],
    nudgeCadence: row.nudge_cadence,
    lastContacted: row.last_contacted,
    nextNudge: row.next_nudge,
    contactHistory: row.contact_history ?? [],
  };
}

interface NudgeRow {
  id: string;
  owner_id: string;
  connection_id: string;
  trigger: NudgeTrigger;
  message: string;
  scheduled_date: string;
  response: NudgeResponse;
  due: boolean;
}

function nudgeToRow(ownerId: string, n: Nudge): NudgeRow {
  return {
    id: n.id,
    owner_id: ownerId,
    connection_id: n.connectionId,
    trigger: n.trigger,
    message: n.message,
    scheduled_date: n.scheduledDate,
    response: n.response,
    due: n.due,
  };
}

function rowToNudge(row: NudgeRow): Nudge {
  return {
    id: row.id,
    connectionId: row.connection_id,
    trigger: row.trigger,
    message: row.message,
    scheduledDate: row.scheduled_date,
    response: row.response,
    due: row.due,
  };
}

interface PendingRow {
  id: string;
  owner_id: string;
  phone: string;
  name: string | null;
  method: ConnectionMethod;
  created_at: string;
  expires_at: string;
}

function pendingToRow(ownerId: string, p: PendingConnection): PendingRow {
  return {
    id: p.id,
    owner_id: ownerId,
    phone: p.phone,
    name: p.name ?? null,
    method: p.method,
    created_at: p.createdAt,
    expires_at: p.expiresAt,
  };
}

function rowToPending(row: PendingRow): PendingConnection {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    method: row.method,
  };
}

interface RequestRow {
  id: string;
  owner_id: string;
  direction: 'outgoing' | 'incoming';
  person_id: string | null;
  note: string | null;
  attempts: number;
  status: RequestStatus | null;
  connection_snapshot: ConnectionRow | null;
}

function outgoingToRow(ownerId: string, r: OutgoingRequest): RequestRow {
  return {
    id: r.id,
    owner_id: ownerId,
    direction: 'outgoing',
    person_id: r.personId,
    note: r.note ?? null,
    attempts: r.attempts,
    status: r.status,
    connection_snapshot: null,
  };
}

function incomingToRow(ownerId: string, r: IncomingRequest): RequestRow {
  return {
    id: r.id,
    owner_id: ownerId,
    direction: 'incoming',
    person_id: null,
    note: r.note ?? null,
    attempts: 0,
    status: null,
    connection_snapshot: connectionToRow(ownerId, r.connection),
  };
}

function rowToOutgoing(row: RequestRow): OutgoingRequest {
  return {
    id: row.id,
    personId: row.person_id ?? '',
    note: row.note ?? undefined,
    attempts: row.attempts,
    status: row.status ?? 'pending',
  };
}

function rowToIncoming(row: RequestRow): IncomingRequest {
  return {
    id: row.id,
    connection: rowToConnection(row.connection_snapshot as ConnectionRow),
    note: row.note ?? undefined,
  };
}

// --- Sync helpers ------------------------------------------------------

function logSyncError(table: string, error: unknown) {
  console.warn(`[supabase] ${table} sync failed`, error);
}

/**
 * Full replace of a small per-owner table: correctly handles removals too.
 * Never throws — these calls are fire-and-forget background syncs (see
 * useStore.ts's subscription), so a network exception is logged, not raised.
 */
async function replaceOwnerRows<T extends object>(table: string, ownerId: string, rows: T[]) {
  if (!supabase) return;
  try {
    const { error: deleteError } = await supabase.from(table).delete().eq('owner_id', ownerId);
    if (deleteError) return logSyncError(table, deleteError);
    if (rows.length === 0) return;
    const { error: insertError } = await supabase.from(table).insert(rows as Record<string, unknown>[]);
    if (insertError) logSyncError(table, insertError);
  } catch (error) {
    logSyncError(table, error);
  }
}

/** Never throws — see replaceOwnerRows. */
export async function saveUserRow(user: User, onboarded: boolean, settings: Settings) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('users').upsert(userToRow(user, onboarded, settings));
    if (error) logSyncError('users', error);
  } catch (error) {
    logSyncError('users', error);
  }
}

export async function saveConnections(ownerId: string, connections: Connection[]) {
  await replaceOwnerRows('connections', ownerId, connections.map((c) => connectionToRow(ownerId, c)));
}

export async function saveNudges(ownerId: string, nudges: Nudge[]) {
  await replaceOwnerRows('nudges', ownerId, nudges.map((n) => nudgeToRow(ownerId, n)));
}

export async function savePendingConnections(ownerId: string, pending: PendingConnection[]) {
  await replaceOwnerRows('pending_connections', ownerId, pending.map((p) => pendingToRow(ownerId, p)));
}

export async function saveRequests(
  ownerId: string,
  outgoing: OutgoingRequest[],
  incoming: IncomingRequest[],
) {
  const rows = [
    ...outgoing.map((r) => outgoingToRow(ownerId, r)),
    ...incoming.map((r) => incomingToRow(ownerId, r)),
  ];
  await replaceOwnerRows('requests', ownerId, rows);
}

/** Best-effort initial push of local/mock state so a fresh project isn't empty. */
async function seedRemote(local: SyncableState) {
  if (!supabase) return;
  const ownerId = local.user.id;
  try {
    await saveUserRow(local.user, local.onboarded, local.settings);
    await saveConnections(ownerId, local.connections);
    await saveNudges(ownerId, local.nudges);
    await savePendingConnections(ownerId, local.pendingConnections);
    await saveRequests(ownerId, local.outgoingRequests, local.incomingRequests);
  } catch (error) {
    logSyncError('seed', error);
  }
}

/**
 * Loads remote state for `local.user.id`, seeding the project from the given
 * local/mock state on first run. Returns null (meaning: keep local state as-is)
 * when Supabase isn't configured or the fetch fails for any reason — the mock
 * seed + AsyncStorage persistence is always the fallback.
 */
export async function loadOrSeedRemoteState(local: SyncableState): Promise<SyncableState | null> {
  if (!supabase) return null;
  const ownerId = local.user.id;
  try {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', ownerId)
      .maybeSingle();
    if (userError) throw userError;

    if (!userRow) {
      await seedRemote(local);
      return null;
    }

    const [connectionsRes, nudgesRes, pendingRes, requestsRes] = await Promise.all([
      supabase.from('connections').select('*').eq('owner_id', ownerId),
      supabase.from('nudges').select('*').eq('owner_id', ownerId),
      supabase.from('pending_connections').select('*').eq('owner_id', ownerId),
      supabase.from('requests').select('*').eq('owner_id', ownerId),
    ]);
    if (connectionsRes.error) throw connectionsRes.error;
    if (nudgesRes.error) throw nudgesRes.error;
    if (pendingRes.error) throw pendingRes.error;
    if (requestsRes.error) throw requestsRes.error;

    const requestRows = (requestsRes.data ?? []) as RequestRow[];

    return {
      onboarded: (userRow as UserRow).onboarded,
      user: rowToUser(userRow as UserRow),
      settings: (userRow as UserRow).settings,
      connections: (connectionsRes.data as ConnectionRow[]).map(rowToConnection),
      nudges: (nudgesRes.data as NudgeRow[]).map(rowToNudge),
      pendingConnections: (pendingRes.data as PendingRow[]).map(rowToPending),
      outgoingRequests: requestRows.filter((r) => r.direction === 'outgoing').map(rowToOutgoing),
      incomingRequests: requestRows.filter((r) => r.direction === 'incoming').map(rowToIncoming),
    };
  } catch (error) {
    logSyncError('loadOrSeedRemoteState', error);
    return null;
  }
}
