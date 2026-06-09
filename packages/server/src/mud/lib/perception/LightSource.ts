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
 * `getEmittedFlux()` + `getEmittedColorTemperature()` once per
 * emitter.
 *
 * Persistence — scalar-default rule.
 *
 * The emission decomposes into two scalar persistent fields:
 * `emittedIntensity` (number, ≥ 0; lumens) and
 * `emittedColorTemperature` (number | null; Kelvin). The runtime API
 * is strict on Quantity value objects; setter coercion accepts
 * numeric / string / Quantity input for authoring ergonomics.
 *
 * Witness hook: `setEmittedFlux` and `setEmittedColorTemperature`
 * fire `onLightSourceChanged` (the `LightSourceObserver` contract,
 * declared below) on the immediate environment when the stored
 * value actually changes. v1 fans out to the IMMEDIATE environment
 * only.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../quantity';
import { coerceColorTemperature } from './Light';

/** Public shape added by LightSourceMixin. */
export interface LightSource {
  getEmittedFlux(): Quantity<'lumen'>;
  setEmittedFlux(value: Quantity<'lumen'> | number | string): void;
  getEmittedColorTemperature(): Quantity<'K'> | null;
  setEmittedColorTemperature(value: Quantity<'K'> | string | null): void;
}

/**
 * Witness hook fired on a light source's immediate environment when
 * `setEmittedFlux` or `setEmittedColorTemperature` results in a
 * different stored emission. Optional — implement only the host
 * Containers that care (typically a Location's caching layer or a
 * Vessel's lit-state observer).
 *
 * Lives next to `LightSourceMixin` (the firer) so the cross-module
 * contract reads from one place. Receivers compose this interface
 * structurally and rely on TypeScript's structural typing — no
 * mixin marker.
 */
export interface LightSourceObserver {
  onLightSourceChanged?(
    source: Stuff,
    oldFlux: Quantity<'lumen'>,
    newFlux: Quantity<'lumen'>,
    oldColorTemperature: Quantity<'K'> | null,
    newColorTemperature: Quantity<'K'> | null,
  ): void;
}

export function LightSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LightSourceMixin extends Base {
    static _mixinName = 'LightSourceMixin';

    static persistentFields = [
      'emittedIntensity',
      'emittedColorTemperature',
    ];

    /** Backing storage for the emitted flux scalar (lumens). */
    private _emittedIntensity: number = 0;
    /** Backing storage for the emitted color-temperature scalar (K). */
    private _emittedColorTemperature: number | null = null;

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
     * Host-internal accessor pair for the Kelvin scalar. Hydration
     * accepts `number | null` (canonical Kelvin) or a tag string
     * (looked up via `Quantity.parse(s, 'K')` against the registered
     * KELVIN_TAGS table). Stored canonically as `number | null`.
     */
    protected get emittedColorTemperature(): number | null {
      return this._emittedColorTemperature;
    }
    protected set emittedColorTemperature(value: number | string | null) {
      if (value === null || value === undefined) {
        this._emittedColorTemperature = null;
        return;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new TypeError(
            `LightSourceMixin.emittedColorTemperature: numeric value must be finite, got ${value}`
          );
        }
        this._emittedColorTemperature = value;
        return;
      }
      if (typeof value === 'string') {
        // Tag-string authoring path — round-trips through KELVIN_TAGS.
        this._emittedColorTemperature = Quantity.parse(value, 'K').rawValue();
        return;
      }
      throw new TypeError(
        `LightSourceMixin.emittedColorTemperature must be number | string | null, got ${typeof value}`
      );
    }

    /** Lumen-typed runtime API. Reads the stored scalar each call. */
    getEmittedFlux(): Quantity<'lumen'> {
      return Quantity.of(this._emittedIntensity, 'lumen');
    }

    /**
     * Strict-shape runtime setter. Accepts a `Quantity<'lumen'>` or a
     * non-negative numeric (interpreted as lumens) or a tag string.
     * Fires the `onLightSourceChanged` Witness hook when the stored
     * flux changes.
     */
    setEmittedFlux(value: Quantity<'lumen'> | number | string): void {
      const flux = coerceFlux(value);
      const prevFlux = this._emittedIntensity;
      const prevColorTemp = this._emittedColorTemperature;
      this._emittedIntensity = flux;
      if (prevFlux !== flux) {
        fireOnLightSourceChanged(
          this as unknown as Stuff,
          Quantity.of(prevFlux, 'lumen'),
          Quantity.of(flux, 'lumen'),
          prevColorTemp === null ? null : Quantity.of(prevColorTemp, 'K'),
          prevColorTemp === null ? null : Quantity.of(prevColorTemp, 'K')
        );
      }
    }

    /** Kelvin-typed runtime API for the color temperature. */
    getEmittedColorTemperature(): Quantity<'K'> | null {
      if (this._emittedColorTemperature === null) return null;
      return Quantity.of(this._emittedColorTemperature, 'K');
    }

    /**
     * Color temperature setter. Accepts `Quantity<'K'>`, a tag
     * string (`'warm'`, `'cool'`, …; resolved through KELVIN_TAGS),
     * a numeric Kelvin value, or null. Fires the Witness hook when
     * the stored value changes.
     */
    setEmittedColorTemperature(
      value: Quantity<'K'> | string | number | null
    ): void {
      const colorQ = value === null ? null : coerceColorTempInput(value);
      const next = colorQ === null ? null : colorQ.rawValue();
      const prev = this._emittedColorTemperature;
      this._emittedColorTemperature = next;
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

function coerceColorTempInput(
  value: Quantity<'K'> | string | number
): Quantity<'K'> {
  if (value instanceof Quantity) {
    return coerceColorTemperature(value)!;
  }
  if (typeof value === 'number') {
    return Quantity.of(value, 'K');
  }
  return Quantity.parse(value, 'K');
}

/**
 * Fire `onLightSourceChanged` on the source's immediate environment
 * if the host is Containable and the environment's hook is present.
 * The hook contract is `LightSourceObserver` (declared above).
 */
function fireOnLightSourceChanged(
  source: Stuff,
  oldFlux: Quantity<'lumen'>,
  newFlux: Quantity<'lumen'>,
  oldColorTemp: Quantity<'K'> | null,
  newColorTemp: Quantity<'K'> | null
): void {
  if (!MixinApi.isContainable(source)) return;
  const env = source.getContainer() as Partial<LightSourceObserver> | null;
  if (!env) return;
  // Optional witness: any environment may opt into the observer
  // contract by defining the hook; no mixin gates it, so a
  // structural presence check is the only available seam.
  const hook = env.onLightSourceChanged;
  if (typeof hook !== 'function') return;
  hook.call(env, source, oldFlux, newFlux, oldColorTemp, newColorTemp);
}
