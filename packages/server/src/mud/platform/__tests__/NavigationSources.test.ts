/**
 * The two navigation sources (navigation-server D1, D7):
 *
 * - where you are: the snapshot stamps each section `v` 1; a poke recomputes
 *   ONCE per holder per beat and each subscription is sent only the
 *   sections that differ from what IT was last sent, each `v` + 1; a failed
 *   read sends nothing; a holder nobody subscribed for costs nothing.
 * - your map: a write is pushed to every copy of THAT owner's map (never
 *   another's), as `replace` under `<locality>|<claim key>`, honoring the
 *   copy's Locality prefix.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import { SensorMixin } from '../../lib/message/Sensor';
import { PerceiverMixin } from '../../lib/description/Perceiver';
import { CartographerMixin } from '../../lib/location/Cartographer';
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { StuffApi } from '../../api/stuff';
import { SubscriptionApi } from '../../api/subscription';
import { NavigationApi } from '../../api/navigation';
import Interactive from '../idea/Interactive';
import WhereaboutsSource from '../idea/WhereaboutsSource';
import MapCopySource from '../idea/MapCopySource';
import { SUBSCRIPTION_SOURCES, type NavSections, type WireClaim } from '@saxonberg/types';

/** A body whose sections the test sets, counting how often it is read. */
class Body extends CartographerMixin(PerceiverMixin(SensorMixin(Idea))) {
  sections: NavSections = {};
  reads = 0;
  owner = '/test/agent/Avatar/me';
  override async navigation(): Promise<NavSections> {
    this.reads += 1;
    return structuredClone(this.sections);
  }
  override keepsMaps(): boolean {
    return true;
  }
  override mapOwnerKey(): string {
    return this.owner;
  }
}

type Env = { type: string; subscriptionId: string; rev?: number; changes?: { key: string; fields?: { v?: number } }[]; snapshot?: unknown };

function session(holder: Body, sink: Env[]): Interactive {
  const s = makeStuff(
    () => new Interactive(`sock-${Math.random()}`, 'sess', { _id: 'u' } as never),
  ) as unknown as Interactive;
  vi.spyOn(s, 'getHolder').mockReturnValue(holder as never);
  vi.spyOn(s, 'sendEnvelope').mockImplementation((tpl: unknown) => {
    sink.push(tpl as Env);
  });
  return s;
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5));

describe('WhereaboutsSource — sections, one flush per beat', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    makeStuffAtPath(() => new WhereaboutsSource(), SUBSCRIPTION_SOURCES.whereabouts);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a poke sends each subscription only the sections that changed, each v + 1', async () => {
    const body = makeStuff(() => new Body()) as unknown as Body;
    body.sections = {
      place: { v: 0, stuffId: 'a', name: 'the vestibule' },
      ways: { v: 0, ways: [] },
    };
    const sink: Env[] = [];
    const s = session(body, sink);
    const snap = (await s.subscribe('w', SUBSCRIPTION_SOURCES.whereabouts)) as { sections: NavSections };
    expect(snap.sections.place?.v).toBe(1);
    expect(snap.sections.ways?.v).toBe(1);

    body.sections.place = { v: 0, stuffId: 'b', name: 'a corridor' };
    const before = body.reads;
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.whereabouts, body as never);
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.whereabouts, body as never, { names: ['ways'] });
    await tick();
    expect(body.reads - before).toBe(1); // two pokes, one recompute
    const deltas = sink.filter((e) => e.type === 'subscription-delta');
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.changes!.map((c) => c.key)).toEqual(['place']);
    expect(deltas[0]!.changes![0]!.fields!.v).toBe(2);

    // Nothing changed: nothing is sent.
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.whereabouts, body as never);
    await tick();
    expect(sink.filter((e) => e.type === 'subscription-delta')).toHaveLength(1);
  });

  it('a read that failed is absent and sends nothing for that section', async () => {
    const body = makeStuff(() => new Body()) as unknown as Body;
    body.sections = { place: { v: 0, stuffId: 'a', name: 'here' } };
    const sink: Env[] = [];
    const s = session(body, sink);
    await s.subscribe('w', SUBSCRIPTION_SOURCES.whereabouts);
    body.sections = {}; // the place read failed
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.whereabouts, body as never);
    await tick();
    expect(sink.filter((e) => e.type === 'subscription-delta')).toHaveLength(0);
  });

  it('a holder nobody subscribed for is never read', async () => {
    const body = makeStuff(() => new Body()) as unknown as Body;
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.whereabouts, body as never);
    await tick();
    expect(body.reads).toBe(0);
  });
});

describe('MapCopySource — the copy follows the map', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    makeStuffAtPath(() => new MapCopySource(), SUBSCRIPTION_SOURCES.mapCopy);
    vi.spyOn(NavigationApi, 'readMapCopy').mockResolvedValue({ documents: [] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const claim = (place: string): WireClaim => ({
    key: `place|${place}`,
    kind: 'place',
    place: { path: place, spoiler: 1 },
    channel: 'walked',
    firstSeen: 1,
    lastSeen: 2,
  });

  it('a write reaches that owner\'s copies only, keyed `<locality>|<claim key>`', async () => {
    const me = makeStuff(() => new Body()) as unknown as Body;
    const other = makeStuff(() => new Body()) as unknown as Body;
    other.owner = '/test/agent/Avatar/other';
    const mine: Env[] = [];
    const theirs: Env[] = [];
    await session(me, mine).subscribe('m', SUBSCRIPTION_SOURCES.mapCopy);
    await session(other, theirs).subscribe('m', SUBSCRIPTION_SOURCES.mapCopy);
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.mapCopy, null, {
      ownerKey: '/test/agent/Avatar/me',
      locality: 'newbie-wilds',
      claims: [claim('/test/place/vestibule')],
    });
    const deltas = mine.filter((e) => e.type === 'subscription-delta');
    expect(deltas).toHaveLength(1);
    const change = deltas[0]!.changes![0]! as unknown as {
      key: string;
      fields: { locality: string; claim: { key: string; place: unknown } };
    };
    expect(change.key).toBe(`newbie-wilds|${change.fields.claim.key}`);
    expect(change.fields.claim.place).toEqual({ path: '/test/place/vestibule', spoiler: 1 });
    expect(theirs.filter((e) => e.type === 'subscription-delta')).toHaveLength(0);
  });

  it('a copy asked for one Locality hears only that Locality and those under it', async () => {
    const me = makeStuff(() => new Body()) as unknown as Body;
    const sink: Env[] = [];
    await session(me, sink).subscribe('m', SUBSCRIPTION_SOURCES.mapCopy, { locality: 'terminus' });
    for (const locality of ['terminus/city', 'newbie-wilds', 'terminus']) {
      SubscriptionApi.poke(SUBSCRIPTION_SOURCES.mapCopy, null, {
        ownerKey: '/test/agent/Avatar/me',
        locality,
        claims: [claim('/x')],
      });
    }
    expect(sink.filter((e) => e.type === 'subscription-delta')).toHaveLength(2);
  });
});
