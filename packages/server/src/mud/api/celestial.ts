/**
 * CelestialApi — sky queries over the world-time axis.
 *
 * Wraps the pure geometry in `lib/time/solar.ts`, resolves the
 * governing `CelestialProfile` (zone inheritance → `EARTH_LIKE`
 * fallback) and the campus latitude, and returns `Quantity`-packaged
 * angles / times. Astronomical scheduling shortcuts compute a
 * deadline and hand it to `WorldClockApi.at` — compose, don't
 * reimplement.
 *
 * Wave 2 ships the celestial *compute* substrate only: there is NO
 * wiring into ambient light (D6) — that waits on the perception
 * branch. Geography (latitude / longitude) and the profile are module
 * constants / zone fields, never EnvironmentMixin settings, because
 * `resolveSetting` can't resolve a world-level key with a `Location`
 * host (plan §2.5 / R8).
 *
 * Every query is async: profile resolution walks `Zone.lookupField`,
 * which is async.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Zone } from '../lib/zone/Zone';
import { Quantity } from '../lib/quantity';
import {
  type CelestialProfile,
  type Season,
  EARTH_LIKE,
} from '../lib/time/CelestialProfile';
import * as Solar from '../lib/time/solar';
import { WorldClockApi, type ClockCallback, type ScheduleOpts, type ClockHandle } from './worldclock';
import { SecurityApi } from './security';

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
    return Solar.isDay(profile, CelestialApi.CAMPUS_LATITUDE, CelestialApi.#t(time));
  }

  public static async sunAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await CelestialApi.profileFor(location);
    return Quantity.of(
      Solar.solarAltitudeDeg(
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
      Solar.solarAzimuthDeg(
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
    return Solar.seasonFor(profile, CelestialApi.#t(time));
  }

  /* ──────────────────── event times ──────────────────── */

  public static async nextSunrise(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    const profile = await CelestialApi.profileFor(location);
    const next = Solar.nextSolarEvent(
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
    const next = Solar.nextSolarEvent(
      profile,
      CelestialApi.CAMPUS_LATITUDE,
      CelestialApi.#t(time),
      'sunset'
    );
    return Quantity.of(next ?? CelestialApi.#t(time), 's');
  }

  /** Next full moon. Uses the universe-default lunar profile (no location). */
  public static nextFullMoon(time?: Quantity<'s'>): Quantity<'s'> {
    const moon = EARTH_LIKE.moons[0];
    const synodic = moon ? moon.synodicPeriodDays : 30;
    return Quantity.of(
      Solar.nextFullMoon(EARTH_LIKE, synodic, CelestialApi.#t(time)),
      's'
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

  /* ──────────────────── internals ──────────────────── */

  static #t(time?: Quantity<'s'>): number {
    return (time ?? WorldClockApi.getNow()).rawValue();
  }
}

SecurityApi.decorateApiClass(CelestialApi);
