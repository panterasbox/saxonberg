/**
 * RecipeCatalogue — singleton Idea owning the runtime recipe index.
 *
 * Lives at `/platform/idea/RecipeCatalogue` (the singleton-in-`obj/` convention,
 * sibling to `TopicCatalogue` / `SoulCatalogue`). The source of truth is
 * `documents {kind: 'recipe'}` (installed by the `generic-objects` content
 * pack at boot); this catalogue warms a transient cache from it and
 * resolves recipes by id + keyword. The installer's go-live re-warms it
 * after a live `pack sync` touches the kind.
 *
 * Read-only reference surface (recipes are public knowledge, like topics), so
 * methods are ungated — the `TopicCatalogue` precedent, not the gated
 * mutation surface of `SoulCatalogue`.
 *
 * Not a persisted record — the seed YAML is `{ class: /platform/idea/RecipeCatalogue,
 * data: {} }`; the cache is rebuilt on demand from the collection.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { Recipe } from '../../lib/craft/Recipe';
import { DocumentApi } from '../../api/document';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const RecipeCatalogueBase = PostRegistrationMixin(Idea);

export default class RecipeCatalogue extends RecipeCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
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

  /**
   * Drop the cache; the read surface answers empty until `warm` runs
   * again (the installer's go-live calls `warm` directly — the reads are
   * sync and cannot re-warm lazily).
   */
  public invalidateCache(): void {
    this.cache = null;
    this.byKeyword = new Map();
  }

  /** (Re)build the cache + keyword index from `documents {kind: recipe}`. */
  public async warm(): Promise<void> {
    const docs = await DocumentApi.listOfKind('recipe');
    const recipes: Recipe[] = [];
    for (const doc of docs) {
      try {
        recipes.push(Recipe.fromDocument(doc));
      } catch (err) {
        // A malformed row never takes the catalogue down: skip it loudly.
        console.warn(`RecipeCatalogue: skipping ${doc.getPath()}: ${(err as Error).message}`);
      }
    }
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
