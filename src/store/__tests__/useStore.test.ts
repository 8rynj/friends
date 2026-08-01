import { useStore, computeCompletion, isDue, todayISO } from '../useStore';
import { User } from '../../data/types';

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

// Every test starts from the seeded state so order never matters.
beforeEach(() => {
  useStore.getState().resetApp();
});

describe('computeCompletion', () => {
  it('returns 100 when every facet is filled', () => {
    const full = user({
      name: 'Bryn',
      hobbies: ['a', 'b', 'c'],
      topHobbies: ['a'],
      handles: [{ source: 'instagram', value: '@b' }],
      bucketList: ['x'],
      certifications: ['CPR'],
      travel: ['Tokyo'],
      lifeExperiences: ['Lived abroad'],
    });
    expect(computeCompletion(full)).toBe(100);
  });

  it('scores a sparse profile below half', () => {
    expect(computeCompletion(user({ name: 'Bryn' }))).toBeLessThan(50);
  });

  it('needs at least three hobbies to credit the hobbies facet', () => {
    const two = user({ name: 'Bryn', hobbies: ['a', 'b'] });
    const three = user({ name: 'Bryn', hobbies: ['a', 'b', 'c'] });
    expect(computeCompletion(three)).toBeGreaterThan(computeCompletion(two));
  });
});

describe('isDue', () => {
  it('is false for a null next nudge', () => {
    expect(isDue(null)).toBe(false);
  });
  it('is true for a date in the past', () => {
    expect(isDue('2000-01-01')).toBe(true);
  });
  it('is false for a date in the future', () => {
    expect(isDue('2999-01-01')).toBe(false);
  });
});

describe('connections', () => {
  it('reports seeded connections as connected', () => {
    expect(useStore.getState().isConnected('sarah')).toBe(true);
    expect(useStore.getState().isConnected('nobody')).toBe(false);
  });

  it('addConnection is idempotent by id', () => {
    const before = useStore.getState().connections.length;
    const sarah = useStore.getState().connections.find((c) => c.id === 'sarah')!;
    useStore.getState().addConnection(sarah);
    expect(useStore.getState().connections).toHaveLength(before);
  });

  it('setConnectionType updates the type', () => {
    useStore.getState().setConnectionType('sarah', 'professional');
    const sarah = useStore.getState().connections.find((c) => c.id === 'sarah')!;
    expect(sarah.connectionType).toBe('professional');
  });
});

describe('setCadence', () => {
  it('reschedules the next nudge from the last-contacted date', () => {
    useStore.getState().setCadence('sarah', 'weekly');
    const sarah = useStore.getState().connections.find((c) => c.id === 'sarah')!;
    // sarah.lastContacted is 2026-06-10; +7 days → 2026-06-17.
    expect(sarah.nudgeCadence).toBe('weekly');
    expect(sarah.nextNudge).toBe('2026-06-17');
  });

  it('clears the next nudge when cadence is "never"', () => {
    useStore.getState().setCadence('sarah', 'never');
    const sarah = useStore.getState().connections.find((c) => c.id === 'sarah')!;
    expect(sarah.nextNudge).toBeNull();
  });
});

describe('logOutreach', () => {
  it('stamps today, logs history, reschedules, and resolves open nudges', () => {
    useStore.getState().logOutreach('marcus', 'imessage', 'caught up');
    const marcus = useStore.getState().connections.find((c) => c.id === 'marcus')!;
    expect(marcus.lastContacted).toBe(todayISO());
    expect(marcus.contactHistory[0]).toMatchObject({ via: 'imessage', note: 'caught up' });
    // Monthly cadence → next nudge is 30 days out, in the future.
    expect(isDue(marcus.nextNudge)).toBe(false);
    // The seeded "reach out to Marcus" nudge is now resolved.
    const nudge = useStore.getState().nudges.find((n) => n.id === 'n1')!;
    expect(nudge.response).toBe('reached_out');
    expect(nudge.due).toBe(false);
  });
});

describe('respondToNudge', () => {
  it('"reached_out" logs outreach for the nudge\'s connection', () => {
    useStore.getState().respondToNudge('n1', 'reached_out');
    const marcus = useStore.getState().connections.find((c) => c.id === 'marcus')!;
    expect(marcus.lastContacted).toBe(todayISO());
    expect(useStore.getState().nudges.find((n) => n.id === 'n1')!.response).toBe('reached_out');
  });

  it('"not_yet" records the response without touching the connection', () => {
    useStore.getState().respondToNudge('n1', 'not_yet');
    const nudge = useStore.getState().nudges.find((n) => n.id === 'n1')!;
    expect(nudge.response).toBe('not_yet');
    expect(nudge.due).toBe(false);
    const marcus = useStore.getState().connections.find((c) => c.id === 'marcus')!;
    expect(marcus.lastContacted).toBeNull();
  });
});

describe('updateFacet', () => {
  it('keeps topHobbies a subset when hobbies shrink', () => {
    useStore.getState().completeProfile({
      hobbies: ['Running', 'Cooking', 'Cycling'],
      topHobbies: ['Running', 'Cooking'],
    });
    useStore.getState().updateFacet('hobbies', ['Running']);
    const u = useStore.getState().user;
    expect(u.hobbies).toEqual(['Running']);
    expect(u.topHobbies).toEqual(['Running']);
  });
});

describe('connectDataPull', () => {
  it('pulls signals onto the profile and marks the handle', async () => {
    await useStore.getState().connectDataPull('linkedin');
    const u = useStore.getState().user;
    expect(u.pulled?.linkedin?.company).toBe('Aperture');
    expect(u.handles.find((h) => h.source === 'linkedin')?.dataPulled).toBe(true);
  });
});

describe('sendConnectRequest', () => {
  it('rejects an already-connected person', async () => {
    expect(await useStore.getState().sendConnectRequest('sarah')).toEqual({ outcome: 'already' });
  });

  it('rejects an unknown person', async () => {
    expect(await useStore.getState().sendConnectRequest('ghost')).toEqual({ outcome: 'notfound' });
  });

  it('accepts a discoverable person and adds the connection', async () => {
    const res = await useStore.getState().sendConnectRequest('maya', 'hi');
    expect(res).toEqual({ outcome: 'accepted', connectionId: 'maya' });
    expect(useStore.getState().isConnected('maya')).toBe(true);
  });

  it('ignores three times, then blocks indefinitely', async () => {
    const send = () => useStore.getState().sendConnectRequest('liam');
    expect((await send()).outcome).toBe('ignored');
    expect((await send()).outcome).toBe('ignored');
    expect((await send()).outcome).toBe('blocked');
    // Once blocked, further attempts stay blocked.
    expect((await send()).outcome).toBe('blocked');
  });
});

describe('incoming requests', () => {
  it('accepting turns a request into a connection', async () => {
    const id = await useStore.getState().acceptIncoming('req-jess');
    expect(id).toBe('jess');
    expect(useStore.getState().isConnected('jess')).toBe(true);
    expect(useStore.getState().incomingRequests.find((r) => r.id === 'req-jess')).toBeUndefined();
  });

  it('ignoring drops the request without connecting', async () => {
    await useStore.getState().ignoreIncoming('req-jess');
    expect(useStore.getState().incomingRequests).toHaveLength(0);
    expect(useStore.getState().isConnected('jess')).toBe(false);
  });
});

describe('pending SMS invites', () => {
  it('creates, claims, and produces a connection', () => {
    const id = useStore.getState().createPendingInvite('Alex', '+15551234567');
    const created = useStore.getState().pendingConnections.find((p) => p.id === id);
    expect(created).toBeDefined();
    expect(created?.token).toBeTruthy();
    const connId = useStore.getState().claimPending(id);
    expect(connId).toBe(`claimed-${id}`);
    expect(useStore.getState().isConnected(connId!)).toBe(true);
    expect(useStore.getState().pendingConnections.find((p) => p.id === id)).toBeUndefined();
  });

  it('cancels a pending invite', () => {
    const id = useStore.getState().createPendingInvite('Alex', '+15551234567');
    useStore.getState().cancelPending(id);
    expect(useStore.getState().pendingConnections.find((p) => p.id === id)).toBeUndefined();
  });
});

describe('searchDirectory (mock pool)', () => {
  it('filters by name and excludes already-connected people', async () => {
    const results = await useStore.getState().searchDirectory('maya');
    expect(results.map((r) => r.id)).toEqual(['maya']);
  });

  it('excludes people already connected', async () => {
    const results = await useStore.getState().searchDirectory('sarah');
    expect(results).toHaveLength(0);
  });
});

describe('NFC bump (mock pool)', () => {
  it('previews a candidate from the bump pool', async () => {
    const preview = await useStore.getState().previewCandidate('theo');
    expect(preview?.name).toBe('Theo Martins');
  });

  it('returns null for an id outside the bump pool', async () => {
    expect(await useStore.getState().previewCandidate('ghost')).toBeNull();
  });

  it('confirming a preview adds the full connection', async () => {
    const preview = await useStore.getState().previewCandidate('theo');
    const id = await useStore.getState().confirmNfcConnection(preview!);
    expect(id).toBe('theo');
    expect(useStore.getState().isConnected('theo')).toBe(true);
    // Full mock profile (handles/pulled data), not just the preview subset.
    const theo = useStore.getState().connections.find((c) => c.id === 'theo')!;
    expect(theo.user.handles.length).toBeGreaterThan(0);
  });
});

describe('settings', () => {
  it('merges a settings patch', () => {
    useStore.getState().updateSettings({ searchable: false });
    expect(useStore.getState().settings.searchable).toBe(false);
    // Other settings are untouched.
    expect(useStore.getState().settings.nfcEnabled).toBe(true);
  });
});
