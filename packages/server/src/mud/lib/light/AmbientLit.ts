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
 * call sites — see the deferred outdoor work in
 * `docs/light-requirements.md § Non-goals`.
 *
 * Persistence: the `ambientLight` field is auto-persisted. The
 * accessor pair coerces between a `Light` instance (runtime) and the
 * `LightDataShape` produced by JSON serialisation (persistence
 * round-trip), so the `PersistentHydrator`'s bracket-assign lands a
 * proper `Light` value object.
 */

import type { MixinConstructor } from '../mixin';
import { Light } from './Light';
import type { LightDataShape } from './Light';

/** Public shape added by AmbientLitMixin. */
export interface AmbientLit {
  getAmbientLight(): Light;
  setAmbientLight(value: Light | LightDataShape): void;
}

export function AmbientLitMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AmbientLitMixin extends Base {
    static _mixinName = 'AmbientLitMixin';

    static persistentFields = ['ambientLight'];

    /** Backing storage for the `ambientLight` accessor pair. */
    private _ambientLight: Light = Light.ZERO;

    /**
     * Host-internal accessor pair (Pattern D). External callers go
     * through `getAmbientLight()` / `setAmbientLight()`. The setter
     * coerces a Light or a hydrated LightDataShape into a Light
     * instance — `target['ambientLight'] = data['ambientLight']` in
     * the hydrator goes through this setter, so a malformed template
     * crashes loudly (Light.from validates) rather than corrupting
     * runtime state.
     */
    protected get ambientLight(): Light {
      return this._ambientLight;
    }

    protected set ambientLight(value: Light | LightDataShape) {
      this._ambientLight = Light.from(value);
    }

    getAmbientLight(): Light {
      return this._ambientLight;
    }

    setAmbientLight(value: Light | LightDataShape): void {
      this.ambientLight = value;
    }
  };
}
