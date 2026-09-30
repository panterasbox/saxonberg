/**
 * The set-count latch and pollination (apiculture W0).
 *
 * Two claims, and the first one is the whole compatibility argument:
 * **a plant that authors no `pollinationBaseline` is byte-identical**,
 * and so is one persisted before the latch fields existed. Then the
 * latch itself: the count and the pollination fraction are fixed at the
 * SET, a pollinator raises the fraction only inside the fill window, and
 * the pick reads what was set rather than what the row says today.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import { GrowingMixin, type GrowthProfileData } from '../Growing';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

class SetFixture extends GrowingMixin(Good) {
  public moistureOverride: number | null = 1;

  protected override sampleLux(): number {
    return 0;
  }
  protected override soilMoisture(): number | null {
    return this.moistureOverride;
  }
  protected override meanSoilMoisture(): number | null {
    return this.moistureOverride;
  }
}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

function polycarp(over: Partial<GrowthProfileData> = {}): GrowthProfileData {
  return {
    moistureHappyAt: 0.35,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0,
    luxHappyAt: 0,
    luxDarkAt: 0,
    rootDemand: { seedling: 0.1, young: 0.3, established: 0.8, mature: 2 },
    daysToStage: { young: 30, established: 90, mature: 170 },
    fruitSetCount: 12,
    fruitFillDays: 20,
    ...over,
  };
}

function fixture(p: GrowthProfileData): SetFixture {
  const f = makeStuff(() => new SetFixture());
  f.setProfile(p);
  f.setHarvestTemplatePath('/trade/farming/thing/cherry');
  f.getVigor();
  return f;
}

describe('the set-count latch', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ no pollinationBaseline authored → the full authored set, as before', () => {
    const f = fixture(polycarp());
    setNow(171 * DAY);
    expect(f.isFlowering()).toBe(true);
    expect(f.getFruitSetCount()).toBe(12);
  });

  it('an insect-pollinated crop alone sets half', () => {
    const f = fixture(polycarp({ pollinationBaseline: 0.5 }));
    setNow(171 * DAY);
    expect(f.getFruitSetCount()).toBe(6);
  });

  it('⭐ a pollinator inside the window restores the full set', () => {
    const f = fixture(polycarp({ pollinationBaseline: 0.5 }));
    setNow(171 * DAY);
    expect(f.getFruitSetCount()).toBe(6);
    f.pollinate(0.3);
    expect(f.getFruitSetCount()).toBe(9);
    f.pollinate(0.5); // clamped at 1 — never more than the authored set
    expect(f.getFruitSetCount()).toBe(12);
  });

  it('pollination is a no-op before the set and after ripe', () => {
    const f = fixture(polycarp({ pollinationBaseline: 0.5 }));
    setNow(40 * DAY); // not flowering yet
    f.pollinate(1);
    setNow(171 * DAY);
    expect(f.getFruitSetCount()).toBe(6); // the push found no window

    setNow(195 * DAY); // ripe
    expect(f.getFruitFill()).toBe(1);
    f.pollinate(1);
    expect(f.getFruitSetCount()).toBe(6); // too late to matter
  });

  it('⭐ the count is LATCHED: editing the profile mid-cycle does not move it', () => {
    const f = fixture(polycarp());
    setNow(171 * DAY);
    expect(f.getFruitSetCount()).toBe(12);
    f.setProfile(polycarp({ fruitSetCount: 40 }));
    expect(f.getFruitSetCount()).toBe(12); // what set, set
  });

  it('settleCycle releases the latch; the next set latches its own', () => {
    const f = fixture(polycarp({ pollinationBaseline: 0.5 }));
    setNow(171 * DAY);
    f.pollinate(0.5);
    expect(f.getFruitSetCount()).toBe(12);
    f.settleCycle();
    setNow(230 * DAY); // a fresh window
    expect(f.isFlowering()).toBe(true);
    expect(f.getFruitSetCount()).toBe(6); // unpollinated again
  });

  it('⭐ a plant persisted before the latch existed reads the profile', () => {
    const f = fixture(polycarp());
    setNow(171 * DAY);
    f.getFruitFill();
    // Exactly what hydration of an old snapshot leaves behind.
    f._fruitSetCount = 0;
    expect(f.getFruitSetCount()).toBe(12);
  });

  it('a monocarp reads 1 and is never latched', () => {
    const f = fixture({ ...polycarp(), fruitSetCount: 0, fruitFillDays: 0 });
    setNow(200 * DAY);
    expect(f.isPolycarp()).toBe(false);
    expect(f.getFruitSetCount()).toBe(1);
  });

  it('death releases the latch', () => {
    const f = fixture(polycarp());
    setNow(195 * DAY);
    expect(f.getFruitSetCount()).toBe(12);
    f.moistureOverride = 0;
    setNow(330 * DAY);
    expect(f.getConditionBand()).toBe('dead');
    expect(f.getFruitSetCount()).toBe(12); // the profile, not the latch
    expect(f.isHarvestable()).toBe(false);
  });
});
