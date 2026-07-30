/**
 * RecipeSeeder — populate the `recipes` collection from a single seed YAML
 * containing the starter recipe roster.
 *
 * Insert-only / idempotent (mirrors `EmoteSeeder`): recipes are matched by
 * `recipeId`; existing records are left alone.
 *
 * Dev workflow when the seed YAML changes:
 *   db.recipes.deleteOne({recipeId: '<id>'}); restart
 *
 * Source file is at `mud/config/recipes.yaml` (NOT under `mud/seeds/`):
 * Recipe records aren't Stuff templates and don't belong in the `domain`
 * collection that `SeederManager` walks. Keeping the file out of the seeds
 * tree avoids the walker double-inserting it as a domain template.
 *
 * Runs in bootstrap after `PersistenceManager.connect` (which creates the
 * indexes) and before `BootstrapManager.run` (which warms the
 * `RecipeCatalogue` singleton from the just-populated collection).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Recipe, type RecipeInputSlot } from '../mud/lib/craft/Recipe';

interface RecipeSeedEntry {
  recipeId: string;
  name?: string;
  keywords?: string[];
  inputSlots: RecipeInputSlot[];
  toolCapabilities?: string[];
  outputTemplate: string;
  outputMaterial: string;
  baseGradeBand?: string;
  requiresHeatK?: number;
  outputApplication?: string;
  outputPortionL?: number;
  outputAppearance?: string;
  difficulty?: string;
  discipline?: string;
}

interface RecipeSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/recipes.yaml. */
  seedPath?: string;
}

export class RecipeSeeder {
  public static async run(opts: RecipeSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? RecipeSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`RecipeSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { recipes?: RecipeSeedEntry[] }
      | RecipeSeedEntry[]
      | null;
    const entries: RecipeSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.recipes)
        ? parsed!.recipes!
        : [];
    let inserted = 0;
    for (const entry of entries) {
      RecipeSeeder.#validate(entry, path);
      const existing = await Recipe.find({ recipeId: entry.recipeId });
      if (existing.length > 0) continue;
      const r = new Recipe();
      r.recipeId = entry.recipeId;
      r.name = entry.name ?? entry.recipeId;
      r.keywords = (entry.keywords ?? []).map((k) => k.toLowerCase());
      r.inputSlots = entry.inputSlots;
      r.toolCapabilities = entry.toolCapabilities ?? [];
      r.outputTemplate = entry.outputTemplate;
      r.outputMaterial = entry.outputMaterial;
      r.baseGradeBand = entry.baseGradeBand ?? '';
      r.requiresHeatK = entry.requiresHeatK ?? 0;
      r.outputApplication = entry.outputApplication ?? '';
      r.outputPortionL = entry.outputPortionL ?? 0;
      r.outputAppearance = entry.outputAppearance ?? '';
      r.difficulty = entry.difficulty ?? '';
      r.discipline = entry.discipline ?? '';
      await r.save();
      inserted++;
    }
    console.info(
      `RecipeSeeder: ${inserted} new recipe${inserted === 1 ? '' : 's'} from ${path}`,
    );
    return inserted;
  }

  static #validate(entry: RecipeSeedEntry, path: string): void {
    if (!entry || typeof entry.recipeId !== 'string' || !entry.recipeId) {
      throw new Error(`RecipeSeeder: malformed entry in ${path}: missing 'recipeId'`);
    }
    if (!Array.isArray(entry.inputSlots) || entry.inputSlots.length === 0) {
      throw new Error(
        `RecipeSeeder: recipe '${entry.recipeId}' needs a non-empty 'inputSlots'`,
      );
    }
    if (typeof entry.outputTemplate !== 'string' || !entry.outputTemplate) {
      throw new Error(
        `RecipeSeeder: recipe '${entry.recipeId}' missing 'outputTemplate'`,
      );
    }
    // `outputMaterial` is optional everywhere: a tangible recipe flows
    // the chosen input's Material onto the output, and a bulk/edible
    // recipe DERIVES its blend from the consumed inputs by default
    // (macros in = macros out) — an authored substance is the override,
    // never the requirement (the fixed-vocabulary rule).
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/recipes.yaml');
  }
}
