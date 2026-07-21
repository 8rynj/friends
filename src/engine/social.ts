/**
 * Social graph helpers (V2) — formatting the structured "where you met"
 * context and computing mutual friends from real connection edges instead of
 * a hand-authored list (Spec §8).
 */
import { Connection, MetContext } from '../data/types';

/** Renders a structured met-context as a short display string, e.g. "Saturday group ride · Trail running club". */
export function formatMetContext(mc?: MetContext): string | undefined {
  if (!mc) return undefined;
  const parts = [mc.event, mc.location].filter((p): p is string => !!p?.trim());
  return parts.length ? parts.join(' · ') : undefined;
}

/** A mutual connection surfaced on a profile. */
export interface Mutual {
  id: string;
  name: string;
}

/**
 * Mutual friends between the signed-in user and a connection: people who are
 * both in my connection list and in the target's own connection graph
 * (`user.connectionIds`). Checked in both directions since either side's mock
 * data may record the edge.
 */
export function computeMutuals(myConnections: Connection[], target: Connection): Mutual[] {
  const targetKnows = new Set(target.user.connectionIds ?? []);
  return myConnections
    .filter((c) => c.id !== target.id)
    .filter(
      (c) =>
        targetKnows.has(c.user.id) || (c.user.connectionIds ?? []).includes(target.user.id),
    )
    .map((c) => ({ id: c.user.id, name: c.user.name }));
}
