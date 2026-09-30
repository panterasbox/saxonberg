/**
 * `Field.inFlowerFraction()` — **how much of this sward is in flower**
 * (apiculture D6), and the two rules it is easy to get wrong.
 *
 * ⭐ The sward knows when it blooms and the hive asks. Nothing here knows
 * bees exist: the read is a fact about the land, and it is the same fact
 * whether anybody is keeping hives or not.
 *
 * ⚠⚠ And the **tri-state rule, twice**: an unresolved sky cache (`-1`)
 * reads as NOT LIMITED. A cache nothing has warmed must never read as a
 * hard zero forever — this codebase has been bitten three times by the
 * other choice, and `restampSeason()` resolves it within the first read
 * cycle anyway.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import Field from '../location/Field';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

/**
 * A field with its sky already resolved to a summer's day, so the season
 * gate is a lever rather than an accident of when the test ran.
 */
function field(legume: number, ambientK = 292, daylight = 0.62): Field {
  const f = makeStuff(() => new Field());
  f.setAreaM2(1000);
  f.setLegumeFraction(legume);
  // The sward reserve is installed by the host's own registration; a
  // hand-built field has to ask. It comes in at the RESIDUAL, which is
  // ground just out of the rough — so the fraction is well under 1 and
  // every assertion below is against `swardFraction()`, never against 1.
  f.installSward();
  f._ambientK = ambientK;
  f._daylightFraction = daylight;
  return f;
}

describe('the bloom a hive can find', () => {
  it('⭐ a clover ley in season reads its authored share of the standing sward', () => {
    const f = field(0.4);
    expect(f.inFlowerFraction()).toBeCloseTo(0.4 * f.swardFraction(), 6);
    expect(f.inFlowerFraction()).toBeGreaterThan(0);
  });

  it('⭐ no clover, no bloom — and no special case anywhere', () => {
    expect(field(0).inFlowerFraction()).toBe(0);
  });

  it('out of season it is zero, however much clover the row claims', () => {
    expect(field(0.4, 279, 0.62).inFlowerFraction()).toBe(0); // too cold
    expect(field(0.4, 292, 0.3).inFlowerFraction()).toBe(0); // days too short
  });

  it('⚠⚠ an UNRESOLVED sky reads as not-limited, never as zero', () => {
    const f = field(0.4, -1, -1);
    expect(f.inFlowerFraction()).toBeGreaterThan(0);
    expect(f.inFlowerFraction()).toBeCloseTo(0.4 * f.swardFraction(), 6);
  });

  it('the sward is a TERM: a grazed-off sward is less bloom', () => {
    const full = field(0.4);
    const before = full.inFlowerFraction();
    // Take the standing dry matter down and the bloom goes with it.
    full.drawSward(full.standingDryMatterKg() * 0.9);
    expect(full.inFlowerFraction()).toBeLessThan(before);
  });
});
