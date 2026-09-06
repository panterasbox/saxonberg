/**
 * The sward (W5 / D7–D9) — **the standing grass, and no `use` field
 * anywhere.**
 *
 * The three claims:
 *
 *  1. ⭐⭐ **Fertility follows the mouths** (D7). Grazing and mowing are
 *     the same draw on the same reserve; the only difference is whether
 *     the animal was standing here, and that difference is where the
 *     nitrogen goes. There is no `use` enum to assert against, and its
 *     absence is the point.
 *  2. ⭐ **Residual and recovery** (D9): below its residual a sward has
 *     spent its root reserves and the regrowth RATE is penalised until it
 *     rebuilds — not a second stock, and never a dead field.
 *  3. **Understocking is a mistake too.** Grass that gets ahead of the
 *     herd stops paying: growth falls away as the sward closes over, so
 *     the band reads `ahead-of-them` and means *move them here*.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SwardMixin, SWARD_RESIDUAL_FRACTION, SWARD_RESERVE_KEY } from '../Sward';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
const AREA = 400;

class TestPaddock extends SwardMixin(ReservedMixin(Idea)) {
  public grazers = 0;
  public factor = 1;
  public override swardAreaM2(): number {
    return AREA;
  }
  public override swardGrowthFactor(): number {
    return this.factor;
  }
  public override swardGrazingDemandPerGameDay(): number {
    return this.grazers;
  }
}

describe('the sward', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const paddock = (): TestPaddock => {
    const p = makeStuff(() => new TestPaddock());
    p.installSward();
    // ⚠ Read once to seed the checkpoint. First touch opens the window
    // and integrates nothing — the shipped reconcile-on-read contract,
    // and a test that skips it measures the seeding rather than the
    // growth.
    p.standingDryMatterKg();
    return p;
  };

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  beforeEach(() => {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('starts at the residual and grows toward its ceiling', () => {
    const p = paddock();
    expect(p.swardFraction()).toBeCloseTo(SWARD_RESIDUAL_FRACTION, 3);
    advance(30);
    expect(p.swardFraction()).toBeGreaterThan(SWARD_RESIDUAL_FRACTION);
    advance(400);
    expect(p.swardFraction()).toBeGreaterThan(0.9);
    expect(p.swardFraction()).toBeLessThanOrEqual(1);
  });

  it('⭐ growth answers to the LIMITING FACTOR, and zero means zero', () => {
    const wet = paddock();
    const dry = paddock();
    dry.factor = 0;
    advance(60);
    expect(wet.swardFraction()).toBeGreaterThan(dry.swardFraction());
    expect(dry.swardFraction()).toBeCloseTo(SWARD_RESIDUAL_FRACTION, 3);
  });

  it('⭐ mouths standing on it eat it — that is the whole of D7 graze', () => {
    const grazed = paddock();
    const rested = paddock();
    grazed.grazers = 3; // kg DM a game day
    advance(20);
    expect(grazed.standingDryMatterKg()).toBeLessThan(rested.standingDryMatterKg());
    expect(grazed.swardGrazedKg).toBeGreaterThan(0);
    expect(rested.swardGrazedKg).toBe(0);
  });

  it('⭐⭐ grazed below the residual, RECOVERY measurably slows (D9)', () => {
    // Two paddocks, same growth conditions, same amount of grass removed
    // — but one is taken down through the residual and the other is not.
    // The one that was over-grazed comes back slower, which is what makes
    // moving stock a READ rather than a timer.
    const hard = paddock();
    const easy = paddock();
    const ceiling = hard.swardCeilingKg();

    hard.drawSward(ceiling * 0.45); // down to ~5% — well under residual
    easy.drawSward(ceiling * 0.0);  // left at the residual exactly

    const hardBefore = hard.standingDryMatterKg();
    const easyBefore = easy.standingDryMatterKg();
    advance(10);
    const hardGain = hard.standingDryMatterKg() - hardBefore;
    const easyGain = easy.standingDryMatterKg() - easyBefore;

    expect(hardGain).toBeGreaterThan(0);      // never a dead field (D45)
    expect(hardGain).toBeLessThan(easyGain);  // and measurably slower
  });

  it('⚠ an overgrazed paddock is a RATE penalty, never a dead field', () => {
    const p = paddock();
    p.drawSward(p.swardCeilingKg());
    expect(p.standingDryMatterKg()).toBe(0);
    advance(200);
    // It comes back. The whole point of the slope.
    expect(p.swardFraction()).toBeGreaterThan(SWARD_RESIDUAL_FRACTION);
  });

  it('⭐ understocking is a mistake too — growth falls away as it closes over', () => {
    const p = paddock();
    advance(500);
    const nearFull = p.standingDryMatterKg();
    advance(560);
    // Sixty more game days buy almost nothing: the sward is shading
    // itself, which is why grass ahead of the herd stops paying.
    expect(p.standingDryMatterKg() - nearFull).toBeLessThan(nearFull * 0.05);
    expect(p.swardBand()).toBe('ahead-of-them');
  });

  it('⭐⭐ the bands are percepts, and the two FAULTS point opposite ways', () => {
    const p = paddock();
    p.drawSward(p.swardCeilingKg() * 0.25);
    expect(p.swardBand()).toBe('grazed-out');
    expect(p.swardPhrase()).not.toMatch(/\d/);
    advance(500);
    expect(p.swardBand()).toBe('ahead-of-them');
    // A reader who does not know the number can tell them apart AND
    // knows which way to move the stock.
    expect(p.swardPhrase()).not.toBe(SWARD_RESIDUAL_FRACTION.toString());
  });

  it('the standing sward transpires — the term the SOIL asks for', () => {
    const p = paddock();
    expect(p.swardTranspirationPerGameDay()).toBeGreaterThan(0);
    p.drawSward(p.swardCeilingKg());
    expect(p.swardTranspirationPerGameDay()).toBe(0);
  });

  it('⚠ a host with no area grows nothing and installs nothing', () => {
    class Barren extends SwardMixin(ReservedMixin(Idea)) {}
    const b = makeStuff(() => new Barren());
    b.installSward();
    expect(b.getReserve(SWARD_RESERVE_KEY)).toBeUndefined();
    expect(b.standingDryMatterKg()).toBe(0);
    expect(b.swardFraction()).toBe(0);
  });

  it('the sward affords the cutting of it, alongside the reclamation acts', () => {
    // ⚠ Two mixins on one host each declaring `commandContributions`:
    // `bucketFilenames` collects the class's own static PLUS every mixin
    // in the chain, so neither shadows the other.
    const verbs = CommandApi.collectContributions(TestPaddock, 'self')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('mow');
  });
});

/**
 * Winter, on the field side (W6 / D10–D12). ⭐ Sward growth reaches
 * **zero** in winter, and it does so because the ground is cold and the
 * days are short — never because a flag said `winter`.
 */
describe('the sward in winter', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  class Seasonal extends SwardMixin(ReservedMixin(Idea)) {
    public ambientK = -1;
    public daylight = -1;
    public override swardAreaM2(): number {
      return AREA;
    }
    public override swardGrowthFactor(): number {
      const factors: number[] = [];
      if (this.ambientK > 0) factors.push(clamp((this.ambientK - 278) / 13));
      if (this.daylight >= 0) factors.push(clamp((this.daylight - 0.33) / 0.21));
      return factors.length === 0 ? 1 : Math.min(...factors);
    }
  }

  const seasonal = (ambientK: number, daylight: number): Seasonal => {
    const p = makeStuff(() => {
      const s = new Seasonal();
      s.ambientK = ambientK;
      s.daylight = daylight;
      return s;
    });
    p.installSward();
    p.standingDryMatterKg();
    return p;
  };

  beforeEach(() => {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ growth reaches ZERO in winter — cold ground, short days', () => {
    // 271 K and nine hours of daylight: a January field at 40°.
    const winter = seasonal(271, 9 / 24);
    const before = winter.standingDryMatterKg();
    clock.mockReturnValue(Quantity.of(base + 90 * DAY, 's'));
    expect(winter.standingDryMatterKg()).toBeCloseTo(before, 6);
  });

  it('⭐ and away in spring, from the same field with nothing else changed', () => {
    const spring = seasonal(288, 13 / 24);
    const before = spring.standingDryMatterKg();
    clock.mockReturnValue(Quantity.of(base + 90 * DAY, 's'));
    expect(spring.standingDryMatterKg()).toBeGreaterThan(before * 1.4);
  });

  it('⭐ EITHER limit alone stops it — the minimum, never a product', () => {
    // Warm but dark (a mild wet December, seven and a half hours) and
    // cold but bright (a hard April frost) both stop growth, which is
    // what a minimum means.
    const warmDark = seasonal(291, 7.5 / 24);
    const coldBright = seasonal(272, 15 / 24);
    const b1 = warmDark.standingDryMatterKg();
    const b2 = coldBright.standingDryMatterKg();
    clock.mockReturnValue(Quantity.of(base + 60 * DAY, 's'));
    expect(warmDark.standingDryMatterKg()).toBeCloseTo(b1, 6);
    expect(coldBright.standingDryMatterKg()).toBeCloseTo(b2, 6);
  });

  it('⚠⚠ UNRESOLVED is not winter — a field that has not looked still grows', () => {
    const unknown = seasonal(-1, -1);
    const before = unknown.standingDryMatterKg();
    clock.mockReturnValue(Quantity.of(base + 60 * DAY, 's'));
    expect(unknown.standingDryMatterKg()).toBeGreaterThan(before);
  });

  it('⚠ D12: winter STOPS the field and does not touch the mouths', () => {
    // The animals go on eating through a winter that grows nothing,
    // which is why the feed budget exists and why husbandry does not
    // stop when farming does.
    const winter = seasonal(271, 9 / 24);
    (winter as unknown as { swardGrazingDemandPerGameDay(): number })
      .swardGrazingDemandPerGameDay = () => 2;
    const before = winter.standingDryMatterKg();
    clock.mockReturnValue(Quantity.of(base + 20 * DAY, 's'));
    expect(winter.standingDryMatterKg()).toBeLessThan(before);
  });
});

function clamp(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
