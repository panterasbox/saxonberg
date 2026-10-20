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

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TextileStockBase = StackableMixin(CraftedMixin(Good));

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

  /**
   * ⭐ *skein of wool yarn* · *skein of raw silk yarn* — yarn is named for
   * the FIBRE it was drawn from, which `spin` now carries onto it. Line,
   * tow, shive and a reeled skein (`yarnCount` 0) keep their authored
   * words: they are not yarn yet.
   *
   * ⚠ Until the silk build, `spin` set nothing but the count, so spun wool
   * was a *skein of linen yarn* with linen's material — every fibre
   * became linen at the wheel.
   */
  override getShortDescription(): string {
    const stem = super.getShortDescription();
    if (this.yarnCount <= 0) return stem;
    const fibre = MixinApi.isTangible(this) ? this.getMaterial()?.getName() : '';
    return fibre ? `skein of ${fibre} yarn` : stem;
  }

  /**
   * ⭐⭐ The stock one act may draw on: this stack and every stack beside it
   * in the same hands that is the same STUFF — the same row, the same
   * fibre, the same count (0 for line and reeled skeins, the yarn's count
   * for yarn). This stack first.
   *
   * ⚠ A good somebody MADE is titled to them and a titled stack never
   * merges (the chattel rule), so a player's two reeled skeins are two
   * stacks of one and two spins are two stacks of yarn; a `spin` (charge
   * 2) or a warp (charge 4) that counted only the stack named refused every
   * one a player could make (silk's drive). The object answers it — a
   * controller reads it (`controllers-are-io`); the reel's `Cocoons` pool
   * is the same shape.
   */
  public likeStacksInHand(): TextileStock[] {
    const pool: TextileStock[] = [this];
    const holder = MixinApi.isContainable(this) ? this.getContainer() : null;
    if (!holder || !MixinApi.isContainer(holder)) return pool;
    const row = this.getTemplatePath();
    const fibre = MixinApi.isTangible(this) ? this.getMaterial() : null;
    for (const s of holder.getContents() as Stuff[]) {
      if ((s as unknown) === (this as unknown) || !(s instanceof TextileStock)) continue;
      if (s.getTemplatePath() !== row || s.getYarnCount() !== this.yarnCount) continue;
      if (s.getMaterial() !== fibre) continue;
      pool.push(s);
    }
    return pool;
  }

  /** How much {@link likeStacksInHand} holds between them. */
  public quantityInHand(): number {
    return this.likeStacksInHand().reduce((n, s) => n + s.getQuantity(), 0);
  }

  /**
   * Use `units` of this stock — this stack first, then the like stacks
   * beside it — destructing any stack it empties. Returns what was drawn.
   */
  public drawInHand(units: number): number {
    let need = Math.max(0, units);
    for (const s of this.likeStacksInHand()) {
      if (need <= 0) break;
      if (s.isDestroyed()) continue;
      const take = Math.min(need, s.getQuantity());
      need -= take;
      if (take >= s.getQuantity()) StuffApi.destruct(s as unknown as Stuff);
      else s.setQuantity(s.getQuantity() - take);
    }
    return Math.max(0, units) - need;
  }
}
