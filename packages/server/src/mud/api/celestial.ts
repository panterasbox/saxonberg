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
 * `ShellApi.resolveSetting` can't resolve a world-level key with a `Location`
 * host (plan §2.5 / R8).
 *
 * Conventions for the geometry: angles are radians internally, degrees
 * at the boundary; dayIndex 0 = vernal equinox = Arienle 1; hour angle
 * 0 at noon, positive west; azimuth from north, clockwise; moon t = 0
 * is a reference new moon (full moon at synodic/2).
 *
 * Profile-resolving queries are async: `Zone.lookupField` is async.
 *
 * Thin, security-gated forwarding shell: the logic + the pure geometry
 * live in the hot-reloadable {@link CelestialLogic} singleton at
 * `/platform/idea/api/celestial`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/celestial` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { Quantity } from '../lib/quantity';
import { type CelestialProfile, type Season } from '../lib/time/CelestialProfile';
import {
  type ClockCallback,
  type ScheduleOpts,
  type ClockHandle,
} from './worldclock';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import {
  CelestialLogic,
  CAMPUS_LATITUDE,
  CAMPUS_LONGITUDE,
} from '../platform/idea/api/CelestialLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/celestial';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/CelestialLogic', import.meta.url)
);

/** Resolve the HMR-able CelestialLogic singleton (sync). */
function logic(): CelestialLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CelestialLogic'
      ) as typeof CelestialLogic | null) ?? CelestialLogic)()
  );
}

export class CelestialApi {
  /** Campus latitude (°N). Single-region v1; per-zone latitude is future work. */
  static readonly CAMPUS_LATITUDE = CAMPUS_LATITUDE;
  /** Campus longitude (°E). Reserved for future time-zone work. */
  static readonly CAMPUS_LONGITUDE = CAMPUS_LONGITUDE;

  /* ──────────────────── profile resolution ──────────────────── */

  /**
   * Resolve the governing profile for a location: the nearest spatial
   * zone's `celestialProfile` field (walking enclosing zones), or
   * `EARTH_LIKE` when nothing in the chain defines one. No per-zone
   * authoring is required for v1 — the fallback covers the campus.
   */
  public static async profileFor(location: Stuff): Promise<CelestialProfile> {
    return logic().profileFor(location);
  }

  /* ──────────────────── instantaneous queries ──────────────────── */

  public static async isDayAt(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<boolean> {
    return logic().isDayAt(location, time);
  }

  public static async sunAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    return logic().sunAltitude(location, time);
  }

  public static async sunAzimuth(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    return logic().sunAzimuth(location, time);
  }

  public static async currentSeason(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Season> {
    return logic().currentSeason(location, time);
  }

  /* ──────────────────── event times ──────────────────── */

  public static async nextSunrise(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    return logic().nextSunrise(location, time);
  }

  public static async nextSunset(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    return logic().nextSunset(location, time);
  }

  /** Next full moon. Uses the universe-default lunar profile (no location). */
  public static nextFullMoon(time?: Quantity<'s'>): Quantity<'s'> {
    return logic().nextFullMoon(time);
  }

  /** Moon phase in [0, 1): 0 = new, 0.5 = full. */
  public static moonPhase(time?: Quantity<'s'>): number {
    return logic().moonPhase(time);
  }

  public static async moonAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    return logic().moonAltitude(location, time);
  }

  public static async moonAzimuth(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    return logic().moonAzimuth(location, time);
  }

  /* ──────────────────── astronomical scheduling ──────────────────── */

  public static async atNextSunrise(
    location: Stuff,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): Promise<ClockHandle> {
    return logic().atNextSunrise(location, cb, opts);
  }

  public static async atNextSunset(
    location: Stuff,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): Promise<ClockHandle> {
    return logic().atNextSunset(location, cb, opts);
  }

  public static atNextFullMoon(
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return logic().atNextFullMoon(cb, opts);
  }

  /* ──────────────────── pure geometry ──────────────────── */

  /** 0-based day-of-year in `[0, yearLengthDays)`. */
  public static dayOfYear(profile: CelestialProfile, t: number): number {
    return logic().dayOfYear(profile, t);
  }

  /** Seconds elapsed since local midnight, in `[0, dayLengthSeconds)`. */
  public static secondOfDay(profile: CelestialProfile, t: number): number {
    return logic().secondOfDay(profile, t);
  }

  /**
   * Solar declination in degrees: `δ = tilt · sin(2π · dayIndex / Y)`.
   * 0 at the equinoxes, ±tilt at the solstices.
   */
  public static declinationDeg(profile: CelestialProfile, t: number): number {
    return logic().declinationDeg(profile, t);
  }

  /**
   * Hour angle in degrees: `(secOfDay / D) · 360 − 180`, so local noon
   * is 0 and the afternoon is positive.
   */
  public static hourAngleDeg(profile: CelestialProfile, t: number): number {
    return logic().hourAngleDeg(profile, t);
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
    return logic().altitudeFor(latitudeDegrees, decDegrees, hourAngleDegrees);
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
    return logic().azimuthFor(latitudeDegrees, decDegrees, hourAngleDegrees);
  }

  /** Solar altitude in degrees. */
  public static solarAltitudeDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number {
    return logic().solarAltitudeDeg(profile, latitudeDegrees, t);
  }

  /** Solar azimuth in degrees, from north clockwise. */
  public static solarAzimuthDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number {
    return logic().solarAzimuthDeg(profile, latitudeDegrees, t);
  }

  /** True when the sun is above the horizon (altitude > 0). */
  public static isDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): boolean {
    return logic().isDay(profile, latitudeDegrees, t);
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
    return logic().sunriseHourAngleDeg(profile, latitudeDegrees, t);
  }

  /** Second-of-day of sunrise, or null on a polar day / night. */
  public static sunriseSecOfDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | null {
    return logic().sunriseSecOfDay(profile, latitudeDegrees, t);
  }

  /** Second-of-day of sunset, or null on a polar day / night. */
  public static sunsetSecOfDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | null {
    return logic().sunsetSecOfDay(profile, latitudeDegrees, t);
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
    return logic().nextSolarEvent(profile, latitudeDegrees, t, which);
  }

  /** Season from day-of-year quarter (vernal equinox = day 0 = spring). */
  public static seasonFor(profile: CelestialProfile, t: number): Season {
    return logic().seasonFor(profile, t);
  }

  /** Moon phase in `[0, 1)`: 0 = new, 0.5 = full. */
  public static moonPhaseFor(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return logic().moonPhaseFor(profile, synodicPeriodDays, t);
  }

  /** First game-time strictly after `t` at which the moon is full. */
  public static nextFullMoonFor(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return logic().nextFullMoonFor(profile, synodicPeriodDays, t);
  }

  /**
   * Sun's ecliptic longitude in degrees, 0 at the vernal equinox,
   * advancing one turn per orbital year. Continuous in `t`.
   */
  public static solarEclipticLongitudeDeg(
    profile: CelestialProfile,
    t: number
  ): number {
    return logic().solarEclipticLongitudeDeg(profile, t);
  }

  public static moonDeclinationDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return logic().moonDeclinationDeg(profile, synodicPeriodDays, t);
  }

  /** Hour angle of the moon: the sun's, lagged by 360° · phase. */
  public static moonHourAngleDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return logic().moonHourAngleDeg(profile, synodicPeriodDays, t);
  }

  public static moonAltitudeDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    synodicPeriodDays: number,
    t: number
  ): number {
    return logic().moonAltitudeDeg(profile, latitudeDegrees, synodicPeriodDays, t);
  }

  public static moonAzimuthDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    synodicPeriodDays: number,
    t: number
  ): number {
    return logic().moonAzimuthDeg(profile, latitudeDegrees, synodicPeriodDays, t);
  }
}

SecurityApi.decorateApiClass(CelestialApi);
