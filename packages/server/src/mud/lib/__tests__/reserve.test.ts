/**
 * ReservedMixin — the generalized reserve substrate on a living body:
 * the three biological reserves at full, the [0, capacity] clamp on
 * the setter, and the authored-thematic seam (a non-biological reserve
 * definable on the same axis).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../creature/Creature';
import { Quantity } from '../quantity';
import { BIOLOGICAL_RESERVE_KEYS } from '../reserve';
import { StuffApi } from '../../api/stuff';
import { makeStuff } from '../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../persistence/__tests__/quantity-marshaller-test-helpers';

describe('ReservedMixin — biological reserves', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a living body starts with the three biological reserves at full', () => {
    const c = makeStuff(() => new Creature());
    expect([...c.getReserves().keys()].sort()).toEqual(
      [...BIOLOGICAL_RESERVE_KEYS].sort(),
    );
    expect(c.getReserve('endurance')?.current.rawValue()).toBe(100);
    expect(c.getReserve('endurance')?.theme).toBe('biological');
  });

  it('adjustReserve clamps to [0, capacity]', () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve('endurance', Quantity.of(-150, '%'));
    expect(c.getReserve('endurance')?.current.rawValue()).toBe(0);
    c.adjustReserve('endurance', Quantity.of(500, '%'));
    expect(c.getReserve('endurance')?.current.rawValue()).toBe(100);
  });

  it('adjustReserve rejects a unit mismatch', () => {
    const c = makeStuff(() => new Creature());
    expect(() => c.adjustReserve('endurance', Quantity.of(5, 'L'))).toThrow(
      TypeError,
    );
  });

  it('adjustReserve on an unknown reserve throws', () => {
    const c = makeStuff(() => new Creature());
    expect(() => c.adjustReserve('nope', Quantity.of(1, '%'))).toThrow();
  });
});

describe('ReservedMixin — authored-thematic seam', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('defines a non-biological reserve on the same axis and round-trips it', () => {
    const c = makeStuff(() => new Creature());
    c.setReserve({
      key: 'charge',
      capacity: Quantity.of(50, '%'),
      current: Quantity.of(30, '%'),
      theme: 'arcane',
      floorEffect: null,
    });
    const charge = c.getReserve('charge');
    expect(charge?.theme).toBe('arcane');
    expect(charge?.current.rawValue()).toBe(30);
    expect(c.hasReserve('charge')).toBe(true);
    expect(c.removeReserve('charge')).toBe(true);
    expect(c.hasReserve('charge')).toBe(false);
  });

  it('setReserve clamps current to capacity', () => {
    const c = makeStuff(() => new Creature());
    c.setReserve({
      key: 'x',
      capacity: Quantity.of(10, '%'),
      current: Quantity.of(50, '%'),
      theme: 't',
      floorEffect: null,
    });
    expect(c.getReserve('x')?.current.rawValue()).toBe(10);
  });
});
