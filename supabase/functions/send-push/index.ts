// Knowable — send-push edge function (2B).
//
// Called by Postgres (supabase/migrations/0004_push_notifications.sql's
// `_dispatch_push`, via pg_net, fire-and-forget) for the server-driven push
// kinds: 'nudge' (§5D), 'connection' (§5B/§5C), 'commonality' (§6 V1.5), and
// 'crush_match' (0005_crush.sql's `toggle_crush`, V2 — dispatched to BOTH
// sides only once both have opted in, never on a one-sided crush).
// Looks up the recipient's settings + device tokens with the service role
// key, builds the payload, and posts to Expo's push API.
//
// This is a self-contained Deno mirror of src/notifications/types.ts,
// src/notifications/copy.ts, and server/sendPush.ts's payload-building
// logic — Edge Functions run in an isolated Deno bundle and can't import the
// RN app's TS tree directly, so if nudge/connection/commonality copy changes
// there, mirror the change here too.
//
// Deploy: `npx supabase functions deploy send-push` (needs a live project —
// see CLAUDE.md "Push notifications (server-driven)"). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided automatically by the Edge Functions
// runtime; nothing to configure for those two.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

type PushKind = 'nudge' | 'connection' | 'commonality' | 'crush_match';

interface DispatchPayload {
  kind: PushKind;
  connectionId: string;
  recipientId: string;
  nudgeId?: string;
  item?: string;
}

/** Mirrors src/engine/nudges.ts's nudgeCopy. */
function nudgeCopy(type: string, name: string): string {
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

/** Mirrors src/notifications/pushToken.ts's CHANNELS (Android notification channel ids). */
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  if (req.headers.get('Authorization') !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response('unauthorized', { status: 401 });
  }

  let payload: DispatchPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }
  if (!payload?.kind || !payload.connectionId || !payload.recipientId) {
    return new Response('missing kind/connectionId/recipientId', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: recipient } = await supabase
    .from('profiles')
    .select('push_nudges, push_updates')
    .eq('id', payload.recipientId)
    .single();
  if (!recipient) return new Response('recipient not found', { status: 404 });

  // Gating matches server/sendPush.ts's doc comments: nudge → pushNudges,
  // commonality → pushUpdates, connection/crush_match → not settings-gated
  // in-app (both are rare, explicitly opted-in-to events, not spam).
  if (payload.kind === 'nudge' && !recipient.push_nudges) return new Response('gated', { status: 200 });
  if (payload.kind === 'commonality' && !recipient.push_updates) return new Response('gated', { status: 200 });

  const { data: member } = await supabase
    .from('connection_members')
    .select('connection_type, other_id')
    .eq('connection_id', payload.connectionId)
    .eq('user_id', payload.recipientId)
    .single();
  if (!member) return new Response('connection not found for recipient', { status: 404 });

  const { data: other } = await supabase.from('profiles').select('name').eq('id', member.other_id).single();
  const otherName = other?.name || 'your connection';
  const first = otherName.split(' ')[0];

  let title: string;
  let body: string;
  switch (payload.kind) {
    case 'nudge':
      title = 'Time to reconnect';
      body = nudgeCopy(member.connection_type, otherName);
      break;
    case 'connection':
      title = 'New connection';
      body = `You and ${first} are connected on Knowable.`;
      break;
    case 'commonality':
      title = 'New thing in common';
      body = `${first} just added ${payload.item ?? 'something'} — you’re into that too.`;
      break;
    case 'crush_match':
      title = 'It’s a match';
      body = `You and ${first} both said yes.`;
      break;
  }

  const { data: tokenRows } = await supabase.from('push_tokens').select('token').eq('owner_id', payload.recipientId);
  const messages = (tokenRows ?? [])
    .map((r) => r.token as string)
    .filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'))
    .map((to) => ({
      to,
      title,
      body,
      data: { kind: payload.kind, connectionId: payload.connectionId, nudgeId: payload.nudgeId },
      sound: 'default' as const,
      channelId: channelIdForKind(payload.kind),
    }));
  if (messages.length === 0) return new Response('no device tokens', { status: 200 });

  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const json = await res.json();
  return new Response(JSON.stringify(json), {
    status: res.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
});
