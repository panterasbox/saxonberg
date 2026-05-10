/**
 * AmbientLitMixin — inherent ambient light a Container exposes
 * regardless of what's inside it.
 *
 * The propagation walk reads `getAmbientFlux()` (lumens) at each
 * receiving location and aggregates with contents-side / fixture-side
 * emitter contributions. The walk divides by the receiving
 * Container's `getSizeScale()` (m²) to produce a `Quantity<'lux'>`
 * for the public `Light` shape; ambient storage stays in flux units
 * for direct accumulation. Underground rooms keep `0 lumen` (the
 * default); outdoor rooms author a stored value.
 *
 * Persistence — scalar-default rule.
 *
 * Two scalar persistent fields: `ambientIntensity` (number, ≥ 0;
 * lumens) and `ambientColorTemperature` (number | null; Kelvin).
 * Setter coercion accepts numeric / string / Quantity input for
 * ergonomics; storage is always primitive scalars.
 */

import type { MixinConstructor } from '../mixin';
import { Quantity } from '../quantity';

/** Public shape added by AmbientLitMixin. */
export interface AmbientLit {
  getAmbientFlux(): Quantity<'lumen'>;
  setAmbientFlux(value: Quantity<'lumen'> | number | string): void;
  getAmbientColorTemperature(): Quantity<'K'> | null;
  setAmbientColorTemperature(
    value: Quantity<'K'> | string | number | null
  ): void;
}

export function AmbientLitMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AmbientLitMixin extends Base {
    static _mixinName = 'AmbientLitMixin';

    static persistentFields = [
      'ambientIntensity',
      'ambientColorTemperature',
    ];

    /** Backing storage for the lumen scalar. */
    private _ambientIntensity: number = 0;
    /** Backing storage for the Kelvin color-temperature scalar. */
    private _ambientColorTemperature: number | null = null;

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
  };
}
