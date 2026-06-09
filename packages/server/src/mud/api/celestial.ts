/**
 * CelestialApi — sky queries over the world-time axis, plus the pure
 * solar / lunar geometry they sit on.
 *
 * The high-level surface resolves the governing `CelestialProfile`
 * (zone inheritance → `EARTH_LIKE` fallback) and the campus latitude
 * and returns `Quantity`-packaged angles / times; the lower
 * `── pure geometry ──` section is the pedagogical seam — stateless
 * methods that take plain numbers and return plain numbers so an
 * astronomy student can compare engine output to textbook formulas.
 * Astronomical scheduling shortcuts compute a deadline and hand it to
 * `WorldClockApi.at` — compose, don't reimplement.
 *
 * Wave 2 ships the celestial *compute* substrate only: there is NO
 * wiring into ambient light (D6) — that waits on the perception
 * branch. Geography (latitude / longitude) and the profile are module
 * constants / zone fields, never EnvironmentMixin settings, because
 * `resolveSetting` can't resolve a world-level key with a `Location`
 * host (plan §2.5 / R8).
 *
 * Conventions for the geometry: angles are radians internally, degrees
 * at the boundary; dayIndex 0 = vernal equinox = Arienle 1; hour angle
 * 0 at noon, positive west; azimuth from north, clockwise; moon t = 0
 * is a reference new moon (full moon at synodic/2).
 *
 * Profile-resolving queries are async: `Zone.lookupField` is async.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Zone } from '../lib/zone/Zone';
import { Quantity } from '../lib/quantity';
import {
  type CelestialProfile,
  type Season,
  EARTH_LIKE,
} from '../lib/time/CelestialProfile';
import {
  WorldClockApi,
  type ClockCallback,
  type ScheduleOpts,
  type ClockHandle,
} from './worldclock';
import { SecurityApi } from './security';

const DEG_PER_TURN = 360;
const TWO_PI = Math.PI * 2;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const clamp = (x: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, x));

export class CelestialApi {
  private constructor() {}

  /** Campus latitude (°N). Single-region v1; per-zone latitude is future work. */
  static readonly CAMPUS_LATITUDE = 42;
  /** Campus longitude (°E). Reserved for future time-zone work. */
  static readonly CAMPUS_LONGITUDE = 0;

  /* ──────────────────── profile resolution ──────────────────── */

  /**
   * Resolve the governing profile for a location: the nearest spatial
   * zone's `celestialProfile` field (walking enclosing zones), or
   * `EARTH_LIKE` when nothing in the chain defines one. No per-zone
   * authoring is required for v1 — the fallback covers the campus.
   */
  public static async profileFor(location: Stuff): Promise<CelestialProfile> {
    const zone = (
      location as Stuff & { getZone?: () => Zone | null }
    ).getZone?.();
    const profile = zone
      ? await zone.lookupField<CelestialProfile>('celestialProfile')
      : null;
    return profile ?? EARTH_LIKE;
  }

  /* ──────────────────── instantaneous queries ──────────────────── */

  public static async isDayAt(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<boolean> {
    const profile = await CelestialApi.profileFor(location);
    return CelestialApi.isDay(
      profile,
      CelestialApi.CAMPUS_LATITUDE,
      CelestialApi.#t(time)
    );
  }

  public static async sunAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await CelestialApi.profileFor(location);
    return Quantity.of(
      CelestialApi.solarAltitudeDeg(
        profile,
        CelestialApi.CAMPUS_LATITUDE,
        CelestialApi.#t(time)
      ),
      'degrees'
    );
  }

  public static async sunAzimuth(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await CelestialApi.profileFor(location);
    return Quantity.of(
      CelestialApi.solarAzimuthDeg(
        profile,
        CelestialApi.CAMPUS_LATITUDE,
        CelestialApi.#t(time)
      ),
      'degrees'
    );
  }

  public static async currentSeason(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Season> {
    const profile = await CelestialApi.profileFor(location);
    return CelestialApi.seasonFor(profile, CelestialApi.#t(time));
  }

  /* ──────────────────── event times ──────────────────── */

  public static async nextSunrise(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    const profile = await CelestialApi.profileFor(location);
    const next = CelestialApi.nextSolarEvent(
      profile,
      CelestialApi.CAMPUS_LATITUDE,
      CelestialApi.#t(time),
      'sunrise'
    );
    return Quantity.of(next ?? CelestialApi.#t(time), 's');
  }

  public static async nextSunset(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    const profile = await CelestialApi.profileFor(location);
    const next = CelestialApi.nextSolarEvent(
      profile,
      CelestialApi.CAMPUS_LATITUDE,
      CelestialApi.#t(time),
      'sunset'
    );
    return Quantity.of(next ?? CelestialApi.#t(time), 's');
  }

  /** Next full moon. Uses the universe-default lunar profile (no location). */
  public static nextFullMoon(time?: Quantity<'s'>): Quantity<'s'> {
    return Quantity.of(
      CelestialApi.nextFullMoonFor(
        EARTH_LIKE,
        CelestialApi.#synodic(),
        CelestialApi.#t(time)
      ),
      's'
    );
  }

  /** Moon phase in [0, 1): 0 = new, 0.5 = full. */
  public static moonPhase(time?: Quantity<'s'>): number {
    return CelestialApi.moonPhaseFor(
      EARTH_LIKE,
      CelestialApi.#synodic(),
      CelestialApi.#t(time)
    );
  }

  public static async moonAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await CelestialApi.profileFor(location);
    const synodic =
      profile.moons[0]?.synodicPeriodDays ?? CelestialApi.#synodic();
    return Quantity.of(
      CelestialApi.moonAltitudeDeg(
        profile,
        CelestialApi.CAMPUS_LATITUDE,
        synodic,
        CelestialApi.#t(time)
      ),
      'degrees'
    );
  }

  public static async moonAzimuth(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await CelestialApi.profileFor(location);
    const synodic =
      profile.moons[0]?.synodicPeriodDays ?? CelestialApi.#synodic();
    return Quantity.of(
      CelestialApi.moonAzimuthDeg(
        profile,
        CelestialApi.CAMPUS_LATITUDE,
        synodic,
        CelestialApi.#t(time)
      ),
      'degrees'
    );
  }

  /* ──────────────────── astronomical scheduling ──────────────────── */

  public static async atNextSunrise(
    location: Stuff,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): Promise<ClockHandle> {
    const deadline = await CelestialApi.nextSunrise(location);
    return WorldClockApi.at(deadline, cb, opts);
  }

  public static async atNextSunset(
    location: Stuff,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): Promise<ClockHandle> {
    const deadline = await CelestialApi.nextSunset(location);
    return WorldClockApi.at(deadline, cb, opts);
  }

  public static atNextFullMoon(
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return WorldClockApi.at(CelestialApi.nextFullMoon(), cb, opts);
  }

  /* ──────────────────── pure geometry ──────────────────── */

  /** 0-based day-of-year in `[0, yearLengthDays)`. */
  public static dayOfYear(profile: CelestialProfile, t: number): number {
    const D = profile.dayLengthSeconds;
    const Y = profile.yearLengthDays;
    const dayIndex = Math.floor(t / D);
    return ((dayIndex % Y) + Y) % Y;
  }

  /** Seconds elapsed since local midnight, in `[0, dayLengthSeconds)`. */
  public static secondOfDay(profile: CelestialProfile, t: number): number {
    const D = profile.dayLengthSeconds;
    return ((t % D) + D) % D;
  }

  /**
   * Solar declination in degrees: `δ = tilt · sin(2π · dayIndex / Y)`.
   * 0 at the equinoxes, ±tilt at the solstices.
   */
  public static declinationDeg(profile: CelestialProfile, t: number): number {
    const tilt = profile.axialTiltDegrees.rawValue();
    const Y = profile.yearLengthDays;
    const dayIndex = CelestialApi.dayOfYear(profile, t);
    return tilt * Math.sin((TWO_PI * dayIndex) / Y);
  }

  /**
   * Hour angle in degrees: `(secOfDay / D) · 360 − 180`, so local noon
   * is 0 and the afternoon is positive.
   */
  public static hourAngleDeg(profile: CelestialProfile, t: number): number {
    const D = profile.dayLengthSeconds;
    return (CelestialApi.secondOfDay(profile, t) / D) * DEG_PER_TURN - 180;
  }

  /**
   * Altitude in degrees of any body from its declination and hour
   * angle: `sin(alt) = sin(lat)·sin(δ) + cos(lat)·cos(δ)·cos(H)`.
   */
  public static altitudeFor(
    latitudeDegrees: number,
    decDegrees: number,
    hourAngleDegrees: number
  ): number {
    const lat = toRad(latitudeDegrees);
    const dec = toRad(decDegrees);
    const H = toRad(hourAngleDegrees);
    const sinAlt =
      Math.sin(lat) * Math.sin(dec) +
      Math.cos(lat) * Math.cos(dec) * Math.cos(H);
    return toDeg(Math.asin(clamp(sinAlt, -1, 1)));
  }

  /**
   * Azimuth in degrees (from north, clockwise) of any body from its
   * declination and hour angle:
   *   cos(Az) = (sin(δ) − sin(lat)·sin(alt)) / (cos(lat)·cos(alt))
   * with the western half taken when the hour angle is positive.
   */
  public static azimuthFor(
    latitudeDegrees: number,
    decDegrees: number,
    hourAngleDegrees: number
  ): number {
    const lat = toRad(latitudeDegrees);
    const dec = toRad(decDegrees);
    const altDeg = CelestialApi.altitudeFor(
      latitudeDegrees,
      decDegrees,
      hourAngleDegrees
    );
    const alt = toRad(altDeg);
    const denom = Math.cos(lat) * Math.cos(alt);
    if (Math.abs(denom) < 1e-12) {
      // Body at the zenith / pole — azimuth is degenerate; report north.
      return 0;
    }
    const cosAz = (Math.sin(dec) - Math.sin(lat) * Math.sin(alt)) / denom;
    let az = toDeg(Math.acos(clamp(cosAz, -1, 1)));
    if (hourAngleDegrees > 0) az = DEG_PER_TURN - az;
    return az;
  }

  /** Solar altitude in degrees. */
  public static solarAltitudeDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number {
    return CelestialApi.altitudeFor(
      latitudeDegrees,
      CelestialApi.declinationDeg(profile, t),
      CelestialApi.hourAngleDeg(profile, t)
    );
  }

  /** Solar azimuth in degrees, from north clockwise. */
  public static solarAzimuthDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number {
    return CelestialApi.azimuthFor(
      latitudeDegrees,
      CelestialApi.declinationDeg(profile, t),
      CelestialApi.hourAngleDeg(profile, t)
    );
  }

  /** True when the sun is above the horizon (altitude > 0). */
  public static isDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): boolean {
    return CelestialApi.solarAltitudeDeg(profile, latitudeDegrees, t) > 0;
  }

  /**
   * The hour-angle magnitude at sunrise/sunset (altitude 0):
   *   cos(H0) = −tan(lat)·tan(δ)
   * Returns `'polar-day'` when the sun never sets, `'polar-night'` when
   * it never rises, otherwise the H0 magnitude in degrees.
   */
  public static sunriseHourAngleDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | 'polar-day' | 'polar-night' {
    const lat = toRad(latitudeDegrees);
    const dec = toRad(CelestialApi.declinationDeg(profile, t));
    const cosH0 = -Math.tan(lat) * Math.tan(dec);
    if (cosH0 < -1) return 'polar-day';
    if (cosH0 > 1) return 'polar-night';
    return toDeg(Math.acos(clamp(cosH0, -1, 1)));
  }

  /** Second-of-day of sunrise, or null on a polar day / night. */
  public static sunriseSecOfDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | null {
    const H0 = CelestialApi.sunriseHourAngleDeg(profile, latitudeDegrees, t);
    if (typeof H0 !== 'number') return null;
    return (profile.dayLengthSeconds * (180 - H0)) / DEG_PER_TURN;
  }

  /** Second-of-day of sunset, or null on a polar day / night. */
  public static sunsetSecOfDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | null {
    const H0 = CelestialApi.sunriseHourAngleDeg(profile, latitudeDegrees, t);
    if (typeof H0 !== 'number') return null;
    return (profile.dayLengthSeconds * (180 + H0)) / DEG_PER_TURN;
  }

  /**
   * First game-time strictly after `t` at which sunrise (or sunset, per
   * `which`) occurs. Walks forward day by day — declination drifts so
   * the event time changes daily — skipping polar days/nights, up to a
   * full year. Returns null if no such event occurs within a year.
   */
  public static nextSolarEvent(
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
          ? CelestialApi.sunriseSecOfDay(profile, latitudeDegrees, dayStart)
          : CelestialApi.sunsetSecOfDay(profile, latitudeDegrees, dayStart);
      if (secOfDay === null) continue;
      const candidate = dayStart + secOfDay;
      if (candidate > t) return candidate;
    }
    return null;
  }

  /** Season from day-of-year quarter (vernal equinox = day 0 = spring). */
  public static seasonFor(profile: CelestialProfile, t: number): Season {
    const dayIndex = CelestialApi.dayOfYear(profile, t);
    const Y = profile.yearLengthDays;
    if (dayIndex < Y / 4) return 'spring';
    if (dayIndex < Y / 2) return 'summer';
    if (dayIndex < (3 * Y) / 4) return 'fall';
    return 'winter';
  }

  /** Moon phase in `[0, 1)`: 0 = new, 0.5 = full. */
  public static moonPhaseFor(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    const synodicSeconds = synodicPeriodDays * profile.dayLengthSeconds;
    return (
      (((t % synodicSeconds) + synodicSeconds) % synodicSeconds) /
      synodicSeconds
    );
  }

  /** First game-time strictly after `t` at which the moon is full. */
  public static nextFullMoonFor(
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

  /**
   * Sun's ecliptic longitude in degrees, 0 at the vernal equinox,
   * advancing one turn per orbital year. Continuous in `t`.
   */
  public static solarEclipticLongitudeDeg(
    profile: CelestialProfile,
    t: number
  ): number {
    const yearSeconds = profile.yearLengthDays * profile.dayLengthSeconds;
    const frac = ((t % yearSeconds) + yearSeconds) % yearSeconds;
    return (frac / yearSeconds) * DEG_PER_TURN;
  }

  public static moonDeclinationDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    const tilt = profile.axialTiltDegrees.rawValue();
    const lambda = CelestialApi.#moonEclipticLongitudeDeg(
      profile,
      synodicPeriodDays,
      t
    );
    return tilt * Math.sin(toRad(lambda));
  }

  /** Hour angle of the moon: the sun's, lagged by 360° · phase. */
  public static moonHourAngleDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    const phase = CelestialApi.moonPhaseFor(profile, synodicPeriodDays, t);
    let H = CelestialApi.hourAngleDeg(profile, t) - DEG_PER_TURN * phase;
    // Normalize into [-180, 180].
    H = ((((H + 180) % DEG_PER_TURN) + DEG_PER_TURN) % DEG_PER_TURN) - 180;
    return H;
  }

  public static moonAltitudeDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    synodicPeriodDays: number,
    t: number
  ): number {
    return CelestialApi.altitudeFor(
      latitudeDegrees,
      CelestialApi.moonDeclinationDeg(profile, synodicPeriodDays, t),
      CelestialApi.moonHourAngleDeg(profile, synodicPeriodDays, t)
    );
  }

  public static moonAzimuthDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    synodicPeriodDays: number,
    t: number
  ): number {
    return CelestialApi.azimuthFor(
      latitudeDegrees,
      CelestialApi.moonDeclinationDeg(profile, synodicPeriodDays, t),
      CelestialApi.moonHourAngleDeg(profile, synodicPeriodDays, t)
    );
  }

  /* ──────────────────── internals ──────────────────── */

  static #t(time?: Quantity<'s'>): number {
    return (time ?? WorldClockApi.getNow()).rawValue();
  }

  /** Universe-default lunar synodic period (days). */
  static #synodic(): number {
    return EARTH_LIKE.moons[0]?.synodicPeriodDays ?? 30;
  }

  /**
   * First-order lunar model (honest but simplified): the moon is a
   * point on the ecliptic whose longitude leads the sun's by
   * `360° · phase` (new moon shares the sun's longitude; full moon
   * sits opposite). Declination follows the ecliptic via the axial
   * tilt; the hour angle lags the sun's by the same separation, so a
   * full moon rides high at local midnight. Ignores the 5° lunar
   * inclination and orbital eccentricity — first order, not an
   * ephemeris.
   */
  static #moonEclipticLongitudeDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    const phase = CelestialApi.moonPhaseFor(profile, synodicPeriodDays, t);
    return (
      CelestialApi.solarEclipticLongitudeDeg(profile, t) +
      DEG_PER_TURN * phase
    );
  }
}

SecurityApi.decorateApiClass(CelestialApi);
