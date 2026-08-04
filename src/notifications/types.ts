/**
 * Push payload shape shared by the client (registration, receiving,
 * deep-linking — this folder) and the backend send function
 * (`server/sendPush.ts`). One place both sides agree on `kind` and the data a
 * tap needs to resolve a deep link, so a push always lands on the connection
 * profile it's about (§8, Not built yet: push notifications).
 */

/** The server-driven push events (Spec §5D nudges, §5B connections, §6 V1.5 commonalities, V2 crush matches). */
export type PushKind = 'nudge' | 'connection' | 'commonality' | 'crush_match';

export interface PushData {
  kind: PushKind;
  connectionId: string;
  nudgeId?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  data: PushData;
}
