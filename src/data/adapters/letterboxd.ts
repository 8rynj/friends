/**
 * Letterboxd adapter — unofficial (Spec §6/§8).
 *
 * Letterboxd's real API is not self-serve; access is granted by application
 * only, so there's no client-side OAuth flow to build against it today.
 * Instead this reads a member's PUBLIC RSS diary feed (no auth required) and
 * returns the same PulledData shape simulatePull produces, so the engine/UI
 * are unaffected. Swap this out for the official API adapter if/when
 * approved API access is granted — the return shape won't need to change.
 *
 * Caveats: the profile must be public; "favorites" here are inferred as the
 * highest-rated recent diary entries (Letterboxd's actual 4-film favorites
 * list isn't exposed via RSS); and this depends on Letterboxd's undocumented
 * RSS field names, which could change without notice. On web this call is
 * also subject to browser CORS, which letterboxd.com's RSS endpoint may not
 * allow — native (iOS/Android) is unaffected since CORS is a browser-only
 * restriction.
 */
import { PulledData } from '../types';

export class LetterboxdError extends Error {}

const ITEM_RE = /<item>([\s\S]*?)<\/item>/g;
const FILM_TITLE_RE = /<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/;
const FILM_YEAR_RE = /<letterboxd:filmYear>(.*?)<\/letterboxd:filmYear>/;
const RATING_RE = /<letterboxd:memberRating>(.*?)<\/letterboxd:memberRating>/;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * Pulls recent diary entries from a member's public Letterboxd RSS feed and
 * derives "favorites" as their highest-rated recent watches.
 */
export async function pullLetterboxd(rawUsername: string): Promise<PulledData> {
  const username = rawUsername.trim().replace(/^@/, '');
  if (!username) throw new LetterboxdError('Enter a Letterboxd username.');

  let res: Response;
  try {
    res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`);
  } catch {
    throw new LetterboxdError('Could not reach Letterboxd — check your connection and try again.');
  }
  if (res.status === 404) {
    throw new LetterboxdError(`No Letterboxd profile found for "${username}".`);
  }
  if (!res.ok) {
    throw new LetterboxdError('Letterboxd is unreachable right now — try again later.');
  }

  const xml = await res.text();
  const films: { title: string; rating: number }[] = [];
  ITEM_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ITEM_RE.exec(xml))) {
    const item = match[1];
    const title = FILM_TITLE_RE.exec(item)?.[1];
    if (!title) continue; // non-diary item (e.g. a list or a review without a filmTitle tag)
    const year = FILM_YEAR_RE.exec(item)?.[1];
    const rating = parseFloat(RATING_RE.exec(item)?.[1] ?? '0');
    films.push({ title: decodeXmlEntities(year ? `${title} (${year})` : title), rating });
  }

  if (films.length === 0) {
    throw new LetterboxdError(`"${username}"'s Letterboxd diary is empty or private.`);
  }

  const favorites = [...films]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map((f) => f.title);

  return { letterboxd: { favorites } };
}
