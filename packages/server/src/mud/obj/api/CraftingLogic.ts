// CraftingLogic — the hot-reloadable logic singleton behind CraftingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BulkableApi } from '../../api/bulk';
import { ThermalApi } from '../../api/thermal';
import { AdvancementApi } from '../../api/advancement';
import { ExecutionContextApi } from '../../api/execution-context';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { Grade } from '../../lib/craft/Grade';
import { RecipeKnowledge } from '../../lib/script/RecipeKnowledge';
import {
  DIFFICULTIES,
  type Difficulty,
} from '../../lib/advancement/ActSignature';
import type Material from '../../lib/material/Material';
import { Recipe, type RecipeInputSlot } from '../../lib/craft/Recipe';
import type RecipeCatalogue from '../RecipeCatalogue';
import type { BulkSlot, BulkPayload } from '../../lib/bulk/Bulkable';
import type { Tooled } from '../../lib/craft/Tooled';
import type {
  CraftRequest,
  CraftOutcome,
  RecipeView,
  MakerMode,
  BuildMintRequest,
  RepairRequest,
  RepairOutcome,
  SalvageRequest,
  SalvageOutcome,
} from '../../api/crafting';
import { MaterialApi } from '../../api/material';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import Scrap from '../Scrap';
import CommerceMenu from '../../lib/commerce/Menu';
import type { BuildContribution } from '../../lib/craft/ManualBuild';

const CraftingApiCallers = SecurityPolicies.FromModule('/api/crafting#CraftingApi',
);

const CATALOGUE_PATH = '/obj/RecipeCatalogue';
const EPS = 1e-9;

/** The generic substance an off-spec (recipe-unmatched) build mints. */
const GENERIC_MIXED_MATERIAL = '/obj/material/cocktail/mixed';

/** The generic substance every derived cooked blend points at. */
const GENERIC_COOKED_MATERIAL = '/obj/material/food/cooked';

/** The portion an off-spec cooked fill lands in the dish (L). */
const GENERIC_COOKED_PORTION_L = 0.3;

/** The template an off-spec workpiece mint clones (a re-meltable lump). */
const WORKED_LUMP_TEMPLATE = '/obj/Casting';

/** The template salvage's non-metal yields clone (the fungible stack). */
const SCRAP_TEMPLATE = '/obj/Scrap';

/** Below this recovered mass (kg) a salvage constituent is dust (lost). */
const SALVAGE_DUST_FLOOR_KG = 0.01;

/** Numeric AppSetting read, falling back to the seeded literal (the
 * `Combustible` dial pattern — pre-warm / test safe). */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

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
  /** The drawn substance (feeds the derived blend payload). */
  material: Material | null;
}

/** A reachable discrete/glob item input candidate. */
interface ItemCandidate {
  stuff: Stuff;
  material: Material;
  /** Graded band, or the `fair` fallback for ungraded stock (an Ingot). */
  grade: Grade;
  /** Glob stack size; 1 for a plain discrete Tangible. */
  quantity: number;
}

/** A matched item input: the source Stuff + units to consume from it. */
interface MatchedItemInput {
  stuff: Stuff;
  count: number;
  /** True ⇒ quantity debit (glob); false ⇒ destruct the whole Tangible. */
  glob: boolean;
  /** The source's grade (joins the weakest-link derivation). */
  grade: Grade;
  /** The source's Material (flows onto a tangible output's primary). */
  material: Material;
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
  const loc = giver.getContainer();
  if (!loc || !MixinApi.isContainer(loc)) return null;
  for (const c of loc.getContents()) {
    if (c !== giver && MixinApi.isMaker(c)) return c;
  }
  return null;
}

/** The gather walk's yield: bulk bottles, tools, and discrete/glob items. */
interface GatheredMatter {
  bottles: BottleCandidate[];
  tools: (Stuff & Tooled)[];
  items: ItemCandidate[];
}

/**
 * Whether `c` qualifies as a discrete/glob item-input candidate: a
 * Material-bearing Tangible that is raw *matter*, not capital or a made
 * form — not a tool (the anvil never feeds the forge), not crafted gear,
 * not a graded bottle (those are bulk candidates), not a container (the
 * pantry chest is reached *into*, never consumed), and not something
 * living.
 */
function isItemCandidate(c: Stuff): boolean {
  return (
    MixinApi.isTangible(c) &&
    c.getMaterial() !== null &&
    !MixinApi.isTool(c) &&
    !MixinApi.isCrafted(c) &&
    !MixinApi.isContainer(c) &&
    !MixinApi.isBulkable(c) &&
    !MixinApi.isOrganism(c) &&
    !MixinApi.isMaker(c)
  );
}

/** Sort/partition one reachable Stuff into the gathered pools. */
async function collectCandidate(c: Stuff, into: GatheredMatter): Promise<void> {
  if (MixinApi.isTool(c)) into.tools.push(c);
  if (MixinApi.isBulkable(c) && MixinApi.isGraded(c)) {
    const slot = BulkableApi.slotFor(c, undefined);
    if (slot) {
      const mpath = slot.getMaterialPath();
      const material = mpath ? await StuffApi.singleton<Material>(mpath) : null;
      into.bottles.push({ stuff: c, slot, material, grade: c.getGrade() });
      return;
    }
  }
  if (isItemCandidate(c) && MixinApi.isTangible(c)) {
    const material = c.getMaterial();
    if (!material) return;
    into.items.push({
      stuff: c,
      material,
      // An ungraded item (an Ingot) derives at `fair` — the
      // deriveAtFixedControl fallback made explicit per candidate.
      grade: MixinApi.isGraded(c) ? c.getGrade() : Grade.of('fair'),
      quantity: MixinApi.isGlobbable(c) ? c.getQuantity() : 1,
    });
  }
}

/**
 * Gather the reachable inputs + tools: the room's direct contents (items
 * resting on a surface already have `container = the room`), the maker's
 * own inventory, and one-level descent into **open** containers in the
 * room. A Sealable-closed (or locked) container never feeds a craft —
 * open-ness is the switch; a non-Sealable room container counts as
 * always-open. Containers carried *by other agents* are never descended
 * into (the maker's own inventory is the only carried rung).
 *
 * Each bottle's bulk Material is **ensure-loaded** via `StuffApi.singleton`
 * (not the sync `slot.getMaterial()`): a Material singleton is created
 * lazily on first reference, and crafting is the first live in-room bulk-
 * material consumer, so the registry may not hold it yet. Loading it here
 * also makes the later sync reads (the drinker's `drink`) resolve.
 */
async function gatherMatter(
  location: Stuff,
  maker: Stuff,
): Promise<GatheredMatter> {
  const gathered: GatheredMatter = { bottles: [], tools: [], items: [] };
  if (!MixinApi.isContainer(location)) return gathered;
  for (const c of location.getContents()) {
    if (c === maker) continue;
    await collectCandidate(c, gathered);
    // Open-container descent (one level). Skip agents (a maker NPC's or
    // bystander's inventory is theirs) — only inanimate room containers.
    if (
      MixinApi.isContainer(c) &&
      !MixinApi.isOrganism(c) &&
      !MixinApi.isMaker(c) &&
      (!MixinApi.isSealable(c) || c.isOpen())
    ) {
      for (const inner of c.getContents()) {
        await collectCandidate(inner, gathered);
      }
    }
  }
  // The maker's own inventory — held kit and carried stock are reachable.
  if (MixinApi.isContainer(maker)) {
    for (const c of maker.getContents()) {
      await collectCandidate(c, gathered);
    }
  }
  return gathered;
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
  const need = inSlot.measureL ?? 0;
  const eligible = bottles.filter(
    (b) =>
      b.material !== null &&
      b.material.hasTag(inSlot.category) &&
      b.grade.compareTo(minGrade) >= 0 &&
      b.slot.available() - (claimed.get(b.stuff) ?? 0) >= need - EPS,
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
 * Pick the item inputs for one discrete/glob slot: category tag on the
 * Material + min grade (ungraded stock counts `fair`) + enough un-claimed
 * units across the reachable candidates. Honors a `with <brand>`
 * preference, then highest grade; greedy across sources until the slot's
 * `count` is covered (a glob covers many units, a discrete Tangible one).
 * `claimedUnits` tracks per-source draw so two slots never double-claim.
 * Returns the matched draws, or null when the slot cannot be covered.
 */
function pickItemInputs(
  inSlot: RecipeInputSlot,
  items: ItemCandidate[],
  claimedUnits: Map<Stuff, number>,
  brand: string | undefined,
): MatchedItemInput[] | null {
  const minGrade = Grade.of(inSlot.minGrade);
  const need = inSlot.count ?? 1;
  const eligible = items.filter(
    (i) =>
      i.material.hasTag(inSlot.category) &&
      i.grade.compareTo(minGrade) >= 0 &&
      i.quantity - (claimedUnits.get(i.stuff) ?? 0) > 0,
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
  const picked: MatchedItemInput[] = [];
  let remaining = need;
  for (const cand of eligible) {
    if (remaining <= 0) break;
    const avail = cand.quantity - (claimedUnits.get(cand.stuff) ?? 0);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    claimedUnits.set(cand.stuff, (claimedUnits.get(cand.stuff) ?? 0) + take);
    picked.push({
      stuff: cand.stuff,
      count: take,
      glob: MixinApi.isGlobbable(cand.stuff),
      grade: cand.grade,
      material: cand.material,
    });
    remaining -= take;
  }
  return remaining <= 0 ? picked : null;
}

/**
 * Derive a blend's {@link BulkPayload} from its consumed inputs —
 * **macros in = macros out** (the fixed-vocabulary rule's engine): union
 * the parts' nutrient routing tags, sum their per-serving label amounts
 * and toxin doses (each consumed slot/unit is one serving — exactly the
 * arithmetic the retired hand-authored cocktail rows encoded: a martini
 * was gin 19 + vermouth 7 = 26 mg of alcohol). Identity (name /
 * appearance / keywords) comes from the matched recipe — inherently
 * per-dish content that lives on the Recipe, never a Material row — or
 * from the generic blend material for an off-spec build.
 */
function deriveBlendPayload(
  name: string,
  appearance: string,
  keywords: readonly string[],
  parts: { material: Material; servings: number }[],
): BulkPayload {
  const nutrients = new Set<string>();
  const nutrientAmounts: Record<string, number> = {};
  const toxins = new Map<string, number>();
  let edible = false;
  for (const part of parts) {
    if (part.material.getEdibility() === true) edible = true;
    for (const tag of part.material.getNutrients()) nutrients.add(tag);
    const amounts = part.material.getNutrientAmounts();
    for (const [tag, mg] of Object.entries(amounts)) {
      nutrientAmounts[tag] = (nutrientAmounts[tag] ?? 0) + mg * part.servings;
    }
    for (const tox of part.material.getToxicity()) {
      if (tox.amount <= 0) continue;
      toxins.set(
        tox.type,
        (toxins.get(tox.type) ?? 0) + tox.amount * part.servings,
      );
    }
  }
  const payload: BulkPayload = {
    name,
    nutrients: [...nutrients],
    nutrientAmounts,
    toxicity: [...toxins].map(([type, amount]) => ({ type, amount })),
    edible,
  };
  if (appearance) payload.appearance = appearance;
  if (keywords.length > 0) payload.keywords = [...keywords];
  return payload;
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
  const totalL = matched.reduce((sum, m) => sum + m.measureL, 0);
  const authored = recipe.getOutputMaterial();
  if (authored) {
    // The authored-substance override (a recipe may still name its
    // blend; the shipped roster derives).
    const material = await StuffApi.singleton<Material>(authored);
    outSlot.setMaterial(material);
    outSlot.setAmount(Quantity.of(totalL, 'L'));
    return;
  }
  // The derived default: the generic blend base + a payload computed
  // from the drawn inputs (each slot's draw = one serving).
  const material = await StuffApi.singleton<Material>(GENERIC_MIXED_MATERIAL);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(totalL, 'L'));
  outSlot.setPayload(
    deriveBlendPayload(
      recipe.getName(),
      recipe.getOutputAppearance(),
      recipe.getKeywords(),
      matched.flatMap((m) =>
        m.material ? [{ material: m.material, servings: 1 }] : [],
      ),
    ),
  );
}

/**
 * Domain seam — apply a **tangible** output (smithing's transform): flow
 * the *primary* matched item input's Material + the summed consumed mass
 * onto the cloned output (the `ThermalLogic` casting-stamp surface).
 * Mass-conserving: the output weighs what the consumed matter weighed.
 */
function applyTangibleOutput(
  output: Stuff,
  recipe: Recipe,
  matchedItems: MatchedItemInput[],
): void {
  const primary = matchedItems[0];
  if (!primary) {
    throw new Error(
      `CraftingLogic: tangible output '${recipe.getOutputTemplate()}' ` +
        `resolved with no matched item input`,
    );
  }
  if (!MixinApi.isTangible(output)) {
    throw new Error(
      `CraftingLogic: output '${recipe.getOutputTemplate()}' is not Tangible`,
    );
  }
  let totalKg = 0;
  for (const m of matchedItems) {
    if (!MixinApi.isTangible(m.stuff)) continue;
    const unitKg = m.stuff.getMass().rawValue();
    // A glob's mass is per-unit (the stack is `quantity` instances).
    totalKg += m.glob ? unitKg * m.count : unitKg;
  }
  output.setMaterial(primary.material);
  if (totalKg > 0) output.setMass(Quantity.of(totalKg, 'kg'));
}

/**
 * Domain seam — apply an **edible** output (cooking's plated dish): fill
 * the output's bulk slot with the recipe's authored food Material at the
 * authored portion. The material must be edible — a recipe authoring an
 * inedible `outputMaterial` under `outputApplication: edible` is a content
 * bug, caught loudly.
 */
async function applyEdibleOutput(
  output: Stuff,
  recipe: Recipe,
  matchedItems: MatchedItemInput[],
): Promise<void> {
  const outSlot = BulkableApi.slotFor(output, undefined);
  if (!outSlot) {
    throw new Error(
      `CraftingLogic: edible output '${recipe.getOutputTemplate()}' is not ` +
        `Bulkable`,
    );
  }
  const authored = recipe.getOutputMaterial();
  if (authored) {
    const material = await StuffApi.singleton<Material>(authored);
    if (!material.getEdibility()) {
      throw new Error(
        `CraftingLogic: edible output material '${authored}' is not edible`,
      );
    }
    outSlot.setMaterial(material);
    outSlot.setAmount(Quantity.of(recipe.getOutputPortionL(), 'L'));
    return;
  }
  // The derived default: the generic cooked base + macros summed from
  // the consumed units (macros in = macros out).
  const material = await StuffApi.singleton<Material>(GENERIC_COOKED_MATERIAL);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(recipe.getOutputPortionL(), 'L'));
  outSlot.setPayload(
    deriveBlendPayload(
      recipe.getName(),
      recipe.getOutputAppearance(),
      recipe.getKeywords(),
      matchedItems.map((m) => ({ material: m.material, servings: m.count })),
    ),
  );
}

/**
 * Domain seam — consume the matched **item** inputs (conservation), the
 * discrete sibling of {@link consumeBulkInputs}: a glob is debited by
 * exactly the matched units (destructed when fully drawn); a discrete
 * Tangible is destructed whole — its chattel id released by the shipped
 * `onDestruct` path. Mismatches are programmatic conservation breaches →
 * throw (feasibility was already checked).
 */
function consumeItemInputs(matched: MatchedItemInput[]): void {
  for (const m of matched) {
    if (m.glob) {
      if (!MixinApi.isGlobbable(m.stuff)) {
        throw new Error(
          'CraftingLogic: conservation breach — a glob input lost its stack',
        );
      }
      const q = m.stuff.getQuantity();
      if (q < m.count) {
        throw new Error(
          `CraftingLogic: conservation breach — debiting ${m.count} of ` +
            `${q} units`,
        );
      }
      if (q === m.count) StuffApi.destruct(m.stuff);
      else m.stuff.setQuantity(q - m.count);
    } else {
      if (m.count !== 1) {
        throw new Error(
          `CraftingLogic: conservation breach — a discrete input is ` +
            `consumed whole (count ${m.count})`,
        );
      }
      StuffApi.destruct(m.stuff);
    }
  }
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
 * when its heat gate is at/under the build's latched heat, each **bulk**
 * slot is covered by a distinct bulk contribution (same category, measure
 * at/above the slot, grade at/above the floor), each **item** slot's
 * count is covered by item contributions (category by the same tag rule
 * `craftImpl` matches with, grade at/above the floor), AND no
 * contribution is left over — a faithful build is exactly the recipe,
 * not a superset. When several recipes are satisfied by the same buffer
 * (the smithing ladder: poker and knife are both one ferrous item —
 * only their heat gates differ), **the work determines the form**: the
 * most heat-demanding satisfied recipe wins (you worked it at knife
 * heat, you drew a knife; ease off the bellows to make the poker).
 * Ties fall to catalogue order. Returns null for an off-spec build
 * (→ the generic mint). The knowledge/deed gate rides on top.
 */
function matchBuild(
  recipes: readonly Recipe[],
  contributions: readonly BuildContribution[],
  heatedToK = 0,
): Recipe | null {
  let best: Recipe | null = null;
  for (const recipe of recipes) {
    if (recipe.getRequiresHeatK() > heatedToK) continue; // never worked hot enough
    if (!buildSatisfies(recipe, contributions)) continue;
    if (!best || recipe.getRequiresHeatK() > best.getRequiresHeatK()) {
      best = recipe;
    }
  }
  return best;
}

/** Whether `contributions` exactly cover `recipe`'s slots (no leftovers). */
function buildSatisfies(
  recipe: Recipe,
  contributions: readonly BuildContribution[],
): boolean {
  const used = new Set<number>();
  for (const slot of recipe.getInputSlots()) {
    const minGrade = Grade.of(slot.minGrade);
    if (Recipe.isItemSlot(slot)) {
      let need = slot.count ?? 1;
      for (let i = 0; i < contributions.length && need > 0; i++) {
        if (used.has(i)) continue;
        const c = contributions[i]!;
        if (c.kind !== 'item') continue;
        if (
          c.category !== slot.category &&
          !(c.tags ?? []).includes(slot.category)
        ) {
          continue;
        }
        if (Grade.of(c.gradeBand).compareTo(minGrade) < 0) continue;
        used.add(i);
        need -= c.count ?? 1;
      }
      if (need > 0) return false;
    } else {
      let found = -1;
      for (let i = 0; i < contributions.length; i++) {
        if (used.has(i)) continue;
        const c = contributions[i]!;
        if ((c.kind ?? 'bulk') !== 'bulk') continue;
        if (
          c.category === slot.category &&
          c.measureL >= (slot.measureL ?? 0) - EPS &&
          Grade.of(c.gradeBand).compareTo(minGrade) >= 0
        ) {
          found = i;
          break;
        }
      }
      if (found < 0) return false;
      used.add(found);
    }
  }
  return used.size === contributions.length; // a faithful build, exactly
}

/**
 * The evidence tail of a successful, recipe-matched craft-resolve
 * (DECISION J) — one place for both `craftImpl` and `mintFromBuildImpl`:
 *
 *  1. **Advancement**: append a Transcript deed against the recipe's
 *     authored `discipline` at its authored `difficulty` (default
 *     `easy`). A recipe authoring NO discipline records nothing — the
 *     bar's rows stay unrecorded exactly as today.
 *  2. **Watch = claim**: every *other* present command-giving agent in
 *     the maker's location with a durable identity gains the known-of
 *     claim (idempotent) — watching a maker demonstrate teaches you *of*
 *     the recipe; your own first execution is always the deed.
 */
async function recordCraftEvidence(
  maker: Stuff | null,
  recipe: Recipe,
): Promise<void> {
  const discipline = recipe.getDiscipline();
  if (!discipline || !maker) return;
  const difficulty: Difficulty = (DIFFICULTIES as readonly string[]).includes(
    recipe.getDifficulty(),
  )
    ? (recipe.getDifficulty() as Difficulty)
    : 'easy';
  await AdvancementApi.recordDeed(maker, {
    discipline,
    difficulty,
    outcome: 'success',
  });
  if (!MixinApi.isContainable(maker)) return;
  const location = maker.getContainer();
  if (!location || !MixinApi.isContainer(location)) return;
  for (const witness of location.getContents()) {
    if (witness === maker) continue;
    if (!MixinApi.isCommandGiver(witness)) continue;
    if (!witness.getTemplatePath()) continue;
    await RecipeKnowledge.noteKnown(
      witness,
      recipe.getRecipeId(),
      recipe.getName(),
    );
  }
}

/**
 * Mint from a completed manual build. See
 * {@link CraftingApi.mintFromBuild}. Reuses the craft quality model —
 * weakest-link `Grade`, the output seams' apply shapes, and
 * `CraftedMixin.stamp` — but draws its inputs from the already-banked
 * build buffer (no re-consume). Dispatches on the request: a `workpiece`
 * mints the tangible path (clone the matched recipe's output / the
 * generic worked lump, consuming the workpiece); a `vessel` is
 * filled (the bar's drink, a matched recipe's edible portion, or the
 * generic pot-luck for an off-spec item build).
 */
async function mintFromBuildImpl(req: BuildMintRequest): Promise<CraftOutcome> {
  if (req.contributions.length === 0) {
    return { ok: false, reason: 'insufficient-input', detail: 'empty-build' };
  }
  const catalogue = await requireCatalogue();
  const recipe = matchBuild(
    catalogue.allRecipes(),
    req.contributions,
    req.heatedToK ?? 0,
  );

  // Weakest-link grade over the buffer, floored at a matched recipe's base.
  let grade = Grade.deriveAtFixedControl(
    req.contributions.map((c) => Grade.of(c.gradeBand)),
  );
  if (recipe) {
    const base = recipe.getBaseGrade();
    if (base) grade = grade.max(base);
  }

  // Resolve the maker. Prefer a live acting author (completed-sync /
  // tests); fall back to the dispatch-captured `makerPath` for the normal
  // engaged-completion case, where the command frame is already gone.
  // Both are context-derived, never a wire value.
  const liveMaker = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
  const makerPath = liveMaker?.getTemplatePath() ?? req.makerPath ?? '';
  const makerStuff =
    liveMaker ??
    (makerPath ? (StuffApi.findByTemplatePath<Stuff>(makerPath) ?? null) : null);

  if (req.workpiece) {
    return mintWorkpiece(req.workpiece, recipe, grade, makerPath, makerStuff);
  }
  return mintVessel(req, recipe, grade, makerPath, makerStuff);
}

/**
 * Fold the control floor: skill embedded in the capital raises the
 * floor — the outcome grade never lands below a used control-bearing
 * instrument's band (and never lowers; `max` only). The ceiling stays
 * the skill seam's business.
 */
function applyControlFloor(
  grade: Grade,
  tools: readonly (Stuff & Tooled)[],
  kinds: readonly string[],
): Grade {
  let out = grade;
  for (const tool of tools) {
    for (const kind of kinds) {
      if (!tool.hasCapability(kind)) continue;
      const band = tool.capabilityControl(kind);
      if (band && Grade.isBand(band)) out = out.max(Grade.of(band));
    }
  }
  return out;
}

/**
 * The maker's reachable tools (held + the room — the two-leg walk the
 * step controllers use), for the workpiece mint's control resolve; the
 * mint runs at engaged-completion, so no request field carries this
 * (a context-derivable fact never rides the wire).
 */
function reachableTools(maker: Stuff | null): (Stuff & Tooled)[] {
  if (!maker) return [];
  const candidates: Stuff[] = [];
  if (MixinApi.isContainer(maker)) candidates.push(...maker.getContents());
  if (MixinApi.isContainable(maker)) {
    const loc = maker.getContainer();
    if (loc && MixinApi.isContainer(loc)) candidates.push(...loc.getContents());
  }
  return candidates.filter((c): c is Stuff & Tooled => MixinApi.isTool(c));
}

/** The smithing terminal mint: the workpiece's matter becomes the form. */
async function mintWorkpiece(
  workpiece: Stuff,
  recipe: Recipe | null,
  grade: Grade,
  makerPath: string,
  makerStuff: Stuff | null,
): Promise<CraftOutcome> {
  if (!MixinApi.isTangible(workpiece)) {
    return {
      ok: false,
      reason: 'insufficient-input',
      detail: 'workpiece-not-tangible',
    };
  }
  // The anvil is the minting verb's conferring kind — a control-bearing
  // one floors the stamped grade (a masterwork anvil never lets sloppy
  // stock leave below its band).
  grade = applyControlFloor(grade, reachableTools(makerStuff), ['anvil']);
  const material = workpiece.getMaterial();
  const massKg = workpiece.getMass().rawValue();

  if (recipe && recipe.getOutputApplication() === 'tangible') {
    const output = await StuffApi.clone<Stuff>(recipe.getOutputTemplate());
    if (!MixinApi.isTangible(output)) {
      throw new Error(
        `CraftingLogic: output '${recipe.getOutputTemplate()}' is not Tangible`,
      );
    }
    if (material) output.setMaterial(material);
    if (massKg > 0) output.setMass(Quantity.of(massKg, 'kg'));
    if (!MixinApi.isCrafted(output)) {
      throw new Error(
        `CraftingLogic: output '${recipe.getOutputTemplate()}' does not ` +
          `compose CraftedMixin`,
      );
    }
    output.stamp({
      maker: makerPath,
      grade,
      recipe: recipe.getRecipeId(),
      craftedAt: WorldClockApi.getNow().rawValue(),
    });
    StuffApi.destruct(workpiece);
    await recordCraftEvidence(makerStuff, recipe);
    return { ok: true, output, grade, recipeId: recipe.getRecipeId() };
  }

  // The generic worked lump (an off-spec build still yields *a* thing):
  // a re-meltable Casting stamped with the workpiece's material + mass —
  // the ThermalLogic freeze-stamp surface. No recipe, no mark.
  const lump = await StuffApi.clone<Stuff>(WORKED_LUMP_TEMPLATE);
  const l = lump as unknown as Stuff & {
    setShortDescription(s: string): void;
    setMaterial(m: Material): void;
    setMass(q: Quantity<'kg'>): void;
  };
  l.setShortDescription(
    `a worked lump of ${material?.getName() ?? 'metal'}`,
  );
  if (material) l.setMaterial(material);
  if (massKg > 0) l.setMass(Quantity.of(massKg, 'kg'));
  StuffApi.destruct(workpiece);
  return { ok: true, output: lump, grade, recipeId: '' };
}

/** The vessel terminal mint: fill the destination glass/dish + stamp. */
async function mintVessel(
  req: BuildMintRequest,
  recipe: Recipe | null,
  grade: Grade,
  makerPath: string,
  makerStuff: Stuff | null,
): Promise<CraftOutcome> {
  const vessel = req.vessel;
  if (!vessel) {
    return { ok: false, reason: 'no-output', detail: 'no-destination' };
  }
  if (!MixinApi.isBulkable(vessel)) {
    return { ok: false, reason: 'no-output', detail: 'vessel-not-bulkable' };
  }
  if (!MixinApi.isCrafted(vessel)) {
    return { ok: false, reason: 'no-output', detail: 'vessel-not-crafted' };
  }
  const outSlot = BulkableApi.slotFor(vessel, undefined);
  if (!outSlot) {
    return { ok: false, reason: 'no-output', detail: 'vessel-no-slot' };
  }
  // The build vessel (shaker / mixing glass / pot) is the conferring
  // instrument; it doesn't ride the mint request (only its banked
  // contributions do), so resolve it from the maker's reach — the same
  // resolve the workpiece path uses for the anvil.
  grade = applyControlFloor(grade, reachableTools(makerStuff), [
    'shaker',
    'mixing-glass',
    'pot',
  ]);

  const hasItems = req.contributions.some((c) => c.kind === 'item');
  const recipeId = recipe ? recipe.getRecipeId() : '';
  // Conservation for a bulk build: Σ buffer measures → the vessel volume.
  // An edible recipe fills its authored portion; an off-spec item build
  // lands the generic cooked portion.
  let amountL = req.contributions.reduce((sum, c) => sum + c.measureL, 0);
  if (recipe && recipe.getOutputApplication() === 'edible') {
    amountL = recipe.getOutputPortionL();
  } else if (!recipe && hasItems) {
    amountL = Math.max(amountL, GENERIC_COOKED_PORTION_L);
  }
  // The blend base: an authored substance (the override channel) wins;
  // else the ONE generic per phase-kind, with the actual identity +
  // macros DERIVED onto the vessel's payload from what was banked
  // (macros in = macros out — the fixed-vocabulary rule).
  const authored = recipe?.getOutputMaterial() ?? '';
  const genericPath = hasItems
    ? GENERIC_COOKED_MATERIAL
    : GENERIC_MIXED_MATERIAL;
  const material = await StuffApi.singleton<Material>(authored || genericPath);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(amountL, 'L'));
  if (!authored) {
    const parts: { material: Material; servings: number }[] = [];
    for (const c of req.contributions) {
      if (!c.materialPath) continue;
      const m = await StuffApi.singleton<Material>(c.materialPath);
      parts.push({
        material: m,
        servings: c.kind === 'item' ? (c.count ?? 1) : 1,
      });
    }
    outSlot.setPayload(
      deriveBlendPayload(
        recipe ? recipe.getName() : material.getName(),
        recipe ? recipe.getOutputAppearance() : '',
        recipe ? recipe.getKeywords() : material.getKeywords(),
        parts,
      ),
    );
  }

  vessel.stamp({
    maker: makerPath,
    grade,
    recipe: recipeId,
    craftedAt: WorldClockApi.getNow().rawValue(),
  });

  if (recipe) await recordCraftEvidence(makerStuff, recipe);
  return { ok: true, output: vessel, grade, recipeId };
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
  const location = maker.getContainer();
  if (!location) {
    return { ok: false, reason: 'insufficient-input', detail: 'no-location' };
  }

  const { bottles, tools, items } = await gatherMatter(location, maker);

  // Match input slots (per-source no-double-claim), dispatching each slot
  // on its kind: bulk → bottle draw, item → discrete/glob units.
  const claimed = new Map<Stuff, number>();
  const claimedUnits = new Map<Stuff, number>();
  const matched: MatchedInput[] = [];
  const matchedItems: MatchedItemInput[] = [];
  const grades: Grade[] = [];
  for (const inSlot of recipe.getInputSlots()) {
    if (Recipe.isItemSlot(inSlot)) {
      const picks = pickItemInputs(inSlot, items, claimedUnits, req.brand);
      if (!picks) {
        return { ok: false, reason: 'insufficient-input', detail: inSlot.category };
      }
      matchedItems.push(...picks);
      for (const p of picks) grades.push(p.grade);
      continue;
    }
    const cand = pickCandidate(inSlot, bottles, claimed, req.brand);
    if (!cand) {
      return { ok: false, reason: 'insufficient-input', detail: inSlot.category };
    }
    const need = inSlot.measureL ?? 0;
    claimed.set(cand.stuff, (claimed.get(cand.stuff) ?? 0) + need);
    matched.push({ slot: cand.slot, measureL: need, material: cand.material });
    grades.push(cand.grade);
  }

  // Match required tools by capability.
  const usedTools: (Stuff & Tooled)[] = [];
  for (const cap of recipe.getToolCapabilities()) {
    const tool = tools.find((t) => t.hasCapability(cap));
    if (!tool) return { ok: false, reason: 'missing-tool', detail: cap };
    if (!usedTools.includes(tool)) usedTools.push(tool);
  }

  // The heat gate (the reachable-heat crafting-control seam consumed): a
  // recipe requiring heat declines when the hottest reachable furnace
  // doesn't clear it — a cold forge is a diegetic decline, not a flag.
  const requiresHeatK = recipe.getRequiresHeatK();
  if (requiresHeatK > 0 && ThermalApi.reachableHeatFor(maker) < requiresHeatK) {
    return {
      ok: false,
      reason: 'insufficient-heat',
      detail: `${requiresHeatK}`,
    };
  }

  // Derive grade (weakest-link, floored at the recipe base if any,
  // then at any used control-bearing instrument's band — skill embedded
  // in the capital raises the floor; the ceiling stays the skill seam's).
  let grade = Grade.deriveAtFixedControl(grades);
  const base = recipe.getBaseGrade();
  if (base) grade = grade.max(base);
  grade = applyControlFloor(grade, usedTools, recipe.getToolCapabilities());

  // Clone the output form, apply its properties (dispatched on the
  // recipe's output-application kind), stamp, consume, wear.
  const output = await StuffApi.clone<Stuff>(recipe.getOutputTemplate());
  const application = recipe.getOutputApplication();
  if (application === 'tangible') {
    applyTangibleOutput(output, recipe, matchedItems);
  } else if (application === 'edible') {
    await applyEdibleOutput(output, recipe, matchedItems);
  } else {
    await applyBulkOutput(output, recipe, matched);
  }

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
  consumeItemInputs(matchedItems);
  // Tools wear on use — the durable-good half (a ToolItem composes
  // DurableMixin alongside ToolMixin).
  for (const t of usedTools) if (MixinApi.isDurable(t)) t.wear();

  // The evidence tail: advancement deed + watch-=-claim for witnesses
  // (a no-op for recipes authoring no discipline — every bar row).
  await recordCraftEvidence(maker, recipe);

  return { ok: true, output, grade, recipeId: recipe.getRecipeId() };
}

/**
 * Repair (DECISION K) — the deficit-priced reverse-craft. Maker from
 * context; the deficit `1 − condition` prices the material cost
 * (`item mass × deficit × crafting.repair.costFactor`, doubled broken);
 * the domain gates by matter — `metal` wants forge-grade reachable heat,
 * soft goods a reachable `mending` tool; stock is drawn from the same
 * gather walk a craft uses (a glob debits partially; a discrete donor is
 * consumed whole only when its mass ≤ 2× the need). On success the
 * condition is restored to full — ceiling-free (gear never obsoletes, it
 * asks for care). Repair never touches keenness; `sharpen` never touches
 * condition.
 */
async function repairImpl(req: RepairRequest): Promise<RepairOutcome> {
  // The engaged repair completes outside the command frame — prefer the
  // live acting author, fall back to the dispatch-captured makerPath
  // (the BuildMintRequest.makerPath pattern).
  const maker =
    ((ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null) ??
    (req.makerPath
      ? (StuffApi.findByTemplatePath<Stuff>(req.makerPath) ?? null)
      : null);
  if (!maker || !MixinApi.isContainable(maker)) {
    return { ok: false, reason: 'no-maker' };
  }
  const location = maker.getContainer();
  if (!location) {
    return { ok: false, reason: 'insufficient-input', detail: 'no-location' };
  }
  const item = req.item;
  if (!MixinApi.isDurable(item)) {
    return { ok: false, reason: 'insufficient-input', detail: 'not-durable' };
  }
  const conditionBefore = item.getCondition();
  const deficit = 1 - conditionBefore;
  if (deficit <= EPS) {
    return {
      ok: false,
      reason: 'insufficient-input',
      detail: 'nothing-to-repair',
    };
  }
  const broken = item.isBroken();
  const material = MixinApi.isTangible(item) ? item.getMaterial() : null;
  const metal = material?.hasTag('metal') ?? false;

  const { tools, items } = await gatherMatter(location, maker);

  // The domain gate: forge heat for metal restoration, `mending` for the
  // soft goods. The whetstone is *sharpening's* tool, never repair's.
  // The domain instrument (the mender; the anvil for metal — the kinds
  // whose families confer `repair`) also carries any control floor.
  let instrument: (Stuff & Tooled) | null = null;
  if (metal) {
    const heatK = dial(AppSettingKeys.craftingRepairMetalHeatK, 900);
    if (ThermalApi.reachableHeatFor(maker) < heatK) {
      return { ok: false, reason: 'insufficient-heat', detail: `${heatK}` };
    }
    instrument = tools.find((t) => t.hasCapability('anvil')) ?? null;
  } else {
    const mender = tools.find((t) => t.hasCapability('mending'));
    if (!mender) {
      return { ok: false, reason: 'missing-tool', detail: 'mending' };
    }
    instrument = mender;
  }

  // The deficit-priced material cost.
  const massKg = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
  let needKg =
    massKg * deficit * dial(AppSettingKeys.craftingRepairCostFactor, 0.6);
  if (broken) needKg *= dial(AppSettingKeys.craftingRepairBrokenFactor, 2);

  const draws: MatchedItemInput[] = [];
  if (needKg > EPS) {
    // Same-category stock: `metal` for metal; for soft goods, anything
    // sharing a tag with the item's own matter (hide mends hide).
    const wantTags = metal ? ['metal'] : [...(material?.getTags() ?? [])];
    const donors = items.filter(
      (i) => i.stuff !== item && wantTags.some((t) => i.material.hasTag(t)),
    );
    // Globs first (partial-mass debits waste nothing).
    donors.sort((a, b) => Number(b.quantity > 1) - Number(a.quantity > 1));
    let remaining = needKg;
    for (const donor of donors) {
      if (remaining <= EPS) break;
      if (!MixinApi.isTangible(donor.stuff)) continue;
      const unitKg = donor.stuff.getMass().rawValue();
      if (unitKg <= 0) continue;
      if (MixinApi.isGlobbable(donor.stuff)) {
        const take = Math.min(donor.quantity, Math.ceil(remaining / unitKg));
        draws.push({
          stuff: donor.stuff,
          count: take,
          glob: true,
          grade: donor.grade,
          material: donor.material,
        });
        remaining -= take * unitKg;
      } else if (unitKg <= 2 * remaining) {
        // A discrete donor is sacrificed whole — only when the overshoot
        // is tolerable (≤ 2× the need); else it's not a repair, it's
        // waste.
        draws.push({
          stuff: donor.stuff,
          count: 1,
          glob: false,
          grade: donor.grade,
          material: donor.material,
        });
        remaining -= unitKg;
      }
    }
    if (remaining > EPS) {
      return {
        ok: false,
        reason: 'insufficient-input',
        detail: metal ? 'metal' : 'stock',
      };
    }
  }

  consumeItemInputs(draws);
  item.setCondition(1); // ceiling-free — the maintenance relationship
  // The control floor: work done on a control-bearing instrument never
  // comes out below its band (floor only — a masterful piece is never
  // lowered by a fine machine).
  if (instrument && MixinApi.isGraded(item)) {
    item.setGrade(
      applyControlFloor(item.getGrade(), [instrument], [
        metal ? 'anvil' : 'mending',
      ]),
    );
  }
  return { ok: true, item, conditionBefore, costKg: needKg };
}

/**
 * Salvage (DECISION L) — the one generic lossy melt-down. Flatten the
 * item's Material composition; each constituent above the dust floor
 * yields `item mass × fraction × crafting.salvageRate` in its natural
 * raw form — `metal` → a re-meltable Casting, anything else → a Scrap
 * stack (quantity by mass). The rest is dross (the entropy sink).
 * Conservation asserted (Σ output ≤ input × rate + ε, throw on breach);
 * the destruct releases provenance, grade, and the chattel id with the
 * form. Outputs are returned unplaced — landing them is the
 * controller's job.
 */
async function salvageImpl(req: SalvageRequest): Promise<SalvageOutcome> {
  const maker = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
  if (!maker) return { ok: false, reason: 'no-maker' };
  const item = req.item;
  if (!MixinApi.isTangible(item) || MixinApi.isOrganism(item)) {
    return {
      ok: false,
      reason: 'insufficient-input',
      detail: 'not-salvageable',
    };
  }
  if (MixinApi.isBuildVessel(item) && !item.isBuildEmpty()) {
    return { ok: false, reason: 'insufficient-input', detail: 'build-in-use' };
  }
  const material = item.getMaterial();
  if (!material) {
    return { ok: false, reason: 'insufficient-input', detail: 'no-material' };
  }
  const massKg = item.getMass().rawValue();
  if (massKg <= 0) {
    return { ok: false, reason: 'insufficient-input', detail: 'no-matter' };
  }
  const rate = dial(AppSettingKeys.craftingSalvageRate, 0.5);

  // The flattened constituents — a pure material is its own whole.
  const comp = MaterialApi.compositionOf(material);
  const constituents: { material: Material; fraction: number }[] = [];
  if (comp.direct.length === 0) {
    constituents.push({ material, fraction: 1 });
  } else {
    for (const entry of comp.direct) {
      const m = await StuffApi.singleton<Material>(entry.materialPath);
      constituents.push({ material: m, fraction: entry.fraction });
    }
  }

  const outputs: Stuff[] = [];
  let recoveredKg = 0;
  for (const c of constituents) {
    const yieldKg = massKg * c.fraction * rate;
    if (yieldKg < SALVAGE_DUST_FLOOR_KG) continue; // dust — lost
    if (c.material.hasTag('metal')) {
      const cast = await StuffApi.clone<Stuff>(WORKED_LUMP_TEMPLATE);
      const lump = cast as unknown as Stuff & {
        setShortDescription(s: string): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
      };
      lump.setShortDescription(`a salvaged lump of ${c.material.getName()}`);
      lump.setMaterial(c.material);
      lump.setMass(Quantity.of(yieldKg, 'kg'));
      outputs.push(cast);
      recoveredKg += yieldKg;
    } else {
      // Scrap: quantity by mass, floor-rounded to whole units (rounding
      // up would counterfeit matter).
      const units = Math.floor(yieldKg / Scrap.UNIT_KG);
      if (units < 1) continue; // sub-unit — dust
      const scrap = await StuffApi.clone<Stuff>(SCRAP_TEMPLATE);
      const s = scrap as unknown as Stuff & {
        setShortDescription(s: string): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
        setQuantity(n: number): void;
      };
      s.setShortDescription(`a heap of ${c.material.getName()} scrap`);
      s.setMaterial(c.material);
      s.setMass(Quantity.of(Scrap.UNIT_KG, 'kg'));
      s.setQuantity(units);
      outputs.push(scrap);
      recoveredKg += units * Scrap.UNIT_KG;
    }
  }

  if (recoveredKg > massKg * rate + EPS) {
    throw new Error(
      `CraftingLogic: conservation breach — salvage recovered ` +
        `${recoveredKg} kg from ${massKg} kg at rate ${rate}`,
    );
  }

  StuffApi.destruct(item); // provenance, grade, chattel die with the form
  return { ok: true, outputs, recoveredKg };
}

async function lookupImpl(ref: string): Promise<RecipeView | null> {
  const catalogue = await requireCatalogue();
  const recipe = catalogue.findByKeyword(ref) ?? catalogue.getRecipe(ref);
  return recipe ? toView(recipe) : null;
}

async function offeredImpl(menu: Stuff): Promise<RecipeView[]> {
  const catalogue = await requireCatalogue();
  const ids = menu instanceof CommerceMenu ? menu.getOfferedRecipeIds() : [];
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
export class CraftingLogic extends ApiLogic {
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

  /** See {@link CraftingApi.repair}. */
  @CallSecurity(CraftingApiCallers)
  public async repair(request: RepairRequest): Promise<RepairOutcome> {
    return repairImpl(request);
  }

  /** See {@link CraftingApi.salvage}. */
  @CallSecurity(CraftingApiCallers)
  public async salvage(request: SalvageRequest): Promise<SalvageOutcome> {
    return salvageImpl(request);
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
