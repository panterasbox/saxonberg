// CraftingLogic — the hot-reloadable logic singleton behind CraftingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { BulkableApi } from '../../api/bulk';
import { ExecutionContextApi } from '../../api/execution-context';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { Grade } from '../../lib/craft/Grade';
import type Material from '../../lib/material/Material';
import type { Recipe, RecipeInputSlot } from '../../lib/craft/Recipe';
import type RecipeCatalogue from '../RecipeCatalogue';
import type { BulkSlot } from '../../lib/bulk/Bulkable';
import type { Tooled } from '../../lib/craft/Tooled';
import type {
  CraftRequest,
  CraftOutcome,
  RecipeView,
  MakerMode,
  BuildMintRequest,
} from '../../api/crafting';
import type { BuildContribution } from '../../lib/craft/ManualBuild';

const CraftingApiCallers = SecurityPolicies.FromModule('/api/crafting#CraftingApi',
);

const CATALOGUE_PATH = '/obj/RecipeCatalogue';
const EPS = 1e-9;

/** The generic substance an off-spec (recipe-unmatched) build mints. */
const GENERIC_MIXED_MATERIAL = '/lib/material/cocktail/mixed';

/** A reachable, graded bulk input candidate. */
interface BottleCandidate {
  stuff: Stuff;
  slot: BulkSlot;
  material: Material | null;
  grade: Grade;
}

/** A matched input: the source slot to debit + the measure to draw. */
interface MatchedInput {
  slot: BulkSlot;
  measureL: number;
}

/** Cached catalogue handle (a fallback; the live registered one wins). */
let catalogueRef: RecipeCatalogue | null = null;
async function requireCatalogue(): Promise<RecipeCatalogue> {
  // Prefer the currently-registered singleton (HMR-replaced or test-reset
  // instances supersede the cache); fall back to the cache, then clone.
  const found = StuffApi.findByTemplatePath<RecipeCatalogue>(CATALOGUE_PATH);
  if (found) {
    catalogueRef = found;
    return found;
  }
  if (catalogueRef) return catalogueRef;
  catalogueRef = await StuffApi.singleton<RecipeCatalogue>(CATALOGUE_PATH);
  return catalogueRef;
}

function toView(recipe: Recipe): RecipeView {
  return {
    recipeId: recipe.getRecipeId(),
    name: recipe.getName(),
    keywords: recipe.getKeywords(),
  };
}

/**
 * Resolve the maker from the execution context — **never** off the wire.
 * `'self'` → the command giver (serve/mix). `'fulfilling-bartender'` → a
 * present `MakerMixin` agent in the giver's (the patron's) location (order).
 */
function resolveMaker(mode: MakerMode): Stuff | null {
  const giver = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
  if (!giver) return null;
  if (mode === 'self') return giver;
  // fulfilling-bartender: the giver is the patron; find a present maker.
  if (!MixinApi.isContainable(giver)) return null;
  const loc = ContainmentApi.getContainer(giver);
  if (!loc || !MixinApi.isContainer(loc)) return null;
  for (const c of ContainmentApi.getContents(loc)) {
    if (c !== giver && MixinApi.isMaker(c)) return c;
  }
  return null;
}

/**
 * Gather the reachable graded bulk inputs + tools in the room. Items resting
 * on a surface (the back-bar) have `container = the room`, so the room's
 * direct contents already include them — no descent needed.
 *
 * Each bottle's bulk Material is **ensure-loaded** via `StuffApi.singleton`
 * (not the sync `slot.getMaterial()`): a Material singleton is created
 * lazily on first reference, and crafting is the first live in-room bulk-
 * material consumer, so the registry may not hold it yet. Loading it here
 * also makes the later sync reads (the drinker's `drink`) resolve.
 */
async function gatherMatter(location: Stuff): Promise<{
  bottles: BottleCandidate[];
  tools: (Stuff & Tooled)[];
}> {
  const bottles: BottleCandidate[] = [];
  const tools: (Stuff & Tooled)[] = [];
  if (!MixinApi.isContainer(location)) return { bottles, tools };
  for (const c of ContainmentApi.getContents(location)) {
    if (MixinApi.isTool(c)) tools.push(c);
    if (MixinApi.isBulkable(c) && MixinApi.isGraded(c)) {
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot) continue;
      const mpath = slot.getMaterialPath();
      const material = mpath
        ? await StuffApi.singleton<Material>(mpath)
        : null;
      bottles.push({ stuff: c, slot, material, grade: c.getGrade() });
    }
  }
  return { bottles, tools };
}

function materialMatchesBrand(material: Material | null, brand: string): boolean {
  if (!material) return false;
  const b = brand.toLowerCase();
  return material.getName().toLowerCase().includes(b) || material.hasTag(b);
}

/**
 * Pick the input bottle for one recipe slot: category tag + min grade +
 * enough un-claimed reachable volume. Honors a `with <brand>` preference,
 * then highest grade. `claimed` tracks per-bottle draw so two slots of the
 * same category don't double-claim the same litres.
 */
function pickCandidate(
  inSlot: RecipeInputSlot,
  bottles: BottleCandidate[],
  claimed: Map<Stuff, number>,
  brand: string | undefined,
): BottleCandidate | null {
  const minGrade = Grade.of(inSlot.minGrade);
  const eligible = bottles.filter(
    (b) =>
      b.material !== null &&
      b.material.hasTag(inSlot.category) &&
      b.grade.compareTo(minGrade) >= 0 &&
      b.slot.available() - (claimed.get(b.stuff) ?? 0) >= inSlot.measureL - EPS,
  );
  if (eligible.length === 0) return null;
  eligible.sort((x, y) => {
    if (brand) {
      const bx = materialMatchesBrand(x.material, brand) ? 1 : 0;
      const by = materialMatchesBrand(y.material, brand) ? 1 : 0;
      if (bx !== by) return by - bx;
    }
    return y.grade.compareTo(x.grade);
  });
  return eligible[0]!;
}

/**
 * Domain seam #1 — apply the output's material/amount. The **only** bulk/
 * cocktail-specific output step: fill the cloned glass's bulk slot with the
 * recipe's authored cocktail Material (the mixture derivation strategy) at
 * the summed input volume. Smithing adds a sibling `applyTangibleOutput`
 * (flow material onto the Tangible), assembly an `applyComposedOutput` —
 * each a new branch, never an edit to the craft skeleton.
 */
async function applyBulkOutput(
  output: Stuff,
  recipe: Recipe,
  matched: MatchedInput[],
): Promise<void> {
  const outSlot = BulkableApi.slotFor(output, undefined);
  if (!outSlot) {
    throw new Error(
      `CraftingLogic: output '${recipe.getOutputTemplate()}' is not Bulkable`,
    );
  }
  const material = await StuffApi.singleton<Material>(recipe.getOutputMaterial());
  const totalL = matched.reduce((sum, m) => sum + m.measureL, 0);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(totalL, 'L'));
}

/**
 * Domain seam #2 — consume the inputs (conservation). The **only** bulk-
 * specific consume step: debit each matched bottle slot by exactly its
 * measure (strict). Globs/items add sibling `consumeGlobInputs` /
 * `consumeItemInputs`. A short debit is a programmatic conservation breach →
 * throw (feasibility was already checked).
 */
function consumeBulkInputs(matched: MatchedInput[]): void {
  for (const m of matched) {
    const result = BulkableApi.transfer(m.slot, null, {
      kind: 'measure',
      litres: m.measureL,
      mode: 'strict',
    });
    if (Math.abs(result.applied - m.measureL) > EPS) {
      throw new Error(
        `CraftingLogic: conservation breach — debited ${result.applied} ` +
          `of ${m.measureL} L`,
      );
    }
  }
}

/**
 * Reverse-match a manual-build buffer to a recipe: a recipe is satisfied
 * when each of its input slots is covered by a **distinct** contribution
 * (same category, measure at/above the slot, grade at/above the floor)
 * AND no contribution is left over — a faithful build is exactly the
 * recipe, not a superset. Returns the first satisfied recipe, or null
 * (an off-spec build → the generic mint). The knowledge/deed gate (P9)
 * rides on top of this match.
 */
function matchBuild(
  recipes: readonly Recipe[],
  contributions: readonly BuildContribution[],
): Recipe | null {
  for (const recipe of recipes) {
    const slots = recipe.getInputSlots();
    if (slots.length !== contributions.length) continue; // no leftovers/shortfall
    const used = new Set<number>();
    let allCovered = true;
    for (const slot of slots) {
      const minGrade = Grade.of(slot.minGrade);
      let found = -1;
      for (let i = 0; i < contributions.length; i++) {
        if (used.has(i)) continue;
        const c = contributions[i]!;
        if (
          c.category === slot.category &&
          c.measureL >= slot.measureL - EPS &&
          Grade.of(c.gradeBand).compareTo(minGrade) >= 0
        ) {
          found = i;
          break;
        }
      }
      if (found < 0) {
        allCovered = false;
        break;
      }
      used.add(found);
    }
    if (allCovered) return recipe;
  }
  return null;
}

/**
 * Mint a drink from a completed manual build. See
 * {@link CraftingApi.mintFromBuild}. Reuses the craft quality model —
 * weakest-link `Grade`, the `applyBulkOutput` fill shape, and
 * `CraftedMixin.stamp` — but draws its inputs from the already-debited
 * build buffer (no re-consume) and fills the player's destination glass
 * rather than cloning a fresh output.
 */
async function mintFromBuildImpl(req: BuildMintRequest): Promise<CraftOutcome> {
  const glass = req.glass;
  if (req.contributions.length === 0) {
    return { ok: false, reason: 'insufficient-input', detail: 'empty-build' };
  }
  if (!MixinApi.isBulkable(glass)) {
    return { ok: false, reason: 'no-output', detail: 'glass-not-bulkable' };
  }
  if (!MixinApi.isCrafted(glass)) {
    return { ok: false, reason: 'no-output', detail: 'glass-not-crafted' };
  }
  const outSlot = BulkableApi.slotFor(glass, undefined);
  if (!outSlot) {
    return { ok: false, reason: 'no-output', detail: 'glass-no-slot' };
  }

  const catalogue = await requireCatalogue();
  const recipe = matchBuild(catalogue.allRecipes(), req.contributions);

  // Weakest-link grade over the buffer, floored at a matched recipe's base.
  let grade = Grade.deriveAtFixedControl(
    req.contributions.map((c) => Grade.of(c.gradeBand)),
  );
  let outputMaterialPath = GENERIC_MIXED_MATERIAL;
  let recipeId = '';
  if (recipe) {
    const base = recipe.getBaseGrade();
    if (base) grade = grade.max(base);
    outputMaterialPath = recipe.getOutputMaterial();
    recipeId = recipe.getRecipeId();
  }

  // Fill the glass (conservation: Σ buffer measures → glass volume).
  const material = await StuffApi.singleton<Material>(outputMaterialPath);
  const totalL = req.contributions.reduce((sum, c) => sum + c.measureL, 0);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(totalL, 'L'));

  // Stamp the maker's mark. Prefer a live acting author (completed-sync /
  // tests); fall back to the dispatch-captured `makerPath` for the normal
  // engaged-completion case, where the command frame is already gone.
  // Both are context-derived, never a wire value.
  const liveMaker = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
  const makerPath = liveMaker?.getTemplatePath() ?? req.makerPath ?? '';
  glass.stamp({
    maker: makerPath,
    grade,
    recipe: recipeId,
    craftedAt: WorldClockApi.getNow().rawValue(),
  });

  return { ok: true, output: glass, grade, recipeId };
}

/** The craft-resolve algorithm. See {@link CraftingApi.craft}. */
async function craftImpl(req: CraftRequest): Promise<CraftOutcome> {
  const catalogue = await requireCatalogue();
  const recipe =
    catalogue.findByKeyword(req.recipeRef) ?? catalogue.getRecipe(req.recipeRef);
  if (!recipe) return { ok: false, reason: 'no-recipe', detail: req.recipeRef };

  const maker = resolveMaker(req.makerMode);
  if (!maker) return { ok: false, reason: 'no-maker' };
  if (!MixinApi.isContainable(maker)) return { ok: false, reason: 'no-maker' };
  const location = ContainmentApi.getContainer(maker);
  if (!location) {
    return { ok: false, reason: 'insufficient-input', detail: 'no-location' };
  }

  const { bottles, tools } = await gatherMatter(location);

  // Match input slots (per-bottle no-double-claim).
  const claimed = new Map<Stuff, number>();
  const matched: MatchedInput[] = [];
  const grades: Grade[] = [];
  for (const inSlot of recipe.getInputSlots()) {
    const cand = pickCandidate(inSlot, bottles, claimed, req.brand);
    if (!cand) {
      return { ok: false, reason: 'insufficient-input', detail: inSlot.category };
    }
    claimed.set(cand.stuff, (claimed.get(cand.stuff) ?? 0) + inSlot.measureL);
    matched.push({ slot: cand.slot, measureL: inSlot.measureL });
    grades.push(cand.grade);
  }

  // Match required tools by capability.
  const usedTools: (Stuff & Tooled)[] = [];
  for (const cap of recipe.getToolCapabilities()) {
    const tool = tools.find((t) => t.hasCapability(cap));
    if (!tool) return { ok: false, reason: 'missing-tool', detail: cap };
    if (!usedTools.includes(tool)) usedTools.push(tool);
  }

  // Derive grade (weakest-link, floored at the recipe base if any).
  let grade = Grade.deriveAtFixedControl(grades);
  const base = recipe.getBaseGrade();
  if (base) grade = grade.max(base);

  // Clone the output form, apply its properties, stamp, consume, wear.
  const output = await StuffApi.clone<Stuff>(recipe.getOutputTemplate());
  await applyBulkOutput(output, recipe, matched);

  if (!MixinApi.isCrafted(output)) {
    throw new Error(
      `CraftingLogic: output '${recipe.getOutputTemplate()}' does not ` +
        `compose CraftedMixin`,
    );
  }
  output.stamp({
    maker: maker.getTemplatePath() ?? '',
    grade,
    recipe: recipe.getRecipeId(),
    craftedAt: WorldClockApi.getNow().rawValue(),
  });

  consumeBulkInputs(matched);
  for (const t of usedTools) t.wear();

  return { ok: true, output, grade, recipeId: recipe.getRecipeId() };
}

async function lookupImpl(ref: string): Promise<RecipeView | null> {
  const catalogue = await requireCatalogue();
  const recipe = catalogue.findByKeyword(ref) ?? catalogue.getRecipe(ref);
  return recipe ? toView(recipe) : null;
}

async function offeredImpl(menu: Stuff): Promise<RecipeView[]> {
  const catalogue = await requireCatalogue();
  const m = menu as unknown as {
    getOfferedRecipeIds?: () => readonly string[];
  };
  const ids =
    typeof m.getOfferedRecipeIds === 'function' ? m.getOfferedRecipeIds() : [];
  const out: RecipeView[] = [];
  for (const id of ids) {
    const recipe = catalogue.getRecipe(id);
    if (recipe) out.push(toView(recipe));
  }
  return out;
}

/**
 * CraftingLogic — the hot-reloadable logic singleton behind
 * {@link CraftingApi}.
 *
 * Lives at `/obj/api/crafting` (a stateless `Stuff` singleton, no backing
 * `Template`); `CraftingApi`'s statics forward here via
 * `StuffApi.singletonSync`. All craft-resolve logic lives in module-private
 * functions (the `RegardLogic` precedent), so there are no intra-singleton
 * `this.x()` calls to trip the gate. Each public method carries the
 * `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class CraftingLogic extends Idea {
  /** See {@link CraftingApi.craft}. */
  @CallSecurity(CraftingApiCallers)
  public async craft(request: CraftRequest): Promise<CraftOutcome> {
    return craftImpl(request);
  }

  /** See {@link CraftingApi.mintFromBuild}. */
  @CallSecurity(CraftingApiCallers)
  public async mintFromBuild(request: BuildMintRequest): Promise<CraftOutcome> {
    return mintFromBuildImpl(request);
  }

  /** See {@link CraftingApi.lookupRecipe}. */
  @CallSecurity(CraftingApiCallers)
  public async lookupRecipe(ref: string): Promise<RecipeView | null> {
    return lookupImpl(ref);
  }

  /** See {@link CraftingApi.offeredRecipes}. */
  @CallSecurity(CraftingApiCallers)
  public async offeredRecipes(menu: Stuff): Promise<RecipeView[]> {
    return offeredImpl(menu);
  }
}
