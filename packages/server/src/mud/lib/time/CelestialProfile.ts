/**
 * CelestialProfile — the per-world sky parameters that drive real
 * solar / lunar geometry (the pedagogical seam): rotation period,
 * orbital year, axial tilt, and the sun / moon roster. One profile
 * governs a region; `CelestialApi.profileFor` resolves it via zone
 * inheritance with `EARTH_LIKE` as the universe fallback.
 *
 * This is a plain data shape, NOT a Stuff — it is consumed by the
 * pure math in `solar.ts` and surfaced through `CelestialApi`. The
 * `EARTH_LIKE` default reconciles to a 360-day orbital year
 * (requirements D7) so seasons (90-day quarters) align cleanly with
 * the 360-day DefaultCalendar.
 */

import { Quantity } from '../quantity';

/** v1 carries identity only; named suns arrive with multi-sun worlds. */
export interface SunDef {
  name?: string;
}

export interface MoonDef {
  /** Synodic (new-moon-to-new-moon) period in days. EARTH_LIKE: 30. */
  synodicPeriodDays: number;
  name?: string;
}

export interface CelestialProfile {
  /** One rotation, in seconds. Earth-like = 86 400. */
  dayLengthSeconds: number;
  /** One orbit, in days. Earth-like = 360 (D7). */
  yearLengthDays: number;
  /** Axial tilt; drives the declination swing. Earth-like = 23.5°. */
  axialTiltDegrees: Quantity<'degrees'>;
  /** At least one sun. Earth-like: exactly one. */
  suns: SunDef[];
  /** Zero or more moons. Earth-like: one, synodic 30 days. */
  moons: MoonDef[];
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

/**
 * The universe-default profile: a 24-hour day, a 360-day year, 23.5°
 * tilt, one sun, and one moon whose 30-day synodic period lands a
 * full moon once per calendar month.
 */
export const EARTH_LIKE: CelestialProfile = {
  dayLengthSeconds: 86_400,
  yearLengthDays: 360,
  axialTiltDegrees: Quantity.of(23.5, 'degrees'),
  suns: [{}],
  moons: [{ synodicPeriodDays: 30 }],
};
