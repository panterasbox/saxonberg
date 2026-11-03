/**
 * ⭐⭐ The rope at a drop (cordage W2, D11/D12): tied round a post above a
 * climbed `down`, it hangs — the rope is the way down from the top and its
 * end the way up from the bottom. A climb chafes it; a load past what it
 * holds parts it and the climber falls to the bottom, hurt; a reef knot
 * spills under an uneven load; a belayed fall is caught and the climber
 * hauled in unhurt — unless they were tied on with a clove hitch.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rope from '../Rope';
import RopeEnd from '../RopeEnd';
import Good from '../Good';
import Material from '../../idea/material/Material';
import Location from '../../location/Location';
import { Character } from '../../../lib/character/Character';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ConditionApi } from '../../../api/condition';
import { SchedulerApi } from '../../../api/scheduler';
import { Quantity } from '../../../lib/quantity';
import { HazardDelivery } from '../../../lib/hazard/HazardDelivery';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { JointDescriptor } from '../../idea/Joint';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Body extends Character {}

const JOINTS: Record<string, Partial<JointDescriptor>> = {
  bowline: { key: 'bowline', label: 'tied in a bowline', strength: 0.6 },
  'clove-hitch': { key: 'clove-hitch', label: 'made fast with a clove hitch', strength: 0.6 },
  'reef-knot': { key: 'reef-knot', label: 'tied in a reef knot', strength: 0.45 },
};

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/platform/thing/rope-end') return makeStuff(() => new RopeEnd());
    if (path === '/platform/thing/rope') return makeStuff(() => new Rope());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
  const realSingleton = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (path: string, ...rest: unknown[]) => path !== '/platform/idea/JointCatalogue'
    ? (realSingleton as (...a: unknown[]) => unknown)(path, ...rest)
    : ({ warmed: async (key: string) => (JOINTS[key] ?? null) as JointDescriptor | null })) as unknown as typeof StuffApi.singleton);
});

// ⚠ Scheduler-free (the TendingEngagement test's shape): `start` needs the
// event framework, so the engagement's own onStart stands in for it.
beforeEach(() => {
  vi.spyOn(SchedulerApi, 'start').mockImplementation(((e: { onStart(): void }) => {
    e.onStart();
    return { ok: true };
  }) as unknown as typeof SchedulerApi.start);
  vi.spyOn(HazardDelivery.prototype, 'resolveSite').mockReturnValue('body.torso');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function hemp(): Material {
  const have = StuffApi.findByTemplatePath<Material>('/test/material/hemp-climb');
  if (have) return have;
  const m = makeStuffAtPath(() => new Material(), '/test/material/hemp-climb');
  m.setName('hemp');
  m.setToughness(Quantity.of(4, 'MJ/m³'));
  m.setDensity(Quantity.of(1480, 'kg/m³'));
  return m;
}

function body(kg: number): Body {
  const b = makeStuff(() => new Body());
  b.setMass(Quantity.of(kg, 'kg'));
  return b;
}

async function drop(diameterMm = 12, knot: string | null = null) {
  const top = makeStuffAtPath(() => new Location(), '/test/climb/top');
  const pit = makeStuffAtPath(() => new Location(), '/test/climb/pit');
  await top.addBidirectionalExit(pit as never, 'down', { opposite: 'up' });
  top.getExit('down')!.setMedia(['vertical']);
  pit.getExit('up')!.setMedia(['ground', 'vertical']);
  const post = makeStuffAtPath(() => new Good(), '/test/climb/post');
  post.setFixedInPlace(true);
  ContainmentApi.move(post as never, top as never);
  const rigger = body(70);
  ContainmentApi.move(rigger as never, top as never);
  const rope = makeStuffAtPath(() => new Rope(), '/platform/thing/rope');
  rope.setMaterial(hemp());
  rope.setLengthM(10);
  rope.setDiameterMm(diameterMm);
  ContainmentApi.move(rope as never, rigger as never);
  const tied = await rope.tieTo(rigger as unknown as Stuff, post as unknown as Stuff, knot);
  expect(tied.ok).toBe(true);
  return { top, pit, post, rigger, rope };
}

describe('the rope at a drop (D11)', () => {
  it('⭐ tied off above a climbed drop it hangs: a way down above, a way up below', async () => {
    const { top, pit, rope } = await drop();
    expect(rope.isHung()).toBe(true);
    expect(rope.getContainer()).toBe(top);
    expect(rope.canEngageAxis('down')).toBe(true);
    const end = rope.getEnd()!;
    expect(end.getContainer()).toBe(pit);
    expect(end instanceof RopeEnd && end.canEngageAxis('up')).toBe(true);
  });

  it('a climb chafes it, more for a heavier climber', async () => {
    const { pit, rope } = await drop();
    const light = body(50);
    ContainmentApi.move(light as never, pit as never);
    await rope.takeClimb(light as unknown as Stuff);
    const once = rope.getChafe();
    expect(once).toBeGreaterThan(0);
    const heavy = body(100);
    ContainmentApi.move(heavy as never, pit as never);
    await rope.takeClimb(heavy as unknown as Stuff);
    expect(rope.getChafe() - once).toBeGreaterThan(once);
  });

  it('⭐ a load past what it holds parts it: the climber falls to the bottom, hurt', async () => {
    const { top, pit, rope } = await drop(4);
    const inflict = vi.spyOn(ConditionApi, 'inflict').mockReturnValue({ ok: true } as never);
    const climber = body(90);
    ContainmentApi.move(climber as never, top as never);
    await rope.takeClimb(climber as unknown as Stuff);
    expect(climber.getContainer()).toBe(pit);
    expect(inflict).toHaveBeenCalledWith(climber, expect.objectContaining({ mechanism: 'blunt' }));
    expect(rope.isHung()).toBe(false);
    expect(rope.getLengthM()).toBe(1);
    expect(pit.getContents().some((c) => c instanceof Rope)).toBe(true);
  });

  it('⭐ a reef knot spills under an uneven load, and the whole rope goes down', async () => {
    const { top, pit, rope } = await drop(12, 'reef knot');
    vi.spyOn(ConditionApi, 'inflict').mockReturnValue({ ok: true } as never);
    const climber = body(70);
    vi.spyOn(climber, 'getBorneBurden').mockReturnValue(Quantity.of(20, 'kg'));
    ContainmentApi.move(climber as never, top as never);
    await rope.takeClimb(climber as unknown as Stuff);
    expect(rope.getContainer()).toBe(pit);
    expect(rope.getAnchor()).toBeNull();
    expect(climber.getContainer()).toBe(pit);
  });
});

describe('the belay (D12)', () => {
  async function belayed(knot: string | null) {
    const scene = await drop(4);
    const { top, rigger, post } = scene;
    const climber = body(90);
    ContainmentApi.move(climber as never, top as never);
    // A second rope, held by the rigger, tied round the climber.
    const line = makeStuffAtPath(() => new Rope(), '/platform/thing/rope');
    line.setMaterial(hemp());
    line.setLengthM(20);
    line.setDiameterMm(12);
    ContainmentApi.move(line as never, rigger as never);
    expect((await line.tieTo(rigger as unknown as Stuff, climber as unknown as Stuff, knot)).ok).toBe(true);
    const out = line.belayFor(rigger as unknown as Stuff, climber as unknown as Stuff);
    expect(out.ok).toBe(true);
    void post;
    return { ...scene, climber, line };
  }

  it('⭐ a belayed fall is caught: the climber hangs and is hauled in unhurt', async () => {
    const { top, rope, climber } = await belayed(null);
    const inflict = vi.spyOn(ConditionApi, 'inflict').mockReturnValue({ ok: true } as never);
    await rope.takeClimb(climber as unknown as Stuff);
    expect(climber.getContainer()).toBe(top);
    expect(inflict).not.toHaveBeenCalled();
  });

  it('tied on with a clove hitch, the climber is not held', async () => {
    const { pit, rope, climber } = await belayed('clove hitch');
    vi.spyOn(ConditionApi, 'inflict').mockReturnValue({ ok: true } as never);
    await rope.takeClimb(climber as unknown as Stuff);
    expect(climber.getContainer()).toBe(pit);
  });
});
