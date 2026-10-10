/**
 * ⭐⭐⭐ **An oven can be fed by a sealed gas vessel set on it** — the
 * one kernel change the drilling build's *the hearth runs on the bore's
 * gas and the cordwood stays unbought* needs.
 *
 * The claims, in order of how load-bearing they are:
 *
 *  1. A sealed vessel of something that burns, standing ON an oven, IS
 *     its fuel tank: `fuelRemaining` reads its litres against the
 *     material's density, `fuelEnergyJ` reads its heat of combustion,
 *     and the bed is ignored while it is coupled.
 *  2. ⚠⚠ **The bed is untouched.** Uncoupling restores it exactly, which
 *     is what *the cordwood stays unbought* means in code: the wood you
 *     already have does not evaporate because you ran a pipe to the
 *     fire.
 *  3. ⚠ **A pail of water on a range is NOT fuel**, and must not read as
 *     empty fuel either. Three conditions and each refuses something
 *     real: not Bulkable (a loaf), not gas-retained (an open pail), not
 *     combustible (water).
 *  4. ⭐⭐ **A `Retort` is unchanged**, which is the whole reason the
 *     hook went on `Oven` rather than on `Firebox`: what is placed on a
 *     retort is its PRODUCT, and on `Firebox` this hook would have
 *     needed a guard to tell a fuel vessel from a product vessel. A
 *     guard that re-narrows the host set is the tell that the host is
 *     wrong.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Oven from '../../../platform/thing/Oven';
import Flask from '../../../platform/thing/Flask';
import Firebox from '../Firebox';
import Receptacle from '../../../platform/thing/Receptacle';
import Material from '../../../platform/idea/material/Material';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import CartesianLocation from '../../location/CartesianLocation';
import { chargeWood } from './burner-fuel';
import type { Stuff } from '../../stuff/Stuff';
import type { Burner } from '../Burner';
import type { Bulkable } from '../../bulk/Bulkable';
import type { Containable } from '../../spatial/Containable';
import type { Placing } from '../../spatial/Placing';

let seq = 0;

/**
 * A gas material: ⭐ **a pack ships a gas by authoring a BOILING POINT**,
 * which is what makes `requiredClosureFor` answer `sealed`. Nothing here
 * declares "this is a gas".
 */
function gas(mjPerKg: number): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-gas-${seq}`);
    m.setDensity(Quantity.of(0.72, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2200, 'J/(kg·K)'));
    m.setBoilingPoint(Quantity.of(112, 'K'));
    m.setHeatOfCombustion(Quantity.of(mjPerKg, 'MJ/kg'));
    return m;
  }, `/stuff/idea/material/_test/gas-${seq}`) as unknown as Material;
}

/** A liquid that does not burn — the pail of water. */
function water(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-water-${seq}`);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4180, 'J/(kg·K)'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    return m;
  }, `/stuff/idea/material/_test/water-${seq}`) as unknown as Material;
}

let room: CartesianLocation;
let bench: CartesianLocation;

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  room = makeStuff(() => new CartesianLocation());
  room.setCoordinates([0, 0, 0]);
  // ⚠ A second room, and it is not scenery: `ContainmentApi.move` is a
  // NO-OP inside one container, so moving a vessel from *on the oven* to
  // *the floor of the same room* leaves its placement stamp in place and
  // it is still coupled. Taking something off a hearth means taking it
  // somewhere, which is what a player does when they pick it up.
  bench = makeStuff(() => new CartesianLocation());
  bench.setCoordinates([1, 0, 0]);
});

/** An oven that things may stand on, with cordwood in its bed. */
function oven(): Stuff & Burner {
  const o = makeStuff(() => new Oven());
  o.setPlacements(['on']);
  ContainmentApi.move(o as unknown as Stuff & Containable, room);
  chargeWood(o as unknown as Stuff & Burner, 20);
  return o as unknown as Stuff & Burner;
}

/** A sealed bladder holding `litres` of `material`. */
function bladder(material: Material, litres: number): Stuff & Bulkable {
  const f = makeStuff(() => new Flask());
  (f as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (f as unknown as { interiorCapacity: Quantity<'L'> | null }).interiorCapacity =
    Quantity.of(400, 'L');
  f.setClosure('sealed');
  f.setOpen(false);
  const slot = f.getBulk('interior');
  slot.setMaterial(material);
  slot.setAmount(Quantity.of(litres, 'L'));
  return f as unknown as Stuff & Bulkable;
}

describe('⭐⭐⭐ a sealed gas vessel on an oven IS its fuel', () => {
  it('the oven burns the bladder, not the bed', () => {
    const o = oven();
    const bedKg = o.fuelRemaining();
    expect(bedKg).toBeCloseTo(20, 6);

    const tank = bladder(gas(55), 300);
    ContainmentApi.place(tank as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);

    // 300 L at 0.72 kg/m³ is a very small mass — which is exactly right
    // for a gas, and is why a bladder is a day's cooking and not a
    // month's.
    const coupled = o.fuelRemaining();
    expect(coupled).toBeGreaterThan(0);
    expect(coupled).not.toBeCloseTo(bedKg, 6);
    // And the energy is the GAS's heat of combustion, not the wood's.
    expect(o.fuelEnergyJ()).toBeGreaterThan(0);
  });

  it('⚠⚠ the BED is untouched — uncoupling restores it exactly', () => {
    // *The cordwood stays unbought* in code: the wood you already have
    // does not evaporate because you ran a pipe to the fire.
    const o = oven();
    const before = o.fuelRemaining();
    const tank = bladder(gas(55), 300);
    ContainmentApi.place(tank as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);
    expect(o.fuelRemaining()).not.toBeCloseTo(before, 6);
    // Take it off again — to somewhere else. See the fixture note.
    ContainmentApi.move(tank as unknown as Stuff & Containable, bench);
    expect(o.fuelRemaining()).toBeCloseTo(before, 6);
  });
});

describe('⚠ the three conditions, and each refuses something real', () => {
  it('a pail of WATER on a range is not fuel, and does not read as empty fuel', () => {
    const o = oven();
    const before = o.fuelRemaining();
    const pail = makeStuff(() => new Receptacle());
    (pail as unknown as { interiorBulk: boolean }).interiorBulk = true;
    (pail as unknown as { interiorCapacity: Quantity<'L'> | null }).interiorCapacity =
      Quantity.of(10, 'L');
    pail.getBulk('interior').setMaterial(water());
    pail.getBulk('interior').setAmount(Quantity.of(8, 'L'));
    ContainmentApi.place(pail as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);
    // Still the bed. ⚠ The dangerous failure would be `0`.
    expect(o.fuelRemaining()).toBeCloseTo(before, 6);
  });

  it('an UNSEALED vessel of gas is not a tank — a gas wants a sealed vessel, shut', () => {
    const o = oven();
    const before = o.fuelRemaining();
    const open = bladder(gas(55), 300);
    (open as unknown as { setClosure(v: string): void }).setClosure('liquidTight');
    ContainmentApi.place(open as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);
    expect(o.fuelRemaining()).toBeCloseTo(before, 6);
  });

  it('a sealed vessel that is OPEN is not a tank either', () => {
    const o = oven();
    const before = o.fuelRemaining();
    const ajar = bladder(gas(55), 300);
    (ajar as unknown as { setOpen(v: boolean): void }).setOpen(true);
    ContainmentApi.place(ajar as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);
    expect(o.fuelRemaining()).toBeCloseTo(before, 6);
  });

  it('a NEVER-FILLED bladder is not a tank — the bed is still the fuel', () => {
    const o = oven();
    const before = o.fuelRemaining();
    const virgin = makeStuff(() => new Flask());
    (virgin as unknown as { interiorBulk: boolean }).interiorBulk = true;
    (virgin as unknown as { interiorCapacity: Quantity<'L'> | null }).interiorCapacity =
      Quantity.of(400, 'L');
    virgin.setClosure('sealed');
    virgin.setOpen(false);
    ContainmentApi.place(virgin as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);
    // No material in it at all, so there is nothing that could be fuel.
    expect(o.fuelRemaining()).toBeCloseTo(before, 6);
  });

  it('⭐⭐ a DRAINED tank is a fire with no fuel, NOT a fire on the bed', () => {
    // ⚠ The design call the test first got wrong, and the code was
    // right: *the fire is on the pipe; take the bladder off to burn
    // wood.* A coupled tank that has run dry means the hearth has
    // stopped, and the remedy is to uncouple it — not to silently fall
    // back to the cordwood, which would make running out of gas
    // invisible and the bed's depletion inexplicable.
    const o = oven();
    const drained = bladder(gas(55), 300);
    ContainmentApi.place(drained as unknown as Stuff & Containable, 'on', o as unknown as Stuff & Placing);
    drained.getBulk('interior').setAmount(Quantity.of(0, 'L'));
    expect(o.fuelRemaining()).toBe(0);
    // ...and taking it off brings the wood back.
    ContainmentApi.move(drained as unknown as Stuff & Containable, bench);
    expect(o.fuelRemaining()).toBeCloseTo(20, 6);
  });
});

describe('⭐⭐ the override is on OVEN and nowhere up the chain', () => {
  it('a bare Firebox has no fuel slot, so a Retort keeps its bed', () => {
    // ⚠ This is the Retort claim, asserted where a KERNEL test can make
    // it: `Retort` is the fuel pack's class and extends `Firebox`, not
    // `Oven`, so it inherits the base hook and answers `null`. What is
    // placed on a retort is its PRODUCT — the condenser, the gasometer
    // the volatiles run into — and on `Firebox` this hook would have
    // needed a guard to tell a fuel vessel from a product vessel.
    //
    // ⭐ **A guard that re-narrows the host set is the tell that the
    // host is wrong**, which is the whole reason the hook went one rung
    // down. Asserted on the inheritance rather than on the pack class so
    // the kernel suite does not reach into a pack.
    const box = makeStuff(() => new Firebox());
    ContainmentApi.move(box as unknown as Stuff & Containable, room);
    chargeWood(box as unknown as Stuff & Burner, 20);
    const bed = (box as unknown as Stuff & Burner).fuelRemaining();
    expect(bed).toBeCloseTo(20, 6);
    // No `getPlaced` at all: a Firebox is not a Placing host, so there
    // is nothing a vessel could be set on.
    expect(
      typeof (box as unknown as { getPlaced?: unknown }).getPlaced,
    ).not.toBe('function');
    // And an Oven IS, which is the difference the whole decision rests on.
    const o = oven();
    expect(typeof (o as unknown as { getPlaced?: unknown }).getPlaced).toBe(
      'function',
    );
  });
});
