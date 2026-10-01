/**
 * HiveBox — ⭐ **a box that adds room to a hive, and nothing else.**
 *
 * A super is not a mechanism. It is an object with a volume and an amount
 * of comb it will hold, and putting it in a hive is the platform's `put`:
 * the hive sums what its contents declare and gets a bigger interior and
 * more comb to fill. That is the whole of supering (AC 6) and there is no
 * verb for it.
 *
 * ⚠ **Why a class rather than counting rows by template path.** The hive
 * has to ask *how much room does this add*, and a path check would make a
 * packing crate a super the day somebody authored one at a similar path.
 * Two authorable numbers are what a super IS.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

// ⚠⚠ **`Good`, not `Thing` — a good you BUY has to be ownable.** The
// general-store standup asserts every stocked line is
// chattel-stampable, and `platform/thing/Thing` is not: `ChattelMixin`
// arrives with `Good` (`Chattel(Concealable(Thing))`). A super, a frame
// and a nucleus are all things somebody buys, carries and owns, so the
// chain of title is the point rather than an incidental. Found by the
// terminus standup the moment the shelf started stocking them.
const HiveBoxBase = DetailedMixin(Good);

export default class HiveBox extends HiveBoxBase {
  static fieldMeta: FieldMeta = {
    volumeM3: { persistent: true, authorable: true },
    combCapacityKg: { persistent: true, authorable: true },
  };

  /** Cubic metres of interior this box adds to the hive it sits in. */
  public volumeM3 = 0.04;

  /** Kilograms of comb the frames in it will hold when drawn out. */
  public combCapacityKg = 12;

  public getVolumeM3(): number {
    return this.volumeM3;
  }
  public setVolumeM3(value: number): void {
    this.volumeM3 = Number.isFinite(value) && value > 0 ? value : 0;
  }

  public getCombCapacityKg(): number {
    return this.combCapacityKg;
  }
  public setCombCapacityKg(value: number): void {
    this.combCapacityKg = Number.isFinite(value) && value > 0 ? value : 0;
  }
}
