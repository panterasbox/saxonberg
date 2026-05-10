/**
 * LightSourceMixin — anything that emits light.
 *
 * Saxonberg v1 keeps the surface deliberately narrow: a host that
 * composes this mixin carries a stored emission expressed as luminous
 * flux (lumens) plus an optional color temperature (Kelvin). To
 * "extinguish" a source, set the flux to `Quantity.of(0, 'lumen')`;
 * to "ignite" it, set it back to a positive flux. There is no
 * `Switchable`, no fuel state, no `light X` verb in v1 — those are
 * content-authoring concerns layered on top of this physics surface.
 *
 * Hosts can be Things (a candle in the inventory; a wall sconce as a
 * fixture, via Adornment), Vessels (a magic lantern), or even
 * Locations. The propagation walk discovers emitters via
 * `getContents()` (contents-side) and
 * `Adornable.getFixtureLightSources()` (fixture-side), and reads
 * `getEmittedFlux()` + `getEmittedColor()` once per emitter.
 *
 * Persistence — scalar-default rule.
 *
 * The emission decomposes into two scalar persistent fields:
 * `emittedIntensity` (number, ≥ 0; lumens) and `emittedColor`
 * (number | null; Kelvin). The runtime API is strict on Quantity
 * value objects; setter coercion accepts numeric / string / Quantity
 * input for authoring ergonomics.
 *
 * Witness hook: `setEmittedFlux` and `setEmittedColor` fire
 * `onLightSourceChanged(source, oldFlux, newFlux, oldColor,
 * newColor)` on the immediate environment when the stored value
 * actually changes. v1 fans out to the IMMEDIATE environment only.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import type { ColorTag } from './Light';
import { coerceColor } from './Light';

/**
 * Witness hook fired on the source's immediate environment whenever
 * `setEmittedFlux` or `setEmittedColor` results in a different stored
 * emission. Optional — implement only the hosts that care.
 */
export interface LightSourceObserver {
  onLightSourceChanged?(
    source: Stuff,
    oldFlux: Quantity<'lumen'>,
    newFlux: Quantity<'lumen'>,
    oldColor: Quantity<'K'> | null,
    newColor: Quantity<'K'> | null
  ): void;
}

/** Public shape added by LightSourceMixin. */
export interface LightSource {
  getEmittedFlux(): Quantity<'lumen'>;
  setEmittedFlux(value: Quantity<'lumen'> | number | string): void;
  getEmittedColor(): Quantity<'K'> | null;
  setEmittedColor(value: Quantity<'K'> | ColorTag | null): void;
}

export function LightSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LightSourceMixin extends Base {
    static _mixinName = 'LightSourceMixin';

    static persistentFields = ['emittedIntensity', 'emittedColor'];

    /** Backing storage for the emitted flux scalar (lumens). */
    private _emittedIntensity: number = 0;
    /** Backing storage for the emitted color temperature scalar (K). */
    private _emittedColorK: number | null = null;

    /**
     * Host-internal accessor pair for the lumen scalar. Hydrator's
     * bracket-assign goes through here so a malformed template
     * (negative, NaN, non-number) crashes loudly. Public API uses
     * the typed `getEmittedFlux` / `setEmittedFlux` pair.
     */
    protected get emittedIntensity(): number {
      return this._emittedIntensity;
    }
    protected set emittedIntensity(value: number) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(
          `LightSourceMixin.emittedIntensity must be a non-negative finite number, got ${value}`
        );
      }
      this._emittedIntensity = value;
    }

    /**
     * Host-internal accessor pair for the color scalar. Hydration
     * accepts `number | null` (canonical Kelvin) or a tag string
     * (looked up via `Quantity.parse(s, 'K')` against the registered
     * KELVIN_TAGS table). Stored canonically as `number | null`.
     */
    protected get emittedColor(): number | null {
      return this._emittedColorK;
    }
    protected set emittedColor(value: number | string | null) {
      if (value === null || value === undefined) {
        this._emittedColorK = null;
        return;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new TypeError(
            `LightSourceMixin.emittedColor: numeric value must be finite, got ${value}`
          );
        }
        this._emittedColorK = value;
        return;
      }
      if (typeof value === 'string') {
        // Tag-string authoring path — round-trips through KELVIN_TAGS.
        this._emittedColorK = Quantity.parse(value, 'K').rawValue();
        return;
      }
      throw new TypeError(
        `LightSourceMixin.emittedColor must be number | string | null, got ${typeof value}`
      );
    }

    /** Lumen-typed runtime API. Reads the stored scalar each call. */
    getEmittedFlux(): Quantity<'lumen'> {
      return Quantity.of(this._emittedIntensity, 'lumen');
    }

    /**
     * Strict-shape runtime setter. Accepts a `Quantity<'lumen'>` or a
     * non-negative numeric (interpreted as lumens). Fires the
     * `onLightSourceChanged` Witness hook when the stored flux
     * changes.
     */
    setEmittedFlux(value: Quantity<'lumen'> | number | string): void {
      const flux = coerceFlux(value);
      const prevFlux = this._emittedIntensity;
      const prevColorK = this._emittedColorK;
      this._emittedIntensity = flux;
      if (prevFlux !== flux) {
        fireOnLightSourceChanged(
          this as unknown as Stuff,
          Quantity.of(prevFlux, 'lumen'),
          Quantity.of(flux, 'lumen'),
          prevColorK === null ? null : Quantity.of(prevColorK, 'K'),
          prevColorK === null ? null : Quantity.of(prevColorK, 'K')
        );
      }
    }

    /** Kelvin-typed runtime API for the color temperature. */
    getEmittedColor(): Quantity<'K'> | null {
      if (this._emittedColorK === null) return null;
      return Quantity.of(this._emittedColorK, 'K');
    }

    /**
     * Color temperature setter. Accepts a `Quantity<'K'>`, a numeric
     * Kelvin value, a string ColorTag (`'warm'`, `'cool'`, …), or
     * null. Fires the Witness hook when the stored color changes.
     */
    setEmittedColor(value: Quantity<'K'> | ColorTag | number | null): void {
      const colorQ = value === null ? null : coerceColorTemp(value);
      const next = colorQ === null ? null : colorQ.rawValue();
      const prev = this._emittedColorK;
      this._emittedColorK = next;
      if (prev !== next) {
        const flux = Quantity.of(this._emittedIntensity, 'lumen');
        fireOnLightSourceChanged(
          this as unknown as Stuff,
          flux,
          flux,
          prev === null ? null : Quantity.of(prev, 'K'),
          next === null ? null : Quantity.of(next, 'K')
        );
      }
    }
  };
}

/**
 * Coerce numeric / Quantity / string into a `number` (lumens). String
 * input goes through `Quantity.parse(s, 'lumen')` so registered tag
 * tables (LUMEN_TAGS) round-trip via the authoring path.
 */
function coerceFlux(value: Quantity<'lumen'> | number | string): number {
  if (value instanceof Quantity) {
    if (value.unit !== 'lumen') {
      throw new TypeError(
        `LightSourceMixin: expected Quantity<'lumen'>, got Quantity<'${value.unit}'>`
      );
    }
    if (value.rawValue() < 0) {
      throw new Error(
        `LightSourceMixin: emitted flux must be non-negative, got ${value.rawValue()}`
      );
    }
    return value.rawValue();
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `LightSourceMixin: emitted flux must be a non-negative finite number, got ${value}`
      );
    }
    return value;
  }
  if (typeof value === 'string') {
    const q = Quantity.parse(value, 'lumen');
    if (q.rawValue() < 0) {
      throw new Error(
        `LightSourceMixin: emitted flux must be non-negative, got ${q.rawValue()}`
      );
    }
    return q.rawValue();
  }
  throw new TypeError(
    `LightSourceMixin: emitted flux must be Quantity | number | string, got ${typeof value}`
  );
}

function coerceColorTemp(
  value: Quantity<'K'> | ColorTag | number
): Quantity<'K'> {
  if (value instanceof Quantity) {
    return coerceColor(value)!;
  }
  if (typeof value === 'number') {
    return Quantity.of(value, 'K');
  }
  return Quantity.parse(value, 'K');
}

/**
 * Fire `onLightSourceChanged` on the source's immediate environment
 * if the host is Containable and the environment's hook is present.
 */
function fireOnLightSourceChanged(
  source: Stuff,
  oldFlux: Quantity<'lumen'>,
  newFlux: Quantity<'lumen'>,
  oldColor: Quantity<'K'> | null,
  newColor: Quantity<'K'> | null
): void {
  const containerFn = (source as { getContainer?: () => unknown }).getContainer;
  if (typeof containerFn !== 'function') return;
  const env = containerFn.call(source) as object | null;
  if (!env) return;
  const hook = (env as { onLightSourceChanged?: unknown }).onLightSourceChanged;
  if (typeof hook !== 'function') return;
  (
    hook as (
      s: Stuff,
      of: Quantity<'lumen'>,
      nf: Quantity<'lumen'>,
      oc: Quantity<'K'> | null,
      nc: Quantity<'K'> | null
    ) => void
  ).call(env, source, oldFlux, newFlux, oldColor, newColor);
}
