import { generateEventNudges, nudgeCopy } from '../nudges';
import { Connection, User } from '../../data/types';

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

/** Minimal connection wrapper around a profile for nudge tests. */
function connection(id: string, name: string, recentlyAdded: string[]): Connection {
  return {
    id,
    user: user({ id, name, recentlyAdded }),
    method: 'nfc',
    connectionType: 'friend',
    sharedContactInfo: [],
    nudgeCadence: 'monthly',
    lastContacted: null,
    nextNudge: null,
    contactHistory: [],
  };
}

describe('generateEventNudges', () => {
  it('emits a nudge when a connection adds something the user shares', () => {
    const me = user({ hobbies: ['Photography'] });
    const conns = [connection('sarah', 'Sarah Chen', ['Photography'])];
    const [n] = generateEventNudges(me, conns);
    expect(n.connectionId).toBe('sarah');
    expect(n.trigger).toBe('event');
    expect(n.due).toBe(true);
    expect(n.response).toBeNull();
    expect(n.message).toContain('Sarah just added Photography');
  });

  it('ignores additions the user does not share', () => {
    const me = user({ hobbies: ['Running'] });
    const conns = [connection('sarah', 'Sarah Chen', ['Skydiving'])];
    expect(generateEventNudges(me, conns)).toEqual([]);
  });

  it('matches the user item set case-insensitively across all facets', () => {
    const me = user({ bucketList: ['Run a marathon'] });
    const conns = [connection('jess', 'Jess Park', ['run a marathon'])];
    expect(generateEventNudges(me, conns)).toHaveLength(1);
  });

  it('produces deterministic, de-duplicating ids', () => {
    const me = user({ hobbies: ['Pottery / ceramics'] });
    const conns = [connection('sarah', 'Sarah Chen', ['Pottery / ceramics'])];
    const first = generateEventNudges(me, conns);
    const second = generateEventNudges(me, conns);
    expect(first[0].id).toBe('evt-sarah-pottery-/-ceramics');
    expect(first[0].id).toBe(second[0].id);
  });
});

describe('nudgeCopy', () => {
  it('adapts the language to the connection type, using the first name', () => {
    expect(nudgeCopy('professional', 'Marcus Bell')).toContain('Marcus');
    expect(nudgeCopy('professional', 'Marcus Bell')).toMatch(/follow up/i);
    expect(nudgeCopy('romantic', 'Priya Nair')).toMatch(/thinking of/i);
    expect(nudgeCopy('acquaintance', 'Dana Okafor')).toMatch(/reconnect/i);
    expect(nudgeCopy('friend', 'Sarah Chen')).toMatch(/been a while/i);
  });
});
