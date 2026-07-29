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
 * the chosen input must carry ("gin" / "ferrous"); `minGrade` is the floor
 * band word. The slot's amount is discriminated by `kind`:
 *
 *   - `kind` absent or `'bulk'` — the bar's slot, byte-identical: `measureL`
 *     is the consumed volume in litres.
 *   - `kind: 'item'` — a discrete/glob slot: `count` units of a reachable
 *     Tangible whose Material carries the category tag (an ingot, a root
 *     vegetable). An ungraded item derives at `fair`.
 */
export interface RecipeInputSlot {
  slot: string;
  category: string;
  minGrade: string;
  kind?: 'bulk' | 'item';
  /** Consumed volume in litres — bulk slots only. */
  measureL?: number;
  /** Units consumed — item slots only (default 1). */
  count?: number;
}

/**
 * How a recipe's output receives its substance — the branch discriminator
 * `CraftingLogic` dispatches its output/consume seams on:
 *
 *   - `'bulk'` (the default) — fill the output's bulk slot with the authored
 *     `outputMaterial` at the summed input volume (the bar's mixture case).
 *   - `'tangible'` — flow the primary matched item input's Material + the
 *     summed consumed mass onto the cloned Tangible (smithing's transform).
 *   - `'edible'` — fill the output's bulk slot with the authored *food*
 *     `outputMaterial` at `outputPortionL` (cooking's plated dish).
 */
export type OutputApplication = 'bulk' | 'tangible' | 'edible';

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
    'requiresHeatK',
    'outputApplication',
    'outputPortionL',
    'difficulty',
    'discipline',
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

  /** Minimum reachable heat (K) to resolve; 0 = no heat gate. */
  requiresHeatK: number = 0;

  /** Output-application kind word; empty = `'bulk'` (the bar's default). */
  outputApplication: string = '';

  /** Edible portion volume in litres (`'edible'` outputs only). */
  outputPortionL: number = 0;

  /**
   * Authored ladder placement — a `Difficulty` word the craft-resolve
   * `ActSignature` records. Empty ⇒ no advancement row (bar rows stay
   * unrecorded exactly as today).
   */
  difficulty: string = '';

  /** The Discipline id the deed records against; empty ⇒ no advancement. */
  discipline: string = '';

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
  getRequiresHeatK(): number {
    return this.requiresHeatK;
  }
  /** The output-application kind (empty stored value ⇒ `'bulk'`). */
  getOutputApplication(): OutputApplication {
    return this.outputApplication === 'tangible' ||
      this.outputApplication === 'edible'
      ? this.outputApplication
      : 'bulk';
  }
  getOutputPortionL(): number {
    return this.outputPortionL;
  }
  getDifficulty(): string {
    return this.difficulty;
  }
  getDiscipline(): string {
    return this.discipline;
  }

  /** Whether `slot` is a discrete/glob item slot (vs the bulk default). */
  static isItemSlot(slot: RecipeInputSlot): boolean {
    return slot.kind === 'item';
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
