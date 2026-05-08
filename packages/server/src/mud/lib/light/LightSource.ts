/**
 * LightSourceMixin — anything that emits light.
 *
 * Saxonberg v1 keeps the surface deliberately narrow: a host that
 * composes this mixin carries an emitted `Light` value. To
 * "extinguish" a source, set the emission to `Light.ZERO`; to
 * "ignite" it, set the emission back to a positive Light. There is
 * no `Switchable`, no fuel state, no `light X` verb in v1 — those
 * are content-authoring concerns layered on top of this physics
 * surface (see `docs/light-requirements.md § Out of scope`).
 *
 * Hosts can be Things (a candle in the inventory; a wall sconce as a
 * fixture, via Adornment), Vessels (a magic lantern), or even
 * Locations (a luminous moss-glow that authors a per-room emission
 * separately from `AmbientLit`). The propagation walk discovers
 * emitters via `getContents()` (contents-side) and
 * `Adornable.getFixtureLightSources()` (fixture-side), and calls
 * `getEmittedLight()` once per emitter.
 *
 * Persistence — scalar-default rule.
 *
 * The emitted `Light` decomposes into two scalar persistent fields:
 * `emittedIntensity` (number, ≥ 0) and `emittedColor`
 * (`ColorTag | null`). `Light.sources` is runtime-only and not
 * stored. The runtime API (`setEmittedLight(value: Light)`) is
 * strict on the value type and decomposes into the two stored
 * scalars; `getEmittedLight()` reconstructs a `Light` instance on
 * read.
 *
 * Witness hook: `setEmittedLight` fires
 * `onLightSourceChanged(source, oldEmission, newEmission)` on the
 * immediate environment when the reconstructed emitted Light
 * differs. v1 fans out to the IMMEDIATE environment only — no
 * walk-up to outer Containers.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Light } from './Light';
import type { ColorTag } from './Light';

/**
 * Witness hook fired on the source's immediate environment whenever
 * `setEmittedLight` results in a different Light value. Optional —
 * implement only the hosts that care.
 */
export interface LightSourceObserver {
  onLightSourceChanged?(
    source: Stuff,
    oldEmission: Light,
    newEmission: Light
  ): void;
}

/** Public shape added by LightSourceMixin. */
export interface LightSource {
  getEmittedLight(): Light;
  setEmittedLight(value: Light): void;
}

export function LightSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LightSourceMixin extends Base {
    static _mixinName = 'LightSourceMixin';

    static persistentFields = ['emittedIntensity', 'emittedColor'];

    /** Backing storage for the `emittedIntensity` accessor pair. */
    private _emittedIntensity: number = 0;
    /** Backing storage for the `emittedColor` accessor pair. */
    private _emittedColor: ColorTag | null = null;

    /**
     * Host-internal accessor pair (Pattern D) for the intensity
     * scalar. Hydrator's bracket-assign goes through here so a
     * malformed template (negative, NaN, non-number) crashes loudly.
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
     * Host-internal accessor pair for the color tag. Setter validates
     * the runtime shape — string-or-null only.
     */
    protected get emittedColor(): ColorTag | null {
      return this._emittedColor;
    }
    protected set emittedColor(value: ColorTag | null) {
      if (value !== null && typeof value !== 'string') {
        throw new TypeError(
          `LightSourceMixin.emittedColor must be a string ColorTag or null, got ${typeof value}`
        );
      }
      this._emittedColor = value;
    }

    /**
     * Reconstruct a `Light` instance from the stored scalars. Returns
     * `Light.ZERO` when both scalars are at their defaults.
     */
    getEmittedLight(): Light {
      if (this._emittedIntensity === 0 && this._emittedColor === null) {
        return Light.ZERO;
      }
      return Light.of(this._emittedIntensity, this._emittedColor);
    }

    /**
     * Strict runtime API — accepts only a `Light` value object.
     * Decomposes into the two stored scalars and fires the change
     * Witness hook on the immediate environment when the
     * reconstructed Light differs from the previous one.
     */
    setEmittedLight(value: Light): void {
      if (!(value instanceof Light)) {
        throw new TypeError(
          `LightSourceMixin.setEmittedLight: expected a Light, got ${typeof value}`
        );
      }
      const prev = this.getEmittedLight();
      this._emittedIntensity = value.intensity;
      this._emittedColor = value.color;
      const next = this.getEmittedLight();
      if (
        prev.intensity !== next.intensity ||
        prev.color !== next.color
      ) {
        fireOnLightSourceChanged(this as unknown as Stuff, prev, next);
      }
    }
  };
}

/**
 * Fire `onLightSourceChanged` on the source's immediate environment
 * if the host is Containable and the environment's hook is present.
 * Optional-method dispatch via `typeof === 'function'`, mirroring the
 * Witness hook pattern in `containment.ts`.
 *
 * v1 fans out to the IMMEDIATE environment only — no walk-up to
 * outer Containers. A future caching layer may widen this radius.
 */
function fireOnLightSourceChanged(
  source: Stuff,
  oldEmission: Light,
  newEmission: Light
): void {
  const containerFn = (source as { getContainer?: () => unknown }).getContainer;
  if (typeof containerFn !== 'function') return;
  const env = containerFn.call(source) as object | null;
  if (!env) return;
  const hook = (env as { onLightSourceChanged?: unknown }).onLightSourceChanged;
  if (typeof hook !== 'function') return;
  (hook as (s: Stuff, o: Light, n: Light) => void).call(
    env,
    source,
    oldEmission,
    newEmission
  );
}
