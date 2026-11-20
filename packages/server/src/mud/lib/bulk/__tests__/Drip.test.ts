/**
 * ⭐⭐ The one drip (matter-model-overlaps D10): what leaves a thing runs to
 * what is under it — the vessel it is IN, then the vessel it stands ON, then
 * the floor (`Containable.dripSlots`) — by `BulkableApi.drip`, which fills
 * them in order by `transfer`, skips a vessel holding another liquid, wets a
 * non-vessel it passes through, and soaks into the ground what a floor of
 * another liquid will not take.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import Floor from '../../../platform/thing/Floor';
import { BulkableMixin } from '../Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { PlacingMixin } from '../../spatial/Placing';
import { Placements } from '../../spatial/Placement';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { ContainmentApi } from '../../../api/containment';
import { DetachedError } from '../../errors';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Room extends Place {}
/** A jug: holds liquid. */
class Jug extends BulkableMixin(Good) {
  static _mixinName = 'DripJug';
}
/** A crock a filter can sit in, and a pot a thing can stand on. */
class Crock extends PlacingMixin(BulkableMixin(ContainerMixin(Good))) {
  static _mixinName = 'DripCrock';
}
/** A pack: holds things, holds no liquid. */
class Pack extends ContainerMixin(Good) {
  static _mixinName = 'DripPack';
}

const WATER = '/stuff/idea/material/_drip/water';
const OIL = '/stuff/idea/material/_drip/oil';

function liquid(path: string): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setTags(['liquid']);
    return m;
  }, path) as unknown as Material;
}

function vessel<T extends Stuff>(v: T, mat: Material | null, litres: number, capL = 10): T {
  const b = v as unknown as {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material | null): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(capL, 'L'));
  b.setBulkMaterial('interior', mat);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  return v;
}

function roomWithFloor(): { room: Room; floor: Floor } {
  const room = makeStuff(() => new Room());
  const floor = makeStuff(() => new Floor());
  floor.surfaceBulk = true;
  floor.setSurfaceCapacity(Quantity.of(100, 'L'));
  room.addFixture(floor);
  return { room, floor };
}

const amount = (v: Stuff, a: 'interior' | 'surface' = 'interior'): number =>
  (v as unknown as { getBulkAmount(a: string): Quantity<'L'> }).getBulkAmount(a).rawValue();

describe('⭐⭐ the one drip — in, then on, then the floor', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });

  it('dripSlots: the vessel it is IN, then the one it stands ON, then the floor', () => {
    const { room, floor } = roomWithFloor();
    const outer = vessel(makeStuff(() => new Crock()), null, 0);
    ContainmentApi.move(outer, room);
    const base = vessel(makeStuff(() => new Crock()), null, 0);
    ContainmentApi.move(base, room);
    const inner = vessel(makeStuff(() => new Crock()), null, 0);
    ContainmentApi.move(inner, outer);
    const jug = vessel(makeStuff(() => new Jug()), liquid(WATER), 1);
    ContainmentApi.move(jug, inner);
    expect(jug.dripSlots().map((s) => s.getHolder())).toEqual([inner, floor]);
    const onIt = vessel(makeStuff(() => new Jug()), liquid(WATER), 1);
    ContainmentApi.move(onIt, base, Placements.ON);
    expect(onIt.dripSlots().map((s) => [s.getHolder(), s.affordance])).toEqual([
      [base, 'interior'],
      [floor, 'surface'],
    ]);
  });

  it('fills what is under it in order — the rest runs on to the floor', () => {
    const { room, floor } = roomWithFloor();
    const pot = vessel(makeStuff(() => new Crock()), null, 0, 0.5);
    ContainmentApi.move(pot, room);
    const jug = vessel(makeStuff(() => new Jug()), liquid(WATER), 2);
    ContainmentApi.move(jug, pot, Placements.ON);
    const out = BulkableApi.drip({ from: jug.getBulk('interior'), litres: 1.5 });
    expect(out.caught).toBeCloseTo(1.5, 9);
    expect(amount(pot)).toBeCloseTo(0.5, 9);
    expect(amount(floor, 'surface')).toBeCloseTo(1, 9);
    expect(amount(jug)).toBeCloseTo(0.5, 9);
  });

  it('skips a vessel holding another liquid', () => {
    const { room, floor } = roomWithFloor();
    const pot = vessel(makeStuff(() => new Crock()), liquid(OIL), 1);
    ContainmentApi.move(pot, room);
    const jug = vessel(makeStuff(() => new Jug()), liquid(WATER), 2);
    ContainmentApi.move(jug, pot, Placements.ON);
    BulkableApi.drip({ from: jug.getBulk('interior'), litres: 1 });
    expect(amount(pot)).toBe(1);
    expect(floor.getBulkMaterial('surface')?.getTemplatePath()).toBe(WATER);
    expect(amount(floor, 'surface')).toBeCloseTo(1, 9);
  });

  it('⭐ a floor already wet with another liquid takes none: the rest soaks into the ground, said', () => {
    const { room, floor } = roomWithFloor();
    floor.setBulkMaterial('surface', liquid(OIL));
    floor.setBulkAmount('surface', Quantity.of(0.3, 'L'));
    const jug = vessel(makeStuff(() => new Jug()), liquid(WATER), 2);
    ContainmentApi.move(jug, room);
    const out = BulkableApi.drip({ from: jug.getBulk('interior'), litres: 1 });
    expect(out.soaked).toBeCloseTo(1, 9);
    expect(out.drained).toBeCloseTo(1, 9);
    expect(amount(jug)).toBeCloseTo(1, 9);
    // The puddle that was there stays.
    expect(amount(floor, 'surface')).toBeCloseTo(0.3, 9);
  });

  it('⭐ a leaking jug in a pack wets the pack, and the rest puddles at the carrier’s feet', () => {
    const { room, floor } = roomWithFloor();
    const carrier = makeStuff(() => new Pack());
    ContainmentApi.move(carrier, room);
    const pack = makeStuff(() => new Pack());
    pack.setMass(Quantity.of(1, 'kg'));
    ContainmentApi.move(pack, carrier);
    const jug = vessel(makeStuff(() => new Jug()), liquid(WATER), 2);
    ContainmentApi.move(jug, pack);
    const capKg = pack.waterCapacityKg();
    expect(capKg).toBeGreaterThan(0);
    const out = BulkableApi.drip({ from: jug.getBulk('interior'), litres: 1 });
    expect(out.wetted).toBe(pack);
    expect(pack.getWetness()).toBeCloseTo(1, 6);
    // What the pack could not hold is on the floor of the place it is in.
    expect(amount(floor, 'surface')).toBeCloseTo(1 - capKg, 6);
    expect(amount(jug)).toBeCloseTo(1, 9);
  });

  it('liquid a SOLID gives up lands the same way — no slot behind it', () => {
    const { room, floor } = roomWithFloor();
    const heap = makeStuff(() => new Pack());
    ContainmentApi.move(heap, room);
    BulkableApi.drip({ off: heap, material: liquid(WATER), litres: 0.4, payload: { hardnessDgh: 3 } });
    expect(amount(floor, 'surface')).toBeCloseTo(0.4, 9);
    expect(floor.getBulkPayload('surface')?.hardnessDgh).toBe(3);
  });

  it('with nothing under it at all, it throws', () => {
    const jug = vessel(makeStuff(() => new Jug()), liquid(WATER), 2);
    expect(() => BulkableApi.drip({ from: jug.getBulk('interior'), litres: 1 })).toThrow(DetachedError);
  });
});
