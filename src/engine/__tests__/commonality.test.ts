import { computeCommonalities, commonalityCount } from '../commonality';
import { User } from '../../data/types';

/** Minimal User factory so each test states only the facets it cares about. */
function user(partial: Partial<User>): User {
  return {
    id: 'u',
    name: 'User',
    interests: [],
    hobbies: [],
    topHobbies: [],
    bucketList: [],
    certifications: [],
    travel: [],
    lifeExperiences: [],
    handles: [],
    profileCompletion: 0,
    ...partial,
  };
}

describe('computeCommonalities', () => {
  it('returns nothing when two profiles share nothing', () => {
    const me = user({ hobbies: ['Knitting'] });
    const them = user({ hobbies: ['Skydiving'] });
    expect(computeCommonalities(me, them)).toEqual([]);
  });

  it('matches case-insensitively but keeps the caller-side casing', () => {
    const me = user({ topHobbies: ['Photography'] });
    const them = user({ topHobbies: ['photography'] });
    const [c] = computeCommonalities(me, them);
    expect(c.title).toBe("You're both into photography");
    expect(c.category).toBeDefined();
  });

  it('ranks a shared top hobby above a shared regular hobby', () => {
    const me = user({ topHobbies: ['Running'], hobbies: ['Running', 'Cooking'] });
    const them = user({ topHobbies: ['Running'], hobbies: ['Running', 'Cooking'] });
    const titles = computeCommonalities(me, them).map((c) => c.title);
    // "Running" (top, weight 100) should outrank "Cooking" (hobby, weight 70).
    expect(titles[0]).toBe("You're both into running");
    expect(titles).toContain('You both like cooking');
  });

  it('does not double-count a hobby that is also a top hobby', () => {
    const me = user({ topHobbies: ['Running'], hobbies: ['Running'] });
    const them = user({ topHobbies: ['Running'], hobbies: ['Running'] });
    const running = computeCommonalities(me, them).filter((c) =>
      c.title.toLowerCase().includes('running'),
    );
    expect(running).toHaveLength(1);
    expect(running[0].title).toBe("You're both into running");
  });

  it('respects the default limit of 5', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    const me = user({ hobbies: six });
    const them = user({ hobbies: six });
    expect(computeCommonalities(me, them)).toHaveLength(5);
  });

  it('honours an explicit limit', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    const me = user({ hobbies: six });
    const them = user({ hobbies: six });
    expect(computeCommonalities(me, them, 2)).toHaveLength(2);
  });

  it('caps acquaintance icebreakers at 3', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    const me = user({ hobbies: five });
    const them = user({ hobbies: five });
    expect(computeCommonalities(me, them, 5, 'acquaintance')).toHaveLength(3);
  });

  it('surfaces low-signal shared platforms', () => {
    const me = user({ handles: [{ source: 'instagram', value: '@me' }] });
    const them = user({ handles: [{ source: 'instagram', value: '@them' }] });
    const [c] = computeCommonalities(me, them);
    expect(c.title).toBe("You're both on Instagram");
    expect(c.source).toBe('instagram');
  });

  describe('connection-type re-weighting', () => {
    // Both share a certification (weight 80) and a regular hobby (weight 70).
    const me = user({ certifications: ['First Aid / CPR'], hobbies: ['Cooking'] });
    const them = user({ certifications: ['First Aid / CPR'], hobbies: ['Cooking'] });

    it('keeps the cert ahead of the hobby by default', () => {
      const titles = computeCommonalities(me, them).map((c) => c.title);
      expect(titles[0]).toBe('Both certified: First Aid / CPR');
    });

    it('professional boosts certs', () => {
      const titles = computeCommonalities(me, them, 5, 'professional').map((c) => c.title);
      expect(titles[0]).toBe('Both certified: First Aid / CPR');
    });

    it('romantic demotes certs below shared hobbies', () => {
      // cert 80 * 0.4 = 32; hobby 70 * 1.4 = 98 → hobby wins.
      const titles = computeCommonalities(me, them, 5, 'romantic').map((c) => c.title);
      expect(titles[0]).toBe('You both like cooking');
    });
  });

  describe('V1.5 data-pull signals', () => {
    it('matches shared artists and tags the originating source', () => {
      const me = user({ pulled: { spotify: { topArtists: ['Phoebe Bridgers'], topGenres: [] } } });
      const them = user({ pulled: { bandsintown: { artists: ['phoebe bridgers'] } } });
      const [c] = computeCommonalities(me, them);
      expect(c.title).toBe("You're both into Phoebe Bridgers");
      expect(c.category).toBe('Music');
      // The user pulled it from Spotify, so that is the attributed source.
      expect(c.source).toBe('spotify');
    });

    it('matches shared films from Letterboxd', () => {
      const me = user({ pulled: { letterboxd: { favorites: ['Aftersun'] } } });
      const them = user({ pulled: { letterboxd: { favorites: ['Aftersun'] } } });
      const [c] = computeCommonalities(me, them);
      expect(c.title).toBe('You both love Aftersun');
      expect(c.source).toBe('letterboxd');
    });

    it('matches shared books across favorites and currently-reading', () => {
      const me = user({ pulled: { goodreads: { favorites: ['The Overstory'], reading: [] } } });
      const them = user({ pulled: { goodreads: { favorites: [], reading: ['The Overstory'] } } });
      const [c] = computeCommonalities(me, them);
      expect(c.title).toBe("You've both read The Overstory");
      expect(c.source).toBe('goodreads');
    });

    it('surfaces a shared employer as the strongest professional signal', () => {
      const me = user({ pulled: { linkedin: { company: 'Aperture', industry: 'Design' } } });
      const them = user({ pulled: { linkedin: { company: 'Aperture', industry: 'Design' } } });
      const [c] = computeCommonalities(me, them);
      expect(c.title).toBe('You both work at Aperture');
      expect(c.source).toBe('linkedin');
    });
  });
});

describe('commonalityCount', () => {
  it('counts every commonality, not just the top few', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    const me = user({ hobbies: six });
    const them = user({ hobbies: six });
    // computeCommonalities would cap at 5; the count helper passes a high limit.
    expect(commonalityCount(me, them)).toBe(6);
  });

  it('is zero with no overlap', () => {
    expect(commonalityCount(user({}), user({}))).toBe(0);
  });
});
