/**
 * BlendLabel — ⭐ **what a blend feeds you and what it poisons you with,
 * derived from what went into it.**
 *
 * `nutrients`, `nutrientAmounts`, `edible` and `toxicity` used to be four
 * arrays on `BulkPayload`, computed once by the craft's blend step and
 * read back forever. They are functions of the ingredients, and the
 * payload now carries the ingredients ({@link BlendPart}) — so they are
 * computed here, on read, in the subsystem whose vocabulary they are.
 *
 * ⭐ **The precedent is spoilage, which already worked this way.**
 * `Freshness.withDose` folds the ptomaine dose *at the read and never
 * stores it*, with the reason written down: a stored dose would let "a
 * refrigerated pot keep a dose it no longer deserves". Exactly the same
 * argument applies to the other four, and they were stored anyway.
 *
 * ## What cannot be derived, and is carried instead
 *
 * Two facts about a blend are HISTORY, not composition, and no amount of
 * looking at the ingredients recovers them:
 *
 * - **`cookedAtK`** — the temperature the working actually reached. The
 *   heat-labile kill depends on it (a toxin the author marked labile is
 *   destroyed once the working got that hot), and it is a fact about an
 *   event. ⚠⚠ It used to be applied at blend time and thrown away, which
 *   was safe only because the answer was frozen with it. Deriving the
 *   toxins without carrying the heat would bring a cooked-off dose back
 *   from the dead.
 * - **`formedToxins`** — toxins that AROSE, rather than arriving in an
 *   ingredient: the ptomaine a spoiled batch grew. Nothing in the
 *   composition implies them. ⚠ Heat does not touch these: heat stops
 *   growth, it does not un-poison what the growth already produced.
 */

import type { BlendPart, BulkPayload } from '../bulk/Bulkable';
import type { ToxinTag } from './Metabolic';
import type Material from '../material/Material';
import { StuffApi } from '../../api/stuff';

export class BlendLabel {
  /**
   * The ingredient Materials of a payload, in the order they went in.
   * Empty for a payload with no composition — a hand-filled vessel, a
   * puddle, a material shadow — which is what makes the `blend` fallback
   * on every reader below the honest answer rather than a guard.
   */
  public static ingredientsOf(payload: BulkPayload | null): Material[] {
    const composition: readonly BlendPart[] = payload?.composition ?? [];
    const out: Material[] = [];
    for (const part of composition) {
      const material = StuffApi.findByTemplatePath<Material>(part.materialPath);
      if (material) out.push(material);
    }
    return out;
  }

  /** The nutrient routing tags — the union of the ingredients'. */
  public static nutrientsOf(
    payload: BulkPayload | null,
    blend: Material | null,
  ): readonly string[] {
    const ingredients = BlendLabel.ingredientsOf(payload);
    if (ingredients.length === 0) return blend?.getNutrients() ?? [];
    const out: string[] = [];
    for (const m of ingredients) {
      for (const tag of m.getNutrients()) if (!out.includes(tag)) out.push(tag);
    }
    return out;
  }

  /**
   * Label amounts (tag → mg per serving), each ingredient's contribution
   * scaled by its **servings** — which is why the composition carries
   * shares and not just an ordered list. A blend that is nine parts water
   * and one part stock is not a bowl of stock.
   */
  public static amountsOf(
    payload: BulkPayload | null,
    blend: Material | null,
  ): Record<string, number> {
    const composition: readonly BlendPart[] = payload?.composition ?? [];
    if (composition.length === 0) {
      return { ...(blend?.getNutrientAmounts() ?? {}) };
    }
    const out: Record<string, number> = {};
    for (const part of composition) {
      const m = StuffApi.findByTemplatePath<Material>(part.materialPath);
      if (!m) continue;
      for (const [tag, mg] of Object.entries(m.getNutrientAmounts())) {
        out[tag] = (out[tag] ?? 0) + mg * part.servings;
      }
    }
    return out;
  }

  /** Edible iff anything that went in was. */
  public static isEdible(
    payload: BulkPayload | null,
    blend: Material | null,
  ): boolean {
    const ingredients = BlendLabel.ingredientsOf(payload);
    if (ingredients.length === 0) return blend?.getEdibility() ?? false;
    return ingredients.some((m) => m.getEdibility() === true);
  }

  /**
   * The per-serving toxin doses: the ingredients' own, scaled by their
   * servings and filtered by the heat the working reached, PLUS whatever
   * the making or the keeping formed.
   *
   * ⭐ The **selective** kill, preserved verbatim from the blend step: a
   * dose the author marked heat-labile is destroyed once the working
   * actually reached its temperature. Alcohol marks none and rides into
   * the pot honestly; so does a formed ptomaine, which is not an
   * ingredient's dose at all.
   */
  public static toxicityOf(
    payload: BulkPayload | null,
    blend: Material | null,
  ): readonly ToxinTag[] {
    const composition: readonly BlendPart[] = payload?.composition ?? [];
    const heatK = payload?.cookedAtK ?? 0;
    const out = new Map<string, ToxinTag>();
    const add = (tox: ToxinTag, servings: number): void => {
      if (tox.amount <= 0) return;
      const existing = out.get(tox.type);
      if (existing) existing.amount += tox.amount * servings;
      else out.set(tox.type, { ...tox, amount: tox.amount * servings });
    };
    if (composition.length === 0) {
      for (const tox of blend?.getToxicity() ?? []) add(tox, 1);
    } else {
      for (const part of composition) {
        const m = StuffApi.findByTemplatePath<Material>(part.materialPath);
        if (!m) continue;
        for (const tox of m.getToxicity()) {
          if (tox.labileAtK !== undefined && tox.labileAtK <= heatK) continue;
          add(tox, part.servings);
        }
      }
    }
    // ⚠ Formed toxins ride past the heat filter by construction: they are
    // added after it, because heat stops growth and does not un-poison
    // what the growth produced.
    for (const tox of payload?.formedToxins ?? []) add(tox, 1);
    return [...out.values()];
  }
}
