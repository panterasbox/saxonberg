/**
 * TextileStock — the intermediate goods of the chain: line, tow, shive
 * and yarn.
 *
 * One class, four rows, because they differ in **prose and numbers**
 * rather than in behaviour: each is a graded, stackable quantity of
 * something that is on its way to being cloth (or, in shive's case, on
 * its way to the fire).
 *
 * ⭐ `Crafted` is what carries the **grade** from the field to the bolt.
 * The band the harvest stamped off the plant's worst stretch rides the
 * shipped weakest-link rule through every step here, and **that band IS
 * the staple length** — there is no separate staple field, because a
 * second number saying the same thing would drift from the first.
 *
 * `yarnCount` is the one number only yarn uses: the count is `spin`'s
 * whole decision, and it is left `0` on line, tow and shive because
 * they have no such thing.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { GlobbableMixin } from '@saxonberg/server/mud/lib/stuff/Globbable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

const TextileStockBase = GlobbableMixin(CraftedMixin(DetailedMixin(Thing)));

export default class TextileStock extends TextileStockBase {
  // ⚠ TS re-surface of the inner `GradedMixin`'s members: they are
  // present at runtime, but an anonymous mixin base's members do not
  // surface through `CraftedMixin` (the documented `Crafted.ts` cast
  // quirk — `GradedReceptacle` carries the same block for the same
  // reason). `declare` only: no runtime slots, no behaviour change.
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;
  static fieldMeta: FieldMeta = {
    yarnCount: { persistent: true, authorable: true },
  };

  /**
   * The yarn count — how many hanks to the pound, so **higher is
   * finer**. `0` on anything that is not yarn.
   *
   * ⚠ It is the real unit rather than a "fineness" abstraction on
   * purpose: without it, *how fine* is a vibe, and `spin`'s decision
   * stops being a decision.
   */
  public yarnCount = 0;

  public getYarnCount(): number {
    return this.yarnCount;
  }

  public setYarnCount(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `TextileStock.setYarnCount: must be a finite, non-negative number, got ${value}`,
      );
    }
    this.yarnCount = value;
  }
}
