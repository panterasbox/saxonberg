/**
 * LightSourceMixin — anything that emits light.
 *
 * Saxonberg v1 keeps the surface deliberately narrow: a host that
 * composes this mixin carries a persistent `emittedLight: Light`. To
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
 * The setter coerces a hydrated `LightDataShape` (raw object stored
 * in MongoDB) into a `Light` instance — same coercion shape as
 * `AmbientLitMixin`. The host fires the optional Witness hook
 * `onLightSourceChanged(source, oldEmission, newEmission)` on the
 * immediate environment when the emission changes, so a future cache
 * layer (or a Sensor present in the room) can react. v1's lazy
 * walk doesn't need the hook itself.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Light } from './Light';
import type { LightDataShape } from './Light';

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
  setEmittedLight(value: Light | LightDataShape): void;
}

export function LightSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LightSourceMixin extends Base {
    static _mixinName = 'LightSourceMixin';

    static persistentFields = ['emittedLight'];

    /** Backing storage for the `emittedLight` accessor pair. */
    private _emittedLight: Light = Light.ZERO;

    /**
     * Host-internal accessor pair (Pattern D). External callers go
     * through `getEmittedLight()` / `setEmittedLight()`. The setter
     * coerces a Light or hydrated LightDataShape into a Light, fires
     * the change-witness hook on the immediate environment, and
     * stores the new value. `target['emittedLight'] = data['emittedLight']`
     * in the hydrator goes through this setter.
     */
    protected get emittedLight(): Light {
      return this._emittedLight;
    }

    protected set emittedLight(value: Light | LightDataShape) {
      const next = Light.from(value);
      const prev = this._emittedLight;
      this._emittedLight = next;
      if (prev !== next) fireOnLightSourceChanged(this as unknown as Stuff, prev, next);
    }

    getEmittedLight(): Light {
      return this._emittedLight;
    }

    setEmittedLight(value: Light | LightDataShape): void {
      this.emittedLight = value;
    }
  };
}

/**
 * Fire `onLightSourceChanged` on the source's immediate environment
 * if the host is Containable and the environment's hook is present.
 * Optional-method dispatch via `typeof === 'function'`, mirroring the
 * Witness hook pattern in `containment.ts:163-171`.
 *
 * v1 fans out to the IMMEDIATE environment only — no walk-up to outer
 * Containers. A future caching layer (and the Phase 4 Window
 * scenarios) may widen this radius.
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
