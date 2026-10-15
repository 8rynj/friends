/**
 * Social graph helpers (V2) — computing mutual friends from real connection
 * edges instead of a hand-authored list (Spec §8).
 */
import { Connection } from '../data/types';

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
