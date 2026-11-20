/**
 * ⭐⭐ One leak (matter-model-overlaps D4, D9): a vessel loses what it holds
 * by three terms — its PORES, its FLAWS and its JOINTS — summed in one read
 * (`Bulkable.leakLPerHour`), drained on read by the one drip, and paced by
 * ONE game-clock wake at the computable moment it runs out.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import Ceramic from '../../../platform/idea/material/Ceramic';
import Floor from '../../../platform/thing/Floor';
import { BulkableMixin } from '../Bulkable';
import { DurableMixin } from '../../material/Durable';
import { AssembledMixin, type PartLine, type JointState } from '../../craft/Assembled';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../platform/idea/EventRegistry';
import '../../../platform/idea/WorldClockRegistry';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { rememberShippedJoints } from '../../craft/__tests__/joint-fixtures';

class Room extends Place {}
/** A cask: made of parts, durable, holds liquid (a Good, so Faced and Flawed). */
class Cask extends AssembledMixin(DurableMixin(BulkableMixin(Good))) {
  static _mixinName = 'LeakTestCask';
}
/** A crock: one piece. */
class Crock extends DurableMixin(BulkableMixin(Good)) {
  static _mixinName = 'LeakTestCrock';
}

let seq = 0;
function material(name: string, fill: (m: Material) => void = () => undefined, make: () => Material = () => new Material()): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = make();
    m.setName(name);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    fill(m);
    return m;
  }, `/stuff/idea/material/_leak/${name}-${seq}`) as unknown as Material;
}

let water: Material;
let oak: Material;
let terracotta: Material;
let glaze: Material;

function holding<T extends Stuff>(v: T, body: Material, litres: number, capL: number): T {
  const b = v as unknown as {
    interiorBulk: boolean;
    setMass(q: Quantity<'kg'>): void;
    setMaterial(m: Material): void;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material | null): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
  };
  b.setMass(Quantity.of(5, 'kg'));
  b.setMaterial(body);
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(capL, 'L'));
  if (litres > 0) {
    b.setBulkMaterial('interior', water);
    b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  }
  return v;
}

function staves(failed: number): PartLine[] {
  return [
    {
      part: 'stave', template: '/x/thing/stave', count: 30, plural: 'staves', role: 'structural',
      material: oak.getTemplatePath()!, grade: 'fair', condition: 1, failed, makers: [],
    },
  ];
}
function hoops(): JointState[] {
  return [{ key: 'hooping', method: '/trade/coopering/joints/hooped', members: ['stave'], tension: 1, maker: '' }];
}

function roomWithFloor(): { room: Room; floor: Floor } {
  const room = makeStuff(() => new Room());
  const floor = makeStuff(() => new Floor());
  floor.surfaceBulk = true;
  floor.setSurfaceCapacity(Quantity.of(200, 'L'));
  room.addFixture(floor);
  return { room, floor };
}

const held = (v: Stuff): number =>
  (v as unknown as { getBulkAmount(a: string): Quantity<'L'> }).getBulkAmount('interior').rawValue();
const puddle = (f: Floor): number => f.getBulkAmount('surface').rawValue();

let now = 1_000_000;
/** Move the injected clock THROUGH the clock, so due wakes fire (the set's D8 shape). */
const gameNow = (): number => WorldClockApi.getNow().rawValue();
const through = (gameS: number): void => {
  WorldClockApi._advanceForTesting(gameS);
  now += gameS;
};

describe('⭐⭐ one leak — pores, flaws and joints', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    rememberShippedJoints();
    const events = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(events, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(events);
    WorldClockApi._resetForTesting();
    now = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    water = material('water', (m) => m.setTags(['liquid']));
    oak = material('oak');
    terracotta = material('terracotta', (m) => {
      m.setTags(['ceramic', 'fired', 'porous']);
      (m as unknown as Ceramic).setWaterAbsorptionCapacity(Quantity.of(15, '%'));
    }, () => new Ceramic());
    glaze = material('glaze', () => undefined, () => new Ceramic());
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ the leak is the SUM of three terms — pores, a crack, a sprung stave', () => {
    const cask = makeStuff(() => holding(new Cask(), terracotta, 10, 20));
    expect(cask.leakLPerHour()).toBeCloseTo(0.15 * 0.02 * 10, 9); // pores alone
    cask.addFlaw('crack', true);
    cask.recordAssembly(staves(1), hoops());
    const pores = 0.15 * 0.02 * 10;
    const flaws = 4 * Math.sqrt(Math.cbrt(10 / 1000)) * 1;
    const joints = 0.4 * 10;
    expect(cask.leakLPerHour()).toBeCloseTo(pores + flaws + joints, 9);
  });

  it('⭐ a cracked GLAZED crock leaks at the crack’s rate — its sealed faces stop the pores, not the crack', () => {
    const crock = makeStuff(() => holding(new Crock(), terracotta, 10, 10));
    void crock.setCoats({
      inside: [{ material: glaze.getTemplatePath()!, thicknessM: 0.0003, state: 'set' }],
      outside: [{ material: glaze.getTemplatePath()!, thicknessM: 0.0003, state: 'set' }],
    });
    expect(crock.isSealed('inside')).toBe(true);
    expect(crock.leakLPerHour()).toBe(0);
    expect(crock.isLiquidTight()).toBe(true);
    crock.addFlaw('crack', true);
    expect(crock.leakLPerHour()).toBeCloseTo(4 * Math.sqrt(Math.cbrt(0.01)), 9);
    // ≈ 1.86 L/h of 10: over the liquid-tight line, so a pour runs through.
    expect(crock.isLiquidTight()).toBe(false);
    expect(crock.getClosure()).toBe('open');
    // And what it holds runs out onto the floor, read by read.
    const { room, floor } = roomWithFloor();
    ContainmentApi.move(crock, room);
    held(crock);
    through(3600);
    const lost = 10 - held(crock);
    expect(lost).toBeGreaterThan(1.7);
    expect(lost).toBeLessThan(1.9);
    expect(puddle(floor)).toBeCloseTo(lost, 6);
  });

  it('⭐⭐ a sprung stave drains a full 25 L cask about a third in an hour — and `fit` stops it', () => {
    const { room, floor } = roomWithFloor();
    const cask = makeStuff(() => holding(new Cask(), oak, 25, 25));
    cask.recordAssembly(staves(1), hoops());
    ContainmentApi.move(cask, room);
    expect(cask.jointLeakShare()).toBeCloseTo(0.4, 9);
    held(cask); // the first read stamps the clock
    through(3600);
    const after = held(cask);
    // `crafting.joint.failedSharePerHour` 0.4: 1 − e^−0.4 ≈ 0.33 of it gone.
    expect((25 - after) / 25).toBeCloseTo(1 - Math.exp(-0.4), 2);
    expect(puddle(floor)).toBeCloseTo(25 - after, 6);
    // `fit stave to cask` — a new stave in the sprung one's place.
    cask.replaceMembers('stave', 1, { material: oak.getTemplatePath()!, grade: 'fair', maker: '/test/cooper' });
    expect(cask.jointLeakShare()).toBe(0);
    through(3600);
    expect(held(cask)).toBeCloseTo(after, 6);
  });

  it('⭐ a dried-out cask still spills a refill: its slack hoops let the pour run through', () => {
    const { room, floor } = roomWithFloor();
    const cask = makeStuff(() => holding(new Cask(), oak, 0, 25));
    cask.recordAssembly(staves(0), hoops());
    cask.slackenJoint('hooping', 0.6);
    ContainmentApi.move(cask, room);
    expect(cask.isLiquidTight()).toBe(false);
    const jug = makeStuff(() => holding(new Crock(), oak, 5, 5));
    ContainmentApi.move(jug, room);
    const out = BulkableApi.transfer(jug.getBulk('interior'), cask.getBulk('interior'), { kind: 'all' });
    expect(out.status).toBe('drained');
    expect(held(cask)).toBe(0);
    expect(puddle(floor)).toBeCloseTo(5, 6);
  });

  it('⭐⭐ the WAKE: a leaking cask nobody reads runs out at its dregs, on time (testing.md § Test the WAKE)', () => {
    const { room, floor } = roomWithFloor();
    const cask = makeStuff(() => holding(new Cask(), oak, 25, 25));
    cask.recordAssembly(staves(1), hoops());
    ContainmentApi.move(cask, room);
    held(cask); // filled and looked at once: the leak arms its one wake
    const dueS = cask.leakWakeAtS - gameNow();
    // The share law's time to `flaws.leak.dregsL` (0.05 L): ln(25 / 0.05) / 0.4 hours.
    expect(dueS / 3600).toBeCloseTo(Math.log(25 / 0.05) / 0.4, 0);
    through(dueS - 120);
    expect(puddle(floor)).toBe(0); // nobody read it: nothing has moved yet
    through(240);
    // No read of the cask: the wake ran it out onto the floor.
    expect(puddle(floor)).toBeCloseTo(25, 6);
    expect(cask.leakWakeAtS).toBe(0);
    expect(held(cask)).toBe(0);
  });

  it('a restart mid-leak re-arms from the persisted due time', () => {
    const { room, floor } = roomWithFloor();
    const cask = makeStuff(() => holding(new Cask(), oak, 25, 25));
    cask.recordAssembly(staves(1), hoops());
    ContainmentApi.move(cask, room);
    held(cask);
    const due = cask.leakWakeAtS;
    // The restore door: the persisted due time re-arms through its setter.
    cask.setLeakWakeAtS(0);
    cask.setLeakWakeAtS(due);
    through(due - gameNow() + 60);
    expect(puddle(floor)).toBeCloseTo(25, 6);
  });
});
