/**
 * ClothBolt — woven cloth, by the unit, and ⭐⭐ **the place dye lots
 * fall out of the model for free**.
 *
 * A bolt is `Globbable`, so bolts of the same cloth stack. What
 * `canMergeWith` is narrowed to *refuse* is the interesting half:
 * beyond the shipped requirements (same row, no shadows, no adornments)
 * two bolts must also share a **grade**, a **construction form**, and a
 * **dye application stack**.
 *
 * > **Two bolts from different dye lots do not merge.**
 *
 * That is the real-world dye-lot problem, it falls straight out of the
 * predicate, and ⭐⭐⭐ it makes the dyeing Discipline's *repeatability*
 * mechanically real in the best possible way:
 *
 * **A master dyer's batches merge. A novice's do not.**
 *
 * Competence becomes visible **in the inventory** — a good dyer's stock
 * consolidates into clean bolts, a bad one's fragments into a dozen
 * almost-matching piles. No gauge, no number, no readout, and nobody
 * designed it: it is what `canMergeWith` meeting the application stack
 * does on its own.
 *
 * `split` is the other half — what `cut` uses to take units off a bolt,
 * through the operation `Globbable` already ships.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { GlobbableMixin } from '@saxonberg/server/mud/lib/stuff/Globbable';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import { DyedMixin } from '@saxonberg/server/mud/lib/material/Dyed';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

const ClothBoltBase = GlobbableMixin(
  CraftedMixin(ConstructedMixin(DyedMixin(DetailedMixin(Thing)))),
);

export default class ClothBolt extends ClothBoltBase {
  // ⚠ TS re-surface of the inner `GradedMixin`'s members: they are
  // present at runtime, but an anonymous mixin base's members do not
  // surface through `CraftedMixin` (the documented `Crafted.ts` cast
  // quirk — `GradedReceptacle` carries the same block for the same
  // reason). `declare` only: no runtime slots, no behaviour change.
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;
  /**
   * ⚠ Narrows, never widens. `super` still decides the shipped
   * questions (same row, no shadows, no adornments); this adds the
   * three facts that make two bolts genuinely the same cloth.
   */
  public override canMergeWith(other: Stuff): boolean {
    if (!super.canMergeWith(other)) return false;

    // Grade — a fine bolt and a fair one are not one pile, and the band
    // came all the way from the field's worst stretch.
    if (MixinApi.isGraded(this as unknown as Stuff) && MixinApi.isGraded(other)) {
      if (
        (this as unknown as { getGradeBand(): string }).getGradeBand() !==
        other.getGradeBand()
      ) {
        return false;
      }
    }

    // Construction form — a close weave and an open one are different
    // cloth however alike they look folded.
    const mine = MixinApi.isConstructed(this as unknown as Stuff)
      ? (this as unknown as { getConstructionForm(): string }).getConstructionForm()
      : '';
    const theirs = MixinApi.isConstructed(other) ? other.getConstructionForm() : '';
    if (mine !== theirs) return false;

    // ⭐⭐ The dye lot. Same dyestuffs, same mordants, same strengths, in
    // the same order — anything else is two lots, and two lots are two
    // piles for as long as anybody owns them.
    return sameLot(this as unknown as Stuff, other);
  }
}

/** Do two things carry the identical dye application stack? */
function sameLot(a: Stuff, b: Stuff): boolean {
  const left = MixinApi.isDyed(a) ? a.getDyeStack() : [];
  const right = MixinApi.isDyed(b) ? b.getDyeStack() : [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    const x = left[i]!;
    const y = right[i]!;
    if (x.dyestuff !== y.dyestuff) return false;
    if (x.mordant !== y.mordant) return false;
    // ⚠ Exact, not near. A novice's two dips ARE two different
    // strengths, and pretending otherwise would delete the whole
    // observation.
    if (x.strength !== y.strength) return false;
  }
  return true;
}
