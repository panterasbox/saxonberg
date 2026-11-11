/**
 * RecipeCatalogue — singleton Idea owning the runtime recipe index.
 *
 * Lives at `/platform/idea/RecipeCatalogue`. The source of truth is
 * `documents {kind: 'recipe'}`; this catalogue is the **lazy dictionary**
 * (scan-sweep ruling 1) a player's typed word needs — `carve stool`,
 * `order martini` — warmed by its own `onCreate` the first time anything
 * reaches it through `StuffApi.singleton`, and never booted. It resolves a
 * recipe by its word (the path's leaf, unique by the install check), by its
 * path (an authored citation), by keyword and by output. The installer's
 * go-live re-warms it in place after a live `pack sync` touches the kind.
 *
 * Read-only reference surface (recipes are public knowledge, like topics), so
 * methods are ungated — the `SoulCatalogue` precedent, not the gated
 * mutation surface of `SoulCatalogue`.
 *
 * Not a persisted record — the seed YAML is `{ class: /platform/idea/RecipeCatalogue,
 * data: {} }`; the cache is rebuilt on demand from the collection.
 */

import { Idea } from '../../lib/stuff/Idea';
import { Recipe } from '../../lib/craft/Recipe';
import { DocumentApi } from '../../api/document';
import { DocumentNotResidentError, type VetoResult } from '../../lib/errors';
import type { CarvePlan, CarveRefusal, CarveRequest } from '../../lib/craft/Carvable';
import { CraftingApi } from '../../api/crafting';
import { MixinApi } from '../../api/mixin';
import type { EvictionContext } from '../../lib/stuff/Stuff';

import type { BoundaryRole } from '../../lib/security/BoundaryRole';
const RecipeCatalogueBase = Idea;

/** The capability a carving asks for — an edge. */
const CARVING_EDGE = 'cutting';
/** The material tag a carving's one slot takes. */
const CARVING_STOCK = 'wood';

export default class RecipeCatalogue extends RecipeCatalogueBase {
  /**
   * a seeded reference catalogue the engine reads to answer *what exists in the world* — every one of these was a verb that simply died inside a circle (`help`, `spells`, `recipes`/`craft`, `studio`, `competence`, `government`): a player standing in their own circle could not read the rulebook.
   *
   * ⭐ Declared, not enumerated. This was one of twenty-seven
   * template-path strings in `api/security.ts`, listed there
   * *"because each is a singleton rather than a class of many"* —
   * which a static on the class makes irrelevant. See
   * `lib/security/BoundaryRole.ts`.
   */
  static boundaryRole: BoundaryRole = 'commons';


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

  /**
   * outputTemplate → recipeId, the first by id when several recipes make
   * one row (repair D1). Built in `warm`, never a scan at the read.
   */
  private byOutput: Map<string, string> = new Map();

  /** Document path → word. */
  private byPath: Map<string, string> = new Map();

  /** Resolve a recipe by its word (its path's leaf), or null. */
  public getRecipe(recipeId: string): Recipe | null {
    this.ensureCache();
    return this.cache!.get(recipeId) ?? null;
  }

  /** Resolve a recipe by its document path (an authored citation), or null. */
  public getRecipeAt(path: string): Recipe | null {
    this.ensureCache();
    const word = this.byPath.get(path);
    return word ? (this.cache!.get(word) ?? null) : null;
  }

  /** Resolve a recipe by keyword / name / word — or by its path — or null. */
  public findByKeyword(keyword: string): Recipe | null {
    this.ensureCache();
    // An authored citation names the recipe's path.
    if (keyword.startsWith('/')) return this.getRecipeAt(keyword);
    const id = this.byKeyword.get(keyword.toLowerCase());
    if (id) return this.cache!.get(id) ?? null;
    // Fallback: scan (covers keywords added after warm).
    for (const recipe of this.cache!.values()) {
      if (recipe.matchesKeyword(keyword)) return recipe;
    }
    return null;
  }

  /**
   * ⭐ The recipe that MAKES `outputTemplate`, or null — how a part with no
   * recorded recipe (a found thing's line, a stocked pick) still knows the
   * trade that made it (repair D1). Deterministic: the lowest recipe id
   * when several make the same row.
   */
  public recipeFor(outputTemplate: string): Recipe | null {
    this.ensureCache();
    const id = this.byOutput.get(outputTemplate);
    return id ? (this.cache!.get(id) ?? null) : null;
  }

  /** Every known recipe. */
  public allRecipes(): readonly Recipe[] {
    this.ensureCache();
    return [...this.cache!.values()];
  }

  /**
   * ⭐ **The cure for what the player named** (controller-liquidity W10;
   * moved off the cooking pack's `PreserveController`): among the recipes
   * that move `axis` of the water state (`solute` — salting, `moisture` —
   * drying), one whose ITEM slot the material's own tags satisfy, matched
   * the way crafting matches. ⚠ `preferred` is checked FIRST and wins
   * ties, so a second row can never steer an existing act elsewhere; with
   * nothing better it is the answer.
   */
  public curingRecipeFor(axis: 'moisture' | 'solute', tags: readonly string[], preferred: string): string {
    const satisfies = (recipe: Recipe | null): boolean => {
      const cure = recipe?.getCure();
      if (!recipe || !cure || cure[axis] === undefined) return false;
      return recipe
        .getInputSlots()
        .some((slot) => (slot.kind ?? 'bulk') === 'item' && tags.includes(slot.category));
    };
    if (satisfies(this.getRecipe(preferred))) return preferred;
    return this.allRecipes().find((r) => satisfies(r))?.getRecipeId() ?? preferred;
  }

  /**
   * ⭐ **The generic carving** (controller-liquidity W7c; moved off
   * `CarveController`, whose second engine it was): the word the player
   * said, read through the keyword index, as a CARVING row — one item of
   * wood, an edge, no heat, a tangible thing out; read off the row, so a
   * pack's spoon or bowl recipe is carvable the day it installs. The plan
   * is instant (`durationMs: 0` — a craft resolved from the actor's reach):
   * the named stock is preferred, not required, and the carving is
   * subtractive (a dowel off a board is not the board's weight). Asked by
   * `carve` when the thing named plans no carving of its own.
   */
  public carvingPlanFor(req: CarveRequest): CarvePlan | CarveRefusal {
    const word = req.word.trim().toLowerCase();
    if (!word) return { ok: false, reason: 'no-part', facts: { names: this.carvingNames() } };
    const found = this.getRecipe(word) ?? this.findByKeyword(word);
    const recipe = found !== null && RecipeCatalogue.isCarving(found) ? found : null;
    if (recipe === null) {
      return { ok: false, reason: 'not-a-carving', facts: { word, names: this.carvingNames() } };
    }
    const knife = req.knife;
    if (knife === null) return { ok: false, reason: 'no-edge', facts: { carves: 'carving' } };
    if (!MixinApi.isTool(knife) || !knife.hasCapability(CARVING_EDGE)) {
      return { ok: false, reason: 'wrong-tool', facts: { knife } };
    }
    const recipeRef = recipe.getRecipeId();
    const stock = req.stock ?? null;
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: { kind: 'carving', knife },
      onComplete: async () => {
        const outcome = await CraftingApi.craft({
          recipeRef,
          makerMode: 'self',
          // To hand — the Api lands, stamps and captures it.
          landing: 'hands',
          subtractive: true,
          ...(stock ? { target: stock } : {}),
        });
        if (!outcome.ok) return { ok: false, reason: 'craft-refused', facts: { failure: outcome } };
        return { ok: true, facts: { kind: 'carved', knife, output: outcome.output } };
      },
    };
  }

  /** Every installed carving, by name — what the refusal says can be carved. */
  private carvingNames(): string[] {
    return this.allRecipes()
      .filter((r) => RecipeCatalogue.isCarving(r))
      .map((r) => r.getName().toLowerCase())
      .sort();
  }

  /** Is this recipe a carving — one item of wood, an edge, no heat, a tangible thing out? */
  private static isCarving(recipe: Recipe): boolean {
    if (recipe.getOutputApplication() !== 'tangible') return false;
    if (recipe.getRequiresHeatK() > 0) return false;
    const tools = recipe.getToolCapabilities();
    if (tools.length !== 1 || tools[0] !== CARVING_EDGE) return false;
    const slots = recipe.getInputSlots();
    if (slots.length !== 1) return false;
    const slot = slots[0]!;
    return (slot.kind ?? 'bulk') === 'item' && slot.category === CARVING_STOCK;
  }

  /** Whether `recipeId` is known. */
  public knows(recipeId: string): boolean {
    this.ensureCache();
    return this.cache!.has(recipeId);
  }

  public override async onCreate(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Drop the cache. ⚠ The sync reads then throw until `warm` runs again —
   * the go-live re-warms in place instead, so nothing reads it cold.
   */
  public invalidateCache(): void {
    this.cache = null;
    this.byKeyword = new Map();
    this.byOutput = new Map();
    this.byPath = new Map();
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
    const byOutput = new Map<string, string>();
    const byPath = new Map<string, string>();
    for (const recipe of recipes) {
      const id = recipe.getRecipeId();
      if (!id) continue;
      cache.set(id, recipe);
      byPath.set(recipe.path, id);
      byKeyword.set(id.toLowerCase(), id);
      const name = recipe.getName();
      if (name) byKeyword.set(name.toLowerCase(), id);
      for (const kw of recipe.getKeywords()) {
        byKeyword.set(kw.toLowerCase(), id);
      }
      // ⭐ Only a recipe that MAKES a thing — a `bulk` recipe fills a
      // vessel, and the dough did not make the trough.
      const out =
        recipe.getOutputApplication() === 'tangible' ? recipe.getOutputTemplate() : '';
      const prior = out ? byOutput.get(out) : undefined;
      if (out && (prior === undefined || id < prior)) byOutput.set(out, id);
    }
    this.cache = cache;
    this.byKeyword = byKeyword;
    this.byOutput = byOutput;
    this.byPath = byPath;
  }

  private ensureCache(): void {
    // ⭐ Never "empty": a sync read of a dictionary nothing warmed is an
    // engine defect (whatever reached this singleton went through
    // `StuffApi.singleton`, whose `onCreate` warms it).
    if (this.cache === null) {
      throw new DocumentNotResidentError('recipe', '/platform/idea/RecipeCatalogue');
    }
  }

  /** Singleton refusal (mirrors SoulCatalogue / SoulCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'RecipeCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
