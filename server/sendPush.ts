/**
 * Server-driven push send function (Spec §8, Not built yet: push
 * notifications). This is the function a backend calls once it has a
 * recipient's Expo push token (from `src/notifications/pushToken.ts`) and has
 * checked their stored notification settings (§Notifications — the caller's
 * job, since settings live server-side once the backend (#4) and auth (#5)
 * land). Talks directly to Expo's push service over HTTP, so it runs
 * anywhere — serverless function, cron job, request handler — without an
 * SDK dependency.
 */
import { commonalityPush, connectionPush, crushMatchPush, nudgePush } from '../src/notifications/copy';
import type { ConnectionType } from '../src/data/types';
import type { PushData, PushKind, PushPayload } from '../src/notifications/types';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_REQUEST = 100;

/** Android channel per push kind, matching the notification channels set up on-device (pushToken.ts). */
function channelIdForKind(kind: PushKind): string {
  switch (kind) {
    case 'nudge':
      return 'nudges';
    case 'commonality':
      return 'commonalities';
    default:
      return 'default';
  }
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: PushData;
  sound?: 'default';
  channelId?: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Low-level: POST a batch of messages to Expo's push service, chunked to its 100-per-request limit. */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = [];
  for (const batch of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      throw new Error(`Expo push service responded ${res.status}`);
    }
    const json = await res.json();
    tickets.push(...(json.data ?? []));
  }
  return tickets;
}

/** Send one payload to a set of recipient device tokens (skips anything that isn't an Expo push token). */
export function sendPushNotification(tokens: string[], payload: PushPayload): Promise<ExpoPushTicket[]> {
  const messages: ExpoPushMessage[] = tokens
    .filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'))
    .map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      channelId: channelIdForKind(payload.data.kind),
    }));
  return sendExpoPush(messages);
}

/** Time-based or event-based nudge reminder (§5D). Gate on the recipient's `pushNudges` setting. */
export function sendNudgePush(
  tokens: string[],
  connectionId: string,
  nudgeId: string,
  connectionName: string,
  connectionType: ConnectionType,
) {
  return sendPushNotification(tokens, nudgePush(connectionId, nudgeId, connectionName, connectionType));
}

/** A connect request was accepted / an invite was claimed (§5B, §5C). Not settings-gated in-app. */
export function sendConnectionPush(tokens: string[], connectionId: string, connectionName: string) {
  return sendPushNotification(tokens, connectionPush(connectionId, connectionName));
}

/** A connection added something the recipient also has (§6 V1.5). Gate on the recipient's `pushUpdates` setting. */
export function sendCommonalityPush(tokens: string[], connectionId: string, connectionName: string, item: string) {
  return sendPushNotification(tokens, commonalityPush(connectionId, connectionName, item));
}

/** Crush mechanic mutual match (V2). Not settings-gated — sent to both sides only once both have opted in. */
export function sendCrushMatchPush(tokens: string[], connectionId: string, connectionName: string) {
  return sendPushNotification(tokens, crushMatchPush(connectionId, connectionName));
}
