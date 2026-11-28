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
import { CartographerMixin } from '../../lib/place/Cartographer';
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { StuffApi } from '../../api/stuff';
import { SubscriptionApi } from '../../api/subscription';
import { NavigationApi } from '../../api/navigation';
import Interactive from '../idea/Interactive';
import WhereaboutsSource, { WHEREABOUTS_WAKES } from '../idea/WhereaboutsSource';
import EventRegistry from '../idea/EventRegistry';
import { EventApi } from '../../api/event';
import { ExecutionContextApi, FrameKind } from '../../api/execution-context';
import { Stuff } from '../../lib/stuff/Stuff';
import MapCopySource from '../idea/MapCopySource';
import { SUBSCRIPTION_SOURCES, NAV_SECTION_NAMES, type NavSectionName, type NavSections, type WireClaim } from '@saxonberg/types';

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
  beforeEach(async () => {
    StuffApi.clearAll();
    EventApi._clearAllForTesting();
    await bootEvents();
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

/** A body that records which sections each read asked for. */
class AskingBody extends Body {
  asked: NavSectionName[][] = [];
  place: Stuff | null = null;
  override async navigation(names?: readonly NavSectionName[]): Promise<NavSections> {
    this.asked.push([...(names ?? NAV_SECTION_NAMES)]);
    return super.navigation();
  }
}

async function bootEvents(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

/** Run `fn` as the work of command `id` (what `executeCommand` plants). */
function asCommand(id: string, fn: () => void): void {
  ExecutionContextApi.runRoot(null, 'r', () => {
    ExecutionContextApi.run(null, {}, 'executeCommand', {
      kind: FrameKind.Command,
      metadata: { causingCommandId: id },
    }, fn);
  });
}

describe('⭐⭐ WhereaboutsSource — ONE declared wake table (navigation-server review)', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    EventApi._clearAllForTesting();
    await bootEvents();
    makeStuffAtPath(() => new WhereaboutsSource(), SUBSCRIPTION_SOURCES.whereabouts);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function subscribed(): Promise<{ body: AskingBody; sink: Env[] }> {
    const body = makeStuff(() => new AskingBody()) as unknown as AskingBody;
    body.sections = { you: { v: 0, pace: 'walk' } as never, place: { v: 0, stuffId: 'a', name: 'here' } };
    const sink: Env[] = [];
    await session(body, sink).subscribe('w', SUBSCRIPTION_SOURCES.whereabouts);
    body.asked = [];
    return { body, sink };
  }

  it('⭐ your posture fires: you, ways and place are re-read — and the delta names the command', async () => {
    const { body, sink } = await subscribed();
    body.sections.you = { v: 0, pace: 'walk', posture: 'sit' } as never;
    asCommand('cmd-sit', () => SubscriptionApi.fireFieldChange(body, 'posture', 'stand', 'sit'));
    await tick();
    expect(body.asked).toEqual([['you', 'ways', 'place']]);
    const delta = sink.find((e) => e.type === 'subscription-delta') as Env & { causes?: string[] };
    expect(delta?.changes?.map((c) => c.key)).toEqual(['you']);
    expect(delta?.causes).toEqual(['cmd-sit']);
  });

  it('a command that fires nothing it shows (`say`) costs nothing; a stranger\'s fire costs nothing', async () => {
    const { body } = await subscribed();
    const stranger = makeStuff(() => new Body());
    asCommand('cmd-say', () => SubscriptionApi.fireFieldChange(stranger, 'posture', 'stand', 'sit'));
    await tick();
    expect(body.asked).toEqual([]);
  });

  it('a field nobody listed wakes nothing, even on your own body', async () => {
    const { body } = await subscribed();
    SubscriptionApi.fireFieldChange(body, 'longDescription', 'a', 'b');
    await tick();
    expect(body.asked).toEqual([]);
  });

  it('the clock wakes every holder\'s place, and names no command', async () => {
    const { body, sink } = await subscribed();
    body.sections.place = { v: 0, stuffId: 'a', name: 'here', daylight: 'night' } as never;
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.whereabouts, null, { names: ['place'] });
    await tick();
    expect(body.asked).toEqual([['place']]);
    const delta = sink.find((e) => e.type === 'subscription-delta') as Env & { causes?: string[] };
    expect(delta?.causes).toBeUndefined();
  });

  it('every row of the table names a field and, in words, why', () => {
    for (const wake of WHEREABOUTS_WAKES) {
      expect(wake.field.length).toBeGreaterThan(0);
      expect(wake.why.length).toBeGreaterThan(8);
      expect(wake.sections.length).toBeGreaterThan(0);
    }
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
    place: { path: place, spoiler: 2 },
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
    expect(change.fields.claim.place).toEqual({ path: '/test/place/vestibule', spoiler: 2 });
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
