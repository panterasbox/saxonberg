/**
 * AmbientLitMixin — inherent ambient light a Container exposes
 * regardless of what's inside it.
 *
 * The propagation walk reads `getAmbientFlux()` (lumens) at each
 * receiving location and aggregates with contents-side / fixture-side
 * emitter contributions. The walk divides by the receiving
 * Container's `getSizeScale()` (m²) to produce a `Quantity<'lux'>`
 * for the public `Light` shape; ambient storage stays in flux units
 * for direct accumulation.
 *
 * ⭐⭐ **Ambient light is DERIVED, and only the exceptions are
 * authored** (envelope D4). A scope open to the sky follows the sun,
 * the moon and the cloud because its biome says it is open to the sky —
 * no row declares it, and no row can therefore disagree with its own
 * biome. A scope that is not open to the sky has no ambient at all, and
 * is dark unless something in it is lit or light spills in through an
 * opening. The three departures from that — a skylit interior, an
 * inherent glow, a sky-exposed place that is nonetheless dark — are the
 * {@link AmbientSource} vocabulary, and `lint:light-sources` keeps a
 * curated list of every row that declares one.
 *
 * Persistence — scalar-default rule.
 *
 * Four persistent fields: `ambientIntensity` (number, ≥ 0; lumens — a
 * noon **calibration override**, not the light itself),
 * `ambientColorTemperature` (number | null; Kelvin), `ambientSource`
 * (the vocabulary | null) and `ambientOpening` (a detail id | null).
 * Setter coercion accepts numeric / string / Quantity input for
 * ergonomics; storage is always primitive scalars.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Quantity } from '../quantity';
import { BiomeApi } from '../../api/biome';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';

/**
 * ⭐ Where a scope's ambient light comes from — the closed vocabulary
 * S2 states as a rule: *every room's light has a named source.*
 *
 * `null` is the ordinary case and means **derived**: a scope open to
 * the sky is sky-lit because it is open to the sky, and one that is not
 * has no ambient at all. The three values are the three exceptions an
 * author may declare, and `lint:light-sources` keeps a curated list of
 * every row that declares one.
 *
 * - `'sky'` — daylight reaches an otherwise enclosed room through an
 *   opening. The row must name that opening (`ambientOpening`, a detail
 *   id), which is what makes the claim checkable rather than a number.
 * - `'glow'` — an inherent, always-on, non-sky ambient: a luminous
 *   cave, the holodeck floor. Does not follow the sun.
 * - `'none'` — a sky-exposed scope that is nonetheless dark. A deep
 *   well, a slot canyon at the bottom.
 */
export type AmbientSource = 'sky' | 'glow' | 'none';

/** Public shape added by AmbientLitMixin. */
export interface AmbientLit {
  getAmbientFlux(): Quantity<'lumen'>;
  /** The declared ambient source, or `null` for the derived case. */
  getAmbientSource(): AmbientSource | null;
  /** The detail id a `'sky'` source claims to arrive through. */
  getAmbientOpening(): string | null;
  /**
   * ⭐ Does this scope follow the sun? True when the row declares
   * `'sky'`, or declares nothing and the biome chain says it is exposed
   * to the sky — so 41 outdoor rows need no `ambientSource:` line and
   * cannot disagree with their own biome.
   */
  isSkyLit(): boolean;
  /**
   * The flux this scope would read at a clear noon overhead sun: the
   * authored `ambientIntensity` if the row calibrated one, else
   * `light.sky.noonLux` times its own floor area. The walk multiplies
   * it by the sky factor and the weather's dim factor.
   */
  skyNoonFlux(): number;
  setAmbientFlux(value: Quantity<'lumen'> | number | string): void;
  getAmbientColorTemperature(): Quantity<'K'> | null;
  setAmbientColorTemperature(
    value: Quantity<'K'> | string | number | null
  ): void;
  /**
   * The weather cloud-dimming factor `[0, 1]` (weather Wave 2). A cached,
   * **transient** multiplier the perception walk applies to `getAmbientFlux`
   * — overcast / storm dims the sky. `1` = undimmed (clear / no weather).
   * Stamped by the weather boundary fan-out (the thermal `lastAmbientK`
   * cache-invalidation precedent), read synchronously on the light path so
   * perception never does an async weather resolve. Never persisted.
   */
  getWeatherDimFactor(): number;
  setWeatherDimFactor(value: number): void;
}

export function AmbientLitMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AmbientLitMixin extends Base {
    static _mixinName = 'AmbientLitMixin';

    static fieldMeta: FieldMeta = {
      ambientIntensity: { persistent: true, authorable: true },
      ambientColorTemperature: { persistent: true, authorable: true },
      ambientSource: { persistent: true, authorable: true },
      ambientOpening: { persistent: true, authorable: true },
    };

    /**
     * Backing storage for the lumen scalar.
     */
    private _ambientIntensity: number = 0;
    /**
     * Backing storage for the Kelvin color-temperature scalar.
     */
    private _ambientColorTemperature: number | null = null;

    /**
     * Cached weather cloud-dimming factor `[0, 1]` (transient, not
     * persisted — a `lastAmbientK`-style cache the boundary fan-out
     * invalidates). `1` = undimmed.
     */
    private _weatherDimFactor: number = 1;

    /** Backing storage for the declared ambient source (null = derived). */
    private _ambientSource: AmbientSource | null = null;
    /** Backing storage for the detail id a `'sky'` source arrives through. */
    private _ambientOpening: string | null = null;

    /**
     * Host-internal accessor pair for the lumen scalar. The
     * hydrator's bracket-assign fires this setter, so a malformed
     * template (negative, NaN, non-number) crashes loudly at hydrate
     * time rather than corrupting runtime state.
     */
    protected get ambientIntensity(): number {
      return this._ambientIntensity;
    }
    protected set ambientIntensity(value: number) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(
          `AmbientLitMixin.ambientIntensity must be a non-negative finite number, got ${value}`
        );
      }
      this._ambientIntensity = value;
    }

    /**
     * Host-internal accessor pair for the Kelvin scalar. Hydration
     * accepts numeric K, a tag string (`'warm'` resolves through the
     * Kelvin tag table), or null.
     */
    protected get ambientColorTemperature(): number | null {
      return this._ambientColorTemperature;
    }
    protected set ambientColorTemperature(value: number | string | null) {
      if (value === null || value === undefined) {
        this._ambientColorTemperature = null;
        return;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new TypeError(
            `AmbientLitMixin.ambientColorTemperature: numeric value must be finite, got ${value}`
          );
        }
        this._ambientColorTemperature = value;
        return;
      }
      if (typeof value === 'string') {
        this._ambientColorTemperature = Quantity.parse(value, 'K').rawValue();
        return;
      }
      throw new TypeError(
        `AmbientLitMixin.ambientColorTemperature must be number | string | null, got ${typeof value}`
      );
    }

    /** Lumen-typed runtime API. Reads the stored scalar each call. */
    getAmbientFlux(): Quantity<'lumen'> {
      return Quantity.of(this._ambientIntensity, 'lumen');
    }

    /** The cached weather cloud-dimming factor `[0, 1]` (transient). */
    getWeatherDimFactor(): number {
      return this._weatherDimFactor;
    }

    /** Stamp the cached weather cloud-dimming factor (clamped to `[0, 1]`). */
    setWeatherDimFactor(value: number): void {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      this._weatherDimFactor = value < 0 ? 0 : value > 1 ? 1 : value;
    }

    /**
     * Strict-shape setter. Accepts Quantity<'lumen'>, numeric
     * lumens, or a tag string (LUMEN_TAGS lookup).
     */
    setAmbientFlux(value: Quantity<'lumen'> | number | string): void {
      if (value instanceof Quantity) {
        if (value.unit !== 'lumen') {
          throw new TypeError(
            `AmbientLitMixin: expected Quantity<'lumen'>, got Quantity<'${value.unit}'>`
          );
        }
        this._ambientIntensity = value.rawValue();
        return;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(
            `AmbientLitMixin: ambient flux must be non-negative finite, got ${value}`
          );
        }
        this._ambientIntensity = value;
        return;
      }
      if (typeof value === 'string') {
        this._ambientIntensity = Quantity.parse(value, 'lumen').rawValue();
        return;
      }
      throw new TypeError(
        `AmbientLitMixin: ambient flux must be Quantity | number | string, got ${typeof value}`
      );
    }

    /** Kelvin-typed runtime API for ambient color temperature. */
    getAmbientColorTemperature(): Quantity<'K'> | null {
      if (this._ambientColorTemperature === null) return null;
      return Quantity.of(this._ambientColorTemperature, 'K');
    }

    /**
     * Color temperature setter. Accepts Quantity<'K'>, numeric K,
     * a tag string, or null.
     */
    setAmbientColorTemperature(
      value: Quantity<'K'> | string | number | null
    ): void {
      if (value === null || value === undefined) {
        this._ambientColorTemperature = null;
        return;
      }
      if (value instanceof Quantity) {
        if (value.unit !== 'K') {
          throw new TypeError(
            `AmbientLitMixin: expected Quantity<'K'>, got Quantity<'${value.unit}'>`
          );
        }
        this._ambientColorTemperature = value.rawValue();
        return;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new TypeError(
            `AmbientLitMixin.setAmbientColorTemperature: numeric value must be finite, got ${value}`
          );
        }
        this._ambientColorTemperature = value;
        return;
      }
      if (typeof value === 'string') {
        this._ambientColorTemperature = Quantity.parse(value, 'K').rawValue();
        return;
      }
      throw new TypeError(
        `AmbientLitMixin.setAmbientColorTemperature: must be Quantity | string | number | null, got ${typeof value}`
      );
    }

    /* ─────────────── the named source (envelope S2 / D4) ─────────────── */

    /**
     * Host-internal accessor pair for the declared source. Hydration
     * bracket-assigns through this, so a row that types a word outside
     * the vocabulary fails loudly at hydrate time instead of reading as
     * "derived" and going quietly dark.
     */
    protected get ambientSource(): AmbientSource | null {
      return this._ambientSource;
    }
    protected set ambientSource(value: AmbientSource | null) {
      if (value === null || value === undefined) {
        this._ambientSource = null;
        return;
      }
      if (value !== 'sky' && value !== 'glow' && value !== 'none') {
        throw new TypeError(
          `AmbientLitMixin.ambientSource must be 'sky' | 'glow' | 'none' | null, got ${String(value)}`
        );
      }
      this._ambientSource = value;
    }

    /** Host-internal accessor pair for the opening a `'sky'` source names. */
    protected get ambientOpening(): string | null {
      return this._ambientOpening;
    }
    protected set ambientOpening(value: string | null) {
      if (value === null || value === undefined) {
        this._ambientOpening = null;
        return;
      }
      if (typeof value !== 'string') {
        throw new TypeError(
          `AmbientLitMixin.ambientOpening must be a detail id string or null, got ${typeof value}`
        );
      }
      this._ambientOpening = value;
    }

    /** The declared ambient source, or `null` for the derived case. */
    getAmbientSource(): AmbientSource | null {
      return this._ambientSource;
    }

    /** The detail id a `'sky'` source claims to arrive through. */
    getAmbientOpening(): string | null {
      return this._ambientOpening;
    }

    /**
     * ⭐ Does this scope follow the sun?
     *
     * `'sky'` says yes explicitly (a windowed interior). `'glow'` and
     * `'none'` say no explicitly. And **nothing at all** — the ordinary
     * case — asks the biome chain, which is the one place the world
     * already records whether you can see the sky from here. That is
     * why lighting the realm's streets took no row edits: they were
     * already authored as outdoors.
     */
    isSkyLit(): boolean {
      if (this._ambientSource === 'sky') return true;
      if (this._ambientSource !== null) return false;
      return BiomeApi.isSkyExposed(
        this as unknown as Stuff & Container
      );
    }

    /**
     * The flux this scope reads at a clear noon overhead sun.
     *
     * An authored `ambientIntensity` is a **calibration override** and
     * wins — authorial control over a place that is brighter or gloomier
     * than its size suggests. Otherwise the noon lux dial times the
     * scope's own light-receiving area, so an unauthored row is lit
     * correctly for its size rather than lit by somebody's guess.
     */
    skyNoonFlux(): number {
      if (this._ambientIntensity > 0) return this._ambientIntensity;
      const scale = (
        this as unknown as { getSizeScale?: () => number }
      ).getSizeScale?.();
      const area = typeof scale === 'number' && scale > 0 ? scale : 1;
      return noonLux() * area;
    }
  };
}

/** Numeric AppSetting read with a seeded-literal fallback (pre-warm safe). */
function noonLux(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.lightSkyNoonLux);
    if (raw === '' || raw == null) return 80;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 80;
  } catch {
    return 80;
  }
}
