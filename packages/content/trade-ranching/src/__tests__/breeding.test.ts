/**
 * Breeding is a photoperiod SEASON, not a date (D26) — the species dial
 * that decides when a ewe will take.
 *
 * ⭐ Since organism-biology W7 (D9) the season is a CONDITION on her:
 * the species' phenology carries `in-season` while the daylength sits in
 * its `breeding` band, and `breed` reads the condition. These keep D26's
 * assertions and change how the season is brought about — a pinned day and
 * the body's own reconcile, never a species read at the act.
 *
 * ⭐ The tap cases that used to sit above this moved to the kernel with
 * `ProducingMixin` (taps build W0):
 * `packages/server/src/mud/lib/husbandry/__tests__/Producing.test.ts`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { BreedingSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { standShippedConditions } from '@saxonberg/server/mud/lib/vitals/__tests__/conditions';

const IN_SEASON = '/platform/idea/Condition/reproduction/in-season';

let seq = 0;
function makeSpecies(breeding: BreedingSpec | null): Species {
  return makeStuffAtPath(() => {
    const s = new Species();
    s.setBreeding(breeding);
    s.setSexDeterminationSystem('xy');
    s.setAgeCurve({ weanedAt: 60, matureAt: 300, agedAt: 3000, senescentAt: 5000 });
    s.applyPhenology([{ condition: IN_SEASON, trigger: { season: 'breeding', sex: 'female', stage: 'adult' } }]);
    return s;
  }, `/stuff/idea/species/_test/breeding-${seq++}`);
}

/** Is a mature female of `species` in season on a day `fraction` light? */
function inSeasonAt(species: Species, fraction: number): boolean {
  const she = makeStuff(() => new Creature());
  she.setSpecies(species);
  she.setSex('female');
  she.setAge(900);
  CelestialApi.pinDaylightFraction(fraction);
  she.reconcilePhenology();
  return she.getConditions().some((c) => c.kind === 'affliction' && c.templatePath === IN_SEASON);
}

describe('breeding is a photoperiod SEASON, not a date (D26)', () => {
  beforeEach(async () => {
    await standShippedConditions();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 10_000_000_000);
  });
  afterEach(() => {
    CelestialApi.pinDaylightFraction(null);
    WorldClockApi._resetForTesting();
  });

  it('⭐⭐ a ewe takes in SHORT days and refuses in long ones', () => {
    // Nine hours of daylight is autumn; fifteen is midsummer. Lambing in
    // spring is a consequence of the calendar, not a flavour decision.
    const shortDay = makeSpecies({ daylightFrom: 0, daylightTo: 0.42, gestationDays: 150, litter: 2 });
    expect(inSeasonAt(shortDay, 9 / 24)).toBe(true);
    expect(inSeasonAt(shortDay, 15 / 24)).toBe(false);
  });

  it('a horse is the other way round, and a cow is never out of season', () => {
    const longDay = makeSpecies({ daylightFrom: 0.55, daylightTo: 1, gestationDays: 340, litter: 1 });
    const aseasonal = makeSpecies({ daylightFrom: 0, daylightTo: 1, gestationDays: 280, litter: 1 });
    expect(inSeasonAt(longDay, 15 / 24)).toBe(true);
    expect(inSeasonAt(longDay, 9 / 24)).toBe(false);
    expect(inSeasonAt(aseasonal, 9 / 24)).toBe(true);
    expect(inSeasonAt(aseasonal, 15 / 24)).toBe(true);
  });

  it('⚠ a species that authors no breeding never breeds — not "always"', () => {
    expect(inSeasonAt(makeSpecies(null), 0.5)).toBe(false);
  });
});
