/**
 * The taps (W9 / D25, D93) — **three renewable products, three genuine
 * neglect failures, and no invented punishments.**
 *
 * ⚠⚠ The load-bearing claim, and the one a `Stock`-shaped implementation
 * would have got wrong: **a tap fills from the production slice of the
 * energy budget and mints nothing.** An animal in poor flesh gives less,
 * because it has less to give. Copy the reset SWEEP; never the `par`
 * semantics, which is a faucet wearing a hat.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducingMixin } from '../lib/Producing';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { TapSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
const SPECIES_PATH = '/stuff/idea/species/_test/beast';

const TAPS: TapSpec[] = [
  // A dairy cow: twice a game day, and she dries off if you do not come.
  { key: 'milk', yieldRow: '/x/milk', perGameDay: 20, behaviour: 'expire', windowDays: 1 },
  // A hen: collect whenever, up to what a clutch holds.
  { key: 'eggs', yieldRow: '/x/eggs', perGameDay: 0.2, behaviour: 'accrue', windowDays: 10 },
  // A sheep: it just keeps growing.
  { key: 'wool', yieldRow: '/x/fleece', perGameDay: 0.008, behaviour: 'continuous', windowDays: 0 },
];

class TestBeast extends ProducingMixin(Creature) {}

describe('the taps', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const beast = (flesh = 55): TestBeast => {
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_PATH;
      return x;
    });
    const current = b.getReserve('flesh')!.current.rawValue();
    b.adjustReserve('flesh', Quantity.of(flesh - current, '%'));
    b.reconcileProduction();
    return b;
  };

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    makeStuffAtPath(() => {
      const s = new Species();
      s.setProduction(TAPS);
      return s;
    }, SPECIES_PATH);
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('reads its taps off its species, and a species with none has none', () => {
    expect(beast().taps().map((t) => t.key)).toEqual(['milk', 'eggs', 'wool']);
    const nobody = makeStuff(() => new TestBeast());
    expect(nobody.taps()).toEqual([]);
  });

  it('⚠⚠ an animal in POOR FLESH gives less — the tap is not a faucet', () => {
    const fat = beast(80);
    const thin = beast(20);
    advance(0.5);
    expect(fat.standingIn('milk')).toBeGreaterThan(thin.standingIn('milk'));
    // …and one with nothing to give gives nothing at all.
    const wasted = beast(8);
    advance(0.5);
    expect(wasted.standingIn('milk')).toBe(0);
  });

  it('⭐⭐ MILK expires: leave her and she DRIES OFF for the lactation', () => {
    const cow = beast();
    advance(0.5);
    expect(cow.standingIn('milk')).toBeGreaterThan(0);
    expect(cow.isDriedOff('milk')).toBe(false);

    advance(3);
    expect(cow.isDriedOff('milk')).toBe(true);
    expect(cow.standingIn('milk')).toBe(0);

    // ⚠ A SLOPE, not a cliff: the next lactation is unaffected, so an
    // absence costs a season and never an animal.
    cow.freshen('milk');
    advance(3.5);
    expect(cow.isDriedOff('milk')).toBe(false);
    expect(cow.standingIn('milk')).toBeGreaterThan(0);
  });

  it('⭐ EGGS accrue, and past a clutch they spoil in the nest', () => {
    const hen = beast();
    advance(5);
    const atFive = hen.standingIn('eggs');
    expect(atFive).toBeGreaterThan(0);
    advance(200);
    // Bounded by the clutch, not unbounded: the surplus is gone.
    expect(hen.standingIn('eggs')).toBeCloseTo(0.2 * 10, 1);
  });

  it('⭐ WOOL is continuous — no window to miss, and it just grows', () => {
    const sheep = beast();
    advance(360);
    const year = sheep.standingIn('wool');
    advance(720);
    expect(sheep.standingIn('wool')).toBeGreaterThan(year * 1.8);
  });

  it('⭐ taking RESETS the neglect clock, which is why it is an act', () => {
    const cow = beast();
    advance(0.5);
    const got = cow.takeFrom('milk');
    expect(got).toBeGreaterThan(0);
    expect(cow.standingIn('milk')).toBeLessThan(got);
    advance(1.2);
    // Taken 0.7 game days ago — inside the window, so she is fine.
    expect(cow.isDriedOff('milk')).toBe(false);
  });

  it('⚠ no far-past guard: a kept animal’s clock runs while you are away', () => {
    // That is the whole of D29. What an absence costs is a lactation, a
    // clutch and a fleece — never the animal.
    const cow = beast();
    advance(400);
    expect(cow.isDriedOff('milk')).toBe(true);
    expect(cow.standingIn('wool')).toBeGreaterThan(1);
  });
});

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
