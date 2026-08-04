/**
 * Goodreads adapter — unofficial (Spec §6/§8, ROADMAP 3B).
 *
 * Amazon closed the Goodreads Developer API to new applicants in December
 * 2020 (no new keys issued, existing ones being sunset), so there's no
 * client-side OAuth flow to build against it — same shape of gap as
 * Letterboxd. Goodreads still serves public per-shelf RSS feeds for any
 * member whose profile is public, with no key required, so this reads those
 * directly: `shelf=currently-reading` for "reading" and `shelf=read` (sorted
 * by the member's own rating) for "favorites". Returns the same PulledData
 * shape simulatePull produces, so the engine/UI are unaffected. Swap this out
 * for the official API adapter if Goodreads ever reopens it.
 *
 * Caveats: the profile's shelves must be public; this depends on Goodreads'
 * undocumented RSS field names and user-id-based URL, which could change
 * without notice. On web this call is also subject to browser CORS, which
 * goodreads.com's RSS endpoint may not allow — native (iOS/Android) is
 * unaffected since CORS is a browser-only restriction.
 */
import { PulledData } from '../types';

export class GoodreadsError extends Error {}

const ITEM_RE = /<item>([\s\S]*?)<\/item>/g;
const TITLE_RE = /<title>(.*?)<\/title>/;
const RATING_RE = /<user_rating>(.*?)<\/user_rating>/;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/** Parses a shelf RSS feed into title/rating pairs, skipping non-book items. */
function parseShelf(xml: string): { title: string; rating: number }[] {
  const books: { title: string; rating: number }[] = [];
  ITEM_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ITEM_RE.exec(xml))) {
    const item = match[1];
    const title = TITLE_RE.exec(item)?.[1];
    if (!title) continue;
    const rating = parseFloat(RATING_RE.exec(item)?.[1] ?? '0');
    books.push({ title: decodeXmlEntities(title), rating });
  }
  return books;
}

async function fetchShelf(userId: string, shelf: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(
      `https://www.goodreads.com/review/list_rss/${encodeURIComponent(userId)}?shelf=${shelf}`,
    );
  } catch {
    throw new GoodreadsError('Could not reach Goodreads — check your connection and try again.');
  }
  if (res.status === 404) {
    throw new GoodreadsError(`No Goodreads profile found for "${userId}".`);
  }
  if (!res.ok) {
    throw new GoodreadsError('Goodreads is unreachable right now — try again later.');
  }
  return res.text();
}

/**
 * Pulls currently-reading and top-rated-read books from a member's public
 * Goodreads shelves. `rawUserId` is the numeric id (or id-name slug) from
 * their profile URL, e.g. "12345678-jane-doe".
 */
export async function pullGoodreads(rawUserId: string): Promise<PulledData> {
  const userId = rawUserId.trim().replace(/^@/, '');
  if (!userId) throw new GoodreadsError('Enter your Goodreads user ID.');

  const [readingXml, readXml] = await Promise.all([
    fetchShelf(userId, 'currently-reading'),
    fetchShelf(userId, 'read'),
  ]);

  const reading = parseShelf(readingXml)
    .slice(0, 5)
    .map((b) => b.title);
  const read = parseShelf(readXml);
  const favorites = [...read]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map((b) => b.title);

  if (reading.length === 0 && favorites.length === 0) {
    throw new GoodreadsError(`"${userId}"'s Goodreads shelves are empty or private.`);
  }

  return { goodreads: { favorites, reading } };
}
