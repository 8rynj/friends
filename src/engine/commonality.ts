/**
 * Commonality / icebreaker engine — the product's core value-add (Spec §3, §5B).
 *
 * Pure function that intersects two users' profiles across all facets and emits
 * ranked `Commonality` objects. This is the single source of truth for
 * commonalities — screens compute on the fly from `currentUser` ↔ a connection's
 * profile, so icebreakers update retroactively as either profile grows (§5A/§5B).
 *
 * Matching is exact, case-insensitive set intersection. Fuzzy/semantic matching
 * is intentionally out of scope for this pass.
 */
import { Commonality, HandleSource, User } from '../data/types';
import { bucketSection, certSection, hobbySection } from '../data/catalog';
import { handleMeta } from '../data/mock';

interface Weighted extends Commonality {
  weight: number;
}

/** Case-insensitive intersection preserving the casing from `a`. */
function intersect(a: string[], b: string[]): string[] {
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

/** Lowercases the first letter so titles like "You both want to Visit Paris" read naturally. */
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Compute the top commonalities between two users, highest-signal first.
 * @param me the signed-in user
 * @param them the connection's profile
 * @param limit max commonalities to return (default 5)
 */
export function computeCommonalities(me: User, them: User, limit = 5): Commonality[] {
  const out: Weighted[] = [];
  const push = (
    facet: string,
    item: string,
    weight: number,
    category: string,
    title: string,
    source?: HandleSource,
  ) => out.push({ id: `${facet}:${item.toLowerCase()}`, weight, category, title, source });

  // Top hobbies (both flagged as top) — strongest signal.
  const topShared = intersect(me.topHobbies ?? [], them.topHobbies ?? []);
  for (const h of topShared) {
    push('top', h, 100, hobbySection[h] ?? 'Interests', `You're both into ${lower(h)}`);
  }

  // Bucket-list goals in common — shared aspirations make great icebreakers.
  for (const b of intersect(me.bucketList ?? [], them.bucketList ?? [])) {
    push('bucket', b, 85, bucketSection[b] ?? 'Bucket list', `You both want to ${lower(b)}`);
  }

  // Certifications / skills in common.
  for (const c of intersect(me.certifications ?? [], them.certifications ?? [])) {
    push('cert', c, 80, certSection[c] ?? 'Certifications', `Both certified: ${c}`);
  }

  // Regular hobbies (skip ones already surfaced as a top match).
  const topKeys = new Set(topShared.map((x) => x.toLowerCase()));
  for (const h of intersect(me.hobbies ?? [], them.hobbies ?? [])) {
    if (topKeys.has(h.toLowerCase())) continue;
    push('hobby', h, 70, hobbySection[h] ?? 'Interests', `You both like ${lower(h)}`);
  }

  // Life experiences in common (exact text).
  for (const e of intersect(me.lifeExperiences ?? [], them.lifeExperiences ?? [])) {
    push('exp', e, 65, 'Experience', e);
  }

  // Places both have been.
  for (const t of intersect(me.travel ?? [], them.travel ?? [])) {
    push('travel', t, 60, 'Travel', `You've both been to ${t}`);
  }

  // Shared platforms (proxy for V1.5 light data-pull).
  const mySources = (me.handles ?? []).map((h) => h.source);
  const theirSources = new Set((them.handles ?? []).map((h) => h.source));
  for (const s of mySources) {
    if (theirSources.has(s)) {
      push('social', s, 40, 'Social', `You're both on ${handleMeta[s].label}`, s);
    }
  }

  return out
    .sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ weight, ...c }) => c);
}

/** Convenience: just the count, for list "{n} in common" labels. */
export function commonalityCount(me: User, them: User): number {
  return computeCommonalities(me, them, 99).length;
}
