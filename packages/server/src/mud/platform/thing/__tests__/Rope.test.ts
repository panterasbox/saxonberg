/**
 * ⭐⭐ A rope is a length with a strength (cordage W1): strength goes as the
 * square of the diameter and as the fiber; a cut makes two ropes whose
 * lengths sum and that both carry the marks; a splice makes one, keeps nine
 * tenths and shows both ropes' marks; a knot keeps its row's share, dressed
 * by the tier's band; a wet untarred rope rots and a tarred one does not; an
 * uncoiled rope will not throw.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rope from '../Rope';
import RopeEnd from '../RopeEnd';
import Good from '../Good';
import Tool from '../Tool';
import Material from '../../idea/material/Material';
import Location from '../../location/Location';
import WorldClockRegistry from '../../idea/WorldClockRegistry';
import { Character } from '../../../lib/character/Character';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { TemplatePaths } from '../../../lib/paths';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { ActPlan } from '../../../lib/craft/ActPlan';
import type { JointDescriptor } from '../../idea/Joint';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Body extends Character {}

const DAY = 86_400;
const PITCH = '/stuff/idea/material/bulk/pitch';

const JOINTS: Record<string, Partial<JointDescriptor>> = {
  bowline: { key: 'bowline', label: 'tied in a bowline', strength: 0.6 },
  'clove-hitch': { key: 'clove-hitch', label: 'made fast with a clove hitch', strength: 0.6 },
  'sheet-bend': { key: 'sheet-bend', label: 'joined with a sheet bend', strength: 0.5 },
  'reef-knot': { key: 'reef-knot', label: 'tied in a reef knot', strength: 0.45 },
  splice: { key: 'splice', label: 'spliced', strength: 0.9 },
};

let now = 1_000_000;

function fiber(name: string, toughness: number): Material {
  const m = makeStuffAtPath(() => new Material(), `/test/material/${name}`);
  m.setName(name);
  m.setToughness(Quantity.of(toughness, 'MJ/m³'));
  m.setDensity(Quantity.of(1480, 'kg/m³'));
  m.setWaterAbsorptionCapacity(Quantity.of(20, '%'));
  return m;
}

function rope(material: Material, lengthM = 20, diameterMm = 12): Rope {
  const r = makeStuffAtPath(() => new Rope(), '/platform/thing/rope');
  r.setMaterial(material);
  r.setLengthM(lengthM);
  r.setDiameterMm(diameterMm);
  return r;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  now = 1_000_000;
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1);
  makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  const pitch = makeStuffAtPath(() => new Material(), PITCH);
  pitch.setName('pitch');
  pitch.setTags(['tar', 'waterproofing']);
  pitch.setMeltingPoint(Quantity.of(320, 'K'));
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/platform/thing/rope-end') return makeStuff(() => new RopeEnd());
    if (path === '/platform/thing/rope') return makeStuff(() => new Rope());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
  const realSingleton = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (path: string, ...rest: unknown[]) => path !== '/platform/idea/JointCatalogue'
    ? (realSingleton as (...a: unknown[]) => unknown)(path, ...rest)
    : ({
    warmed: async (key: string) => (JOINTS[key] ?? null) as JointDescriptor | null,
  })) as unknown as typeof StuffApi.singleton);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('a rope is a length with a strength (D4, D6)', () => {
  it('⭐ twice as thick holds four times as much; hemp before flax before jute', () => {
    const hemp = fiber('hemp', 4);
    const flax = fiber('flax', 3);
    const jute = fiber('jute', 2);
    const thin = rope(hemp, 20, 6).breakingKg();
    const thick = rope(hemp, 20, 12).breakingKg();
    expect(thick / thin).toBeCloseTo(4, 5);
    expect(thick).toBeGreaterThan(1000);
    expect(thick).toBeGreaterThan(rope(flax).breakingKg());
    expect(rope(flax).breakingKg()).toBeGreaterThan(rope(jute).breakingKg());
  });

  it('its mass is derived from length and thickness, and tar adds to it', () => {
    const hemp = fiber('hemp', 4);
    const r = rope(hemp, 20, 12);
    const bare = r.getDryMass().rawValue();
    expect(bare).toBeGreaterThan(1);
    expect(bare).toBeLessThan(3);
    expect(rope(hemp, 40, 12).getDryMass().rawValue()).toBeCloseTo(bare * 2, 5);
    r.setCoats({ outside: [{ material: PITCH, thicknessM: 0.0005, state: 'set' }] });
    expect(r.getDryMass().rawValue()).toBeCloseTo(bare * 1.15, 5);
  });

  it('the look tells its length, fiber and what it holds in words', () => {
    const r = rope(fiber('hemp', 4), 20, 12);
    const line = r.describeRope()[0]!;
    expect(line).toMatch(/20 meters of hemp rope/);
    expect(line).toMatch(/it would hold/);
    expect(line).not.toMatch(/kg/);
  });
});

describe('cut, splice, coil (D4, D9, D10)', () => {
  async function cutter(r: Rope): Promise<{ who: Body; knife: Tool }> {
    const room = makeStuffAtPath(() => new Location(), '/test/rope/room');
    const who = makeStuff(() => new Body());
    ContainmentApi.move(who as never, room as never);
    ContainmentApi.move(r as never, who as never);
    const knife = makeStuff(() => new Tool());
    knife.setCapabilities(['cutting']);
    ContainmentApi.move(knife as never, who as never);
    return { who, knife };
  }

  it('⭐ a cut makes two ropes whose lengths sum, both carrying the marks', async () => {
    const r = rope(fiber('hemp', 4), 20);
    r.marks = ['red'];
    const { who, knife } = await cutter(r);
    const plan = await r.cutPlan({ actor: who as unknown as Stuff, tools: [knife as unknown as Stuff], raw: null, length: '8 m', options: {} });
    expect(plan.ok).toBe(true);
    await (plan as ActPlan).onComplete();
    const ropes = who.getContents().filter((c): c is Rope => c instanceof Rope);
    expect(ropes).toHaveLength(2);
    expect(ropes.map((x) => x.getLengthM()).sort((a, b) => a - b)).toEqual([8, 12]);
    expect(ropes.every((x) => x.getMarks().includes('red'))).toBe(true);
    expect(r.describeRope().join(' ')).toMatch(/red yarn/);
  });

  it('no knife, no length, or too long — refused in words', async () => {
    const r = rope(fiber('hemp', 4), 20);
    const { who, knife } = await cutter(r);
    const actor = who as unknown as Stuff;
    expect(await r.cutPlan({ actor, tools: [], raw: null, length: '5', options: {} })).toMatchObject({ ok: false, reason: 'no-knife' });
    expect(await r.cutPlan({ actor, tools: [knife as unknown as Stuff], raw: null, length: null, options: {} })).toMatchObject({ ok: false, reason: 'no-length' });
    expect(await r.cutPlan({ actor, tools: [knife as unknown as Stuff], raw: null, length: '30 meters', options: {} })).toMatchObject({ ok: false, reason: 'too-long' });
  });

  it('⭐ a splice makes one rope, keeps nine tenths and shows both ropes\' marks', async () => {
    const hemp = fiber('hemp', 4);
    const a = rope(hemp, 10);
    const b = rope(hemp, 15);
    a.marks = ['red'];
    b.marks = ['blue'];
    const who = makeStuff(() => new Body());
    const out = await a.spliceBy(who as unknown as Stuff, b as unknown as Stuff);
    expect(out.ok).toBe(true);
    expect(a.getLengthM()).toBe(25);
    expect([...a.getMarks()].sort()).toEqual(['blue', 'red']);
    expect(b.isDestroyed()).toBe(true);
    expect(a.effectiveKg() / a.breakingKg()).toBeCloseTo(0.9 * 0.8, 5);
  });

  it('⭐ an uncoiled rope will not throw; coiled, it does', async () => {
    const r = rope(fiber('hemp', 4), 20);
    r.coiledDown = false;
    const who = makeStuff(() => new Body());
    expect(await r.tossTo(who as unknown as Stuff, 'anyone')).toMatchObject({ ok: false, reason: 'not-coiled' });
    const plan = r.coilPlan(who as unknown as Stuff);
    expect(plan.ok).toBe(true);
    await (plan as ActPlan).onComplete();
    expect(r.isCoiled()).toBe(true);
    expect(await r.tossTo(who as unknown as Stuff, 'anyone')).toMatchObject({ reason: 'no-such-person' });
  });
});

describe('knots (D7)', () => {
  it('⭐ a knot keeps its row\'s share, dressed by the band; a reef knot keeps least', async () => {
    const hemp = fiber('hemp', 4);
    const room = makeStuffAtPath(() => new Location(), '/test/rope/knots');
    const who = makeStuff(() => new Body());
    ContainmentApi.move(who as never, room as never);
    const post = makeStuffAtPath(() => new Good(), '/test/rope/post');
    ContainmentApi.move(post as never, room as never);

    const r = rope(hemp, 20);
    ContainmentApi.move(r as never, who as never);
    expect((await r.tieTo(who as unknown as Stuff, post as unknown as Stuff, null)).ok).toBe(true);
    // An untrained hand: a bowline keeps .6 × .8.
    expect(r.effectiveKg() / r.breakingKg()).toBeCloseTo(0.48, 5);
    expect(r.getKnots()[0]!.key).toBe('bowline');
    await r.untieBy(who as unknown as Stuff);

    expect((await r.tieTo(who as unknown as Stuff, post as unknown as Stuff, 'reef knot')).ok).toBe(true);
    expect(r.effectiveKg() / r.breakingKg()).toBeCloseTo(0.36, 5);
    await r.untieBy(who as unknown as Stuff);
    expect(r.getKnots()).toHaveLength(0);

    expect(await r.tieTo(who as unknown as Stuff, post as unknown as Stuff, 'granny knot')).toMatchObject({ ok: false, reason: 'no-such-knot' });
  });
});

describe('rot and tar (D13′)', () => {
  it('⭐ a wet untarred rope rots; a tarred one does not', () => {
    const hemp = fiber('hemp', 4);
    const bare = rope(hemp);
    const tarred = rope(hemp);
    tarred.setCoats({ outside: [{ material: PITCH, thicknessM: 0.0005, state: 'set' }] });
    expect(tarred.isTarred()).toBe(true);
    for (const r of [bare, tarred]) {
      r.reconcileRot();
      r.wet(1);
    }
    now += 5 * DAY;
    expect(bare.getRot()).toBeGreaterThan(0);
    expect(tarred.getRot()).toBe(0);
    expect(bare.effectiveKg()).toBeLessThan(bare.breakingKg());
  });

  it('⭐ a wet coat of pitch sets as it cools', () => {
    const r = rope(fiber('hemp', 4));
    r.layCoat('outside', PITCH, 0.0005);
    expect(r.getCoats('outside')[0]!.state).toBe('wet');
    expect(r.isTarred()).toBe(true);
    expect(r.getCoats('outside')[0]!.state).toBe('set');
  });
});
