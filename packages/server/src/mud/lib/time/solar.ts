/**
 * solar.ts — pure solar / lunar geometry. The pedagogical seam: an
 * astronomy student comparing engine output to textbook formulas must
 * get a match, so the math lives here in isolation, takes plain
 * numbers, and returns plain numbers (degrees / seconds / boolean /
 * Season). `CelestialApi` wraps these with profile + latitude
 * resolution and `Quantity` packaging.
 *
 * Angles are radians internally, degrees at the boundary. Conventions:
 *   - dayIndex 0 = vernal equinox = Arienle 1 (declination 0, rising).
 *   - hour angle H: noon = 0, positive toward the west.
 *   - azimuth: measured from north, clockwise (0 = N, 90 = E …).
 *   - moon: t = 0 is a reference new moon (flavor anchor, not
 *     load-bearing), so a full moon falls at synodic/2.
 *
 * No content / no Stuff — a leaf math module under the time subsystem.
 */

import type { CelestialProfile, Season } from './CelestialProfile';

const DEG_PER_TURN = 360;
const TWO_PI = Math.PI * 2;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const clamp = (x: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, x));

/** 0-based day-of-year in `[0, yearLengthDays)`. */
export function dayOfYear(profile: CelestialProfile, t: number): number {
  const D = profile.dayLengthSeconds;
  const Y = profile.yearLengthDays;
  const dayIndex = Math.floor(t / D);
  return ((dayIndex % Y) + Y) % Y;
}

/** Seconds elapsed since local midnight, in `[0, dayLengthSeconds)`. */
export function secondOfDay(profile: CelestialProfile, t: number): number {
  const D = profile.dayLengthSeconds;
  return ((t % D) + D) % D;
}

/**
 * Solar declination in degrees:
 *   δ = tilt · sin(2π · dayIndex / Y)
 * 0 at the equinoxes, ±tilt at the solstices.
 */
export function declinationDeg(profile: CelestialProfile, t: number): number {
  const tilt = profile.axialTiltDegrees.rawValue();
  const Y = profile.yearLengthDays;
  const dayIndex = dayOfYear(profile, t);
  return tilt * Math.sin((TWO_PI * dayIndex) / Y);
}

/**
 * Hour angle in degrees: `(secOfDay / D) · 360 − 180`, so local noon
 * (secOfDay = D/2) is 0 and the afternoon is positive.
 */
export function hourAngleDeg(profile: CelestialProfile, t: number): number {
  const D = profile.dayLengthSeconds;
  return (secondOfDay(profile, t) / D) * DEG_PER_TURN - 180;
}

/**
 * Solar altitude in degrees:
 *   sin(alt) = sin(lat)·sin(δ) + cos(lat)·cos(δ)·cos(H)
 */
export function solarAltitudeDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number {
  const lat = toRad(latitudeDegrees);
  const dec = toRad(declinationDeg(profile, t));
  const H = toRad(hourAngleDeg(profile, t));
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) +
    Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  return toDeg(Math.asin(clamp(sinAlt, -1, 1)));
}

/**
 * Solar azimuth in degrees, measured from north clockwise:
 *   cos(Az) = (sin(δ) − sin(lat)·sin(alt)) / (cos(lat)·cos(alt))
 * with the afternoon (H > 0) reflected to the western half.
 */
export function solarAzimuthDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number {
  const lat = toRad(latitudeDegrees);
  const dec = toRad(declinationDeg(profile, t));
  const altDeg = solarAltitudeDeg(profile, latitudeDegrees, t);
  const alt = toRad(altDeg);
  const denom = Math.cos(lat) * Math.cos(alt);
  if (Math.abs(denom) < 1e-12) {
    // Sun at the zenith / pole — azimuth is degenerate; report north.
    return 0;
  }
  const cosAz = (Math.sin(dec) - Math.sin(lat) * Math.sin(alt)) / denom;
  let az = toDeg(Math.acos(clamp(cosAz, -1, 1)));
  if (hourAngleDeg(profile, t) > 0) az = DEG_PER_TURN - az;
  return az;
}

/** True when the sun is above the horizon (altitude > 0). */
export function isDay(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): boolean {
  return solarAltitudeDeg(profile, latitudeDegrees, t) > 0;
}

/**
 * The hour-angle magnitude at sunrise/sunset (altitude 0):
 *   cos(H0) = −tan(lat)·tan(δ)
 * Returns `'polar-day'` when the sun never sets, `'polar-night'` when
 * it never rises, otherwise the H0 magnitude in degrees.
 */
export function sunriseHourAngleDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number | 'polar-day' | 'polar-night' {
  const lat = toRad(latitudeDegrees);
  const dec = toRad(declinationDeg(profile, t));
  const cosH0 = -Math.tan(lat) * Math.tan(dec);
  if (cosH0 < -1) return 'polar-day';
  if (cosH0 > 1) return 'polar-night';
  return toDeg(Math.acos(clamp(cosH0, -1, 1)));
}

/** Second-of-day of sunrise, or null on a polar day / night. */
export function sunriseSecOfDay(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number | null {
  const H0 = sunriseHourAngleDeg(profile, latitudeDegrees, t);
  if (typeof H0 !== 'number') return null;
  return (profile.dayLengthSeconds * (180 - H0)) / DEG_PER_TURN;
}

/** Second-of-day of sunset, or null on a polar day / night. */
export function sunsetSecOfDay(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number | null {
  const H0 = sunriseHourAngleDeg(profile, latitudeDegrees, t);
  if (typeof H0 !== 'number') return null;
  return (profile.dayLengthSeconds * (180 + H0)) / DEG_PER_TURN;
}

/**
 * First game-time strictly after `t` at which sunrise (or sunset, per
 * `which`) occurs. Walks forward day by day — declination drifts so
 * the event time changes daily — skipping polar days/nights, up to a
 * full year. Returns null if no such event occurs within a year
 * (perpetual polar day/night for that season).
 */
export function nextSolarEvent(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number,
  which: 'sunrise' | 'sunset'
): number | null {
  const D = profile.dayLengthSeconds;
  const Y = profile.yearLengthDays;
  const startDay = Math.floor(t / D);
  for (let offset = 0; offset <= Y; offset++) {
    const dayStart = (startDay + offset) * D;
    const secOfDay =
      which === 'sunrise'
        ? sunriseSecOfDay(profile, latitudeDegrees, dayStart)
        : sunsetSecOfDay(profile, latitudeDegrees, dayStart);
    if (secOfDay === null) continue;
    const candidate = dayStart + secOfDay;
    if (candidate > t) return candidate;
  }
  return null;
}

/** Season from day-of-year quarter (vernal equinox = day 0 = spring). */
export function seasonFor(profile: CelestialProfile, t: number): Season {
  const dayIndex = dayOfYear(profile, t);
  const Y = profile.yearLengthDays;
  if (dayIndex < Y / 4) return 'spring';
  if (dayIndex < Y / 2) return 'summer';
  if (dayIndex < (3 * Y) / 4) return 'fall';
  return 'winter';
}

/** Moon phase in `[0, 1)`: 0 = new, 0.5 = full. */
export function moonPhase(
  profile: CelestialProfile,
  synodicPeriodDays: number,
  t: number
): number {
  const synodicSeconds = synodicPeriodDays * profile.dayLengthSeconds;
  return ((t % synodicSeconds) + synodicSeconds) % synodicSeconds / synodicSeconds;
}

/** First game-time strictly after `t` at which the moon is full. */
export function nextFullMoon(
  profile: CelestialProfile,
  synodicPeriodDays: number,
  t: number
): number {
  const synodicSeconds = synodicPeriodDays * profile.dayLengthSeconds;
  const cycleStart = Math.floor(t / synodicSeconds) * synodicSeconds;
  let full = cycleStart + synodicSeconds / 2;
  if (full <= t) full += synodicSeconds;
  return full;
}
