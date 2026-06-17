/**
 * WeatherApi — the caller-facing surface for the weather substrate.
 *
 * Weather is a thin, **stateless** driver over biome's static atmospheric
 * state: a deterministic, lazy-compute-on-read field that deviates
 * SkyExposed scopes' temperature / humidity / wind / pressure over time,
 * coherently, per locality. There is no simulation, no tick, and no
 * stored weather state — `weatherAt(time, locality)` is a pure function.
 * The grammar + compute live in the hot-reloadable {@link WeatherLogic}
 * singleton at `/obj/api/weather`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/weather` reloads it.
 *
 * **The activation signal is the singleton's presence.** Weather is
 * "configured" iff the `WeatherLogic` singleton exists.
 * {@link WeatherApi.isActive} is a non-creating `findByTemplatePath`
 * check, so a process that never touched weather (most unit tests) reads
 * zero deviation and biome-identical values — the no-dependency
 * guarantee. Boot forces the singleton into existence when it registers
 * the segment-boundary system schedule (`WorldClockRegistry`).
 *
 * Sync vs async: `weatherAt` / `deviationFor` / `isActive` are sync (pure
 * hashing / a presence check); `deviationFor` takes a pre-resolved
 * `Locality | null` so the biome seam never does I/O inside it.
 * `forecastFor` / `sampleFor` are async (a full `AddressApi`
 * resolve-walk) and only the `analyze weather` verb calls them.
 */

import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Quantity } from '../lib/quantity';
import type Locality from '../lib/address/Locality';
import { WeatherLogic } from '../obj/api/WeatherLogic';
import { fileURLToPath } from 'url';

// Re-export the call-shape types so callers import them from the Api face.
export type {
  WeatherType,
  WeatherField,
  WeatherFieldUnit,
  WeatherDeviation,
  WeatherSample,
  WeatherForecast,
  WeatherForecastEntry,
} from '../lib/weather/WeatherType';

import type {
  WeatherField,
  WeatherFieldUnit,
  WeatherSample,
  WeatherForecast,
} from '../lib/weather/WeatherType';

const LOGIC_PATH = '/obj/api/weather';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/WeatherLogic', import.meta.url),
);

/** Resolve the HMR-able WeatherLogic singleton (sync, creating). */
function logic(): WeatherLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'WeatherLogic',
      ) as typeof WeatherLogic | null) ?? WeatherLogic)(),
  );
}

export class WeatherApi {
  /* ──────────────── pure compute (sync, no I/O) ──────────────── */

  /**
   * Deterministic weather sample for an instant + locality. Pure: same
   * `(timeS, locality)` always yields the same sample, across processes.
   * A future time is computable now (the forecast property).
   */
  public static weatherAt(
    timeS: Quantity<'s'>,
    locality: Locality | null,
  ): WeatherSample {
    return logic().weatherAt(timeS, locality);
  }

  /* ──────────────── the biome seam (cheap, SYNC) ──────────────── */

  /**
   * Per-field additive deviation for an already-resolved locality at a
   * game-time. The caller resolved the `Locality | null`, so this never
   * does I/O — biome's per-read cost stays a hash. A `clear` segment is
   * zero in every field, so a weather-flat read is biome-identical.
   */
  public static deviationFor(
    locality: Locality | null,
    field: WeatherField,
    timeS: Quantity<'s'>,
  ): Quantity<WeatherFieldUnit> {
    return logic().deviationFor(locality, field, timeS);
  }

  /* ──────────────── forecast / sample reads (async) ──────────────── */

  /** Current sample + the next-`segments` segment types for a scope. */
  public static forecastFor(
    scope: Stuff & Container,
    segments?: number,
  ): Promise<WeatherForecast> {
    return logic().forecastFor(scope, segments);
  }

  /** The current weather sample at a scope (resolves its covering Locality). */
  public static sampleFor(scope: Stuff & Container): Promise<WeatherSample> {
    return logic().sampleFor(scope);
  }

  /* ──────────────── activation / boundary ──────────────── */

  /**
   * True iff the `WeatherLogic` singleton is present (weather
   * configured). A non-creating presence check — the biome seam calls
   * this **before** any address walk, so weather-absent costs nothing.
   */
  public static isActive(): boolean {
    return StuffApi.findByTemplatePath<WeatherLogic>(LOGIC_PATH) !== null;
  }

  /**
   * The next segment-boundary game-time strictly after `timeS`. Boot
   * calls this when registering the boundary system schedule — which
   * also forces the singleton into existence (activating weather).
   */
  public static nextBoundaryAfter(timeS: Quantity<'s'>): Quantity<'s'> {
    return logic().nextBoundaryAfter(timeS);
  }

  /**
   * The segment-boundary callback, fired by the WorldClock system
   * schedule. Runs the presence-gated thermal restamp fan-out; weather
   * arms nothing itself.
   */
  public static onBoundary(): void {
    logic().onBoundary();
  }

  /* ──────────────── test seams ──────────────── */

  /**
   * Force every segment to a fixed type (or `null` to clear). Makes the
   * biome-deviation + thermal-coupling tests deterministic without
   * pinning a seed.
   */
  static _forceTypeForTesting(type: WeatherSample['type'] | null): void {
    SecurityApi.assertTestOnly('_forceTypeForTesting');
    logic()._forceTypeForTesting(type);
  }

  /** Clear the forced-type override. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('_resetForTesting');
    logic()._resetForTesting();
  }
}

SecurityApi.decorateApiClass(WeatherApi);
