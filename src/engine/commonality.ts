/**
 * Commonality / icebreaker engine — the product's core value-add (Spec §3, §5B).
 *
 * Pure function that intersects two users' profiles across all facets — including
 * V1.5 light-data-pull signals (shared artists, films, books, activities) — and
 * returns ranked `Commonality` objects. Connection type (friend / professional /
 * acquaintance / romantic) re-weights and trims the result so icebreakers fit
 * the relationship (Spec §8 V1.5).
 *
 * This is the single source of truth for commonalities — screens compute on the
 * fly from `currentUser` ↔ a connection's profile, so icebreakers update
 * retroactively as either profile grows (§5A/§5B). Matching is exact,
 * case-insensitive set intersection.
 */
import { Commonality, ConnectionType, HandleSource, PulledData, User } from '../data/types';
import { bucketSection, certSection, hobbySection } from '../data/catalog';
import { handleMeta } from '../data/mock';

type Facet =
  | 'top' | 'bucket' | 'cert' | 'hobby' | 'exp' | 'travel' | 'social'
  | 'artist' | 'genre' | 'film' | 'book' | 'activity' | 'professional';

interface Weighted extends Commonality {
  weight: number;
  facet: Facet;
}

/** Case-insensitive intersection preserving the casing from `a`. */
function intersect(a: string[] = [], b: string[] = []): string[] {
  const set = new Set(b.map((x) => x.toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of a) {
    const key = item.toLowerCase();
    if (set.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Lowercases the first letter so titles read naturally mid-sentence. */
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Combined artist signal from Spotify + Bandsintown pulls. */
function artistsOf(p?: PulledData): string[] {
  return [...(p?.spotify?.topArtists ?? []), ...(p?.bandsintown?.artists ?? [])];
}

/** Re-weights a facet for a connection type (Spec §8 V1.5). */
function typeMultiplier(facet: Facet, type?: ConnectionType): number {
  if (!type || type === 'friend' || type === 'acquaintance') return 1;
  if (type === 'professional') {
    if (facet === 'professional' || facet === 'cert') return 1.5;
    if (facet === 'book') return 1.2;
    if (facet === 'bucket' || facet === 'artist' || facet === 'genre' || facet === 'film' || facet === 'social') return 0.5;
    return 1;
  }
  // romantic
  if (facet === 'artist' || facet === 'genre' || facet === 'film' || facet === 'book' || facet === 'bucket' || facet === 'hobby' || facet === 'top' || facet === 'travel') return 1.4;
  if (facet === 'cert' || facet === 'professional') return 0.4;
  return 1;
}

/**
 * Compute the top commonalities between two users, highest-signal first.
 * @param me the signed-in user
 * @param them the connection's profile
 * @param limit max commonalities to return (default 5)
 * @param type connection type, to tune which icebreakers surface (V1.5)
 */
export function computeCommonalities(
  me: User,
  them: User,
  limit = 5,
  type?: ConnectionType,
): Commonality[] {
  const out: Weighted[] = [];
  const push = (
    facet: Facet,
    item: string,
    weight: number,
    category: string,
    title: string,
    source?: HandleSource,
  ) => out.push({ id: `${facet}:${item.toLowerCase()}`, weight, facet, category, title, source });

  // --- V1.5 light data pull (highest-signal, source-tagged) ---
  const myArtists = artistsOf(me.pulled);
  const artistSource = (a: string): HandleSource =>
    (me.pulled?.spotify?.topArtists ?? []).some((x) => x.toLowerCase() === a.toLowerCase())
      ? 'spotify'
      : 'bandsintown';
  for (const a of intersect(myArtists, artistsOf(them.pulled))) {
    push('artist', a, 92, 'Music', `You're both into ${a}`, artistSource(a));
  }
  for (const g of intersect(me.pulled?.spotify?.topGenres, them.pulled?.spotify?.topGenres)) {
    push('genre', g, 55, 'Music', `You both like ${lower(g)}`, 'spotify');
  }
  for (const f of intersect(me.pulled?.letterboxd?.favorites, them.pulled?.letterboxd?.favorites)) {
    push('film', f, 90, 'Film', `You both love ${f}`, 'letterboxd');
  }
  const myBooks = [...(me.pulled?.goodreads?.favorites ?? []), ...(me.pulled?.goodreads?.reading ?? [])];
  const theirBooks = [...(them.pulled?.goodreads?.favorites ?? []), ...(them.pulled?.goodreads?.reading ?? [])];
  for (const b of intersect(myBooks, theirBooks)) {
    push('book', b, 88, 'Books', `You've both read ${b}`, 'goodreads');
  }
  for (const act of intersect(me.pulled?.strava?.activities, them.pulled?.strava?.activities)) {
    push('activity', act, 78, 'Fitness', `You both do ${lower(act)}`, 'strava');
  }
  // LinkedIn professional context.
  const myLi = me.pulled?.linkedin;
  const theirLi = them.pulled?.linkedin;
  if (myLi && theirLi) {
    if (myLi.company && myLi.company === theirLi.company) {
      push('professional', myLi.company, 95, 'Professional', `You both work at ${myLi.company}`, 'linkedin');
    } else if (myLi.industry && myLi.industry === theirLi.industry) {
      push('professional', myLi.industry, 72, 'Professional', `You both work in ${lower(myLi.industry)}`, 'linkedin');
    }
  }

  // --- Self-reported facets ---
  const topShared = intersect(me.topHobbies, them.topHobbies);
  for (const h of topShared) {
    push('top', h, 100, hobbySection[h] ?? 'Interests', `You're both into ${lower(h)}`);
  }
  for (const b of intersect(me.bucketList, them.bucketList)) {
    push('bucket', b, 85, bucketSection[b] ?? 'Bucket list', `You both want to ${lower(b)}`);
  }
  for (const c of intersect(me.certifications, them.certifications)) {
    push('cert', c, 80, certSection[c] ?? 'Certifications', `Both certified: ${c}`);
  }
  const topKeys = new Set(topShared.map((x) => x.toLowerCase()));
  for (const h of intersect(me.hobbies, them.hobbies)) {
    if (topKeys.has(h.toLowerCase())) continue;
    push('hobby', h, 70, hobbySection[h] ?? 'Interests', `You both like ${lower(h)}`);
  }
  for (const e of intersect(me.lifeExperiences, them.lifeExperiences)) {
    push('exp', e, 65, 'Experience', e);
  }
  // Places both have been (self-reported travel + Polarsteps pull).
  const myPlaces = [...(me.travel ?? []), ...(me.pulled?.polarsteps?.places ?? [])];
  const theirPlaces = [...(them.travel ?? []), ...(them.pulled?.polarsteps?.places ?? [])];
  for (const t of intersect(myPlaces, theirPlaces)) {
    push('travel', t, 60, 'Travel', `You've both been to ${t}`);
  }
  // Shared platforms (low-signal proxy when no data is pulled).
  const theirSources = new Set((them.handles ?? []).map((h) => h.source));
  for (const h of me.handles ?? []) {
    if (theirSources.has(h.source)) {
      push('social', h.source, 40, 'Social', `You're both on ${handleMeta[h.source].label}`, h.source);
    }
  }

  // Apply connection-type weighting, dedupe by title, sort, slice.
  const effectiveLimit = type === 'acquaintance' ? Math.min(limit, 3) : limit;
  const byTitle = new Map<string, Weighted>();
  for (const c of out) {
    const w = { ...c, weight: c.weight * typeMultiplier(c.facet, type) };
    const key = w.title.toLowerCase();
    const existing = byTitle.get(key);
    if (!existing || w.weight > existing.weight) byTitle.set(key, w);
  }

  return [...byTitle.values()]
    .sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title))
    .slice(0, effectiveLimit)
    .map(({ weight, facet, ...c }) => c);
}

/** Convenience: just the count, for list "{n} in common" labels. */
export function commonalityCount(me: User, them: User): number {
  return computeCommonalities(me, them, 99).length;
}
