/**
 * ⭐ Weight is mass × the place's gravity (size-and-carrying W4): the burden
 * line reads 0 at zero g and 38 % on Mars, and keeps the water's buoyancy
 * as shipped. Plus the pass order (slots first — a worn coat is not
 * charged the held surcharge) and the awkwardness of a held load.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';
import { LOAD_BEARING_DEFAULTS } from '../LoadBearing';
import { makeBody, tool, hold, wornBag, pack, handsOf } from '../../slot/__tests__/carrying-fixture';

describe('LoadBearing — weight by the place (W4)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  const heldSurcharge = LOAD_BEARING_DEFAULTS.HELD_SURCHARGE;

  it('a held 10 kg weighs 10 kg × the held surcharge at standard gravity', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    hold(me, plan, tool('kettlebell', 10, [0.2, 0.2, 0.2]));
    expect(me.getBorneBurden().rawValue()).toBeCloseTo(10 * heldSurcharge * me.awkwardnessOf(me.heldThings()[0]!), 5);
  });

  it('zero g: nothing on the burden line, and the mass and the hands it takes are unchanged', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const kb = hold(me, plan, tool('kettlebell', 12, [0.2, 0.2, 0.2]));
    room.setGravity(Quantity.of(0, 'm/s²'));
    expect(me.getBorneBurden().rawValue()).toBe(0);
    expect(kb.getMass().rawValue()).toBe(12);
    expect(handsOf(me, kb)).toBe(2);
  });

  it('D10-d: the hands judge MASS — a full pack takes both at 9.81 and at zero g; only the burden goes to 0', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    // A 2 kg pack holding 12 kg: no one piece is heavy, the pack is.
    const full = pack('rucksack', 2, [0.35, 0.25, 0.55]);
    ContainmentApi.move(full, room);
    for (let i = 0; i < 4; i++) ContainmentApi.move(tool(`stone-${i}`, 3, [0.1, 0.1, 0.1]), full);
    // Shut: weightless, what is in an open pack drifts out of it (W1).
    full.setOpen(false);
    const empty = pack('daysack', 2, [0.35, 0.25, 0.55]);
    ContainmentApi.move(empty, room);
    expect(me.ladenMassOf(full).rawValue()).toBeCloseTo(14, 5);
    const atEarth = handsOf(me, full);
    expect(atEarth).toBe(2);
    expect(handsOf(me, empty)).toBe(1);
    room.setGravity(Quantity.of(0, 'm/s²'));
    expect(me.ladenMassOf(full).rawValue()).toBeCloseTo(14, 5);
    expect(handsOf(me, full)).toBe(atEarth);
    expect(handsOf(me, empty)).toBe(1);
    hold(me, plan, tool('kettlebell', 12, [0.2, 0.2, 0.2]));
    expect(me.getBorneBurden().rawValue()).toBe(0);
  });

  it('Mars: 0.38 of the standard burden', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    hold(me, plan, tool('kettlebell', 10, [0.2, 0.2, 0.2]));
    const earth = me.getBorneBurden().rawValue();
    room.setGravity(Quantity.of(9.81 * 0.38, 'm/s²'));
    expect(me.getBorneBurden().rawValue()).toBeCloseTo(earth * 0.38, 5);
  });

  it('in the water each thing counts by its buoyancy, as shipped', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    hold(me, plan, tool('kettlebell', 10, [0.2, 0.2, 0.2]));
    const dry = me.getBorneBurden().rawValue();
    // No material: neutral density — water buoys it to (near) nothing.
    expect(me.getBorneBurden(1000).rawValue()).toBeLessThan(dry);
  });

  it('slots first: a worn bag in the contents is charged the worn floor, not the held surcharge', () => {
    const { me, plan } = makeBody();
    const room = makeStuff(() => new Location());
    ContainmentApi.move(me, room);
    const bag = wornBag(me, plan, 'satchel', 'torso');
    bag.setMass(Quantity.of(4, 'kg'));
    expect(me.getBorneBurden().rawValue()).toBeCloseTo(4, 5);
  });

  it('a held pole longer than you are tall is awkward; walking is fine, running refuses', () => {
    const { me, plan } = makeBody();
    const pole = hold(me, plan, tool('pole', 3, [0.05, 0.05, 3]));
    expect(me.awkwardnessOf(pole)).toBeGreaterThan(1.3);
    const short = tool('knife', 0.3, [0.03, 0.02, 0.25]);
    expect(me.awkwardnessOf(short)).toBeCloseTo(1, 1);
  });
});
