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
  NudgeCadence,
  NudgeResponse,
  OutgoingRequest,
  PendingConnection,
  User,
} from '../data/types';
import {
  connections as mockConnections,
  currentUser,
  directory,
  incomingRequestsSeed,
  nudges as mockNudges,
  searchIgnorers,
} from '../data/mock';
import { simulatePull } from '../data/datapull';
import { generateEventNudges } from '../engine/nudges';
import { palette } from '../theme/colors';

/** Result of sending a connect request (Search — Spec §5B Method 3). */
export type RequestOutcome =
  | { outcome: 'accepted'; connectionId: string }
  | { outcome: 'ignored' | 'blocked' | 'already' | 'notfound' };

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
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  /** V1.5: connect a platform and pull (simulated) its signals onto the profile. */
  connectDataPull: (source: DataPullSource) => void;

  // --- Connect flows (Spec §5B/§5C) ---
  /** Send a connect request to a directory person; resolves by disposition. */
  sendConnectRequest: (personId: string, note?: string) => RequestOutcome;
  /** Accept an incoming request → becomes a connection. Returns its id. */
  acceptIncoming: (requestId: string) => string | undefined;
  /** Ignore an incoming request. */
  ignoreIncoming: (requestId: string) => void;
  /** Create an SMS invite (pending, 30-day expiry). Returns the pending id. */
  createPendingInvite: (name: string, phone: string) => string;
  /** Claim a pending invite → confirmed connection. Returns the connection id. */
  claimPending: (pendingId: string) => string | undefined;
  /** Cancel a pending invite. */
  cancelPending: (pendingId: string) => void;

  // --- Settings ---
  /** Merge a settings patch (privacy / notifications / defaults). */
  updateSettings: (patch: Partial<Settings>) => void;
  /** Reset all app data back to the seed state (mock sign-out). */
  resetApp: () => void;
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

      logOutreach: (connectionId, via, note) =>
        set((s) => {
          const today = todayISO();
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
        }),

      respondToNudge: (nudgeId, response) => {
        const nudge = get().nudges.find((n) => n.id === nudgeId);
        if (response === 'reached_out' && nudge) {
          // Logging outreach also resolves the nudge.
          get().logOutreach(nudge.connectionId, 'imessage');
          return;
        }
        set((s) => ({
          nudges: s.nudges.map((n) =>
            n.id === nudgeId ? { ...n, response, due: false } : n,
          ),
        }));
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

      connectDataPull: (source) =>
        set((s) => {
          const pulled = { ...s.user.pulled, ...simulatePull(source) };
          const handles = s.user.handles.some((h) => h.source === source)
            ? s.user.handles.map((h) =>
                h.source === source ? { ...h, dataPulled: true } : h,
              )
            : [...s.user.handles, { source, value: '', dataPulled: true }];
          const user = { ...s.user, pulled, handles };
          user.profileCompletion = computeCompletion(user);
          return { user };
        }),

      sendConnectRequest: (personId, note) => {
        const s = get();
        if (s.connections.some((c) => c.id === personId)) return { outcome: 'already' };
        const person = directory.find((d) => d.id === personId);
        if (!person) return { outcome: 'notfound' };
        const existing = s.outgoingRequests.find((r) => r.personId === personId);
        if (existing?.status === 'blocked') return { outcome: 'blocked' };

        // Mock disposition: ignorers reject; everyone else accepts (§5B Method 3).
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
          metContext: note ? `Connected via search · “${note}”` : 'Connected via search',
          nudgeCadence: s.settings.defaultCadence,
        };
        set((st) => ({
          connections: [connection, ...st.connections],
          outgoingRequests: st.outgoingRequests.filter((r) => r.personId !== personId),
        }));
        return { outcome: 'accepted', connectionId: personId };
      },

      acceptIncoming: (requestId) => {
        const req = get().incomingRequests.find((r) => r.id === requestId);
        if (!req) return undefined;
        get().addConnection(req.connection);
        set((s) => ({ incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId) }));
        return req.connection.id;
      },

      ignoreIncoming: (requestId) =>
        set((s) => ({ incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId) })),

      createPendingInvite: (name, phone) => {
        const id = genId();
        const today = todayISO();
        const pending: PendingConnection = {
          id,
          phone,
          name,
          createdAt: today,
          expiresAt: addDaysISO(today, 30),
          method: 'sms',
        };
        set((s) => ({ pendingConnections: [pending, ...s.pendingConnections] }));
        return id;
      },

      claimPending: (pendingId) => {
        const pending = get().pendingConnections.find((p) => p.id === pendingId);
        if (!pending) return undefined;
        const id = `claimed-${pendingId}`;
        const connection: Connection = {
          id,
          user: {
            id,
            name: pending.name ?? pending.phone,
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
          metContext: 'Joined from your invite',
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
          onboarded: true,
        }),
    }),
    {
      // Bumped to v5 for settings.
      name: 'knowable-store-v5',
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
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/** Stable helper used across screens: is a connection's next nudge due today? */
export function isDue(nextNudge: string | null): boolean {
  if (!nextNudge) return false;
  return new Date(nextNudge) <= new Date();
}

export { genId, todayISO };
export type { HandleSource };
