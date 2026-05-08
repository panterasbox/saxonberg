/**
 * AmbientLitMixin — inherent ambient light a Container exposes
 * regardless of what's inside it.
 *
 * The propagation walk uses each receiving location's
 * `getAmbientLight()` as a starting point before adding contributions
 * from contents, fixtures, and cross-boundary propagation. Underground
 * rooms keep `Light.ZERO` (the default); outdoor rooms author a stored
 * value. The method form (not a property) leaves room for a future
 * outdoor-time-of-day override on the same name without churning the
 * call sites.
 *
 * Persistence — scalar-default rule.
 *
 * The ambient `Light` value decomposes into two scalar persistent
 * fields: `ambientIntensity` (number, ≥ 0) and `ambientColor`
 * (`ColorTag | null`). The `Light.sources` array is runtime-only —
 * sources accumulate during the propagation walk, never on stored
 * ambient — so it doesn't appear in storage at all. The
 * `getAmbientLight()` getter reconstructs a `Light` instance on
 * read; `setAmbientLight(value: Light)` is strict (rejects anything
 * but a `Light`) and decomposes the value into the two scalars for
 * storage.
 *
 * The runtime-vs-storage split keeps the `PersistentHydrator`'s
 * bracket-assign dumb — it lands two scalars through their accessor
 * pairs, each setter validating shape independently. No marshaller
 * needed; no `LightDataShape` union on the public setter.
 */

import type { MixinConstructor } from '../mixin';
import { Light } from './Light';
import type { ColorTag } from './Light';

/** Public shape added by AmbientLitMixin. */
export interface AmbientLit {
  getAmbientLight(): Light;
  setAmbientLight(value: Light): void;
}

export function AmbientLitMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AmbientLitMixin extends Base {
    static _mixinName = 'AmbientLitMixin';

    static persistentFields = ['ambientIntensity', 'ambientColor'];

    /** Backing storage for the `ambientIntensity` accessor pair. */
    private _ambientIntensity: number = 0;
    /** Backing storage for the `ambientColor` accessor pair. */
    private _ambientColor: ColorTag | null = null;

    /**
     * Host-internal accessor pair (Pattern D) for the intensity
     * scalar. The hydrator's bracket-assign
     * `target['ambientIntensity'] = data.ambientIntensity` fires this
     * setter, so a malformed template (negative, NaN, non-number)
     * crashes loudly at hydrate time rather than corrupting runtime
     * state.
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
     * Host-internal accessor pair for the color tag. Setter validates
     * the runtime shape — string-or-null only.
     */
    protected get ambientColor(): ColorTag | null {
      return this._ambientColor;
    }
    protected set ambientColor(value: ColorTag | null) {
      if (value !== null && typeof value !== 'string') {
        throw new TypeError(
          `AmbientLitMixin.ambientColor must be a string ColorTag or null, got ${typeof value}`
        );
      }
      this._ambientColor = value;
    }

    /**
     * Reconstruct a `Light` instance from the stored scalars. Returns
     * `Light.ZERO` when both scalars are at their defaults — keeps
     * the canonical-zero singleton property of the value class.
     */
    getAmbientLight(): Light {
      if (this._ambientIntensity === 0 && this._ambientColor === null) {
        return Light.ZERO;
      }
      return Light.of(this._ambientIntensity, this._ambientColor);
    }

    /**
     * Strict runtime API — accepts only a `Light` value object.
     * Decomposes into the two stored scalars. `Light.sources` is
     * runtime-only and dropped here (ambient lights never carry
     * source attribution; sources accumulate during the propagation
     * walk).
     */
    setAmbientLight(value: Light): void {
      if (!(value instanceof Light)) {
        throw new TypeError(
          `AmbientLitMixin.setAmbientLight: expected a Light, got ${typeof value}`
        );
      }
      this._ambientIntensity = value.intensity;
      this._ambientColor = value.color;
    }
  };
}
