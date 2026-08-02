/**
 * Spotify adapter (Spec §6/§8 Integrations) — real Authorization Code + PKCE
 * OAuth against Spotify's Web API, on the shared OAuth infra in
 * `src/data/oauth/`. Public-client PKCE needs only a Client ID (no secret to
 * ship in the app) — see `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` in `.env.example`.
 * `isSpotifyConfigured` is false without it, and `runDataPull` (datapull.ts)
 * falls back to the simulated pull, same opt-in-via-env-var shape as
 * Supabase/PostHog/Sentry elsewhere in this app.
 *
 * Tokens are persisted via `src/data/oauth/tokenStore.ts` (Keychain/Keystore
 * on native) so a reconnect only re-prompts once the refresh token itself
 * expires or is revoked.
 */
import { PulledData } from '../types';
import { authorize, refresh, OAuthError, OAuthProviderConfig } from '../oauth/authorizationCode';
import { loadTokens, saveTokens } from '../oauth/tokenStore';

export class SpotifyError extends Error {}

export const isSpotifyConfigured = !!process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;

const SPOTIFY_CONFIG: OAuthProviderConfig = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '',
  scopes: ['user-top-read'],
  redirectPath: 'spotify-auth-callback',
};

/** A valid access token — reuses a stored one, refreshes it, or runs a fresh browser authorize. */
async function getAccessToken(): Promise<string> {
  const stored = await loadTokens('spotify');
  if (stored && stored.expiresAt > Date.now() + 60_000) {
    return stored.accessToken;
  }
  if (stored?.refreshToken) {
    try {
      const refreshed = await refresh(SPOTIFY_CONFIG, stored.refreshToken);
      const tokens = { ...refreshed, refreshToken: refreshed.refreshToken ?? stored.refreshToken };
      await saveTokens('spotify', tokens);
      return tokens.accessToken;
    } catch {
      // Refresh token expired/revoked — fall through to a fresh authorize below.
    }
  }
  const tokens = await authorize(SPOTIFY_CONFIG);
  await saveTokens('spotify', tokens);
  return tokens.accessToken;
}

/** Pulls this user's top artists/genres from Spotify, authorizing first if needed. */
export async function pullSpotify(): Promise<PulledData> {
  if (!isSpotifyConfigured) {
    throw new SpotifyError('Spotify isn’t configured yet.');
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    throw new SpotifyError(err instanceof OAuthError ? err.message : 'Could not connect to Spotify — try again.');
  }

  let res: Response;
  try {
    res = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new SpotifyError('Could not reach Spotify — check your connection and try again.');
  }
  if (!res.ok) {
    throw new SpotifyError('Spotify is unreachable right now — try again later.');
  }

  const json = await res.json();
  const items: { name: string; genres: string[] }[] = json.items ?? [];
  if (items.length === 0) {
    throw new SpotifyError('No top artists yet — listen on Spotify a bit more, then try again.');
  }

  const topArtists = items.slice(0, 4).map((a) => a.name);

  const genreCounts = new Map<string, number>();
  for (const artist of items) {
    for (const genre of artist.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre.charAt(0).toUpperCase() + genre.slice(1));

  return { spotify: { topArtists, topGenres } };
}
