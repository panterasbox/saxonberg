/**
 * Recipe — authored crafting knowledge: a transformation from constrained
 * inputs (+ tools) into one output form.
 *
 * NOT a Stuff and NOT a template. A recipe is **authored reference data**
 * with no state, lifecycle, or behavior beyond answering questions about its
 * own fields (the derivation math lives on {@link Grade}). So it follows the
 * `Emote` precedent: a value shape over one `documents` row of
 * `kind: 'recipe'` (`data` = {@link Recipe.toData}), installed by the
 * `generic-objects` content pack at `/generic-objects/recipes/<recipeId>`
 * and loaded by the {@link RecipeCatalogue} singleton (the
 * `SoulCatalogue`↔`Emote` relationship).
 *
 * Storage shape:
 *   - `recipeId` — canonical lookup key. Unique-indexed.
 *   - `keywords` — what the order/serve/mix verbs resolve against.
 *   - `inputSlots` — input constraints (category tag + min grade + measure).
 *   - `toolCapabilities` — required tool capabilities (by kind).
 *   - `outputTemplate` — the **real cloneable** Stuff template to mint (a
 *     glass). The honest boundary: only the recipe-as-knowledge is a
 *     Document; the output *form* is a template.
 *   - `outputMaterial` — an OPTIONAL authored-substance override for a
 *     mixture. Empty (the shipped roster) ⇒ the blend **derives**: the
 *     output slot points at one generic blend base and a per-instance
 *     `BulkPayload` sums identity + macros from the consumed inputs
 *     (macros in = macros out — the fixed-vocabulary rule; per-dish
 *     Material rows are the retired anti-pattern). A transform recipe
 *     ignores it (the input's material flows onto the Tangible).
 *   - `baseGradeBand` — optional floor band.
 */

import { Grade } from './Grade';
import type { FieldMeta } from '../mixin';
import type { StoredDocument } from '../document/StoredDocument';

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

/**
 * The garnish a drink is finished with: a reachable item whose Material
 * carries `category` (an olive, a lime wedge), `count` of them (default
 * 1), moved INTO the glass at the fill — a thing in the drink, not a
 * flourish. Absent ⇒ no garnish.
 */
export interface RecipeGarnish {
  category: string;
  count?: number;
}

/** How a drink takes ice: `cubes` / `crushed` in the glass, or `none`. */
export type RecipeIce = 'cubes' | 'crushed' | 'none';

export class Recipe {
  /**
   * ⭐ **How to FIND a recipe is open; what it takes is level 1.**
   *
   * Not persistence metadata any more (a recipe is not a `Document`) —
   * the static stays because it is the spoiler schema the wiki's
   * composition components read off the class: which fields are how
   * you find it, and which are the recipe.
   *
   *
   * Name, keywords and discipline are how a recipe is looked up at
   * all, and a search index nobody can read indexes nothing. The
   * inputs, the tools, the heat, the difficulty and what comes out are
   * the recipe — the thing a crafter works out, buys, or is taught.
   *
   * Level 1 rather than higher **because looking a recipe up is a
   * legitimate way to learn it**, and a wiki whose crafting pages were
   * blank to ordinary players would just move that traffic to a
   * third-party site nobody here controls. Collapsed by default is the
   * whole intent: the discovery stays available to anyone who wants
   * it, and unspoiled for anyone who does not.
   */
  static fieldMeta: FieldMeta = {
    // ── How you find it ──
    recipeId: { persistent: true },
    name: { persistent: true },
    keywords: { persistent: true },
    discipline: { persistent: true },

    // ── What it actually takes, and yields ──
    inputSlots: { persistent: true, spoiler: 1, spoilerName: 0 },
    toolCapabilities: { persistent: true, spoiler: 1, spoilerName: 0 },
    outputTemplate: { persistent: true, spoiler: 1, spoilerName: 0 },
    outputMaterial: { persistent: true, spoiler: 1, spoilerName: 0 },
    baseGradeBand: { persistent: true, spoiler: 1, spoilerName: 0 },
    requiresHeatK: { persistent: true, spoiler: 1, spoilerName: 0 },
    outputApplication: { persistent: true, spoiler: 1, spoilerName: 0 },
    outputPortionL: { persistent: true, spoiler: 1, spoilerName: 0 },
    outputAppearance: { persistent: true, spoiler: 1, spoilerName: 0 },
    difficulty: { persistent: true, spoiler: 1, spoilerName: 0 },
    garnish: { persistent: true, spoiler: 1, spoilerName: 0 },
    ice: { persistent: true, spoiler: 1, spoilerName: 0 },
  };

  /** The document's path (`/generic-objects/recipes/martini`). */
  path: string = '';

  /** Canonical id; unique per kind at the collection level (`{kind, data.recipeId}`). */
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

  /** Optional authored-substance override; empty ⇒ the blend derives. */
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
   * Appearance prose for a **derived** mixture blend ("a thick brown
   * stew…") — carried on the recipe (inherently per-dish content)
   * instead of a per-dish Material row (the retired anti-pattern). Used
   * only when `outputMaterial` is empty (the derived default); empty ⇒
   * the generic blend material's own appearance shows.
   */
  outputAppearance: string = '';

  /**
   * Authored ladder placement — a `Difficulty` word the craft-resolve
   * `ActSignature` records. Empty ⇒ no advancement row (bar rows stay
   * unrecorded exactly as today).
   */
  difficulty: string = '';

  /** The Discipline id the deed records against; empty ⇒ no advancement. */
  discipline: string = '';

  /** The garnish (an item by category, moved into the glass); null ⇒ none. */
  garnish: RecipeGarnish | null = null;

  /** Ice in the glass at the fill (`none` — the stored default — ⇒ no ice). */
  ice: RecipeIce = 'none';

  /**
   * Hydrate from a `kind: 'recipe'` document. Validates what the retired
   * `RecipeSeeder` validated — a non-empty `inputSlots` and a string
   * `outputTemplate` — so a malformed pack file fails at `read`.
   */
  static fromDocument(doc: StoredDocument): Recipe {
    const r = Recipe.fromData(doc.getData());
    r.path = doc.getPath();
    return r;
  }

  /** The same validation over a bare `data` object (the pack reader's use). */
  static fromData(data: Record<string, unknown>): Recipe {
    if (typeof data.recipeId !== 'string' || data.recipeId.length === 0) {
      throw new Error(`Recipe: document is missing a string 'recipeId'`);
    }
    if (!Array.isArray(data.inputSlots) || data.inputSlots.length === 0) {
      throw new Error(`Recipe '${data.recipeId}' needs a non-empty 'inputSlots'`);
    }
    if (typeof data.outputTemplate !== 'string' || !data.outputTemplate) {
      throw new Error(`Recipe '${data.recipeId}' missing 'outputTemplate'`);
    }
    const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
    const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
    const list = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const r = new Recipe();
    r.recipeId = data.recipeId;
    r.name = str(data.name, data.recipeId);
    r.keywords = list(data.keywords).map((k) => k.toLowerCase());
    r.inputSlots = data.inputSlots as RecipeInputSlot[];
    r.toolCapabilities = list(data.toolCapabilities);
    r.outputTemplate = data.outputTemplate;
    r.outputMaterial = str(data.outputMaterial);
    r.baseGradeBand = str(data.baseGradeBand);
    r.requiresHeatK = num(data.requiresHeatK);
    r.outputApplication = str(data.outputApplication);
    r.outputPortionL = num(data.outputPortionL);
    r.outputAppearance = str(data.outputAppearance);
    r.difficulty = str(data.difficulty);
    r.discipline = str(data.discipline);
    r.garnish = Recipe.garnishFrom(data.garnish, r.recipeId);
    r.ice = Recipe.iceFrom(data.ice, r.recipeId);
    return r;
  }

  /** Validate an authored `garnish` block (`{ category, count? }`). */
  private static garnishFrom(v: unknown, id: string): RecipeGarnish | null {
    if (v == null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) {
      throw new Error(`Recipe '${id}': 'garnish' must be { category, count? }`);
    }
    const g = v as Record<string, unknown>;
    if (typeof g.category !== 'string' || g.category.length === 0) {
      throw new Error(`Recipe '${id}': 'garnish' needs a string 'category'`);
    }
    const out: RecipeGarnish = { category: g.category };
    if (g.count !== undefined) {
      if (typeof g.count !== 'number' || !(g.count >= 1)) {
        throw new Error(`Recipe '${id}': 'garnish.count' must be ≥ 1`);
      }
      out.count = g.count;
    }
    return out;
  }

  /** Validate an authored `ice` word. */
  private static iceFrom(v: unknown, id: string): RecipeIce {
    if (v === undefined || v === null || v === '') return 'none';
    if (v === 'cubes' || v === 'crushed' || v === 'none') return v;
    throw new Error(`Recipe '${id}': 'ice' must be cubes | crushed | none`);
  }

  /** The inverse — the `data` a recipe document carries. */
  toData(): Record<string, unknown> {
    return {
      recipeId: this.recipeId,
      name: this.name,
      keywords: [...this.keywords],
      inputSlots: this.inputSlots,
      toolCapabilities: [...this.toolCapabilities],
      outputTemplate: this.outputTemplate,
      outputMaterial: this.outputMaterial,
      baseGradeBand: this.baseGradeBand,
      requiresHeatK: this.requiresHeatK,
      outputApplication: this.outputApplication,
      outputPortionL: this.outputPortionL,
      outputAppearance: this.outputAppearance,
      difficulty: this.difficulty,
      discipline: this.discipline,
      garnish: this.garnish ? { ...this.garnish } : null,
      ice: this.ice,
    };
  }

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
  getOutputAppearance(): string {
    return this.outputAppearance;
  }
  getDifficulty(): string {
    return this.difficulty;
  }
  getDiscipline(): string {
    return this.discipline;
  }
  /** The garnish spec, or null for none. */
  getGarnish(): RecipeGarnish | null {
    return this.garnish;
  }
  /** The ice word (`none` when the drink takes none). */
  getIce(): RecipeIce {
    return this.ice;
  }
  /** Whether the drink is served over ice. */
  wantsIce(): boolean {
    return this.ice !== 'none';
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
