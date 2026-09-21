/**
 * The slow stocks (nutrition-and-fitness W0) — `lean`, `protein`,
 * `wind`, `vitamin-c`, `alcohol-tolerance` — five more biological
 * reserves on the body, riding the metabolism clock that already runs.
 *
 * ⭐ What this file proves: the routing table widened (protein has a
 * home, vitamin C lands on its store); each slice step is a no-op on a
 * body lacking its reserve; lean relaxes toward its seed and never below
 * it; wind halves at its half-life; vitamin C empties over the dialled
 * days and the SHIPPED cascade afflicts `scurvy` off the floor, and one
 * orange-sized ingest clears it; a `config` change is seen on the next
 * slice; and — the rule every stock inherits for free — absence
 * integrates nothing.
 *
 * ⚠ And one thing that would have been a shipped defect: a reserve
 * seeded EMPTY (`wind`, `alcohol-tolerance`) must not read as a floored
 * reserve to `VitalsMixin.getConditionBand`. A fresh body is untrained,
 * not degraded.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import Material from '../../material/Material';
import { BIOLOGICAL_RESERVE_KEYS, Reserve } from '../../reserve';
import { METABOLIC_DEFAULTS } from '../Metabolic';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;

/** A fed, watered body somebody owns — integrates every gap. */
class FedCreature extends Creature {
  public ration = 55;
  protected override integratesLongAbsence(): boolean {
    return true;
  }
  protected override basalDrain(stepMin: number): void {
    super.basalDrain(stepMin);
    const sat = this.getReserve('satiation')?.current.rawValue() ?? 0;
    this.adjustReserve('satiation', Quantity.of(this.ration - sat, '%'));
    const hyd = this.getReserve('hydration')?.current.rawValue() ?? 0;
    this.adjustReserve('hydration', Quantity.of(60 - hyd, '%'));
  }
}

function food(name: string, nutrients: string[]): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName(name);
    m.setNutrients(nutrients);
    m.setEdibility(true);
    return m;
  }) as unknown as Material;
}

describe('the slow stocks — five more reserves on the metabolism clock', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;
  let settings: Record<string, string>;

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
    settings = {};
    vi.spyOn(AppApi, 'setting').mockImplementation((k: string) => settings[k] ?? '');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const body = (): FedCreature => {
    const c = makeStuff(() => new FedCreature());
    c.setLifecycleState('alive');
    c.reconcileMetabolism(); // first touch seeds the clock stamp
    return c;
  };
  const set = (c: Creature, key: string, level: number): void => {
    const cur = c.getReserve(key)!.current.rawValue();
    c.adjustReserve(key, Quantity.of(level - cur, '%'));
  };
  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };
  const raw = (c: Creature, key: string): number =>
    c.reserves[key]?.currentValue ?? NaN;

  it('⭐ every living body installs all nine, biological, at their seeds', () => {
    const c = makeStuff(() => new Creature());
    expect([...c.getReserves().keys()].sort()).toEqual(
      [...BIOLOGICAL_RESERVE_KEYS].sort(),
    );
    expect(c.getLean().current.rawValue()).toBe(50);
    expect(c.getProtein().current.rawValue()).toBe(50);
    expect(c.getWind().current.rawValue()).toBe(0);
    expect(c.getVitaminC().current.rawValue()).toBe(100);
    expect(c.getVitaminC().floorEffect).toBe('scurvy');
    expect(c.getLean().floorEffect).toBeNull();
    expect(c.getWind().floorEffect).toBeNull();
  });

  it('⚠⚠ a stock seeded EMPTY is not a floored reserve — a fresh body is untrained, not degraded', () => {
    const c = body();
    expect(c.getWind().current.rawValue()).toBe(0);
    expect(c.getConditionBand()).toBe('healthy');
  });

  it('⭐ a body that predates a stock gains it on construct, idempotently', () => {
    const c = makeStuff(() => new Creature());
    c.removeReserve('wind');
    c.removeReserve('lean');
    c.installBiologicalReserves();
    expect(c.hasReserve('wind')).toBe(true);
    expect(c.getFlesh().current.rawValue()).toBe(55);
  });

  it('⭐ protein has a HOME — the tag lands on the protein reserve', () => {
    const c = body();
    set(c, 'protein', 20);
    c.ingest(food('mutton', ['protein']), Quantity.of(0.4, 'L'), 'solid');
    advance(1);
    c.reconcileMetabolism();
    // 70 %/L × 0.4 L = 28 in the pool; a day's turnover (8) comes off.
    expect(c.getProtein().current.rawValue()).toBeCloseTo(20 + 28 - 8, 0);
  });

  it('⭐ vitamin C lands on its store — one orange portion restores ~30 %', () => {
    const c = body();
    set(c, 'vitamin-c', 10);
    c.ingest(food('orange', ['water', 'sugar', 'vitamin-c']), Quantity.of(0.4, 'L'), 'solid');
    advance(0.5);
    c.reconcileMetabolism();
    // 75 %/L × 0.4 = 30, less half a day's drain (100/30/2 ≈ 1.7).
    expect(c.getVitaminC().current.rawValue()).toBeGreaterThan(36);
    expect(c.getVitaminC().current.rawValue()).toBeLessThan(40.1);
  });

  it('⭐ each slice step is a no-op on a body lacking its reserve', () => {
    const c = body();
    for (const k of ['lean', 'wind', 'vitamin-c', 'protein', 'alcohol-tolerance']) {
      c.removeReserve(k);
    }
    advance(10);
    expect(() => c.reconcileMetabolism()).not.toThrow();
    expect(c.hasReserve('wind')).toBe(false);
  });

  it('⭐⭐ lean relaxes toward its seed with the dialled time constant — and never below it', () => {
    const trained = body();
    set(trained, 'lean', 90);
    const fresh = body();
    advance(45);
    trained.reconcileMetabolism();
    fresh.reconcileMetabolism();
    // One time constant: (90 − 50) × e⁻¹ ≈ 14.7 left above the seed.
    expect(trained.getLean().current.rawValue()).toBeCloseTo(50 + 40 / Math.E, 0);
    expect(fresh.getLean().current.rawValue()).toBe(50);
  });

  it('⚠ a starving body burns its lean too', () => {
    const c = body();
    c.ration = 5;
    set(c, 'satiation', 5);
    advance(10);
    c.reconcileMetabolism();
    expect(c.getLean().current.rawValue()).toBeCloseTo(50 - 10, 0);
  });

  it('⭐ wind halves at its half-life while you play', () => {
    const c = body();
    set(c, 'wind', 80);
    advance(30);
    c.reconcileMetabolism();
    expect(c.getWind().current.rawValue()).toBeCloseTo(40, 0);
  });

  it('⭐ alcohol tolerance is fed where alcohol is absorbed and fades the same way', () => {
    const c = body();
    set(c, 'alcohol-tolerance', 40);
    advance(20);
    c.reconcileMetabolism();
    expect(raw(c, 'alcohol-tolerance')).toBeCloseTo(20, 0);
  });

  it('⭐⭐ bread alone for the dialled month → SCURVY off the shipped cascade; an orange clears it', () => {
    const c = body();
    advance(31);
    c.reconcileMetabolism();
    expect(c.getVitaminC().current.rawValue()).toBe(0);
    const scurvy = () =>
      c.getConditions().some(
        (a) => a.kind === 'affliction' && a.templatePath.endsWith('/scurvy'),
      );
    expect(scurvy()).toBe(true);
    // Not lethal: still alive, and never dying.
    expect(c.isLivingBody()).toBe(true);
    c.ingest(food('orange', ['water', 'sugar', 'vitamin-c']), Quantity.of(0.4, 'L'), 'solid');
    advance(32);
    c.reconcileMetabolism();
    expect(c.getVitaminC().current.rawValue()).toBeGreaterThanOrEqual(
      METABOLIC_DEFAULTS.CONDITION_CLEAR_PCT,
    );
    expect(scurvy()).toBe(false);
  });

  it('⭐ a `config` change is seen on the next slice — the season can be turned up', () => {
    const c = body();
    settings[AppSettingKeys.bodyVitaminCDrainDays] = '1';
    advance(1.5);
    c.reconcileMetabolism();
    expect(c.getVitaminC().current.rawValue()).toBe(0);
  });

  it('⭐⭐ absence is not taxed — a body nobody owns integrates nothing across a long gap', () => {
    const c = makeStuff(() => new Creature());
    c.setLifecycleState('alive');
    c.reconcileMetabolism(); // seed the stamp
    set(c, 'wind', 80);
    advance(60);
    c.reconcileMetabolism();
    expect(c.getWind().current.rawValue()).toBe(80);
    expect(c.getVitaminC().current.rawValue()).toBe(100);
  });

  it('the seeds are the one source of truth the relaxation reads', () => {
    expect(Reserve.defaultBiological().lean?.currentValue).toBe(50);
  });
});
