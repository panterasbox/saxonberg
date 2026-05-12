/**
 * SpawnerMixin — within-session dynamic-spawn tracking.
 *
 * A `Spawner` holds a runtime Pattern B collection of live refs to
 * the instances it has spawned during the current session. Pattern:
 * a monster-spawner room, a necromancer summoning skeletons, a
 * production vessel producing items.
 *
 * Substrate guarantees:
 *
 *   - **Transient collection.** The `_spawned` set is NOT in
 *     `persistentFields`. It resets on clone / hydrate. The host's
 *     policy (or template-driven seeding via a future
 *     `PopulatesMixin`) rebuilds the live collection each session.
 *   - **Symmetric cleanup on Spawned destruct (R2.4).** When a
 *     `Spawned` thing destructs, its framework
 *     `Spawned.cleanupOnDestruct(stuff)` calls
 *     `stuff.getSpawner()?.untrackSpawn(stuff)` so this set stays
 *     clean.
 *   - **No automatic cascade on Spawner destruct.** Default: spawns
 *     become orphans within the session. Their back-pointer
 *     self-heals on next access (R2.3); GC sweep eventually catches
 *     orphans and invites self-destruct per the spawn's own policy.
 *     Subclasses may override `onDestruct` on the Spawner side to
 *     opt in to cascade-destruct or transfer behavior.
 *
 * The method surface uses gameplay-aware names (`trackSpawn` /
 * `untrackSpawn`) rather than the generic `addX` / `removeX` /
 * `getXs` / `hasX` shape from `collections.md`. The "Spawner"
 * gameplay pattern is established across Unity, Unreal, Minecraft
 * and other engines and means specifically "creates and tracks
 * progeny"; gameplay-aware names read better at call sites and
 * are an intentional exception to the canonical surface.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';
import type { Spawned } from './Spawned';

/**
 * Public shape provided by SpawnerMixin.
 */
export interface Spawner {
  /** Record `spawned` as a runtime child of this Spawner. Idempotent. */
  trackSpawn(spawned: Stuff & Spawned): void;

  /**
   * Drop `spawned` from this Spawner's runtime collection. Returns
   * true if it was present. Used by `Spawned.cleanupOnDestruct` for
   * R2.4 symmetric cleanup; also callable by content code that wants
   * to transfer ownership of a spawn elsewhere.
   */
  untrackSpawn(spawned: Stuff & Spawned): boolean;

  /** Read-only snapshot of the current spawn set. */
  getSpawned(): ReadonlySet<Stuff & Spawned>;

  /** Membership predicate. */
  hasSpawned(spawned: Stuff & Spawned): boolean;
}

export function SpawnerMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class SpawnerMixin extends Base {
    static _mixinName = 'SpawnerMixin';

    /**
     * Live ref collection. Transient — not in `persistentFields`,
     * resets to empty on clone / hydrate.
     */
    protected _spawned: Set<Stuff & Spawned> = new Set();

    public trackSpawn(spawned: Stuff & Spawned): void {
      if (this._spawned.has(spawned)) return;
      this._spawned.add(spawned);
      // Mirror to the held side; idempotent setter on Spawned.
      spawned.setSpawner(this as unknown as Stuff & Spawner);
    }

    public untrackSpawn(spawned: Stuff & Spawned): boolean {
      const had = this._spawned.delete(spawned);
      if (had && spawned.getSpawner() === (this as unknown as Stuff & Spawner)) {
        // Only clear the back-pointer if it still names us — leave
        // a re-tracked spawn alone.
        spawned.setSpawner(null);
      }
      return had;
    }

    public getSpawned(): ReadonlySet<Stuff & Spawned> {
      return this._spawned;
    }

    public hasSpawned(spawned: Stuff & Spawned): boolean {
      return this._spawned.has(spawned);
    }
  };
}
