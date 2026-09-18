/**
 * ExertingMixin — one exertion event, and what the body does with it.
 *
 * ⭐ The debit is the EXCESS only (the aerobic threshold): a walk at
 * 300 W costs nothing, a run at 600 W costs 12 % per nominal exit on a
 * fresh body and nothing at wind 100. Wind and lean move per D6, lean
 * spends protein and stops when the load no longer clears the ceiling.
 * `canExert` refuses at the floor; `canSustainPace` is what breaks a
 * run; the band-crossing hook fires once per crossing.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { LocomotionMode } from '../../../platform/idea/LocomotionMode';

const mode = (name: string, costMultiplier: number, speed = 1): LocomotionMode =>
  ({
    getName: () => name,
    getCostMultiplier: () => costMultiplier,
    getSpeed: () => speed,
  }) as unknown as LocomotionMode;

const WALK = mode('walk', 1.0);
const RUN = mode('run', 2.0, 2);

describe('ExertingMixin — one exertion event', () => {
  let settings: Record<string, string>;
  beforeEach(() => {
    installV1QuantityMarshallers();
    settings = {};
    vi.spyOn(AppApi, 'setting').mockImplementation((k: string) => settings[k] ?? '');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const body = (): Creature => {
    const c = makeStuff(() => new Creature());
    c.setMass(Quantity.of(70, 'kg'));
    return c;
  };
  const set = (c: Creature, key: string, level: number): void => {
    const cur = c.getReserve(key)!.current.rawValue();
    c.adjustReserve(key, Quantity.of(level - cur, '%'));
  };
  const endurance = (c: Creature) => c.getEndurance().current.rawValue();

  it('every Creature exerts', () => {
    expect(MixinApi.isExerting(body())).toBe(true);
  });

  it('⭐ a walk at 300 W costs nothing — the aerobic threshold', () => {
    const c = body();
    c.exert({ durationS: 600, powerW: 300 });
    expect(endurance(c)).toBe(100);
  });

  it('⭐ a run at 600 W costs 12 % per nominal exit on a fresh body', () => {
    const c = body();
    c.exert({ durationS: 60, powerW: 600 });
    expect(endurance(c)).toBeCloseTo(88, 6);
  });

  it('⭐⭐ …and nothing at all at wind 100 — a conditioned body holds a run', () => {
    const c = body();
    set(c, 'wind', 100);
    expect(c.sustainableW()).toBeCloseTo(750, 6);
    c.exert({ durationS: 60, powerW: 600 });
    expect(endurance(c)).toBe(100);
  });

  it('wind grows with duration at a pace you can hold, and not under the floor', () => {
    const c = body();
    c.exert({ durationS: 3600, powerW: 300 });
    expect(c.getWind().current.rawValue()).toBeCloseTo(6, 6);
    const idle = body();
    idle.exert({ durationS: 3600, powerW: 100 });
    expect(idle.getWind().current.rawValue()).toBe(0);
    // A heavy act counts for its duration and no more.
    const heavy = body();
    heavy.exert({ durationS: 3600, powerW: 900 });
    expect(heavy.getWind().current.rawValue()).toBeCloseTo(6, 6);
  });

  it('⭐⭐ lean moves only on OVERLOAD, and spends protein', () => {
    const c = body();
    // Ceiling = 70 × 12 × 1.0 = 840 W; the threshold is 588 W.
    expect(c.ceilingW()).toBeCloseTo(840, 6);
    c.exert({ durationS: 3600, powerW: 500 });
    expect(c.getLean().current.rawValue()).toBe(50);
    c.exert({ durationS: 3600, powerW: 840 });
    expect(c.getLean().current.rawValue()).toBeCloseTo(52, 6);
    expect(c.getProtein().current.rawValue()).toBeCloseTo(50 - 3, 6);
  });

  it('⚠ no protein, no muscle — the pool is the cap', () => {
    const c = body();
    set(c, 'protein', 0);
    c.exert({ durationS: 3600, powerW: 840 });
    expect(c.getLean().current.rawValue()).toBe(50);
  });

  it('⭐ a load you have outgrown trains nothing — the ceiling rises with lean', () => {
    const c = body();
    set(c, 'lean', 80);
    // Margin 0.6 + 0.8 × 0.8 = 1.24 → ceiling 1041.6 → threshold 729 W.
    c.exert({ durationS: 3600, powerW: 700 });
    expect(c.getLean().current.rawValue()).toBe(80);
  });

  it('canExert refuses a step that would leave the body under the floor', () => {
    const c = body();
    set(c, 'endurance', 15);
    expect(c.canExert(300, 3600)).toBe(true); // free work is always allowed
    expect(c.canExert(900, 9)).toBe(true); // 3.6 % → 11.4 left
    expect(c.canExert(900, 20)).toBe(false); // 8 % → 7 left
    expect(c.exhaustionRefusal()).toBe("You're too tired for that.");
  });

  it('⭐ canSustainPace: a run holds above the pace floor and breaks under it; a walk always holds', () => {
    const c = body();
    expect(c.canSustainPace(RUN)).toBe(true);
    set(c, 'endurance', 40);
    expect(c.canSustainPace(RUN)).toBe(false);
    expect(c.canSustainPace(WALK)).toBe(true);
    set(c, 'wind', 100);
    expect(c.canSustainPace(RUN)).toBe(true);
  });

  it('the conditioning band is a threshold over the stock', () => {
    const c = body();
    const at: Array<[number, string]> = [
      [0, 'untrained'],
      [19, 'untrained'],
      [20, 'novice'],
      [40, 'competent'],
      [60, 'proficient'],
      [80, 'expert'],
      [100, 'expert'],
    ];
    for (const [level, band] of at) {
      set(c, 'wind', level);
      expect(c.conditioningBand('wind')).toBe(band);
    }
    expect(c.conditioningBand('no-such-stock')).toBe('untrained');
  });

  it('the band-crossing hook re-derives conferrals once per crossing', () => {
    const c = body();
    const spy = vi.fn().mockResolvedValue(undefined);
    (c as unknown as { refreshConferrals: () => Promise<void> }).refreshConferrals = spy;
    vi.spyOn(MixinApi, 'isAdvancing').mockReturnValue(true);
    set(c, 'wind', 19.9);
    c.exert({ durationS: 600, powerW: 300 }); // +1 → crosses 20
    expect(spy).toHaveBeenCalledTimes(1);
    c.exert({ durationS: 60, powerW: 300 }); // stays novice
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('every rate is a dial — the season can be turned up', () => {
    const c = body();
    settings['body.windGainPerHour'] = '60';
    c.exert({ durationS: 3600, powerW: 300 });
    expect(c.getWind().current.rawValue()).toBeCloseTo(60, 6);
  });
});
