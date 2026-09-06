/**
 * BlendIdentity — ⭐ **what a blend IS, read back off the recipe that
 * made it.**
 *
 * `name`, `appearance`, `keywords` and `discipline` were four fields on
 * `BulkPayload`, copied in by the craft at the blend step. Unlike the
 * label and the palate they are **not** functions of the ingredients —
 * you cannot get *"hearty stew"* out of root-vegetable plus stew-meat.
 *
 * ⚠⚠ **And they are not the Material's either, which is the thing that
 * makes this wave different from the ones around it.** The craft sets a
 * blend slot's material to `GENERIC_MIXED_MATERIAL` — a generic base —
 * and passes the name, the appearance and the keywords in from the
 * RECIPE. **A blend has no Material of its own.** So there was nothing
 * to derive them from, and the payload copied all four.
 *
 * ⭐ There is one thing to derive them from: the recipe itself.
 * `recipeId` is canonical and unique-indexed, and
 * `RecipeCatalogue.getRecipe` is SYNCHRONOUS off a warmed catalogue — so
 * one carried id replaces four carried strings, and every reader asks
 * the recipe the same question the craft asked it.
 *
 * ⚠ Every reader falls back to the Material, because most bulk is not a
 * blend at all: water in a butt, a puddle on a floor, a discrete
 * ration's shadow. Those have a Material and no recipe, and they read
 * exactly as they did.
 */

import { StuffApi } from '../../api/stuff';
import type { BulkPayload } from '../bulk/Bulkable';
import type Material from '../material/Material';
import type { Recipe } from './Recipe';
import type { Stuff } from '../stuff/Stuff';

/** Where the warmed catalogue lives — the same constant the craft uses. */
const CATALOGUE_PATH = '/platform/idea/RecipeCatalogue';

interface RecipeLookup {
  getRecipe(recipeId: string): Recipe | null;
}

export class BlendIdentity {
  /** The recipe that made this blend, or `null` — most bulk has none. */
  public static recipeOf(payload: BulkPayload | null): Recipe | null {
    const id = payload?.recipeId;
    if (!id) return null;
    const catalogue = StuffApi.findByTemplatePath<Stuff>(CATALOGUE_PATH);
    if (!catalogue) return null;
    return (catalogue as unknown as RecipeLookup).getRecipe(id) ?? null;
  }

  /** Display name — the recipe's, else the Material's. */
  public static nameOf(
    payload: BulkPayload | null,
    material: Material | null,
  ): string {
    return BlendIdentity.recipeOf(payload)?.getName() ?? material?.getName() ?? '';
  }

  /** Appearance prose — the recipe's, else the Material's. */
  public static appearanceOf(
    payload: BulkPayload | null,
    material: Material | null,
  ): string {
    // ⚠ The carried string first: it is what the substrate renders, so
    // reading the recipe here instead could disagree with the vessel's
    // own prose after a recipe edit.
    return (
      payload?.appearance ||
      BlendIdentity.recipeOf(payload)?.getOutputAppearance() ||
      material?.getAppearance() ||
      ''
    );
  }

  /** Resolution keywords (`look stew`) — the recipe's, else the Material's. */
  public static keywordsOf(
    payload: BulkPayload | null,
    material: Material | null,
  ): readonly string[] {
    // ⚠ Carried first — these are how the blend is FOUND, and a lookup
    // that misses does not degrade the reading, it removes the object.
    if (payload?.keywords?.length) return payload.keywords;
    const recipe = BlendIdentity.recipeOf(payload);
    if (recipe) return recipe.getKeywords();
    return material?.getKeywords() ?? [];
  }

  /**
   * ⭐⭐ The Discipline whose recipe made this — the skill a taster's
   * palate is read through. A blend nobody's recipe made records none and
   * reads at the floor, which is honest: an off-spec lump of food teaches
   * you nothing about its making.
   */
  public static disciplineOf(payload: BulkPayload | null): string {
    return BlendIdentity.recipeOf(payload)?.getDiscipline() ?? '';
  }
}
