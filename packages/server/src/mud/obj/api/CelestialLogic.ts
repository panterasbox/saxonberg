// CelestialLogic — the hot-reloadable logic singleton behind
// CelestialApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Zone } from '../../lib/zone/Zone';
import { Quantity } from '../../lib/quantity';
import {
  type CelestialProfile,
  type Season,
  EARTH_LIKE,
} from '../../lib/time/CelestialProfile';
import {
  WorldClockApi,
  type ClockCallback,
  type ScheduleOpts,
  type ClockHandle,
} from '../../api/worldclock';

const DEG_PER_TURN = 360;
const TWO_PI = Math.PI * 2;

/** Campus latitude (°N). Single-region v1; per-zone latitude is future work. */
export const CAMPUS_LATITUDE = 42;
/** Campus longitude (°E). Reserved for future time-zone work. */
export const CAMPUS_LONGITUDE = 0;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const clamp = (x: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, x));

const CelestialApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('api/celestial#CelestialApi'),
  SecurityPolicies.SelfOnly
);

/**
 * CelestialLogic — the hot-reloadable logic singleton behind
 * {@link CelestialApi}.
 *
 * Lives at `/obj/api/celestial` (a stateless `Stuff` singleton, no
 * backing `Template`); `CelestialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): the high-level
 * sky queries fan out to each other and to the profile resolver via
 * intra-singleton `this.x()` self-calls (`SelfOnly`), while the facade
 * forwarders supply the `FromModule` half. The entire pure-geometry
 * layer (declination / hour-angle / altitude / azimuth / moon model)
 * lives in module-private free functions — the pedagogical seam stays
 * plain-numbers-in, plain-numbers-out — and the public geometry methods
 * are thin gated wrappers over them. The former static `#`-private
 * helpers (`#t`, `#synodic`, `#moonEclipticLongitudeDeg`) are likewise
 * module-private free functions; the `CAMPUS_*` constants are placed
 * here and re-exposed on the facade.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class CelestialLogic extends Idea {
  /* ──────────────────── profile resolution ──────────────────── */

  /** See {@link CelestialApi.profileFor}. */
  @CallSecurity(CelestialApiCallers)
  public async profileFor(location: Stuff): Promise<CelestialProfile> {
    const zone = (
      location as Stuff & { getZone?: () => Zone | null }
    ).getZone?.();
    const profile = zone
      ? await zone.lookupField<CelestialProfile>('celestialProfile')
      : null;
    return profile ?? EARTH_LIKE;
  }

  /* ──────────────────── instantaneous queries ──────────────────── */

  /** See {@link CelestialApi.isDayAt}. */
  @CallSecurity(CelestialApiCallers)
  public async isDayAt(location: Stuff, time?: Quantity<'s'>): Promise<boolean> {
    const profile = await this.profileFor(location);
    return isDay(profile, CAMPUS_LATITUDE, nowOr(time));
  }

  /** See {@link CelestialApi.sunAltitude}. */
  @CallSecurity(CelestialApiCallers)
  public async sunAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await this.profileFor(location);
    return Quantity.of(
      solarAltitudeDeg(profile, CAMPUS_LATITUDE, nowOr(time)),
      'degrees'
    );
  }

  /** See {@link CelestialApi.sunAzimuth}. */
  @CallSecurity(CelestialApiCallers)
  public async sunAzimuth(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await this.profileFor(location);
    return Quantity.of(
      solarAzimuthDeg(profile, CAMPUS_LATITUDE, nowOr(time)),
      'degrees'
    );
  }

  /** See {@link CelestialApi.currentSeason}. */
  @CallSecurity(CelestialApiCallers)
  public async currentSeason(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Season> {
    const profile = await this.profileFor(location);
    return seasonFor(profile, nowOr(time));
  }

  /* ──────────────────── event times ──────────────────── */

  /** See {@link CelestialApi.nextSunrise}. */
  @CallSecurity(CelestialApiCallers)
  public async nextSunrise(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    const profile = await this.profileFor(location);
    const next = nextSolarEvent(
      profile,
      CAMPUS_LATITUDE,
      nowOr(time),
      'sunrise'
    );
    return Quantity.of(next ?? nowOr(time), 's');
  }

  /** See {@link CelestialApi.nextSunset}. */
  @CallSecurity(CelestialApiCallers)
  public async nextSunset(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'s'>> {
    const profile = await this.profileFor(location);
    const next = nextSolarEvent(
      profile,
      CAMPUS_LATITUDE,
      nowOr(time),
      'sunset'
    );
    return Quantity.of(next ?? nowOr(time), 's');
  }

  /** See {@link CelestialApi.nextFullMoon}. */
  @CallSecurity(CelestialApiCallers)
  public nextFullMoon(time?: Quantity<'s'>): Quantity<'s'> {
    return Quantity.of(
      nextFullMoonFor(EARTH_LIKE, defaultSynodic(), nowOr(time)),
      's'
    );
  }

  /** See {@link CelestialApi.moonPhase}. */
  @CallSecurity(CelestialApiCallers)
  public moonPhase(time?: Quantity<'s'>): number {
    return moonPhaseFor(EARTH_LIKE, defaultSynodic(), nowOr(time));
  }

  /** See {@link CelestialApi.moonAltitude}. */
  @CallSecurity(CelestialApiCallers)
  public async moonAltitude(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await this.profileFor(location);
    const synodic = profile.moons[0]?.synodicPeriodDays ?? defaultSynodic();
    return Quantity.of(
      moonAltitudeDeg(profile, CAMPUS_LATITUDE, synodic, nowOr(time)),
      'degrees'
    );
  }

  /** See {@link CelestialApi.moonAzimuth}. */
  @CallSecurity(CelestialApiCallers)
  public async moonAzimuth(
    location: Stuff,
    time?: Quantity<'s'>
  ): Promise<Quantity<'degrees'>> {
    const profile = await this.profileFor(location);
    const synodic = profile.moons[0]?.synodicPeriodDays ?? defaultSynodic();
    return Quantity.of(
      moonAzimuthDeg(profile, CAMPUS_LATITUDE, synodic, nowOr(time)),
      'degrees'
    );
  }

  /* ──────────────────── astronomical scheduling ──────────────────── */

  /** See {@link CelestialApi.atNextSunrise}. */
  @CallSecurity(CelestialApiCallers)
  public async atNextSunrise(
    location: Stuff,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): Promise<ClockHandle> {
    const deadline = await this.nextSunrise(location);
    return WorldClockApi.at(deadline, cb, opts);
  }

  /** See {@link CelestialApi.atNextSunset}. */
  @CallSecurity(CelestialApiCallers)
  public async atNextSunset(
    location: Stuff,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): Promise<ClockHandle> {
    const deadline = await this.nextSunset(location);
    return WorldClockApi.at(deadline, cb, opts);
  }

  /** See {@link CelestialApi.atNextFullMoon}. */
  @CallSecurity(CelestialApiCallers)
  public atNextFullMoon(cb: ClockCallback, opts?: ScheduleOpts): ClockHandle {
    return WorldClockApi.at(this.nextFullMoon(), cb, opts);
  }

  /* ──────────────────── pure geometry ──────────────────── */

  /** See {@link CelestialApi.dayOfYear}. */
  @CallSecurity(CelestialApiCallers)
  public dayOfYear(profile: CelestialProfile, t: number): number {
    return dayOfYear(profile, t);
  }

  /** See {@link CelestialApi.secondOfDay}. */
  @CallSecurity(CelestialApiCallers)
  public secondOfDay(profile: CelestialProfile, t: number): number {
    return secondOfDay(profile, t);
  }

  /** See {@link CelestialApi.declinationDeg}. */
  @CallSecurity(CelestialApiCallers)
  public declinationDeg(profile: CelestialProfile, t: number): number {
    return declinationDeg(profile, t);
  }

  /** See {@link CelestialApi.hourAngleDeg}. */
  @CallSecurity(CelestialApiCallers)
  public hourAngleDeg(profile: CelestialProfile, t: number): number {
    return hourAngleDeg(profile, t);
  }

  /** See {@link CelestialApi.altitudeFor}. */
  @CallSecurity(CelestialApiCallers)
  public altitudeFor(
    latitudeDegrees: number,
    decDegrees: number,
    hourAngleDegrees: number
  ): number {
    return altitudeFor(latitudeDegrees, decDegrees, hourAngleDegrees);
  }

  /** See {@link CelestialApi.azimuthFor}. */
  @CallSecurity(CelestialApiCallers)
  public azimuthFor(
    latitudeDegrees: number,
    decDegrees: number,
    hourAngleDegrees: number
  ): number {
    return azimuthFor(latitudeDegrees, decDegrees, hourAngleDegrees);
  }

  /** See {@link CelestialApi.solarAltitudeDeg}. */
  @CallSecurity(CelestialApiCallers)
  public solarAltitudeDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number {
    return solarAltitudeDeg(profile, latitudeDegrees, t);
  }

  /** See {@link CelestialApi.solarAzimuthDeg}. */
  @CallSecurity(CelestialApiCallers)
  public solarAzimuthDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number {
    return solarAzimuthDeg(profile, latitudeDegrees, t);
  }

  /** See {@link CelestialApi.isDay}. */
  @CallSecurity(CelestialApiCallers)
  public isDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): boolean {
    return isDay(profile, latitudeDegrees, t);
  }

  /** See {@link CelestialApi.sunriseHourAngleDeg}. */
  @CallSecurity(CelestialApiCallers)
  public sunriseHourAngleDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | 'polar-day' | 'polar-night' {
    return sunriseHourAngleDeg(profile, latitudeDegrees, t);
  }

  /** See {@link CelestialApi.sunriseSecOfDay}. */
  @CallSecurity(CelestialApiCallers)
  public sunriseSecOfDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | null {
    return sunriseSecOfDay(profile, latitudeDegrees, t);
  }

  /** See {@link CelestialApi.sunsetSecOfDay}. */
  @CallSecurity(CelestialApiCallers)
  public sunsetSecOfDay(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number
  ): number | null {
    return sunsetSecOfDay(profile, latitudeDegrees, t);
  }

  /** See {@link CelestialApi.nextSolarEvent}. */
  @CallSecurity(CelestialApiCallers)
  public nextSolarEvent(
    profile: CelestialProfile,
    latitudeDegrees: number,
    t: number,
    which: 'sunrise' | 'sunset'
  ): number | null {
    return nextSolarEvent(profile, latitudeDegrees, t, which);
  }

  /** See {@link CelestialApi.seasonFor}. */
  @CallSecurity(CelestialApiCallers)
  public seasonFor(profile: CelestialProfile, t: number): Season {
    return seasonFor(profile, t);
  }

  /** See {@link CelestialApi.moonPhaseFor}. */
  @CallSecurity(CelestialApiCallers)
  public moonPhaseFor(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return moonPhaseFor(profile, synodicPeriodDays, t);
  }

  /** See {@link CelestialApi.nextFullMoonFor}. */
  @CallSecurity(CelestialApiCallers)
  public nextFullMoonFor(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return nextFullMoonFor(profile, synodicPeriodDays, t);
  }

  /** See {@link CelestialApi.solarEclipticLongitudeDeg}. */
  @CallSecurity(CelestialApiCallers)
  public solarEclipticLongitudeDeg(
    profile: CelestialProfile,
    t: number
  ): number {
    return solarEclipticLongitudeDeg(profile, t);
  }

  /** See {@link CelestialApi.moonDeclinationDeg}. */
  @CallSecurity(CelestialApiCallers)
  public moonDeclinationDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return moonDeclinationDeg(profile, synodicPeriodDays, t);
  }

  /** See {@link CelestialApi.moonHourAngleDeg}. */
  @CallSecurity(CelestialApiCallers)
  public moonHourAngleDeg(
    profile: CelestialProfile,
    synodicPeriodDays: number,
    t: number
  ): number {
    return moonHourAngleDeg(profile, synodicPeriodDays, t);
  }

  /** See {@link CelestialApi.moonAltitudeDeg}. */
  @CallSecurity(CelestialApiCallers)
  public moonAltitudeDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    synodicPeriodDays: number,
    t: number
  ): number {
    return moonAltitudeDeg(profile, latitudeDegrees, synodicPeriodDays, t);
  }

  /** See {@link CelestialApi.moonAzimuthDeg}. */
  @CallSecurity(CelestialApiCallers)
  public moonAzimuthDeg(
    profile: CelestialProfile,
    latitudeDegrees: number,
    synodicPeriodDays: number,
    t: number
  ): number {
    return moonAzimuthDeg(profile, latitudeDegrees, synodicPeriodDays, t);
  }
}

// ---------------------------------------------------------------------------
// Pure geometry (module-private free functions, off-class, ungated). The
// pedagogical seam: plain numbers in, plain numbers out.
// ---------------------------------------------------------------------------

/** Resolve `time` to a raw second value, defaulting to the world clock. */
function nowOr(time?: Quantity<'s'>): number {
  return (time ?? WorldClockApi.getNow()).rawValue();
}

/** Universe-default lunar synodic period (days). */
function defaultSynodic(): number {
  return EARTH_LIKE.moons[0]?.synodicPeriodDays ?? 30;
}

function dayOfYear(profile: CelestialProfile, t: number): number {
  const D = profile.dayLengthSeconds;
  const Y = profile.yearLengthDays;
  const dayIndex = Math.floor(t / D);
  return ((dayIndex % Y) + Y) % Y;
}

function secondOfDay(profile: CelestialProfile, t: number): number {
  const D = profile.dayLengthSeconds;
  return ((t % D) + D) % D;
}

function declinationDeg(profile: CelestialProfile, t: number): number {
  const tilt = profile.axialTiltDegrees.rawValue();
  const Y = profile.yearLengthDays;
  const dayIndex = dayOfYear(profile, t);
  return tilt * Math.sin((TWO_PI * dayIndex) / Y);
}

function hourAngleDeg(profile: CelestialProfile, t: number): number {
  const D = profile.dayLengthSeconds;
  return (secondOfDay(profile, t) / D) * DEG_PER_TURN - 180;
}

function altitudeFor(
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

function azimuthFor(
  latitudeDegrees: number,
  decDegrees: number,
  hourAngleDegrees: number
): number {
  const lat = toRad(latitudeDegrees);
  const dec = toRad(decDegrees);
  const altDeg = altitudeFor(latitudeDegrees, decDegrees, hourAngleDegrees);
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

function solarAltitudeDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number {
  return altitudeFor(
    latitudeDegrees,
    declinationDeg(profile, t),
    hourAngleDeg(profile, t)
  );
}

function solarAzimuthDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number {
  return azimuthFor(
    latitudeDegrees,
    declinationDeg(profile, t),
    hourAngleDeg(profile, t)
  );
}

function isDay(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): boolean {
  return solarAltitudeDeg(profile, latitudeDegrees, t) > 0;
}

function sunriseHourAngleDeg(
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

function sunriseSecOfDay(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number | null {
  const H0 = sunriseHourAngleDeg(profile, latitudeDegrees, t);
  if (typeof H0 !== 'number') return null;
  return (profile.dayLengthSeconds * (180 - H0)) / DEG_PER_TURN;
}

function sunsetSecOfDay(
  profile: CelestialProfile,
  latitudeDegrees: number,
  t: number
): number | null {
  const H0 = sunriseHourAngleDeg(profile, latitudeDegrees, t);
  if (typeof H0 !== 'number') return null;
  return (profile.dayLengthSeconds * (180 + H0)) / DEG_PER_TURN;
}

function nextSolarEvent(
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

function seasonFor(profile: CelestialProfile, t: number): Season {
  const dayIndex = dayOfYear(profile, t);
  const Y = profile.yearLengthDays;
  if (dayIndex < Y / 4) return 'spring';
  if (dayIndex < Y / 2) return 'summer';
  if (dayIndex < (3 * Y) / 4) return 'fall';
  return 'winter';
}

function moonPhaseFor(
  profile: CelestialProfile,
  synodicPeriodDays: number,
  t: number
): number {
  const synodicSeconds = synodicPeriodDays * profile.dayLengthSeconds;
  return (
    (((t % synodicSeconds) + synodicSeconds) % synodicSeconds) / synodicSeconds
  );
}

function nextFullMoonFor(
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

function solarEclipticLongitudeDeg(
  profile: CelestialProfile,
  t: number
): number {
  const yearSeconds = profile.yearLengthDays * profile.dayLengthSeconds;
  const frac = ((t % yearSeconds) + yearSeconds) % yearSeconds;
  return (frac / yearSeconds) * DEG_PER_TURN;
}

function moonDeclinationDeg(
  profile: CelestialProfile,
  synodicPeriodDays: number,
  t: number
): number {
  const tilt = profile.axialTiltDegrees.rawValue();
  const lambda = moonEclipticLongitudeDeg(profile, synodicPeriodDays, t);
  return tilt * Math.sin(toRad(lambda));
}

function moonHourAngleDeg(
  profile: CelestialProfile,
  synodicPeriodDays: number,
  t: number
): number {
  const phase = moonPhaseFor(profile, synodicPeriodDays, t);
  let H = hourAngleDeg(profile, t) - DEG_PER_TURN * phase;
  // Normalize into [-180, 180].
  H = ((((H + 180) % DEG_PER_TURN) + DEG_PER_TURN) % DEG_PER_TURN) - 180;
  return H;
}

function moonAltitudeDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  synodicPeriodDays: number,
  t: number
): number {
  return altitudeFor(
    latitudeDegrees,
    moonDeclinationDeg(profile, synodicPeriodDays, t),
    moonHourAngleDeg(profile, synodicPeriodDays, t)
  );
}

function moonAzimuthDeg(
  profile: CelestialProfile,
  latitudeDegrees: number,
  synodicPeriodDays: number,
  t: number
): number {
  return azimuthFor(
    latitudeDegrees,
    moonDeclinationDeg(profile, synodicPeriodDays, t),
    moonHourAngleDeg(profile, synodicPeriodDays, t)
  );
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
function moonEclipticLongitudeDeg(
  profile: CelestialProfile,
  synodicPeriodDays: number,
  t: number
): number {
  const phase = moonPhaseFor(profile, synodicPeriodDays, t);
  return solarEclipticLongitudeDeg(profile, t) + DEG_PER_TURN * phase;
}
