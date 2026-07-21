/**
 * Push payload builders — one per server-driven push kind (nudge / connection
 * / new-commonality). Used by the backend send function (`server/sendPush.ts`)
 * so copy stays consistent with the in-app nudge language in
 * `src/engine/nudges.ts`.
 */
import { ConnectionType } from '../data/types';
import { nudgeCopy } from '../engine/nudges';
import { PushPayload } from './types';

export function nudgePush(
  connectionId: string,
  nudgeId: string,
  name: string,
  type: ConnectionType,
): PushPayload {
  return {
    title: 'Time to reconnect',
    body: nudgeCopy(type, name),
    data: { kind: 'nudge', connectionId, nudgeId },
  };
}

export function connectionPush(connectionId: string, name: string): PushPayload {
  const first = name.split(' ')[0];
  return {
    title: 'New connection',
    body: `You and ${first} are connected on Knowable.`,
    data: { kind: 'connection', connectionId },
  };
}

export function commonalityPush(connectionId: string, name: string, item: string): PushPayload {
  const first = name.split(' ')[0];
  return {
    title: 'New thing in common',
    body: `${first} just added ${item} — you’re into that too.`,
    data: { kind: 'commonality', connectionId },
  };
}
