/**
 * App store — Zustand + AsyncStorage persistence.
 *
 * Seeded from mock data so the app is populated on first launch, then user
 * actions (completing onboarding, connecting, logging outreach, responding to
 * nudges, changing cadence) mutate and persist real state. This is the
 * architectural backbone that auth / NFC / a real backend will later plug into
 * by replacing the seed + persistence with API calls.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Connection,
  ConnectionType,
  ContactLogEntry,
  DataPullSource,
  HandleSource,
  IncomingRequest,
  MetContext,
  NudgeCadence,
  NudgeResponse,
  OutgoingRequest,
  PendingConnection,
  PulledData,
  User,
} from '../data/types';
import {
  connections as mockConnections,
  currentUser,
  directory,
  incomingRequestsSeed,
  mockMutualCrushes,
  newCandidates,
  nudges as mockNudges,
  searchIgnorers,
} from '../data/mock';
import { runDataPull, DataPullInput } from '../data/datapull';
import { generateEventNudges } from '../engine/nudges';
import { palette } from '../theme/colors';
import { isSupabaseConfigured } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';
import * as repository from '../data/repository';

/**
 * Result of sending a connect request (Search — Spec §5B Method 3).
 * 'accepted' only happens against the mock pool (offline/unconfigured) — a
 * real request always lands as 'pending' until the target actually accepts.
 */
export type RequestOutcome =
  | { outcome: 'accepted'; connectionId: string }
  | { outcome: 'pending' | 'ignored' | 'blocked' | 'already' | 'notfound' | 'error' };

/** Minimal preview of another user, for confirm-before-connect UI (NFC bump, Spec §5B Method 1). */
export interface CandidatePreview {
  id: string;
  name: string;
  avatarColor?: string;
  photo?: string;
  topHobbies: string[];
  hobbies: string[];
}

/** Spaced-repetition cadence → days until the next nudge (Spec §5D). */
const CADENCE_DAYS: Record<Exclude<NudgeCadence, 'never'>, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
/**
 * RFC4122 v4-shaped id. Locally-created connections/pending-invites/etc. may
 * end up as primary keys in Supabase's uuid-typed tables (see
 * src/data/repository.ts), so every client-generated id needs to look like a
 * real uuid even before/without a backend.
 */
const genId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/** Next nudge date from a base date + cadence (null when cadence is "never"). */
function nextNudgeDate(base: string, cadence: NudgeCadence): string | null {
  if (cadence === 'never') return null;
  return addDaysISO(base, CADENCE_DAYS[cadence]);
}

/** Profile completion 0–100 from how many profile facets are filled (§5A). */
export function computeCompletion(u: User): number {
  const checks = [
    !!u.name?.trim(),
    u.hobbies.length >= 3,
    (u.topHobbies?.length ?? 0) >= 1,
    u.handles.length >= 1,
    u.bucketList.length >= 1,
    (u.certifications?.length ?? 0) >= 1,
    u.travel.length >= 1,
    u.lifeExperiences.length >= 1,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Profile array facets an editor can update. */
export type FacetKey =
  | 'hobbies'
  | 'topHobbies'
  | 'bucketList'
  | 'certifications'
  | 'travel'
  | 'lifeExperiences';

/** User settings & privacy preferences (Spec §Privacy, §Notifications). */
export interface Settings {
  /** NFC bump enabled — on by default (§Privacy). */
  nfcEnabled: boolean;
  /** Discoverable in search — on by default; opt-out hides you (§Privacy). */
  searchable: boolean;
  /** Push notifications for nudges. */
  pushNudges: boolean;
  /** Push notifications when a connection adds a new commonality (V1.5). */
  pushUpdates: boolean;
  /** Email fallback for notifications. */
  emailFallback: boolean;
  /** Default nudge cadence applied to new connections (§5D). */
  defaultCadence: NudgeCadence;
}

const DEFAULT_SETTINGS: Settings = {
  nfcEnabled: true,
  searchable: true,
  pushNudges: true,
  pushUpdates: true,
  emailFallback: false,
  defaultCadence: 'monthly',
};

interface AppState {
  hasHydrated: boolean;
  onboarded: boolean;
  user: User;
  connections: Connection[];
  nudges: import('../data/types').Nudge[];
  /** Outgoing connect requests (Search — Spec §5B). */
  outgoingRequests: OutgoingRequest[];
  /** Incoming connect requests awaiting accept/ignore (§5B). */
  incomingRequests: IncomingRequest[];
  /** Pending SMS invites tied to a phone number, 30-day expiry (§5C). */
  pendingConnections: PendingConnection[];
  /** User settings & privacy preferences. */
  settings: Settings;
  /** This device's Expo push token, once registered — null until a push setting is enabled and permission is granted. */
  pushToken: string | null;

  setHasHydrated: (v: boolean) => void;
  /** Merge a profile patch and recompute completion (onboarding / editing). */
  completeProfile: (patch: Partial<User>) => void;
  /** Replace a single array facet and recompute completion (profile editors). */
  updateFacet: (key: FacetKey, items: string[]) => void;
  /** Add a connection if not already present (the bump / connect result). */
  addConnection: (c: Connection) => void;
  isConnected: (id: string) => boolean;
  /** Record confirmed outreach: stamps lastContacted, logs history, reschedules. */
  logOutreach: (connectionId: string, via: ContactLogEntry['via'], note?: string) => void;
  /** Respond to a nudge's "did you reach out?" prompt (§5D). */
  respondToNudge: (nudgeId: string, response: NudgeResponse) => void;
  /** Change a connection's nudge cadence and reschedule the next nudge. */
  setCadence: (connectionId: string, cadence: NudgeCadence) => void;
  /** Set a connection's type (filters icebreakers, sharing, nudge copy — V1.5). */
  setConnectionType: (connectionId: string, type: ConnectionType) => void;
  /** Mark "not interested": hides from Home/People and pauses nudges (V2). Reversible. */
  archiveConnection: (connectionId: string) => void;
  /** Undo an archive — restores default cadence and resumes nudges (V2). */
  unarchiveConnection: (connectionId: string) => void;
  /**
   * Crush mechanic (V2): toggle this user's opt-in on a connection. Mutual
   * opt-in only — against a real backend this calls a security-definer RPC
   * that's the only thing able to see both sides' state, so neither user is
   * notified unless both have opted in. Against the mock pool, matches
   * `mockMutualCrushes` so the mutual-match moment is demonstrable offline.
   */
  toggleCrush: (connectionId: string) => Promise<void>;
  /**
   * V1.5: connect a platform and pull its signals onto the profile. Runs a
   * real adapter when one exists and `input` is supplied (e.g. a Letterboxd
   * username), otherwise falls back to the simulated pull. Resolves with an
   * error message on failure instead of writing anything to the profile.
   */
  connectDataPull: (source: DataPullSource, input?: DataPullInput) => Promise<{ ok: true } | { ok: false; error: string }>;

  // --- Connect flows (Spec §5B/§5C) ---
  /** Search the directory by name (real `search_profiles` RPC when signed into a real backend, else the local mock pool). */
  searchDirectory: (query: string) => Promise<{ id: string; name: string; avatarColor?: string; photo?: string }[]>;
  /** Send a connect request to a directory person; resolves by disposition. */
  sendConnectRequest: (personId: string, note?: string, met?: MetContext) => Promise<RequestOutcome>;
  /** Accept an incoming request → becomes a connection. Returns its id. */
  acceptIncoming: (requestId: string) => Promise<string | undefined>;
  /** Ignore an incoming request. */
  ignoreIncoming: (requestId: string) => Promise<void>;
  /** Look up a bumped NFC tag's id against the real directory (confirm-before-connect UI). Null when it's not a real profile. */
  previewCandidate: (candidateId: string) => Promise<CandidatePreview | null>;
  /** Create the connection from a confirmed NFC bump. Returns the connection id. */
  confirmNfcConnection: (candidate: CandidatePreview) => Promise<string | undefined>;
  /** Create an SMS invite (pending, 30-day expiry). Returns the pending id. */
  createPendingInvite: (name: string, phone: string, met?: MetContext) => string;
  /** Claim a pending invite → confirmed connection, tagged with the claimant's verified phone. Returns the connection id. */
  claimPending: (pendingId: string, claimantPhone?: string) => string | undefined;
  /** Claim a pending invite by its claim-link token (the real cross-device path — Spec §5C). Returns the connection id. */
  claimInviteByToken: (token: string) => Promise<string | undefined>;
  /** Cancel a pending invite. */
  cancelPending: (pendingId: string) => void;

  // --- Settings ---
  /** Merge a settings patch (privacy / notifications / defaults). */
  updateSettings: (patch: Partial<Settings>) => void;
  /** Reset all app data back to the seed state (mock sign-out). */
  resetApp: () => void;

  // --- Push notifications ---
  /** Store this device's Expo push token (or clear it, e.g. when all push settings are off). */
  setPushToken: (token: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      onboarded: true, // seeded user exists; onboarding edits the same profile
      user: currentUser,
      connections: mockConnections,
      // Seed time nudges + generated event nudges (new shared commonalities).
      nudges: [...mockNudges, ...generateEventNudges(currentUser, mockConnections)],
      outgoingRequests: [],
      incomingRequests: incomingRequestsSeed,
      pendingConnections: [],
      settings: DEFAULT_SETTINGS,
      pushToken: null,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      completeProfile: (patch) =>
        set((s) => {
          const user = { ...s.user, ...patch };
          user.profileCompletion = computeCompletion(user);
          return { user, onboarded: true };
        }),

      updateFacet: (key, items) =>
        set((s) => {
          const user = { ...s.user, [key]: items };
          // Keep topHobbies a subset of hobbies if hobbies shrink.
          if (key === 'hobbies') {
            user.topHobbies = (s.user.topHobbies ?? []).filter((h) => items.includes(h));
          }
          user.profileCompletion = computeCompletion(user);
          return { user };
        }),

      addConnection: (c) =>
        set((s) =>
          s.connections.some((x) => x.id === c.id)
            ? s
            : { connections: [c, ...s.connections] },
        ),

      isConnected: (id) => get().connections.some((c) => c.id === id),

      logOutreach: (connectionId, via, note) => {
        const today = todayISO();
        set((s) => {
          const entry: ContactLogEntry = { id: genId(), date: today, via, note };
          const connections = s.connections.map((c) =>
            c.id === connectionId
              ? {
                  ...c,
                  lastContacted: today,
                  nextNudge: nextNudgeDate(today, c.nudgeCadence),
                  contactHistory: [entry, ...c.contactHistory],
                }
              : c,
          );
          // Resolve any open nudge for this connection as "reached out".
          const nudges = s.nudges.map((n) =>
            n.connectionId === connectionId && n.response === null
              ? { ...n, response: 'reached_out' as const, due: false }
              : n,
          );
          return { connections, nudges };
        });
        // Multi-table invariant (contact_log insert + next_nudge advance) — RPC, see repository.ts.
        if (activeOwnerId) repository.logOutreachRemote(connectionId, via);
      },

      respondToNudge: (nudgeId, response) => {
        const nudge = get().nudges.find((n) => n.id === nudgeId);
        trackEvent('nudge_acted_on', { response });
        if (response === 'reached_out' && nudge) {
          // Logging outreach resolves every open nudge on this connection
          // locally (see logOutreach) — mirror that resolution remotely too,
          // not just this one nudge, so a fresh load doesn't resurrect them.
          const resolvedIds = get()
            .nudges.filter((n) => n.connectionId === nudge.connectionId && n.response === null)
            .map((n) => n.id);
          get().logOutreach(nudge.connectionId, 'imessage');
          if (activeOwnerId) {
            for (const id of resolvedIds) repository.respondToNudgeRemote(id, 'reached_out');
          }
          return;
        }
        set((s) => ({
          nudges: s.nudges.map((n) =>
            n.id === nudgeId ? { ...n, response, due: false } : n,
          ),
        }));
        if (activeOwnerId && response) repository.respondToNudgeRemote(nudgeId, response);
      },

      setCadence: (connectionId, cadence) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === connectionId
              ? {
                  ...c,
                  nudgeCadence: cadence,
                  nextNudge: nextNudgeDate(c.lastContacted ?? todayISO(), cadence),
                }
              : c,
          ),
        })),

      setConnectionType: (connectionId, type) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === connectionId ? { ...c, connectionType: type } : c,
          ),
        })),

      archiveConnection: (connectionId) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === connectionId
              ? { ...c, archived: true, nudgeCadence: 'never' as const, nextNudge: null }
              : c,
          ),
          // Drop any open nudge for this connection so it can't resurface on Home.
          nudges: s.nudges.map((n) =>
            n.connectionId === connectionId && n.response === null
              ? { ...n, response: 'not_yet' as const, due: false }
              : n,
          ),
        })),

      unarchiveConnection: (connectionId) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === connectionId
              ? {
                  ...c,
                  archived: false,
                  nudgeCadence: s.settings.defaultCadence,
                  nextNudge: nextNudgeDate(c.lastContacted ?? todayISO(), s.settings.defaultCadence),
                }
              : c,
          ),
        })),

      toggleCrush: async (connectionId) => {
        if (activeOwnerId) {
          try {
            const result = await repository.toggleCrushRemote(connectionId);
            set((s) => ({
              connections: s.connections.map((c) =>
                c.id === connectionId ? { ...c, crush: result.crushed, crushMatched: result.matched } : c,
              ),
            }));
          } catch (error) {
            console.warn('[supabase] toggleCrush failed', error);
          }
          return;
        }
        // Mock pool (offline/unconfigured): the other side's opt-in isn't
        // real, so match against the fixed mockMutualCrushes pool instead.
        set((s) => ({
          connections: s.connections.map((c) => {
            if (c.id !== connectionId) return c;
            const crush = !c.crush;
            return { ...c, crush, crushMatched: crush && mockMutualCrushes.includes(connectionId) };
          }),
        }));
      },

      connectDataPull: async (source, input) => {
        let result: PulledData;
        try {
          result = await runDataPull(source, input);
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong.' };
        }
        set((s) => {
          const pulled = { ...s.user.pulled, ...result };
          const value = input?.username?.trim();
          const handles = s.user.handles.some((h) => h.source === source)
            ? s.user.handles.map((h) =>
                h.source === source ? { ...h, dataPulled: true, value: value || h.value } : h,
              )
            : [...s.user.handles, { source, value: value ?? '', dataPulled: true }];
          const user = { ...s.user, pulled, handles };
          user.profileCompletion = computeCompletion(user);
          return { user };
        });
        trackEvent('data_pull_connected', { source });
        return { ok: true };
      },

      searchDirectory: async (query) => {
        const connections = get().connections;
        if (activeOwnerId) {
          const results = await repository.searchProfilesRemote(query);
          return results.filter((r) => !connections.some((c) => c.id === r.id));
        }
        const q = query.trim().toLowerCase();
        return directory
          .filter((d) => !connections.some((c) => c.id === d.id) && (q ? d.user.name.toLowerCase().includes(q) : true))
          .map((d) => ({ id: d.id, name: d.user.name, avatarColor: d.user.avatarColor, photo: d.user.photo }));
      },

      sendConnectRequest: async (personId, note, met) => {
        const s = get();
        if (s.connections.some((c) => c.id === personId)) return { outcome: 'already' };

        if (activeOwnerId) {
          try {
            const status = await repository.sendConnectRequestRemote(activeOwnerId, personId, note, met);
            const outgoingRequests = await repository.loadOutgoingRequests(activeOwnerId);
            set({ outgoingRequests });
            return { outcome: status };
          } catch (error) {
            console.warn('[supabase] sendConnectRequest failed', error);
            return { outcome: 'error' };
          }
        }

        // Mock pool (offline/unconfigured): a fixed disposition per person simulates
        // a real counterpart's accept/ignore, since there's no live directory to ask.
        const person = directory.find((d) => d.id === personId);
        if (!person) return { outcome: 'notfound' };
        const existing = s.outgoingRequests.find((r) => r.personId === personId);
        if (existing?.status === 'blocked') return { outcome: 'blocked' };

        if (searchIgnorers.includes(personId)) {
          const attempts = (existing?.attempts ?? 0) + 1;
          const status: OutgoingRequest['status'] = attempts >= 3 ? 'blocked' : 'ignored';
          const req: OutgoingRequest = { id: existing?.id ?? genId(), personId, note, attempts, status };
          set((st) => ({
            outgoingRequests: existing
              ? st.outgoingRequests.map((r) => (r.personId === personId ? req : r))
              : [...st.outgoingRequests, req],
          }));
          return { outcome: status };
        }

        const connection: Connection = {
          ...person,
          metContext: met ?? { event: 'Connected via search' },
          nudgeCadence: s.settings.defaultCadence,
        };
        set((st) => ({
          connections: [connection, ...st.connections],
          outgoingRequests: st.outgoingRequests.filter((r) => r.personId !== personId),
        }));
        trackEvent('connect_made', { method: 'search' });
        return { outcome: 'accepted', connectionId: personId };
      },

      acceptIncoming: async (requestId) => {
        if (activeOwnerId) {
          try {
            const connectionId = await repository.acceptRequestRemote(requestId);
            const [connection] = await repository.loadConnections(activeOwnerId, connectionId);
            if (connection) get().addConnection(connection);
            set((s) => ({ incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId) }));
            trackEvent('connect_made', { method: 'search' });
            return connection?.id ?? connectionId;
          } catch (error) {
            console.warn('[supabase] acceptIncoming failed', error);
            return undefined;
          }
        }
        const req = get().incomingRequests.find((r) => r.id === requestId);
        if (!req) return undefined;
        get().addConnection(req.connection);
        set((s) => ({ incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId) }));
        trackEvent('connect_made', { method: 'search' });
        return req.connection.id;
      },

      ignoreIncoming: async (requestId) => {
        set((s) => ({ incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId) }));
        if (activeOwnerId) await repository.ignoreRequestRemote(requestId);
      },

      previewCandidate: async (candidateId) => {
        if (activeOwnerId) {
          if (candidateId === activeOwnerId) return null;
          const preview = await repository.getProfilePreview(candidateId);
          return preview;
        }
        // Mock pool (offline/unconfigured) — bump only ever resolves against newCandidates (§5B Method 1).
        const candidate = newCandidates.find((c) => c.id === candidateId);
        if (!candidate) return null;
        return {
          id: candidate.id,
          name: candidate.user.name,
          avatarColor: candidate.user.avatarColor,
          photo: candidate.user.photo,
          topHobbies: candidate.user.topHobbies,
          hobbies: candidate.user.hobbies,
        };
      },

      confirmNfcConnection: async (candidate) => {
        if (activeOwnerId) {
          try {
            const connectionId = await repository.confirmConnectionRemote(candidate.id, 'nfc');
            const [connection] = await repository.loadConnections(activeOwnerId, connectionId);
            if (connection) {
              get().addConnection(connection);
              get().setCadence(connection.id, get().settings.defaultCadence);
            }
            trackEvent('connect_made', { method: 'nfc' });
            return connection?.id ?? connectionId;
          } catch (error) {
            console.warn('[supabase] confirmNfcConnection failed', error);
            return undefined;
          }
        }
        // Mock pool (offline/unconfigured): reuse the full seeded Connection
        // (previewCandidate only returns a preview-shaped subset) so profile
        // facets (handles/pulled/etc.) still feed the commonality engine on
        // the icebreaker screen.
        const full = newCandidates.find((c) => c.id === candidate.id);
        if (!full) return undefined;
        get().addConnection(full);
        get().setCadence(full.id, get().settings.defaultCadence);
        trackEvent('connect_made', { method: 'nfc' });
        return full.id;
      },

      createPendingInvite: (name, phone, met) => {
        const id = genId();
        const today = todayISO();
        const pending: PendingConnection = {
          id,
          phone,
          name,
          createdAt: today,
          expiresAt: addDaysISO(today, 30),
          method: 'sms',
          metContext: met,
          // Generated client-side (not server-side) so it's usable as the shareable
          // claim link the moment the invite is created, before the Supabase push resolves.
          token: genId(),
        };
        set((s) => ({ pendingConnections: [pending, ...s.pendingConnections] }));
        return id;
      },

      claimInviteByToken: async (token) => {
        if (!activeOwnerId) return undefined;
        try {
          const connectionId = await repository.claimPendingRemote(token);
          const [connection] = await repository.loadConnections(activeOwnerId, connectionId);
          if (connection) get().addConnection(connection);
          set((s) => ({ pendingConnections: s.pendingConnections.filter((p) => p.token !== token) }));
          trackEvent('connect_made', { method: 'sms' });
          return connection?.id ?? connectionId;
        } catch (error) {
          console.warn('[supabase] claimInviteByToken failed', error);
          return undefined;
        }
      },

      // Offline/self-preview path only (Supabase unconfigured, or an inviter
      // previewing their own link on the same device): `pendingConnections` is
      // this user's own outgoing invites, so a real recipient on a different
      // device never has a local entry to find here — see `claimInviteByToken`
      // for the real cross-device claim (Spec §5C).
      claimPending: (pendingId, claimantPhone) => {
        const pending = get().pendingConnections.find((p) => p.id === pendingId);
        if (!pending) return undefined;
        const id = `claimed-${pendingId}`;
        const connection: Connection = {
          id,
          user: {
            id,
            name: pending.name ?? pending.phone,
            phone: claimantPhone ?? pending.phone,
            avatarColor: palette.navy,
            interests: [],
            hobbies: [],
            topHobbies: [],
            bucketList: [],
            certifications: [],
            travel: [],
            lifeExperiences: [],
            handles: [],
            profileCompletion: 10,
          },
          method: 'sms',
          connectionType: 'friend',
          metContext: pending.metContext ?? { event: 'Joined from your invite' },
          sharedContactInfo: [],
          nudgeCadence: 'monthly',
          lastContacted: null,
          nextNudge: null,
          contactHistory: [],
        };
        set((s) => ({
          connections: [connection, ...s.connections],
          pendingConnections: s.pendingConnections.filter((p) => p.id !== pendingId),
        }));
        trackEvent('connect_made', { method: 'sms' });
        return id;
      },

      cancelPending: (pendingId) =>
        set((s) => ({ pendingConnections: s.pendingConnections.filter((p) => p.id !== pendingId) })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetApp: () =>
        set({
          user: currentUser,
          connections: mockConnections,
          nudges: [...mockNudges, ...generateEventNudges(currentUser, mockConnections)],
          outgoingRequests: [],
          incomingRequests: incomingRequestsSeed,
          pendingConnections: [],
          settings: DEFAULT_SETTINGS,
          pushToken: null,
          onboarded: true,
        }),

      setPushToken: (token) => set({ pushToken: token }),
    }),
    {
      // Bumped to v8 for pushToken, on top of v7's User.phone (passwordless
      // phone auth) and v6's structured metContext (location/event) +
      // graph-based mutuals.
      name: 'knowable-store-v8',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        user: s.user,
        connections: s.connections,
        nudges: s.nudges,
        outgoingRequests: s.outgoingRequests,
        incomingRequests: s.incomingRequests,
        pendingConnections: s.pendingConnections,
        settings: s.settings,
        pushToken: s.pushToken,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/**
 * Supabase sync layer — entirely additive, no store action above is aware of
 * it except the two RPC call-sites in `logOutreach`/`respondToNudge` above.
 * Unlike the old single-tenant design this is gated on a real authenticated
 * user, not just `isSupabaseConfigured`: RLS (see supabase/migrations) keys
 * every table off `auth.uid()`, so there's nothing valid to sync before
 * sign-in. `app/_layout.tsx` calls `startSupabaseSync(userId)` once
 * `useAuthStore` reports `signedIn`, and `stopSupabaseSync()` on sign-out.
 * When `isSupabaseConfigured` is false (no project/keys set, e.g. local dev
 * or CI), or while signed out, this never runs — the app is mock seed +
 * AsyncStorage persistence only, exactly as before auth/Supabase existed.
 *
 * On start, remote state (once fetched) overwrites the local/mock state that
 * rendered first. After that, `connections`/`nudges`/`pendingConnections`/
 * `incomingRequests`/`outgoingRequests` are read-hydrated only — they can't
 * be manufactured from local/mock state (see src/data/repository.ts module
 * docs) — while `profiles` stays a full push-on-change mirror, and
 * per-connection edits (cadence/type/archived) or new/cancelled invites push
 * their specific change directly. NFC bump, Search send/accept, and
 * SMS-invite claim (`previewCandidate`/`confirmNfcConnection`,
 * `sendConnectRequest`/`acceptIncoming`/`ignoreIncoming`,
 * `claimInviteByToken`) branch on `activeOwnerId` themselves to call the real
 * directory/RPCs instead of the local mock pool.
 */
let activeOwnerId: string | null = null;
let syncUnsubscribe: (() => void) | null = null;

export function startSupabaseSync(ownerId: string) {
  if (!isSupabaseConfigured || activeOwnerId === ownerId) return;
  stopSupabaseSync();
  activeOwnerId = ownerId;

  const initial = useStore.getState();
  // Device-local, not part of loadOrSeedRemoteState's profile shape — push it
  // once up front so a token registered before sign-in still reaches push_tokens.
  if (initial.pushToken) repository.savePushTokenRemote(ownerId, initial.pushToken, null);

  repository
    .loadOrSeedRemoteState(
      {
        user: initial.user,
        settings: initial.settings,
        connections: initial.connections,
        nudges: initial.nudges,
        pendingConnections: initial.pendingConnections,
        incomingRequests: initial.incomingRequests,
        outgoingRequests: initial.outgoingRequests,
        onboarded: initial.onboarded,
      },
      ownerId,
    )
    .then((remote) => {
      if (activeOwnerId !== ownerId || !remote) return;
      useStore.setState({
        user: { ...remote.user, profileCompletion: computeCompletion(remote.user) },
        settings: remote.settings,
        connections: remote.connections,
        nudges: remote.nudges,
        pendingConnections: remote.pendingConnections,
        incomingRequests: remote.incomingRequests,
        outgoingRequests: remote.outgoingRequests,
        onboarded: remote.onboarded ?? initial.onboarded,
      });
    })
    .catch((error) => console.warn('[supabase] initial hydrate failed, staying on local data', error));

  syncUnsubscribe = useStore.subscribe((state, prev) => {
    if (activeOwnerId !== ownerId) return;
    if (state.user !== prev.user || state.settings !== prev.settings) {
      repository.saveProfile(state.user, state.settings);
    }
    if (state.connections !== prev.connections) {
      // Push only the connection(s) whose object identity actually changed —
      // setCadence/setConnectionType/archiveConnection/unarchiveConnection
      // all `.map()` in place, so untouched connections keep their prior
      // reference. Pushing the whole list here would fire one remote update
      // per connection for every single-connection edit.
      const prevById = new Map(prev.connections.map((c) => [c.id, c]));
      for (const c of state.connections) {
        if (prevById.get(c.id) !== c) repository.updateConnectionMember(ownerId, c);
      }
    }
    if (state.pendingConnections !== prev.pendingConnections) {
      const added = state.pendingConnections.filter((p) => !prev.pendingConnections.some((pp) => pp.id === p.id));
      const removed = prev.pendingConnections.filter((p) => !state.pendingConnections.some((cp) => cp.id === p.id));
      for (const p of added) repository.createPendingInviteRemote(ownerId, p);
      for (const p of removed) repository.deletePendingInviteRemote(p.id);
    }
    if (state.pushToken !== prev.pushToken) {
      repository.savePushTokenRemote(ownerId, state.pushToken, prev.pushToken);
    }
  });
}

export function stopSupabaseSync() {
  syncUnsubscribe?.();
  syncUnsubscribe = null;
  activeOwnerId = null;
}

/** Stable helper used across screens: is a connection's next nudge due today? */
export function isDue(nextNudge: string | null): boolean {
  if (!nextNudge) return false;
  return new Date(nextNudge) <= new Date();
}

export { genId, todayISO };
export type { HandleSource };
