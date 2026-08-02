/**
 * V1.5 light data pull (Spec §6 / §8 Integrations).
 *
 * `simulatePull` returns canned, realistic signals so the commonality engine
 * and UI can be built and demoed without live platform access — used as the
 * dev fallback for every source, and still the only path for sources without
 * a real adapter yet. `runDataPull` is what screens should call: it routes to
 * a real adapter when one exists (Letterboxd always; Spotify once
 * `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` is set; Strava once
 * `EXPO_PUBLIC_STRAVA_CLIENT_ID`/`EXPO_PUBLIC_STRAVA_CLIENT_SECRET` are set —
 * see `.env.example`), otherwise it falls back to `simulatePull`. Every path
 * returns the same PulledData shape, so the engine/UI never need to know
 * which one ran.
 */
import { DataPullSource, PulledData } from './types';
import { pullLetterboxd, LetterboxdError } from './adapters/letterboxd';
import { pullSpotify, SpotifyError, isSpotifyConfigured } from './adapters/spotify';
import { pullStrava, StravaError, isStravaConfigured } from './adapters/strava';

export { LetterboxdError, SpotifyError, isSpotifyConfigured, StravaError, isStravaConfigured };

/** Platforms that support light data pull, in display order. */
export const DATA_PULL_SOURCES: DataPullSource[] = [
  'spotify',
  'letterboxd',
  'goodreads',
  'strava',
  'bandsintown',
  'polarsteps',
  'linkedin',
];

/** Human label for what each pull surfaces (shown in the connect UI). */
export const dataPullBlurb: Record<DataPullSource, string> = {
  spotify: 'Top artists & genres',
  letterboxd: 'Recent films & favorites',
  goodreads: 'Currently reading & favorites',
  strava: 'Activities & routes',
  bandsintown: 'Upcoming shows & artists',
  polarsteps: 'Places visited',
  linkedin: 'Professional context',
};

/**
 * Simulated pull for the signed-in user when they connect a platform in-app.
 * Canned so it overlaps with the seeded connections for a good demo.
 */
export function simulatePull(source: DataPullSource): PulledData {
  switch (source) {
    case 'spotify':
      return {
        spotify: {
          topArtists: ['Phoebe Bridgers', 'Khruangbin', 'Fleet Foxes', 'Sufjan Stevens'],
          topGenres: ['Indie folk', 'Indie rock'],
        },
      };
    case 'letterboxd':
      return { letterboxd: { favorites: ['Perfect Days', 'Past Lives', 'Aftersun'] } };
    case 'goodreads':
      return {
        goodreads: {
          favorites: ['Tomorrow, and Tomorrow, and Tomorrow'],
          reading: ['The Overstory'],
        },
      };
    case 'strava':
      return { strava: { activities: ['Trail running', 'Road cycling'] } };
    case 'bandsintown':
      return { bandsintown: { artists: ['Phoebe Bridgers', 'Khruangbin'] } };
    case 'polarsteps':
      return { polarsteps: { places: ['Lisbon', 'Tokyo', 'Mexico City'] } };
    case 'linkedin':
      return { linkedin: { title: 'Product Designer', company: 'Aperture', industry: 'Design' } };
  }
}

/** Per-source input a real adapter needs to run (e.g. a public username). */
export interface DataPullInput {
  username?: string;
}

/**
 * Runs a real pull when a source has a live adapter and the required input
 * was supplied; otherwise falls back to `simulatePull`. Throws for a real
 * adapter's own errors (e.g. profile not found) rather than silently
 * substituting fake data under the user's real identity.
 */
export async function runDataPull(source: DataPullSource, input?: DataPullInput): Promise<PulledData> {
  if (source === 'letterboxd' && input?.username?.trim()) {
    return pullLetterboxd(input.username);
  }
  if (source === 'spotify' && isSpotifyConfigured) {
    return pullSpotify();
  }
  if (source === 'strava' && isStravaConfigured) {
    return pullStrava();
  }
  return simulatePull(source);
}
