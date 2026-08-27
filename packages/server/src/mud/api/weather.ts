/**
 * WeatherApi — the caller-facing surface for the weather substrate.
 *
 * Weather is a thin, **stateless** driver over biome's static atmospheric
 * state: a deterministic, lazy-compute-on-read field that deviates
 * SkyExposed scopes' temperature / humidity / wind / pressure over time,
 * coherently, per locality. There is no simulation, no tick, and no
 * stored weather state — `weatherAt(time, locality)` is a pure function.
 * The grammar + compute live in the hot-reloadable {@link WeatherLogic}
 * singleton at `/platform/idea/api/weather`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/weather` reloads it.
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
import type Locality from '../platform/idea/Locality';
import { WeatherLogic } from '../platform/idea/api/WeatherLogic';
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
  WeatherPin,
  WeatherPinMode,
  ClimateLean,
  WeatherProvenance,
  ResolvedWeather,
  CloudForm,
  SkyRead,
} from '../lib/weather/WeatherType';

import type {
  WeatherField,
  WeatherFieldUnit,
  WeatherSample,
  WeatherForecast,
  WeatherType,
  ResolvedWeather,
  CloudForm,
  SkyRead,
} from '../lib/weather/WeatherType';

const LOGIC_PATH = '/platform/idea/api/weather';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/WeatherLogic', import.meta.url),
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

  /* ──────────────── the coexistence resolve (Wave 2) ──────────────── */

  /**
   * The single resolved atmospheric state for a scope (Wave 2), folding
   * **authored pin → procgen(climate-lean-shaped) → biome** in precedence,
   * with a provenance tag and a resolved `precipitationHere` read. **Every
   * Wave-2 consumer reads this** (wetness / thermal / electricity / light /
   * `analyze`) — nobody calls `weatherAt`/`deviationFor` directly except
   * this resolver and the biome field-fold. Async (resolves the covering
   * Locality + the sky-exposure walk).
   */
  public static resolveWeatherFor(
    scope: Stuff & Container,
  ): Promise<ResolvedWeather> {
    return logic().resolveWeatherFor(scope);
  }

  /**
   * Pin-aware single-field deviation for the biome field-fold (SYNC). The
   * caller (`BiomeLogic.resolveQuantityFor`) has already passed the cheap
   * field-in-set → isActive → skyExposed gates and resolved the
   * `Locality | null`; this folds the **pinned type's** deviation when a
   * pin governs the scope, else the procgen deviation — byte-identical to
   * `deviationFor` when no pin applies.
   */
  public static deviatedFieldFor(
    scope: Stuff & Container,
    locality: Locality | null,
    field: WeatherField,
    timeS: Quantity<'s'>,
  ): Quantity<WeatherFieldUnit> {
    return logic().deviatedFieldFor(scope, locality, field, timeS);
  }

  /* ──────────────── cloud forms (Wave 2, Phase H) ──────────────── */

  /**
   * A derived sky reading for `look up` / `analyze weather` (Phase H) — the
   * resolved type, its visible cloud form, and whether that form presages a
   * front (a hedged, deterministic forecast tell). Presage-aware only for a
   * genuinely modelled sky (procgen / climate-leaned); a pin / biome reports
   * its base form. **Presentation only** — no consequence reads the form.
   */
  public static skyReadFor(scope: Stuff & Container): Promise<SkyRead> {
    return logic().skyReadFor(scope);
  }

  /**
   * The pure cloud-form derivation: the base genus of `current`, upgraded to
   * the presage form (`cirrus`/`cirrostratus`) when `current` is fair and
   * `upcoming` carries a rain/storm front. Deterministic + total.
   */
  public static cloudFormFor(
    current: WeatherType,
    upcoming: readonly WeatherType[],
  ): CloudForm {
    return logic().cloudFormFor(current, upcoming);
  }

  /* ──────────────── activation / boundary ──────────────── */

  /**
   * True iff the `WeatherLogic` singleton is present (weather
   * configured). A non-creating presence check — the biome seam calls
   * this **before** any address walk, so weather-absent costs nothing.
   */
  public static isActive(): boolean {
    return (StuffApi.findByTemplatePath<WeatherLogic>(LOGIC_PATH) ?? null) !== null;
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
   * schedule. Runs the presence-gated thermal restamp fan-out + Wave-2
   * puddle accrual/evaporation; weather arms nothing itself.
   *
   * ⚠ Returns the fan-out's promise for the same reason
   * {@link WeatherApi.onStormTick} does — see the note there. The
   * scheduler still fires and forgets (`void`); what changed is that a
   * caller who needs to know when the pass finished can now ask.
   */
  public static onBoundary(): Promise<void> {
    return logic().onBoundary();
  }

  /**
   * The storm-strike callback, fired by the `weather:strike` WorldClock
   * system schedule (Wave 2). Runs the presence-gated strike fan-out:
   * occupied SkyExposed `storm` scopes roll `storm.strikeRate` and, on a
   * hit, take an ambient strike routed through `ElectricityApi.conduct`.
   * No weather state stored — the schedule owns the handle.
   *
   * ⚠ **Returns the fan-out's promise, and the scheduler deliberately
   * ignores it** (`void WeatherApi.onStormTick()`). Fire-and-forget is
   * right for a tick — nothing waits on weather. But swallowing the
   * promise *inside* the method made the work unobservable, and a
   * caller that needs to know when the fan-out finished had no way to
   * ask. The strike tests spent months flaky for exactly this: they
   * pumped 30 macrotask turns and hoped, so under load the assertion
   * ran before the fan-out (`conduct` never called) — or, worse, a
   * PREVIOUS test's fan-out landed inside the next test's spy window
   * and it saw a call it never made. One cause, two contradictory
   * symptoms.
   */
  public static onStormTick(): Promise<void> {
    return logic().onStormTick();
  }

  /**
   * The `weather:strike` schedule interval in game-seconds
   * (`storm.strikeIntervalS`). Boot reads this when registering the strike
   * system schedule.
   */
  public static strikeIntervalSeconds(): number {
    return logic().strikeIntervalSeconds();
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

  /**
   * Force the per-scope strike roll (0 = always strike, 1 = never), or
   * `null` to restore `Math.random`. Makes the strike tests deterministic.
   */
  static _forceStrikeRollForTesting(roll: number | null): void {
    SecurityApi.assertTestOnly('_forceStrikeRollForTesting');
    logic()._forceStrikeRollForTesting(roll);
  }
}

SecurityApi.decorateApiClass(WeatherApi);
