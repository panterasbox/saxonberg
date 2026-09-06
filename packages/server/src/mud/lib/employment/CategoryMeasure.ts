/**
 * CategoryMeasure — ⭐⭐ **what counts against a category, and how much
 * of it this thing is.**
 *
 * One question, asked by three consumers that had all been answering it
 * separately:
 *
 * | asker | asking |
 * |---|---|
 * | `house stock` / the par sheet | *how much gin is on hand here?* |
 * | the `restocks` keeper | *what do I point at to order more?* |
 * | ⭐ a `supply` contract | *has six litres of gin arrived yet?* |
 *
 * ## ⚠⚠ Why it exists: the same confusion, twice, in one build
 *
 * A business is denominated in **category and unit** — `gin`, 6, `L` —
 * and everything it deals with is denominated in **objects**. Translating
 * between the two is where this build kept going wrong:
 *
 * - `exemplarFor` read a bottle's `getCategory()` — its **vessel kind**
 *   (`bottle`) — as though it were the par category (`gin`), so no bulk
 *   line ever matched and the flagship order silently never went out;
 * - a `supply` gig bound a **template path**, so eight-of-that-exact-row
 *   was the only way to satisfy it. A player bringing one demijohn
 *   holding six litres had done the job in every sense the bar cares
 *   about, and the engine counted **zero**.
 *
 * ⭐ The second is the one that matters, because it is about **player
 * agency**. A contract should say what the business WANTS, not the shape
 * the author happened to imagine it arriving in. *Six litres of gin, in
 * whatever you like* is the honest sentence; *eight of row X* is an
 * opinion about packaging masquerading as a requirement.
 *
 * ## The rule
 *
 * A `count` line counts discrete things whose own `category` names it, or
 * whose material carries it as a tag. `L` and `kg` lines measure the
 * **interior bulk** of holders whose contents carry the tag — so a keg, a
 * demijohn and a bottle all contribute, in proportion to what is in them.
 *
 * ⚠ Still engine-verifiable end to end, which is what keeps it legal
 * inside an escrowed contract: tags, litres and a density are all facts
 * the engine reads, with nobody adjudicating.
 */

import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ParUnit } from './ParLine';

/** A thing that names its own category (a glass, a vessel kind). */
interface Categorized {
  getCategory?(): string;
}

export class CategoryMeasure {
  /**
   * Whether `item` counts against `category` at all — the discrete
   * reading: it names the category itself, or it is made of it.
   */
  public static names(item: Stuff, category: string): boolean {
    const named = (item as unknown as Categorized).getCategory?.();
    if (named === category) return true;
    if (MixinApi.isTangible(item)) {
      const material = item.getMaterial();
      if (material?.hasTag(category)) return true;
    }
    return false;
  }

  /** Whether `item` HOLDS the category as interior bulk (a bottle of gin). */
  public static holds(item: Stuff, category: string): boolean {
    if (!MixinApi.isBulkable(item) || !item.hasInteriorBulk()) return false;
    return item.getBulkMaterial('interior')?.hasTag(category) ?? false;
  }

  /** Whether `item` counts against `category` either way. */
  public static counts(item: Stuff, category: string): boolean {
    return (
      CategoryMeasure.names(item, category) ||
      CategoryMeasure.holds(item, category)
    );
  }

  /**
   * How much `item` contributes to a `category` line denominated in
   * `unit` — `0` when it contributes nothing.
   *
   * ⚠ A `count` line counts a glob's whole quantity (six limes in a
   * stack are six limes), while `L`/`kg` read the interior. The two
   * readings are why this is one function rather than a predicate plus
   * arithmetic at each call site.
   */
  public static contribution(
    item: Stuff,
    category: string,
    unit: ParUnit,
  ): number {
    if (unit === 'count') {
      if (!CategoryMeasure.names(item, category)) return 0;
      return MixinApi.isGlobbable(item) ? item.getQuantity() : 1;
    }
    if (!MixinApi.isBulkable(item) || !item.hasInteriorBulk()) return 0;
    const material = item.getBulkMaterial('interior');
    if (!material?.hasTag(category)) return 0;
    const litres = item.getBulkAmount('interior').rawValue();
    if (unit === 'L') return litres;
    return (litres / 1000) * material.getDensity().rawValue();
  }
}
