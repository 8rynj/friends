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
  NudgeCadence,
  NudgeResponse,
  User,
} from '../data/types';
import { connections as mockConnections, currentUser, nudges as mockNudges } from '../data/mock';
import { simulatePull } from '../data/datapull';
import { generateEventNudges } from '../engine/nudges';

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

interface AppState {
  hasHydrated: boolean;
  onboarded: boolean;
  user: User;
  connections: Connection[];
  nudges: import('../data/types').Nudge[];

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
    }),
    {
      // Bumped to v3 for V1.5 fields (pulled data, mutuals, recentlyAdded).
      name: 'knowable-store-v3',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        user: s.user,
        connections: s.connections,
        nudges: s.nudges,
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
