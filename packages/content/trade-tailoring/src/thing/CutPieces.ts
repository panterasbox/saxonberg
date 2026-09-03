/**
 * CutPieces — a garment's parts, chalked and cut, waiting to be sewn.
 *
 * ⭐ It is `Wearable` **before it is wearable**, which sounds odd and is
 * exactly right: the `cutTo` stamp is the thing `cut` produces, and it
 * has to survive until `sew` puts it on a garment. Carrying the stamp
 * on the pieces is what makes "cut for a body" a fact about the CLOTH
 * rather than a fact about the finished coat, which is what lets a
 * tailor cut today and sew tomorrow.
 *
 * `seamAllowance` is `cut`'s other output and `alter`'s whole budget.
 * ⚠⚠ **Conservation is what caps it**: letting a coat out needs more
 * cloth, and there is no more cloth — only what the cut left folded
 * inside the seams. That is a physical fact, not a game rule, which is
 * why **magic hits the identical wall**: a spell cannot conjure matter,
 * so a working might alter FASTER but never FURTHER.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { GlobbableMixin } from '@saxonberg/server/mud/lib/stuff/Globbable';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

const CutPiecesBase = WearableMixin(
  SlottableMixin(
    GlobbableMixin(CraftedMixin(ConstructedMixin(DetailedMixin(Thing)))),
  ),
);

export default class CutPieces extends CutPiecesBase {
  static fieldMeta: FieldMeta = {
    seamAllowance: { persistent: true, authorable: true },
  };

  /**
   * Cloth folded inside the seams, in units — `alter`'s entire budget.
   * `0` means the cut was tight and this can never be let out.
   */
  public seamAllowance = 0;

  public getSeamAllowance(): number {
    return this.seamAllowance;
  }

  public setSeamAllowance(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `CutPieces.setSeamAllowance: must be finite and non-negative, got ${value}`,
      );
    }
    this.seamAllowance = value;
  }

  // ⚠ TS re-surface of the inner `GradedMixin`'s members (the
  // documented `Crafted.ts` cast quirk — `GradedReceptacle` carries the
  // same block). `declare` only: no runtime slots.
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;
}
