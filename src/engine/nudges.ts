/**
 * Nudge helpers (Spec §5D, §8 V1.5).
 *
 * - generateEventNudges: when a connection adds something the user shares, emit
 *   an event-based nudge ("Sarah just added Photography — you too").
 * - nudgeCopy: nudge language adapts to the connection type.
 */
import { Connection, Nudge, User } from '../data/types';
import type { ConnectionType } from '../data/types';

/** All self-reported items a user "has", lowercased, for shared-item checks. */
function userItemSet(u: User): Set<string> {
  return new Set(
    [
      ...(u.hobbies ?? []),
      ...(u.topHobbies ?? []),
      ...(u.bucketList ?? []),
      ...(u.certifications ?? []),
    ].map((x) => x.toLowerCase()),
  );
}

/**
 * Build event nudges from connections' `recentlyAdded` items that the user also
 * has. Deterministic ids so they de-duplicate across regenerations.
 */
export function generateEventNudges(user: User, connections: Connection[]): Nudge[] {
  const mine = userItemSet(user);
  const today = new Date().toISOString().slice(0, 10);
  const nudges: Nudge[] = [];
  for (const c of connections) {
    const first = c.user.name.split(' ')[0];
    for (const item of c.user.recentlyAdded ?? []) {
      if (!mine.has(item.toLowerCase())) continue;
      nudges.push({
        id: `evt-${c.id}-${item.toLowerCase().replace(/\s+/g, '-')}`,
        connectionId: c.id,
        trigger: 'event',
        message: `${first} just added ${item} — you’re into that too.`,
        scheduledDate: today,
        response: null,
        due: true,
      });
    }
  }
  return nudges;
}

/** Connection-type-aware nudge copy for time-based reminders (§8 V1.5). */
export function nudgeCopy(type: ConnectionType, name: string): string {
  const first = name.split(' ')[0];
  switch (type) {
    case 'professional':
      return `Keep it warm — follow up with ${first}.`;
    case 'romantic':
      return `Thinking of ${first}? Send them a message.`;
    case 'acquaintance':
      return `Reconnect with ${first} when you get a chance.`;
    default:
      return `It’s been a while — reach out to ${first}.`;
  }
}
