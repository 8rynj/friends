/**
 * Knowable data model — mirrors Spec Sheet §8 "Data Model — Key Entities".
 *
 * These types are shaped now to accommodate later backend/auth/NFC work without
 * a painful retrofit. In particular `connectionType` is modeled in V1 even
 * though the feature ships in V1.5 — the spec explicitly warns against
 * retrofitting it later (§8, Known Risks).
 *
 * This first build is mock-data only; nothing here is persisted yet.
 */

/** The 18 V1 handle-sharing platforms (Spec §4 / §8 Integrations). */
export type HandleSource =
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'spotify'
  | 'letterboxd'
  | 'facebook'
  | 'twitter'
  | 'tiktok'
  | 'goodreads'
  | 'strava'
  | 'duolingo'
  | 'chesscom'
  | 'yelp'
  | 'opentable'
  | 'polarsteps'
  | 'meetup'
  | 'bandsintown'
  | 'steam';

export interface Handle {
  source: HandleSource;
  /** The user-visible handle, e.g. "@bryn". */
  value: string;
  /** Whether this handle is shared with a given connection (asymmetrical, §5B). */
  shared?: boolean;
  /** V1.5: light data pull connected for this platform (Spec §6 / §8). */
  dataPulled?: boolean;
}

/** Platforms that support V1.5 light data pull (Spec §6 / §8 Integrations). */
export type DataPullSource =
  | 'spotify'
  | 'letterboxd'
  | 'goodreads'
  | 'strava'
  | 'bandsintown'
  | 'polarsteps'
  | 'linkedin';

/**
 * V1.5 light-data-pull results stored on a profile. In production these come
 * from each platform's API; here they're simulated, but the shape is the same
 * so the engine and UI don't change when real pulls land.
 */
export interface PulledData {
  spotify?: { topArtists: string[]; topGenres: string[] };
  letterboxd?: { favorites: string[] };
  goodreads?: { favorites: string[]; reading: string[] };
  strava?: { activities: string[] };
  bandsintown?: { artists: string[] };
  polarsteps?: { places: string[] };
  linkedin?: { title?: string; company?: string; industry?: string };
}

/**
 * Connection type (V1.5 feature, V1 data model). Filters icebreakers, contact
 * sharing, and nudge language.
 */
export type ConnectionType =
  | 'friend'
  | 'professional'
  | 'acquaintance'
  | 'romantic';

/** How a connection was first captured (Spec §5B). */
export type ConnectionMethod = 'nfc' | 'sms' | 'search';

/** A single shared point of common ground surfaced as an icebreaker (§3, §5B). */
export interface Commonality {
  id: string;
  /** Short category label shown as an eyebrow, e.g. "MUSIC", "TRAVEL". */
  category: string;
  /** The shared thing, e.g. "Both into Phoebe Bridgers". */
  title: string;
  /** Optional supporting detail / conversation starter. */
  detail?: string;
  /** Optional source the commonality was derived from (V1.5 data pull). */
  source?: HandleSource;
}

/** User profile (Spec §8). */
export interface User {
  id: string;
  name: string;
  /** Optional photo URI; when absent we render initials on a brand-color avatar. */
  photo?: string;
  /** Avatar background when no photo — a brand color, never gray (§5). */
  avatarColor?: string;
  interests: string[];
  hobbies: string[];
  /** The current top 5 (subset of hobbies); weighted highest by the engine. */
  topHobbies: string[];
  bucketList: string[];
  /** Certifications & skills (e.g. "Personal Trainer (CPT)"). */
  certifications: string[];
  travel: string[];
  lifeExperiences: string[];
  handles: Handle[];
  /** V1.5: simulated light-data-pull signals, keyed by platform. */
  pulled?: PulledData;
  /** V1.5: items recently added to this profile (drives new-commonality nudges). */
  recentlyAdded?: string[];
  /** 0–100, drives the onboarding/home completion indicator (§5A). */
  profileCompletion: number;
}

/** Nudge trigger type (Spec §5D, §8). */
export type NudgeTrigger = 'time' | 'event';

/** Logged response to a "did you reach out?" prompt (§5D). */
export type NudgeResponse = 'reached_out' | 'not_yet' | null;

export interface Nudge {
  id: string;
  connectionId: string;
  trigger: NudgeTrigger;
  /** Human-readable nudge copy, e.g. "Sarah just added she's into ceramics". */
  message: string;
  scheduledDate: string; // ISO date
  response: NudgeResponse;
  /** "due" nudges render with the orange due treatment (§ Pills). */
  due: boolean;
}

/** A single confirmed-outreach entry in a connection's contact history (§5D). */
export interface ContactLogEntry {
  id: string;
  date: string; // ISO date
  /** Which platform the outreach happened on. */
  via: HandleSource | 'imessage' | 'phone';
  note?: string;
}

/** Per-connection nudge cadence (§5D Ongoing Management). */
export type NudgeCadence = 'weekly' | 'monthly' | 'quarterly' | 'never';

/** A confirmed connection (Spec §8). */
export interface Connection {
  id: string;
  user: User;
  method: ConnectionMethod;
  connectionType: ConnectionType;
  /** Where/when first met — free text for now (event/location context is V2). */
  metContext?: string;
  /** V1.5: mutual connections, surfaced on the profile (names for now). */
  mutuals?: string[];
  /** Contact info this user has chosen to share back (asymmetrical, §5B). */
  sharedContactInfo: HandleSource[];
  /**
   * Optional seed commonalities. Screens compute these dynamically from the two
   * profiles via the commonality engine, so this is no longer the source of truth.
   */
  commonalities?: Commonality[];
  nudgeCadence: NudgeCadence;
  /** ISO date of last confirmed outreach, or null if never. */
  lastContacted: string | null;
  /** ISO date of the next scheduled nudge. */
  nextNudge: string | null;
  contactHistory: ContactLogEntry[];
  /**
   * "Not interested" — user archived this connection (V2). Hidden from Home
   * and the default People list, excluded from nudges/due counts, but kept
   * (not deleted) and reversible from the Archived view.
   */
  archived?: boolean;
}

/** Pending connection tied to a phone number, 30-day expiry (Spec §5C, §8). */
export interface PendingConnection {
  id: string;
  phone: string;
  name?: string;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date (createdAt + 30 days)
  method: ConnectionMethod;
}

/** Lifecycle of an outgoing connect request (Search — Spec §5B Method 3). */
export type RequestStatus = 'pending' | 'ignored' | 'blocked' | 'accepted';

/**
 * An outgoing connect request to a discoverable person. After 3 ignores the
 * status becomes 'blocked' — pending indefinitely, no further requests (§5B).
 */
export interface OutgoingRequest {
  id: string;
  personId: string;
  note?: string;
  attempts: number;
  status: RequestStatus;
}

/** An incoming connect request the user can accept or ignore (§5B Method 3). */
export interface IncomingRequest {
  id: string;
  connection: Connection;
  note?: string;
}
