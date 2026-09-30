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

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const HiveBoxBase = DetailedMixin(Thing);

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
