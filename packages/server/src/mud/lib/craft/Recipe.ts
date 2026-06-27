/**
 * Recipe — authored crafting knowledge: a transformation from constrained
 * inputs (+ tools) into one output form.
 *
 * NOT a Stuff and NOT a template. A recipe is **authored reference data**
 * with no state, lifecycle, or behavior beyond answering questions about its
 * own fields (the derivation math lives on {@link Grade}). So it follows the
 * `Emote` precedent: a {@link Document} in the `recipes` collection, loaded
 * by the {@link RecipeCatalogue} singleton (the `SoulCatalogue`↔`Emote`
 * relationship), seeded at boot by `RecipeSeeder`.
 *
 * Storage shape:
 *   - `recipeId` — canonical lookup key. Unique-indexed.
 *   - `keywords` — what the order/serve/mix verbs resolve against.
 *   - `inputSlots` — input constraints (category tag + min grade + measure).
 *   - `toolCapabilities` — required tool capabilities (by kind).
 *   - `outputTemplate` — the **real cloneable** Stuff template to mint (a
 *     glass). The honest boundary: only the recipe-as-knowledge is a
 *     Document; the output *form* is a template.
 *   - `outputMaterial` — **one output-derivation strategy** (the *mixture*
 *     case): the resulting substance is authored on the recipe because no
 *     single input material flows through. NOT the universal output rule — a
 *     transform like ore→ingot flows the input's material onto the output
 *     Tangible; assembly composes components. (v1 is transform + bulk; those
 *     other strategies arrive as new branches in `CraftingLogic`.)
 *   - `baseGradeBand` — optional floor band.
 */

import { Document } from '../persistence/Document';
import { Grade } from './Grade';

/**
 * One input slot, by constraint. `category` is a Material classification tag
 * the chosen input must carry ("gin"); `minGrade` is the floor band word;
 * `measureL` is the consumed volume in litres (the v1 bulk-only amount —
 * mass/count amounts arrive with cooking/smithing).
 */
export interface RecipeInputSlot {
  slot: string;
  category: string;
  minGrade: string;
  measureL: number;
}

export class Recipe extends Document {
  static collectionName = 'recipes';
  static persistentFields = [
    'recipeId',
    'name',
    'keywords',
    'inputSlots',
    'toolCapabilities',
    'outputTemplate',
    'outputMaterial',
    'baseGradeBand',
  ];

  /** Canonical id; unique-indexed at the collection level. */
  recipeId: string = '';

  /** Display name (e.g. `'Gin Martini'`). */
  name: string = '';

  /** Keywords the order/serve/mix verbs resolve against. */
  keywords: string[] = [];

  /** Input slots, by constraint. */
  inputSlots: RecipeInputSlot[] = [];

  /** Required tool capabilities. */
  toolCapabilities: string[] = [];

  /** The output template path to clone (a real cloneable Stuff). */
  outputTemplate: string = '';

  /** The cocktail Material the output glass holds (the mixture strategy). */
  outputMaterial: string = '';

  /** Optional floor band word; empty = no floor. */
  baseGradeBand: string = '';

  getRecipeId(): string {
    return this.recipeId;
  }
  getName(): string {
    return this.name;
  }
  getKeywords(): readonly string[] {
    return this.keywords;
  }
  getInputSlots(): readonly RecipeInputSlot[] {
    return this.inputSlots;
  }
  getToolCapabilities(): readonly string[] {
    return this.toolCapabilities;
  }
  getOutputTemplate(): string {
    return this.outputTemplate;
  }
  getOutputMaterial(): string {
    return this.outputMaterial;
  }

  /** The optional floor grade as a value-object, or null. */
  getBaseGrade(): Grade | null {
    return this.baseGradeBand ? Grade.of(this.baseGradeBand) : null;
  }

  /** Whether `kw` matches a keyword or the (case-insensitive) name. */
  matchesKeyword(kw: string): boolean {
    const needle = kw.toLowerCase();
    return (
      this.keywords.some((k) => k.toLowerCase() === needle) ||
      this.name.toLowerCase() === needle ||
      this.recipeId.toLowerCase() === needle
    );
  }
}
