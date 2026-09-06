/**
 * Winter, on the plant side (farmstead W6 / D10) — **winter is not a
 * mode; it is cold and short days at a place.**
 *
 * No season flag on a plant. A plant answers to the conditions where it
 * actually is, and three consequences follow, all of which are the point:
 *
 *  1. ⭐ **The dorm houseplant does not die every real month.** A heated
 *     room in February is a warm place, and the plant in it is fine.
 *  2. ⭐⭐ **The greenhouse falls out for free** — somewhere warm and lit
 *     in winter is an *economic* decision against the shipped fuel chain
 *     rather than an architectural unlock. Nothing here knows the word
 *     "greenhouse".
 *  3. The mechanism is identical indoors, outdoors, under glass and
 *     underground, so an author extends it without asking for a flag.
 *
 * ⚠⚠ And the tri-state: **unresolved reads as NOT COLD-LIMITED, never as
 * absolute zero.** Resolving the temperature at a place is asynchronous
 * and the growth reconcile is synchronous, so there is a window in which
 * a plant genuinely does not know how cold it is. This codebase has been
 * bitten three times by a cache nothing warms reading a default forever
 * while hand-built tests stayed green, so the unresolved path is tested
 * FIRST.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { GrowingMixin, type GrowthProfileData } from '../Growing';
import Thing from '../../stuff/Thing';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestPlant extends GrowingMixin(Thing) {
  /** Stand in for the ground: happy on every other axis. */
  protected override soilMoisture(): number | null {
    return 1;
  }
  protected override meanSoilMoisture(): number | null {
    return 1;
  }
  protected override sampleLux(): number {
    return 20_000;
  }
  /** Reach the protected satisfaction the way a white-box test may. */
  public warmth(): number {
    return this.satWarmth();
  }
}

/** A profile that DOES respond to cold — a temperate outdoor crop. */
const TEMPERATE: GrowthProfileData = {
  moistureHappyAt: 0.4,
  moistureWiltAt: 0.05,
  litresPerGameDay: 0.5,
  luxHappyAt: 10_000,
  luxDarkAt: 200,
  rootDemand: { seedling: 1, young: 2, established: 4, mature: 8 },
  daysToStage: { young: 5, established: 15, mature: 40 },
  coldStopK: 278,
  warmHappyK: 288,
};

/** The houseplant's profile, which shipped before winter existed. */
const INDOOR: GrowthProfileData = { ...TEMPERATE };
delete (INDOOR as Partial<GrowthProfileData>).coldStopK;
delete (INDOOR as Partial<GrowthProfileData>).warmHappyK;

function plant(profile: GrowthProfileData, ambientK?: number): TestPlant {
  return makeStuff(() => {
    const p = new TestPlant();
    p.setProfile(profile);
    if (ambientK !== undefined) p._lastAmbientK = ambientK;
    return p;
  });
}

describe('warmth as a limiting factor', () => {
  it('⚠⚠ UNRESOLVED is not cold — an unplaced plant is not freezing', () => {
    const p = plant(TEMPERATE);
    expect(p._lastAmbientK).toBe(-1);
    expect(p.warmth()).toBe(1);
    expect(p.getLimitingFactor()).toBeNull();
  });

  it('⭐ a profile that declares no cold response is NEVER cold-limited', () => {
    // Every plant that shipped before winter existed keeps behaving
    // exactly as it did — which is the compatibility claim, tested
    // rather than asserted.
    const p = plant(INDOOR, 250);
    expect(p.warmth()).toBe(1);
    expect(p.getLimitingFactor()).toBeNull();
  });

  it('⭐⭐ cold stops it, and the cause line SAYS SO', () => {
    const frozen = plant(TEMPERATE, 271);
    expect(frozen.warmth()).toBe(0);
    expect(frozen.getLimitingFactor()).toBe('cold');
  });

  it('⭐ a warm lit room keeps it growing — the houseplant, and the greenhouse', () => {
    // The SAME plant, the same profile, the same February. Only the
    // temperature where it is standing differs, and nothing here knows
    // the word "greenhouse".
    const outside = plant(TEMPERATE, 271);
    const inside = plant(TEMPERATE, 293);
    expect(outside.warmth()).toBe(0);
    expect(inside.warmth()).toBe(1);
    expect(inside.getLimitingFactor()).toBeNull();
  });

  it('the response is a RAMP, not a switch — spring comes on gradually', () => {
    const cold = plant(TEMPERATE, 280);
    const mild = plant(TEMPERATE, 284);
    expect(cold.warmth()).toBeGreaterThan(0);
    expect(cold.warmth()).toBeLessThan(mild.warmth());
    expect(mild.warmth()).toBeLessThan(1);
  });

  it('⚠ warmth joins the MINIMUM, never a product', () => {
    // A plant that is half-cold and half-dark is limited by the worse of
    // the two, not by their product — two half-limitations must not read
    // as a quarter.
    const p = plant(TEMPERATE, 283);
    expect(p.getLimitingFactor()).toBe('cold');
  });
});
