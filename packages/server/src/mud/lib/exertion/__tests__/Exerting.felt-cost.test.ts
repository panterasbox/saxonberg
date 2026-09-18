/**
 * ⭐⭐ The felt-cost pins (plan D7). The five `%`-point debits that used
 * to live in mining, farming, the smelt and the loaded traverse now ride
 * one exertion event — and at each act's reference duration on a FRESH
 * body the debit is what it was, exactly. These numbers must hold; the
 * rest of `body.yaml` is playtest.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { LOAD_BEARING_DEFAULTS } from '../../encumbrance/LoadBearing';
import type { LocomotionMode } from '../../../platform/idea/LocomotionMode';

describe('felt cost — the five debits, preserved by construction', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const fresh = (): Creature => {
    const c = makeStuff(() => new Creature());
    c.setMass(Quantity.of(70, 'kg'));
    return c;
  };
  const debit = (powerW: number, durationS: number): number => {
    const c = fresh();
    c.exert({ durationS, powerW });
    return 100 - c.getEndurance().current.rawValue();
  };

  it('the mine: hew 4 / drive 12 / shore 8 at their reference durations', () => {
    expect(debit(967, 9)).toBeCloseTo(4, 1);
    expect(debit(750, 40)).toBeCloseTo(12, 6);
    expect(debit(900, 20)).toBeCloseTo(8, 6);
  });

  it('the smelt: 10 over two minutes', () => {
    expect(debit(425, 120)).toBeCloseTo(10, 6);
  });

  it('the field: lime 4 / ditch 5 / grub 6 / mow 8 / plough 14 through wattsForFeltCost', () => {
    const c = fresh();
    for (const [cost, durationS] of [
      [4, 4],
      [5, 5],
      [6, 4],
      [8, 3],
      [14, 14],
    ] as const) {
      expect(debit(c.wattsForFeltCost(cost, durationS), durationS)).toBeCloseTo(cost, 6);
    }
    // …and the draught still divides the plough: 14 / 2 behind an ox.
    expect(debit(c.wattsForFeltCost(7, 7), 7)).toBeCloseTo(7, 6);
  });

  it('⭐ the loaded traverse: 2.0 × (ratio − 0.25) per exit, and nothing under the floor', () => {
    const traverse = (ratio: number): number => {
      const c = fresh();
      vi.spyOn(c, 'getLoadRatio').mockReturnValue(ratio);
      const walk = { getName: () => 'walk', getCostMultiplier: () => 1, getSpeed: () => 1 } as unknown as LocomotionMode;
      c.exertTraverse(walk);
      return 100 - c.getEndurance().current.rawValue();
    };
    expect(traverse(0.2)).toBe(0);
    expect(traverse(LOAD_BEARING_DEFAULTS.LIGHT_LOAD_FLOOR)).toBe(0);
    expect(traverse(1.0)).toBeCloseTo(2.0 * (1.0 - 0.25), 2);
    expect(traverse(1.75)).toBeCloseTo(2.0 * (1.75 - 0.25), 2);
  });

  it('a wheeled cart still hauls free — its draft sits under the floor', () => {
    const c = fresh();
    vi.spyOn(c, 'getLoadRatio').mockReturnValue(0.1);
    const walk = { getName: () => 'walk', getCostMultiplier: () => 1, getSpeed: () => 1 } as unknown as LocomotionMode;
    c.exertTraverse(walk);
    expect(c.getEndurance().current.rawValue()).toBe(100);
  });
});
