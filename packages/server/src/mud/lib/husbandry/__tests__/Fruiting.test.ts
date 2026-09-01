/**
 * The fruit cycle (farming Wave A2) — polycarpy on the shipped latch.
 *
 * The one structural claim: **a monocarp is byte-identical** — no cycle
 * fields, no branch, the phase-1 pin. Then the cycle itself: the latch
 * SETS the crop (and suppresses the seed-drop), fill advances at the
 * limiting rate, the worst-limiting window re-seeds at the SET (never at
 * harvest), ripe is fill 1, `settleCycle` re-opens, death zeroes.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import {
  GrowingMixin,
  type GrowthProfileData,
} from '../Growing';
import type { FieldMeta } from '../../mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

/**
 * The mixin in isolation, with every seam a test lever: fixed soil
 * moisture (no reserve, no drain — fill dynamics are the subject here),
 * light/root/nutrient overrides, and a latch counter.
 */
class FruitFixture extends GrowingMixin(Thing) {
  public luxOverride = 0;
  public moistureOverride: number | null = 1;
  public floweringLatches = 0;

  protected override sampleLux(): number {
    return this.luxOverride;
  }
  protected override soilMoisture(): number | null {
    return this.moistureOverride;
  }
  protected override meanSoilMoisture(): number | null {
    return this.moistureOverride;
  }
  protected override onFloweringLatched(): void {
    this.floweringLatches += 1;
  }
}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

/** Light-indifferent, unpotted; mature at 170 well-kept days. */
function profile(over: Partial<GrowthProfileData> = {}): GrowthProfileData {
  return {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0, // moisture is a fixed override here
    luxHappyAt: 0,
    luxDarkAt: 0,
    rootDemand: { seedling: 0.1, young: 0.3, established: 0.8, mature: 2 },
    daysToStage: { young: 30, established: 90, mature: 170 },
    ...over,
  };
}

/** The polycarp variant — the PAIR of fields is the whole marker. */
function polycarp(over: Partial<GrowthProfileData> = {}): GrowthProfileData {
  return profile({ fruitSetCount: 12, fruitFillDays: 20, ...over });
}

function fixture(p: GrowthProfileData): FruitFixture {
  const f = makeStuff(() => new FruitFixture());
  f.setProfile(p);
  f.setHarvestTemplatePath('/trade/farming/thing/cherry');
  f.getVigor(); // seed the stamp at t=0
  return f;
}

describe('the fruit cycle', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ a monocarp is BYTE-IDENTICAL — no cycle fields, no branch', () => {
    const f = fixture(profile());
    setNow(200 * DAY);
    expect(f.getGrowthStage()).toBe('mature');
    expect(f.isFlowering()).toBe(true);
    expect(f.isPolycarp()).toBe(false);
    // The ornamental/annual episode still drops its one seed…
    expect(f.floweringLatches).toBe(1);
    // …and carries no fill; mature-and-alive is all harvest asks of it.
    expect(f.getFruitFill()).toBe(0);
    expect(f.isHarvestable()).toBe(true);
  });

  it('⭐ the latch SETS the crop and suppresses the seed-drop (polycarp only)', () => {
    const f = fixture(polycarp());
    setNow(171 * DAY); // just past maturity — the window has just opened
    expect(f.getGrowthStage()).toBe('mature');
    expect(f.isFlowering()).toBe(true);
    expect(f.floweringLatches).toBe(0); // the yield IS the crop — no seed
    const early = f.getFruitFill();
    expect(early).toBeGreaterThan(0); // filling…
    expect(early).toBeLessThan(1);
    expect(f.isHarvestable()).toBe(false); // …but nothing ripe yet
  });

  it('ripe at fill 1 — a well-kept window fills in fruitFillDays', () => {
    const f = fixture(polycarp());
    setNow(195 * DAY); // set ~day 170 + 20 fill days + slack
    expect(f.getFruitFill()).toBe(1);
    expect(f.isHarvestable()).toBe(true);
  });

  it('fill advances at the LIMITING rate — a dry window fills slower', () => {
    const kept = fixture(polycarp());
    const dry = fixture(polycarp());
    setNow(171 * DAY); // both set
    kept.getFruitFill();
    dry.getFruitFill();
    dry.moistureOverride = 0.2; // satWater = 0.5 on the authored ramp
    setNow(186 * DAY); // 15 more days of a 20-day fill
    expect(kept.getFruitFill()).toBeGreaterThan(0.7);
    expect(dry.getFruitFill()).toBeLessThan(0.6); // ~half the rate
    // The set crop SURVIVES the dip (vigor fell below thriving): the
    // window stays open so the bad stretch grades the crop.
    expect(dry.getFruitFill()).toBeGreaterThan(0.3);
  });

  it('⭐ the verdict window RE-SEEDS at the set, not at harvest', () => {
    const f = fixture(polycarp());
    // A hard seedling drought: worst drops long before the first set.
    f.moistureOverride = 0.2; // satWater 0.5
    setNow(40 * DAY);
    expect(f.getWorstLimiting()).toBeCloseTo(0.5, 5);
    // Recover; maturity accrues from here (0.5 was below goodAt).
    f.moistureOverride = 1;
    setNow(215 * DAY); // 170 good days after day 40 → set ~day 210
    expect(f.isFlowering()).toBe(true);
    // ⭐ The seedling drought is FORGIVEN: the window opened at the set.
    expect(f.getWorstLimiting()).toBe(1);
    // A dip inside the window is what grades this crop.
    f.moistureOverride = 0.2;
    setNow(220 * DAY);
    expect(f.getWorstLimiting()).toBeCloseTo(0.5, 5);
  });

  it('⭐ settleCycle re-opens: the next window sets fresh and re-grades clean', () => {
    const f = fixture(polycarp());
    setNow(195 * DAY);
    expect(f.getFruitFill()).toBe(1);
    // Grade the ripe wait down, then pick.
    f.moistureOverride = 0.2;
    setNow(200 * DAY);
    expect(f.getWorstLimiting()).toBeCloseTo(0.5, 5);
    f.moistureOverride = 1;
    f.settleCycle();
    expect(f.isFlowering()).toBe(false);
    expect(f.getFruitFill()).toBe(0);
    expect(f.isHarvestable()).toBe(false);
    // Thriving again → a NEW window latches, sets, and re-seeds the
    // verdict — the last cycle's bad stretch does not follow the tree.
    setNow(230 * DAY);
    expect(f.isFlowering()).toBe(true);
    expect(f.getWorstLimiting()).toBe(1);
    expect(f.getFruitFill()).toBeGreaterThan(0);
    expect(f.floweringLatches).toBe(0); // still no seed, ever
  });

  it('death zeroes the cycle', () => {
    const f = fixture(polycarp());
    setNow(195 * DAY);
    expect(f.getFruitFill()).toBe(1);
    f.moistureOverride = 0; // satWater 0 — the long neglect
    setNow(330 * DAY);
    expect(f.getConditionBand()).toBe('dead');
    expect(f.getFruitFill()).toBe(0);
    expect(f.isHarvestable()).toBe(false);
  });

  it('the presentation ladder: filling reads flowering; ripe reads heavy with fruit', () => {
    const f = fixture(polycarp());
    const aug = (
      f as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!;
    setNow(171 * DAY); // filling
    f.getVigor();
    expect(aug('', f, f)).toContain('in flower');
    setNow(195 * DAY); // ripe
    f.getVigor();
    expect(aug('', f, f)).toContain('heavy with fruit');
  });

  it('the fill state persists — _fruitFill rides the declared fieldMeta', () => {
    const meta = (
      FruitFixture as unknown as { fieldMeta: FieldMeta }
    ).fieldMeta;
    expect(meta._fruitFill).toEqual({ persistent: true });
  });
});
