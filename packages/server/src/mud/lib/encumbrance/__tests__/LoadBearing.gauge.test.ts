/**
 * LoadBearingMixin — the gauge: the weighted burden tree-walk (both
 * stores, transmission product, placement coupling, cycle/depth safety)
 * and the physiology-derived carry capacity (condition-band + endurance
 * margins, the spiral with its gentle floor).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Quantity } from '../../quantity';
import { LOAD_BEARING_DEFAULTS } from '../LoadBearing';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  bearerCreature,
  massThing,
  wornThing,
  heldThing,
  vessel,
  equip,
} from './encumbrance-fixtures';

const { CAPACITY_FRACTION, LOOSE_CARRY_SURCHARGE, OVERLOAD_FACTOR, ENDURANCE_FLOOR } =
  LOAD_BEARING_DEFAULTS;

describe('LoadBearing — composition', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('Creature composes LoadBearingMixin and the predicate narrows', () => {
    const c = bearerCreature();
    expect(MixinApi.hasMixin(c, Mixins.LoadBearing)).toBe(true);
    expect(MixinApi.isLoadBearing(c)).toBe(true);
  });
});

describe('LoadBearing — getBorneBurden (the weighted tree-walk)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('an empty bearer bears nothing (body mass is not burden)', () => {
    const c = bearerCreature(70);
    expect(c.getBorneBurden().rawValue()).toBe(0);
  });

  it('a loose-carried item pays the held surcharge', () => {
    const c = bearerCreature();
    ContainmentApi.move(massThing(10), c);
    expect(c.getBorneBurden().rawValue()).toBeCloseTo(10 * LOOSE_CARRY_SURCHARGE);
  });

  it('a worn item counts at the worn floor (1.0)', () => {
    const c = bearerCreature();
    equip(c, wornThing(10), 'torso');
    expect(c.getBorneBurden().rawValue()).toBeCloseTo(10);
  });

  it('a held item counts at the held surcharge', () => {
    const c = bearerCreature();
    equip(c, heldThing(10), 'hand:left');
    expect(c.getBorneBurden().rawValue()).toBeCloseTo(10 * LOOSE_CARRY_SURCHARGE);
  });

  it('sums a nested container: self + child, placement carried down', () => {
    const c = bearerCreature();
    const bag = vessel(2, 1.0); // full transmission
    ContainmentApi.move(massThing(10), bag);
    ContainmentApi.move(bag, c);
    // bag self: 2 * 1.0(transmission) * 1.25(loose placement) = 2.5
    // child:   10 * 1.0 * 1.25                                = 12.5
    expect(c.getBorneBurden().rawValue()).toBeCloseTo(
      2 * LOOSE_CARRY_SURCHARGE + 10 * LOOSE_CARRY_SURCHARGE,
    );
  });

  it('an attenuating container drops its subtree toward zero', () => {
    const c = bearerCreature();
    const bagOfHolding = vessel(1, 0.05); // near-zero transmission
    ContainmentApi.move(massThing(100), bagOfHolding);
    ContainmentApi.move(bagOfHolding, c);
    // bag self: 1 * 1.0 * 1.25                   = 1.25
    // child:    100 * 0.05 * 1.25                = 6.25
    const burden = c.getBorneBurden().rawValue();
    expect(burden).toBeCloseTo(1 * LOOSE_CARRY_SURCHARGE + 100 * 0.05 * LOOSE_CARRY_SURCHARGE);
    expect(burden).toBeLessThan(10); // 100 kg of cargo, but barely felt
  });

  it('the same item in both stores is counted once (visited guard)', () => {
    const c = bearerCreature();
    const shared = wornThing(10);
    equip(c, shared, 'torso');
    // Force the same instance into general contents too (pathological).
    ContainmentApi.move(shared, c);
    // Counted once — worn floor (slots walked first → 10), not 10 + 12.5.
    // Either store may win the first visit; assert it is not double-counted.
    expect(c.getBorneBurden().rawValue()).toBeLessThan(10 * LOOSE_CARRY_SURCHARGE + 10);
    expect(c.getBorneBurden().rawValue()).toBeGreaterThanOrEqual(10);
  });
});

describe('LoadBearing — getCarryCapacity (physiology-derived)', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('baseline capacity = body mass × CAPACITY_FRACTION (healthy, rested)', () => {
    const c = bearerCreature(70);
    expect(c.getCarryCapacity().rawValue()).toBeCloseTo(70 * CAPACITY_FRACTION);
  });

  it('strain ceiling = capacity × OVERLOAD_FACTOR', () => {
    const c = bearerCreature(70);
    expect(c.getStrainCeiling().rawValue()).toBeCloseTo(
      70 * CAPACITY_FRACTION * OVERLOAD_FACTOR,
    );
  });

  it('the spiral: low endurance shaves capacity but never to zero', () => {
    const c = bearerCreature(70);
    const full = c.getCarryCapacity().rawValue();
    // Drain endurance to 50% (not floored → band stays healthy, isolating
    // the endurance margin): margin = FLOOR + (1-FLOOR)*0.5.
    c.adjustReserve('endurance', Quantity.of(-50, '%'));
    const drained = c.getCarryCapacity().rawValue();
    expect(drained).toBeLessThan(full);
    expect(drained).toBeCloseTo(full * (ENDURANCE_FLOOR + (1 - ENDURANCE_FLOOR) * 0.5));
    // Even emptied, capacity stays positive (the gentle floor).
    c.adjustReserve('endurance', Quantity.of(-100, '%')); // → 0
    expect(c.getCarryCapacity().rawValue()).toBeGreaterThan(0);
  });

  it('a degraded condition band lowers capacity', () => {
    const c = bearerCreature(70);
    const healthy = c.getCarryCapacity().rawValue();
    // Floor satiation (not endurance) → band degrades while the endurance
    // margin stays 1.0, isolating the condition-band margin.
    c.adjustReserve('satiation', Quantity.of(-100, '%'));
    expect(c.getConditionBand()).not.toBe('healthy');
    const degraded = c.getCarryCapacity().rawValue();
    expect(degraded).toBeLessThan(healthy);
    expect(degraded).toBeGreaterThan(0);
  });
});

describe('LoadBearing — getLoadRatio', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('ratio = burden / capacity', () => {
    const c = bearerCreature(70); // capacity 35
    equip(c, wornThing(35), 'torso'); // worn floor → burden 35
    expect(c.getLoadRatio()).toBeCloseTo(1.0);
  });

  it('zero capacity with positive burden reads as Infinity (over-ceiling)', () => {
    const c = bearerCreature(0); // no body mass → zero capacity
    ContainmentApi.move(massThing(5), c);
    expect(c.getLoadRatio()).toBe(Infinity);
  });
});
