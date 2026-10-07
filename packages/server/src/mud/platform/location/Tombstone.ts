/**
 * Tombstone — the marker that stands where a place stood.
 *
 * ⭐⭐ **Offline is a CAMERA, not a wall.** Draft content has never been
 * live, so nobody is inside it and the flag alone is enough. Live
 * content coming down is different: somebody may be standing in it, and
 * the honest thing is to move them somewhere that **tells them what
 * happened and who to ask**, rather than to a void room or to a refusal
 * with no fiction behind it.
 *
 * So a tombstone is minted per offlined extent, the evicted are moved
 * into it, and it carries:
 *
 *   - a description naming the extent and its holder — *the place that
 *     stood here was taken offline by …; tell them if you were sent
 *     here*;
 *   - one exit, `out`, chosen by a four-rung cascade (below), so nobody
 *     is ever stuck in it;
 *   - a self-destruct once the last person leaves. It is a message, not
 *     a place, and a message nobody is reading is litter.
 *
 * ⚠ Named for what it IS — a marker where something stood — rather than
 * for the mechanism. A noun, and not an adjective: every `-able` name
 * in the kernel is a mixin or an interface, so a class wearing one
 * reads as a category error.
 *
 * ⭐ Its identity is `` `${row}/${extent stripped}` `` — re-derivable
 * from the extent, which is what lets a second offlining of the same
 * ground find the tombstone already standing instead of minting a
 * second one.
 */

import Location from '../../lib/stuff/Location';
import { ExitableMixin } from '../../lib/boundary/Exitable';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type Exit from '../../lib/boundary/Exit';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { FieldMeta } from '../../lib/mixin';

/** The kind row every tombstone is cloned from. */
export const TOMBSTONE_ROW = '/platform/location/tombstone';

// ⭐ `PerceptibleMixin` is composed per class because `Location` does
// NOT carry it — only `CartesianLocation` does — so a room class built
// directly on `Location` has to remember, or it authors
// `primaryKeyword` into a void (`lint:presentation` clause (d)).
const TombstoneBase = ExitableMixin(PerceptibleMixin(Location));

export default class Tombstone extends TombstoneBase {
  static fieldMeta: FieldMeta = {
    // ⚠ Authorable but NOT persistent: a tombstone is minted per
    // offlining with a data overlay and reaped when the last reader
    // leaves, so there is nothing about it worth remembering across a
    // restart — the parcel's flag is the durable fact.
    extent: { authorable: true },
    takenDownBy: { authorable: true },
  };

  /** The extent whose content was taken down. */
  public extent = '';

  /** Who took it down, as a readable name — never a key. */
  public takenDownBy = '';

  public getExtent(): string {
    return this.extent;
  }

  public setExtent(value: string): void {
    this.extent = value;
  }

  public getTakenDownBy(): string {
    return this.takenDownBy;
  }

  public setTakenDownBy(value: string): void {
    this.takenDownBy = value;
  }

  /*
   * ⚠ The identity FORMULA lives on `ParcelLogic`, not here as a
   * static. `lint:lib-statics` counts statics on non-Api classes
   * against a ratchet that may not grow, and asking its question gave
   * the better placement anyway: *which identity does a tombstone for
   * this extent answer to* is a question the OFFLINING asks, and the
   * offlining is the only thing that asks it. What matters is tested
   * where it matters — offline the same ground twice and one marker
   * stands, which is the guarantee rather than the string.
   */

  /**
   * ⭐⭐ Reap once the last person leaves.
   *
   * A tombstone is a MESSAGE, not a place, and a message nobody is
   * reading is litter — it would otherwise accumulate one room per
   * offlining for the life of the world. ⚠ Only `HasInteractive`
   * occupants count: an NPC or a dropped object left behind must not
   * pin it open forever, and anything still inside goes wherever a
   * destructing container sends its occupants.
   */
  public onExited(_mover: Stuff & Mobile & Containable, _via: Exit): void {
    const self = this as unknown as Stuff;
    const contents = (
      this as unknown as { getContents(): Stuff[] }
    ).getContents();
    const stillWatching = contents.some((c) => MixinApi.isHasInteractive(c));
    if (stillWatching) return;
    void StuffApi.destruct(self);
  }
}
