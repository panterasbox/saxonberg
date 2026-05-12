/**
 * SpawnedMixin — held side of the Spawner / Spawned substrate.
 *
 * A `Spawned` thing carries a transient back-pointer to its
 * `Spawner` (the host that created it during this session). The
 * back-pointer is a Pattern B live ref with R2.3 self-heal: if the
 * Spawner destructs, the next `getSpawner()` clears the slot and
 * returns `null` (rather than handing back a destroyed ref).
 *
 * Persistence: NONE. Per the foundational stuffId constraint, no
 * cross-reboot instance refs are supported. On clone / hydrate the
 * back-pointer starts null; the spawning host wires it on
 * `trackSpawn`.
 *
 * R2.4 cleanup: the static `cleanupOnDestruct(stuff)` here unhooks
 * this Spawned from its Spawner's collection via the canonical
 * `Spawner.untrackSpawn` chokepoint. Subclass `onDestruct`
 * overrides cannot bypass it (statics aren't on the prototype
 * chain).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';
import type { Spawner } from './Spawner';

/**
 * Public shape provided by SpawnedMixin.
 */
export interface Spawned {
  /**
   * Returns the Spawner that produced this thing, or `null` when
   * unset OR when the previous Spawner has destructed (R2.3
   * self-heal). The clear-on-destroy fold happens here so consumers
   * never receive a destroyed ref.
   */
  getSpawner(): (Stuff & Spawner) | null;

  /**
   * Setter for the back-pointer. Normal callers don't invoke this
   * directly — it's wired by `Spawner.trackSpawn` /
   * `Spawner.untrackSpawn`. Public so the symmetric Spawner-side
   * helper can reach it.
   */
  setSpawner(value: (Stuff & Spawner) | null): void;
}

export function SpawnedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class SpawnedMixin extends Base {
    static _mixinName = 'SpawnedMixin';

    /**
     * R2.4 framework cleanup. Unhook from the Spawner's collection
     * on destruct. The canonical chokepoint
     * (`Spawner.untrackSpawn`) clears the back-pointer too — but
     * we read `getSpawner()` before the untrack call so the lookup
     * doesn't itself depend on the back-pointer being intact.
     *
     * Single-op handler: no internal try/catch. The dispatcher's
     * outer per-handler try/catch in `StuffApi.#destructCore`
     * logs-and-continues if `untrackSpawn` throws. Same shape as
     * `Containable.cleanupOnDestruct`. Collection-walking handlers
     * (`Container`, `Slottable`, `Slotted`) wrap per-iteration
     * because one bad item must not strand the rest.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const self = stuff as Stuff & Spawned;
      const spawner = self.getSpawner();
      if (spawner) {
        spawner.untrackSpawn(self);
      }
    }

    /**
     * Live ref back-pointer. Transient — not in `persistentFields`.
     */
    private _spawner: (Stuff & Spawner) | null = null;

    public getSpawner(): (Stuff & Spawner) | null {
      if (this._spawner === null) return null;
      if (this._spawner.isDestroyed()) {
        this._spawner = null;
        return null;
      }
      return this._spawner;
    }

    public setSpawner(value: (Stuff & Spawner) | null): void {
      this._spawner = value;
    }
  };
}
