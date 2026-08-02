/**
 * Strava adapter (Spec §6/§8 Integrations, ROADMAP 3B) — real Authorization
 * Code OAuth against Strava's v3 API, on the shared OAuth infra in
 * `src/data/oauth/`.
 *
 * Unlike Spotify, Strava's `/oauth/token` endpoint requires `client_secret`
 * on every code exchange and refresh — it has no PKCE-only public-client
 * option (see `OAuthProviderConfig.clientSecret`). So this needs both
 * `EXPO_PUBLIC_STRAVA_CLIENT_ID` and `EXPO_PUBLIC_STRAVA_CLIENT_SECRET` — see
 * `.env.example`. `isStravaConfigured` is false without both, and
 * `runDataPull` (datapull.ts) falls back to the simulated pull, same
 * opt-in-via-env-var shape as every other integration in this app.
 *
 * Tokens are persisted via `src/data/oauth/tokenStore.ts` (Keychain/Keystore
 * on native) so a reconnect only re-prompts once the refresh token itself
 * expires or is revoked.
 */
import { PulledData } from '../types';
import { authorize, refresh, OAuthError, OAuthProviderConfig } from '../oauth/authorizationCode';
import { loadTokens, saveTokens } from '../oauth/tokenStore';

export class StravaError extends Error {}

export const isStravaConfigured =
  !!process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID && !!process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET;

const STRAVA_CONFIG: OAuthProviderConfig = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
  clientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '',
  clientSecret: process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET,
  scopes: ['activity:read'],
  redirectPath: 'strava-auth-callback',
};

/** Strava's `type`/`sport_type` values, humanized for the commonality engine + UI. */
const ACTIVITY_LABELS: Record<string, string> = {
  Run: 'Running',
  TrailRun: 'Trail running',
  Ride: 'Road cycling',
  MountainBikeRide: 'Mountain biking',
  GravelRide: 'Gravel cycling',
  VirtualRide: 'Indoor cycling',
  Hike: 'Hiking',
  Walk: 'Walking',
  Swim: 'Swimming',
  Yoga: 'Yoga',
  WeightTraining: 'Weight training',
  Workout: 'Strength training',
  Rowing: 'Rowing',
  AlpineSki: 'Skiing',
  NordicSki: 'Cross-country skiing',
  Snowboard: 'Snowboarding',
  Surfing: 'Surfing',
  RockClimbing: 'Climbing',
  Golf: 'Golf',
};

function humanizeActivityType(raw: string): string {
  if (ACTIVITY_LABELS[raw]) return ACTIVITY_LABELS[raw];
  // Fallback: split PascalCase ("StandUpPaddling" -> "Stand up paddling").
  return raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/** A valid access token — reuses a stored one, refreshes it, or runs a fresh browser authorize. */
async function getAccessToken(): Promise<string> {
  const stored = await loadTokens('strava');
  if (stored && stored.expiresAt > Date.now() + 60_000) {
    return stored.accessToken;
  }
  if (stored?.refreshToken) {
    try {
      const refreshed = await refresh(STRAVA_CONFIG, stored.refreshToken);
      const tokens = { ...refreshed, refreshToken: refreshed.refreshToken ?? stored.refreshToken };
      await saveTokens('strava', tokens);
      return tokens.accessToken;
    } catch {
      // Refresh token expired/revoked — fall through to a fresh authorize below.
    }
  }
  const tokens = await authorize(STRAVA_CONFIG);
  await saveTokens('strava', tokens);
  return tokens.accessToken;
}

/** Pulls this user's recent activity types from Strava, authorizing first if needed. */
export async function pullStrava(): Promise<PulledData> {
  if (!isStravaConfigured) {
    throw new StravaError('Strava isn’t configured yet.');
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    throw new StravaError(err instanceof OAuthError ? err.message : 'Could not connect to Strava — try again.');
  }

  let res: Response;
  try {
    res = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new StravaError('Could not reach Strava — check your connection and try again.');
  }
  if (!res.ok) {
    throw new StravaError('Strava is unreachable right now — try again later.');
  }

  const json: { sport_type?: string; type?: string }[] = await res.json();
  if (json.length === 0) {
    throw new StravaError('No recent activities yet — log one on Strava, then try again.');
  }

  const counts = new Map<string, number>();
  for (const activity of json) {
    const raw = activity.sport_type ?? activity.type;
    if (!raw) continue;
    const label = humanizeActivityType(raw);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const activities = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);

  return { strava: { activities } };
}
