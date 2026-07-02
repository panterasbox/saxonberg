/**
 * RecipeCatalogue — singleton Idea owning the runtime recipe index.
 *
 * Lives at `/obj/RecipeCatalogue` (the singleton-in-`obj/` convention,
 * sibling to `TopicCatalogue` / `SoulCatalogue`). The source of truth is the
 * `recipes` collection of {@link Recipe} Documents (seeded by `RecipeSeeder`
 * at boot); this catalogue warms a transient cache from it and resolves
 * recipes by id + keyword.
 *
 * Read-only reference surface (recipes are public knowledge, like topics), so
 * methods are ungated — the `TopicCatalogue` precedent, not the gated
 * mutation surface of `SoulCatalogue`.
 *
 * Not a persisted record — the seed YAML is `{ class: /obj/RecipeCatalogue,
 * data: {} }`; the cache is rebuilt on demand from the collection.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Recipe } from '../lib/craft/Recipe';
import type { VetoResult } from '../lib/errors';

const RecipeCatalogueBase = PostRegistrationMixin(Idea);

export default class RecipeCatalogue extends RecipeCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** recipeId → Recipe. `null` = not yet warmed. */
  private cache: Map<string, Recipe> | null = null;

  /** Lowercase keyword/name/id → recipeId. */
  private byKeyword: Map<string, string> = new Map();

  /** Resolve a recipe by its canonical id, or null. */
  public getRecipe(recipeId: string): Recipe | null {
    this.ensureCache();
    return this.cache!.get(recipeId) ?? null;
  }

  /** Resolve a recipe by keyword / name / id, or null. */
  public findByKeyword(keyword: string): Recipe | null {
    this.ensureCache();
    const id = this.byKeyword.get(keyword.toLowerCase());
    if (id) return this.cache!.get(id) ?? null;
    // Fallback: scan (covers keywords added after warm).
    for (const recipe of this.cache!.values()) {
      if (recipe.matchesKeyword(keyword)) return recipe;
    }
    return null;
  }

  /** Every known recipe. */
  public allRecipes(): readonly Recipe[] {
    this.ensureCache();
    return [...this.cache!.values()];
  }

  /** Whether `recipeId` is known. */
  public knows(recipeId: string): boolean {
    this.ensureCache();
    return this.cache!.has(recipeId);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /** (Re)build the cache + keyword index from the `recipes` collection. */
  public async warm(): Promise<void> {
    const recipes = await Recipe.find<Recipe>({});
    const cache = new Map<string, Recipe>();
    const byKeyword = new Map<string, string>();
    for (const recipe of recipes) {
      const id = recipe.getRecipeId();
      if (!id) continue;
      cache.set(id, recipe);
      byKeyword.set(id.toLowerCase(), id);
      const name = recipe.getName();
      if (name) byKeyword.set(name.toLowerCase(), id);
      for (const kw of recipe.getKeywords()) {
        byKeyword.set(kw.toLowerCase(), id);
      }
    }
    this.cache = cache;
    this.byKeyword = byKeyword;
  }

  private ensureCache(): void {
    // A unit test that doesn't go through boot may read before warm; start
    // empty so the resolve surface returns null rather than throwing.
    if (this.cache === null) this.cache = new Map();
  }

  /** Singleton refusal (mirrors TopicCatalogue / SoulCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'RecipeCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
