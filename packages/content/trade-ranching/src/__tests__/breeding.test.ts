/**
 * Breeding is a photoperiod SEASON, not a date (D26) — the species dial
 * that decides when a ewe will take.
 *
 * ⭐ The tap cases that used to sit above this moved to the kernel with
 * `ProducingMixin` (taps build W0):
 * `packages/server/src/mud/lib/husbandry/__tests__/Producing.test.ts`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

describe('breeding is a photoperiod SEASON, not a date (D26)', () => {
  const shortDay = makeSpecies({ daylightFrom: 0, daylightTo: 0.42, gestationDays: 150, litter: 2 });
  const longDay = makeSpecies({ daylightFrom: 0.55, daylightTo: 1, gestationDays: 340, litter: 1 });
  const aseasonal = makeSpecies({ daylightFrom: 0, daylightTo: 1, gestationDays: 280, litter: 1 });

  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ a ewe takes in SHORT days and refuses in long ones', () => {
    // Nine hours of daylight is autumn; fifteen is midsummer. Lambing in
    // spring is a consequence of the calendar, not a flavour decision.
    expect(shortDay.breedsAtDaylight(9 / 24)).toBe(true);
    expect(shortDay.breedsAtDaylight(15 / 24)).toBe(false);
  });

  it('a horse is the other way round, and a cow is never out of season', () => {
    expect(longDay.breedsAtDaylight(15 / 24)).toBe(true);
    expect(longDay.breedsAtDaylight(9 / 24)).toBe(false);
    expect(aseasonal.breedsAtDaylight(9 / 24)).toBe(true);
    expect(aseasonal.breedsAtDaylight(15 / 24)).toBe(true);
  });

  it('⚠ a species that authors no breeding never breeds — not "always"', () => {
    const barren = makeSpecies(null);
    expect(barren.breedsAtDaylight(0.5)).toBe(false);
  });
});

function makeSpecies(
  breeding: {
    daylightFrom: number;
    daylightTo: number;
    gestationDays: number;
    litter: number;
  } | null,
): Species {
  return makeStuff(() => {
    const s = new Species();
    s.setBreeding(breeding);
    return s;
  });
}
