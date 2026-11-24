/**
 * Building — what a building ROW names: one {@link BuildingBase} per row
 * (a `Singleton` keyed by the row's path) — the cottage, the chandlery,
 * the light on Gannet Rock (paint review, 2026-11-02).
 *
 * Everything a building IS is the base's (`lib/structure/Building`): a
 * structure with a face and a condition.
 *
 * ⭐⭐ **A building rides what it stands on** (persistence-model D4). It is
 * a thing, not a container, so it keeps no record of its own: its coats
 * and condition ride the record of its ENTRANCE when that room is a kept
 * place (`PersistableApi.adoptRider`). A building whose entrance is a plain
 * room is staged — it comes back as its row authored it. ⭐ A building that
 * can be sold is authored with kept rooms, so nothing changes at the sale:
 * the seller keeps it before and the buyer after. (Before this, a building
 * kept a record of its own once its title was sold — a third rule nobody
 * could predict.)
 */

import BuildingBase from '../../lib/structure/Building';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { PersistableApi } from '../../api/persistable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HydrationSource, HydrateOutcome } from '../../lib/persistence/PersistenceSlice';

export const BUILDING_CLASS_PATH = '/platform/idea/Building';

export default class Building extends SingletonMixin(BuildingBase) {
  /**
   * What the world remembered about this building: what its kept entrance's
   * record holds for it. `required: false` — an unreachable store (early
   * boot, every unit test) is a recorded skip, and the building stands as
   * authored.
   */
  static hydrationSource: HydrationSource = {
    name: 'holder_snapshots (its entrance)',
    required: false,
  };

  static async hydrateFromSource(host: Stuff): Promise<HydrateOutcome> {
    if (!(host instanceof Building)) return { status: 'skipped', reason: 'not-its-kind' };
    try {
      const ridden = await host.rideEntrance();
      return ridden ? { status: 'hydrated' } : { status: 'skipped', reason: 'nothing-kept' };
    } catch (err) {
      // ⚠ Never throw: a throw unregisters the half-built building.
      return { status: 'unreachable', reason: String(err) };
    }
  }

  /** Ride the entrance's record when the entrance is a kept place; `false` when it is not. */
  private async rideEntrance(): Promise<boolean> {
    const path = this.getEntrance();
    if (!path) return false;
    const room = await StuffApi.singleton<Stuff>(path).catch(() => null);
    if (!room || !MixinApi.isPersistable(room) || !room.shouldPersist()) return false;
    await PersistableApi.adoptRider(room, 'structure', this);
    return true;
  }
}
