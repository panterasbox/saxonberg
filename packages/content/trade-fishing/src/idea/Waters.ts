/**
 * Waters — **the trade's world-level arithmetic, in one place** (fishing
 * D7): which reach a room fishes, what the water holds, the feed factors
 * of the hour, the reader's band. A singleton `Idea` with instance
 * methods and no statics, reached by `StuffApi.singleton`, so nothing
 * here grows the value-object static census.
 *
 * ⭐ It reads the water pack's registry **by path, duck-typed** — the
 * `GristMill` rule: this pack depends on the water pack, the water pack
 * knows nothing of this one, and the registry's surface is met over a
 * shape rather than an import.
 *
 * ## Which reach
 *
 * A verb that wants a reach takes a `Shore` as its declared argument;
 * when none is bound, {@link reachAt} answers with the covering
 * Locality's reach (`AddressApi.resolveLocalityFor` → `getReach()`).
 * That fallback is what lets Heart's Delight's millsite fish the
 * Delight's flats with no row and no code.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FisheryRegistry, FisheryStanding } from '../lib/FisheryRead';

/** The water pack's register, by path — never by import. */
export const FISHERY_REGISTRY = '/system/water/idea/FisheryRegistry';
/** The trade's own Discipline. */
export const FISHING_DISCIPLINE = 'fishing';
/** This singleton's own template path. */
export const WATERS_PATH = '/trade/fishing/idea/Waters';

/** What the hour and the weather do to the bite, before the bait. */
export interface FeedFactors {
  /** Dawn or dusk — the sun within ten degrees of the horizon. */
  twilight: number;
  /** Rain or a storm on the water. */
  weather: number;
}

export default class Waters extends Idea {
  /** A load-bearing singleton is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the trade singleton; never culled' };
  }

  /**
   * The reach a room fishes when no Shore is bound: the covering
   * Locality's, or `null` — no water here.
   */
  public async reachAt(room: Stuff): Promise<string | null> {
    if (!MixinApi.isContainer(room)) return null;
    const locality = await AddressApi.resolveLocalityFor(room as Stuff & Container);
    return locality?.getReach() ?? null;
  }

  /** The water pack's register, met over its shape. */
  public async registry(): Promise<FisheryRegistry | null> {
    try {
      const reg = (await StuffApi.singleton<Stuff>(FISHERY_REGISTRY)) as unknown as Partial<FisheryRegistry>;
      return typeof reg.standingAt === 'function' && typeof reg.draw === 'function'
        ? (reg as FisheryRegistry)
        : null;
    } catch {
      return null;
    }
  }

  /** What a reach holds right now, or `null`. */
  public async standingFor(reachRef: string, nowS: number): Promise<FisheryStanding | null> {
    const reg = await this.registry();
    return reg === null ? null : reg.standingAt(reachRef, nowS);
  }

  /**
   * The hour's and the weather's factors on the bite at a room. Both
   * seeded at the call site and retuned by `fishing.bite.*`.
   */
  public async feedFactorsAt(room: Stuff, nowS: number): Promise<FeedFactors> {
    let twilight = 1;
    let weather = 1;
    try {
      const profile = await CelestialApi.profileFor(room);
      const altitude = CelestialApi.solarAltitudeDeg(profile, CelestialApi.CAMPUS_LATITUDE, nowS);
      if (Math.abs(altitude) <= 10) twilight = dial('fishing.bite.twilight', 1.8);
    } catch {
      /* no sky: no twilight */
    }
    try {
      if (MixinApi.isContainer(room)) {
        const sample = await WeatherApi.sampleFor(room as Stuff & Container);
        if (sample.type === 'rain' || sample.type === 'storm') {
          weather = dial('fishing.bite.preStorm', 1.5);
        }
      }
    } catch {
      /* no weather: no factor */
    }
    return { twilight, weather };
  }

  /** The viewer's band in the fishing Discipline — sync, the floor when unknown. */
  public bandOf(viewer: Stuff): CompetenceBandName {
    if (!MixinApi.isAdvancing(viewer)) return CompetenceBand.FLOOR;
    const bands = viewer.competenceDigestCached();
    return bands?.find((b) => b.discipline === FISHING_DISCIPLINE)?.band ?? CompetenceBand.FLOOR;
  }
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
