/**
 * V1.5 light data pull — simulated (Spec §6 / §8 Integrations).
 *
 * Real pulls require each platform's OAuth + API; here we return canned, but
 * realistic, signals so the commonality engine and UI can be built and demoed
 * now. The function shape matches what a real adapter would return, so swapping
 * in live APIs later is a drop-in replacement.
 */
import { DataPullSource, PulledData } from './types';

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
