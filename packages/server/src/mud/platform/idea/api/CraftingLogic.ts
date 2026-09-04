// CraftingLogic — the hot-reloadable logic singleton behind CraftingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { CorpoApi } from '../../../api/corpo';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { ExecutionContextApi } from '../../../api/execution-context';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { Grade } from '../../../lib/craft/Grade';
import { RecipeKnowledge } from '../../../lib/script/RecipeKnowledge';
import {
  DIFFICULTIES,
  type Difficulty,
} from '../../../lib/advancement/ActSignature';
import type Material from '../../../lib/material/Material';
import { Freshness } from '../../../lib/material/Freshness';
import { Cure } from '../../../lib/material/Cured';
import {
  Contamination,
  type PathogenLoads,
} from '../../../lib/material/Contaminable';
import type { ToxinTag } from '../../../lib/metabolism/Metabolic';
import {
  Recipe,
  RECIPE_MEDIA,
  type RecipeInputSlot,
  type RecipeMedium,
} from '../../../lib/craft/Recipe';
import { Template } from '../../../lib/stuff/Template';
import {
  Techniques,
  type Technique,
  type ResolvedTechnique,
} from '../../../lib/craft/Technique';
import { ContainmentApi } from '../../../api/containment';
import { GlobbableApi } from '../../../api/glob';
import type RecipeCatalogue from '../RecipeCatalogue';
import type { BulkSlot, BulkPayload } from '../../../lib/bulk/Bulkable';
import type { Tooled } from '../../../lib/craft/Tooled';
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
} from '../../../api/crafting';
import { MaterialApi } from '../../../api/material';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import Scrap from '../../thing/Scrap';
import CommerceMenu from '../../../lib/commerce/Menu';
import type { BuildContribution } from '../../../lib/craft/ManualBuild';

const CraftingApiCallers = SecurityPolicies.FromModule('/api/crafting#CraftingApi',
);

const CATALOGUE_PATH = '/platform/idea/RecipeCatalogue';
const EPS = 1e-9;

/** The generic substance an off-spec (recipe-unmatched) build mints. */
const GENERIC_MIXED_MATERIAL = '/platform/idea/material/blend';

/** The generic substance every derived cooked blend points at. */
const GENERIC_COOKED_MATERIAL = '/platform/idea/material/cooked';

/** The portion an off-spec cooked fill lands in the dish (L). */
const GENERIC_COOKED_PORTION_L = 0.3;

/** The template an off-spec workpiece mint clones (a re-meltable lump). */
const WORKED_LUMP_TEMPLATE = '/stuff/thing/Casting';

/** The template salvage's non-metal yields clone (the fungible stack). */
const SCRAP_TEMPLATE = '/stuff/thing/Scrap';

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

/**
 * The gather walk's yield: bulk holders, tools, discrete/glob items, and
 * the glass pool (every Crafted bulk vessel in reach — a claimed glass is
 * the output form; a glass is never an input).
 */
interface GatheredMatter {
  bottles: BottleCandidate[];
  tools: (Stuff & Tooled)[];
  items: ItemCandidate[];
  glasses: Stuff[];
}

/**
 * The glass-pool surface `CraftVessel` carries (duck-typed — the kernel
 * never names the platform class). A vessel without it is claimable
 * whenever its bulk is empty.
 */
interface PoolGlass {
  isClaimable(): boolean;
  soil(): void;
  setTechnique(value: string): void;
  setIce(kg: number, form: string, meltK?: number, latentJPerKg?: number): void;
  clearIce(): void;
}

function asPoolGlass(stuff: Stuff): Partial<PoolGlass> {
  return stuff as unknown as Partial<PoolGlass>;
}

/**
 * Claim the output vessel from the pool: the first reachable clean,
 * empty one of the recipe's output **kind**. Null when the pool has none
 * — the diegetic `no-glass` decline ("no clean coupe"), the bound that
 * makes bussing and washing real work.
 *
 * ⭐ The match is the **vessel kind** (`category` on `BulkableMixin`),
 * not the template path, with the path as the fallback for a row that
 * declares no kind. That is what makes a washed-out vessel and a
 * factory-fresh one the same input to a fill — which is what a real
 * line does, and what the whole returns loop depends on. Matching the
 * path meant a drained can of cola could never be refilled: it would be
 * walked straight past in favour of a can nobody had drunk from, and an
 * emptied vessel was economically dead the moment it was emptied.
 *
 * `wantKind` is the output row's own `category`, resolved by the caller
 * (a template read, so this stays synchronous over the gathered pool).
 */
/**
 * The **vessel kind** the recipe's output row declares (`can`, `coupe`,
 * `keg`), or `''` for a row that declares none — in which case
 * {@link claimGlass} falls back to matching the template path, the
 * behaviour before kinds existed.
 *
 * Read from the template row rather than from an instance: the pool may
 * hold nothing but drained products, which is exactly the case the kind
 * exists to serve.
 */
async function outputVesselKind(recipe: Recipe): Promise<string> {
  const row = await Template.findByPath(recipe.getOutputTemplate());
  const kind = (row?.data as { category?: unknown } | undefined)?.category;
  return typeof kind === 'string' ? kind : '';
}

function claimGlass(
  gathered: GatheredMatter,
  recipe: Recipe,
  wantKind: string,
): Stuff | null {
  const want = recipe.getOutputTemplate();
  const kindOf = (g: Stuff): string =>
    MixinApi.isVesselKind(g) ? g.getCategory() : '';
  const matches = (g: Stuff): boolean =>
    wantKind ? kindOf(g) === wantKind : g.getTemplatePath() === want;
  // A house-made intermediate (an authored `outputMaterial`: pressed
  // juice, the syrup) TOPS UP a reachable bottle of the same template
  // already holding that material — the day's lime juice is one bottle,
  // not a bottle per lime. Such a bottle is a bulk SOURCE by then (see
  // `collectCandidate`), so it is found among the bottles, not the glasses.
  const authored = recipe.getOutputMaterial();
  if (authored) {
    for (const b of gathered.bottles) {
      if (!matches(b.stuff)) continue;
      if (b.slot.getMaterialPath() !== authored) continue;
      if (b.slot.available() <= EPS) continue;
      return b.stuff;
    }
  }
  for (const g of gathered.glasses) {
    if (!matches(g)) continue;
    const pool = asPoolGlass(g);
    const claimable =
      typeof pool.isClaimable === 'function'
        ? pool.isClaimable()
        : MixinApi.isBulkable(g) && g.isBulkEmpty('interior');
    if (claimable) return g;
  }
  return null;
}

/**
 * ⭐ **The last-resort cook vessel** — the pot the food was made in.
 *
 * Reached only when the dish pool has nothing clean: a meal must land
 * SOMEWHERE, and "no clean bowl" cancelling dinner would be a worse lie
 * than eating out of the pot. Prefers a vessel that was actually used as
 * an instrument for this craft (the matched `pot`), then any claimable
 * pool vessel in reach.
 *
 * ⚠ It must be soiled by the fill like any other claim, or the fallback
 * would sit outside the wash loop and the pot would never need cleaning.
 * `finishGlass` / `mintVessel` do that for every vessel alike.
 */
function claimCookVessel(
  gathered: GatheredMatter,
  usedTools: readonly (Stuff & Tooled)[],
): Stuff | null {
  const claimable = (v: Stuff): boolean => {
    const pool = asPoolGlass(v);
    return typeof pool.isClaimable === 'function'
      ? pool.isClaimable()
      : MixinApi.isBulkable(v) && v.isBulkEmpty('interior');
  };
  for (const tool of usedTools) {
    if (MixinApi.isBulkable(tool) && claimable(tool)) return tool;
  }
  for (const g of gathered.glasses) {
    if (claimable(g)) return g;
  }
  return null;
}

/**
 * Whether a Crafted discrete is EDIBLE MATTER — food by its own material
 * (`ConsumableMaterial.edibility`, the surface `eat`/metabolism already
 * consume). The maker's mark on a lime says who grew it, not what it is:
 * **the distinction is the material, not a flag** (the D3 precedent, the
 * same rule the crafted-bulkable branch applies to a bottle of pressed
 * juice). A marked roast gathers too — leftovers feeding the next dish
 * is deliberate.
 */
function isEdibleMatter(c: Stuff): boolean {
  if (!MixinApi.isTangible(c)) return false;
  const material = c.getMaterial();
  return material !== null && material.getEdibility();
}

/**
 * Whether `c` qualifies as a discrete/glob item-input candidate: a
 * Material-bearing Tangible that is raw *matter*, not capital or a made
 * form — not a tool (the anvil never feeds the forge), not crafted
 * NON-FOOD (a grown, marked lime is still matter — see
 * {@link isEdibleMatter}), not a graded bottle (those are bulk
 * candidates), not a container (the pantry chest is reached *into*,
 * never consumed), and not something living.
 */
function isItemCandidate(c: Stuff): boolean {
  return (
    MixinApi.isTangible(c) &&
    c.getMaterial() !== null &&
    !MixinApi.isTool(c) &&
    (!MixinApi.isCrafted(c) || isEdibleMatter(c)) &&
    !MixinApi.isContainer(c) &&
    !MixinApi.isBulkable(c) &&
    !MixinApi.isOrganism(c) &&
    !MixinApi.isMaker(c)
  );
}

/** Sort/partition one reachable Stuff into the gathered pools. */
async function collectCandidate(c: Stuff, into: GatheredMatter): Promise<void> {
  if (MixinApi.isTool(c)) into.tools.push(c);
  // A Crafted bulk vessel is a glass — the output pool, never an input
  // (a served martini is not a base for the next one) — UNLESS it holds a
  // house-made intermediate: a recipe with an authored `outputMaterial`
  // (pressed juice, the syrup) fills a pool bottle with a REAL material,
  // and that bottle is stock for the next recipe. A served drink's slot
  // holds the derived blend; the distinction is the material, not a flag.
  if (MixinApi.isCrafted(c) && MixinApi.isBulkable(c)) {
    const slot = BulkableApi.slotFor(c, undefined);
    const mpath = slot?.getMaterialPath() ?? '';
    const intermediate =
      slot !== null &&
      slot !== undefined &&
      !c.isBulkEmpty('interior') &&
      mpath !== '' &&
      mpath !== GENERIC_MIXED_MATERIAL &&
      // ⚠ …and the COOKED base for the same reason as the mixed one: a
      // plated stew (and a pot with dinner still in it) holds a derived
      // blend, not stock. Dish-as-ingredient is out of scope for v1, and
      // without this line a served bowl would quietly become a bulk
      // source the moment `CookPot` joined the vessel pool.
      mpath !== GENERIC_COOKED_MATERIAL;
    if (!intermediate) {
      into.glasses.push(c);
      return;
    }
  }
  // Any bulk holder is a source: a graded bottle at its band, an ungraded
  // holder (the water tap, the ice bin, a mug) at `fair` — the same
  // fallback an ungraded item input gets.
  if (MixinApi.isBulkable(c)) {
    const slot = BulkableApi.slotFor(c, undefined);
    if (slot) {
      const mpath = slot.getMaterialPath();
      const material = mpath ? await StuffApi.singleton<Material>(mpath) : null;
      into.bottles.push({
        stuff: c,
        slot,
        material,
        grade: MixinApi.isGraded(c) ? c.getGrade() : Grade.of('fair'),
      });
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
  const gathered: GatheredMatter = {
    bottles: [],
    tools: [],
    items: [],
    glasses: [],
  };
  if (!MixinApi.isContainer(location)) return gathered;
  for (const c of location.getContents()) {
    if (c === maker) continue;
    await collectCandidate(c, gathered);
    // Open-container descent (one level). Skip agents (a maker NPC's or
    // bystander's inventory is theirs) — only inanimate room containers.
    // A glass is a container too (its garnish) — never descended: the
    // olive in a served martini is not the next martini's garnish.
    if (
      MixinApi.isContainer(c) &&
      !MixinApi.isOrganism(c) &&
      !MixinApi.isMaker(c) &&
      !MixinApi.isCrafted(c) &&
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

/**
 * Resolve a player-typed `with <brand>` token to a brand **key**, once
 * per craft.
 *
 * ⭐ This is the ONLY place a word is matched, and it is the sanctioned
 * one: a token the player typed, resolved at the command boundary
 * against the brands that actually exist. Everything downstream compares
 * `_brandKey` for equality — identity, not prose.
 *
 * It replaced `material.getName().toLowerCase().includes(brand)`, which
 * asked whether a MATERIAL's display name contained the token: `with
 * crow` matched Crowsfoot and anything else spelled with a crow in it,
 * and a mark carried by the bottle rather than the liquid could never
 * match at all. See docs/antipatterns.md § Keywords Where You Mean
 * Identity.
 */
function resolveBrandKey(token: string): string | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  const brands = CorpoApi.listBrands();
  const exact = brands.find(
    (b) => b.key.toLowerCase() === t || b.name.toLowerCase() === t,
  );
  if (exact) return exact.key;
  // A shorter spoken form of the mark — "crowsfoot" for `crowsfoot-gin`,
  // "hollis" for `old-hollis`. Segments of the key and words of the
  // name, never a free substring.
  const spoken = brands.find(
    (b) =>
      b.key.toLowerCase().split('-').includes(t) ||
      b.name.toLowerCase().split(/\s+/).includes(t),
  );
  return spoken?.key ?? null;
}

/**
 * Does this candidate carry the mark? The mark lives on the **bottle**
 * (`_brandKey`, `BrandedMixin`) — a brand is a mark somebody owns, not a
 * property of the liquid, which is the whole point of private label:
 * Old Hollis and Veshko's unbranded rail hold the SAME material.
 */
function carriesBrand(stuff: Stuff, brandKey: string): boolean {
  return CorpoApi.brandOf(stuff)?.key === brandKey;
}

/**
 * Pick the input bottle for one recipe slot: category tag + min grade +
 * enough un-claimed reachable volume. Honors a resolved `with <brand>`
 * preference (matched on the bottle's mark, never on the liquid's name),
 * then highest grade. `claimed` tracks per-bottle draw so two slots of the
 * same category don't double-claim the same litres.
 */
/**
 * ⭐ **The medium's phase ceiling** — the heat a cooking medium can carry
 * into the food, however hot the fire is. Water pins at its **boiling
 * point** (the excess goes into steam, not into the stew); a fat pins at
 * its **smoke point** (past it the fat breaks down, which is a different
 * thing happening, not a hotter version of this one).
 *
 * `0` when the material tabulates none — no cap, the fire wins. Syrup's
 * elevated boiling point needs no special case: it rides its own row.
 */
function mediumCapK(medium: RecipeMedium, material: Material | null): number {
  if (!material) return 0;
  const cap =
    medium === 'fat'
      ? material.getSmokePoint().rawValue()
      : material.getBoilingPoint().rawValue();
  return cap > 0 ? cap : 0;
}

/**
 * The matched input actually carrying the medium — found by the medium's
 * own TAG on the Material (`water` ships on water; a cooking fat authors
 * `fat`), never by slot name. No such input ⇒ the recipe cannot be worked
 * at all: you cannot boil without water.
 */
function findMediumMaterial(
  medium: RecipeMedium,
  matched: readonly MatchedInput[],
  matchedItems: readonly MatchedItemInput[],
): Material | null {
  for (const m of matched) {
    if (m.material?.hasTag(medium)) return m.material;
  }
  for (const m of matchedItems) if (m.material.hasTag(medium)) return m.material;
  return null;
}

/** Whether a medium candidate's phase ceiling clears the recipe's demand. */
function capClears(
  floor: { medium: RecipeMedium; minK: number },
  material: Material,
): boolean {
  const cap = mediumCapK(floor.medium, material);
  return cap === 0 || cap >= floor.minK;
}

function pickCandidate(
  inSlot: RecipeInputSlot,
  bottles: BottleCandidate[],
  claimed: Map<Stuff, number>,
  brandKey: string | null,
  mediumFloor: { medium: RecipeMedium; minK: number } | null = null,
): BottleCandidate | null {
  const minGrade = Grade.of(inSlot.minGrade);
  const need = inSlot.measureL ?? 0;
  const eligible = bottles.filter(
    (b) =>
      b.material !== null &&
      b.material.hasTag(inSlot.category) &&
      b.grade.compareTo(minGrade) >= 0 &&
      b.slot.available() - (claimed.get(b.stuff) ?? 0) >= need - EPS &&
      // ⭐ **A cook reaches for a fat that will take the heat.** Without
      // this the rail rule below (take the cheapest sufficient) picks the
      // first liquid carrying the medium's tag, and a bottle of olive oil
      // standing beside a crock of tallow makes a 470 K cutlet decline —
      // saying "not hot enough" about a fire that was, and a fat that
      // would have been. A medium that cannot carry the recipe's heat is
      // not a cheaper option; it is not an option.
      (mediumFloor === null ||
        !b.material.hasTag(mediumFloor.medium) ||
        capClears(mediumFloor, b.material)),
  );
  if (eligible.length === 0) return null;
  eligible.sort((x, y) => {
    if (brandKey) {
      const bx = carriesBrand(x.stuff, brandKey) ? 1 : 0;
      const by = carriesBrand(y.stuff, brandKey) ? 1 : 0;
      if (bx !== by) return by - bx;
    }
    // ⭐ An UNNAMED pour takes the cheapest liquid that still clears the
    // recipe's `minGrade` — the rail. That is what a bar does, and it is
    // what makes stocking a decision: your well determines the margin on
    // every drink nobody specified, which is most of them, while a good
    // bottle is not squandered on someone who did not ask for it. Ask
    // for it by name (`with crowsfoot`) and the branch above overrides.
    return x.grade.compareTo(y.grade);
  });
  return eligible[0]!;
}

/**
 * Pick the item inputs for one discrete/glob slot: category tag on the
 * Material + min grade (ungraded stock counts `fair`) + enough un-claimed
 * units across the reachable candidates. Honors a `with <brand>`
 * preference, then the LOWEST sufficient grade (the rail — see
 * `pickBulkInput`); greedy across sources until the slot's
 * `count` is covered (a glob covers many units, a discrete Tangible one).
 * `claimedUnits` tracks per-source draw so two slots never double-claim.
 * Returns the matched draws, or null when the slot cannot be covered.
 */
function pickItemInputs(
  inSlot: RecipeInputSlot,
  items: ItemCandidate[],
  claimedUnits: Map<Stuff, number>,
  brandKey: string | null,
  preferred: Stuff | null = null,
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
    // ⭐ The named target first, ahead of everything: an act performed on
    // a particular thing is performed on THAT thing. Without this, drying
    // a cut you had just salted could pick the plain one off the table
    // and hurdles could never be stacked deliberately.
    if (preferred) {
      const px = x.stuff === preferred ? 1 : 0;
      const py = y.stuff === preferred ? 1 : 0;
      if (px !== py) return py - px;
    }
    if (brandKey) {
      const bx = carriesBrand(x.stuff, brandKey) ? 1 : 0;
      const by = carriesBrand(y.stuff, brandKey) ? 1 : 0;
      if (bx !== by) return by - bx;
    }
    // Cheapest sufficient first, as above — the bruised lime goes in the
    // daiquiri and the good one stays for the guest who asks.
    return x.grade.compareTo(y.grade);
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
 * Move what the inputs were carrying onto the tools the working used.
 *
 * ⭐ The mechanism is the board's, generalized: a surface that worked on
 * contaminated matter carries it to whatever it works on next. Which tools
 * can hold a load is a CLASS decision (`KitchenTool` does, `ToolItem` does
 * not), so this offers it to all of them and the host set decides.
 */
function contaminateTools(
  usedTools: readonly Stuff[],
  matched: readonly MatchedInput[],
  matchedItems: readonly MatchedItemInput[],
): void {
  const targets = usedTools.filter((t) => MixinApi.isContaminable(t));
  if (targets.length === 0) return;
  const parts: { loads: PathogenLoads; weight: number }[] = [];
  for (const m of matched) {
    if (m.measureL > 0) {
      parts.push({ loads: Contamination.loadsFor(m.slot), weight: m.measureL });
    }
  }
  for (const m of matchedItems) {
    parts.push({
      loads: MixinApi.isContaminable(m.stuff) ? m.stuff.getPathogenLoads() : {},
      weight: Math.max(0.1, m.count),
    });
  }
  const carried = Contamination.blendAll(parts);
  if (Contamination.isClean(carried)) return;
  for (const tool of targets) {
    if (!MixinApi.isContaminable(tool)) continue;
    const have = tool.getPathogenLoads();
    tool.setPathogenLoads(Contamination.blend(carried, 1, have, 1));
  }
}

/** Stamp a working's spoilage outcome onto the output slot. */
function applySpoilage(outSlot: BulkSlot, outcome: SpoilageOutcome): void {
  Freshness.stampLoad(outSlot, outcome.load);
  // ⚠⚠ The silent half, and it must ride the SAME stamp. A dish that
  // carried the flora through and dropped the pathogens would be a build
  // whose unit tests all pass and whose contaminated stew is harmless.
  Contamination.stampLoads(outSlot, outcome.pathogens);
  const formed = outcome.formed;
  if (!formed) return;
  const payload = outSlot.getPayload();
  if (!payload) return;
  // ⭐ A FORMED toxin — it arose in the working, it did not arrive in an
  // ingredient, so it cannot derive from the composition and is carried.
  // ⚠ It is also deliberately past the heat filter: the kill stops the
  // growth, it does not un-poison what the growth already produced.
  const formedToxins = (payload.formedToxins ?? []).map((t) => ({ ...t }));
  const existing = formedToxins.find((t) => t.type === formed.type);
  if (existing) existing.amount += formed.amount;
  else formedToxins.push({ ...formed });
  outSlot.setPayload({ ...payload, formedToxins });
}

/**
 * What a working did to the spoilage its inputs brought: the load the
 * output starts from, and the formed toxin the killed population left.
 */
interface SpoilageOutcome {
  load: number;
  formed: ToxinTag | null;
  /** ⚠ The SECOND population — silent, event-seeded, its own kill curve. */
  pathogens: PathogenLoads;
}

/**
 * ⭐ **What the working did to the spoilage the inputs brought with them.**
 *
 * Two different facts, and keeping them apart is the point:
 *
 *   - **the load** — reset to nothing when the working reached the kill
 *     temperature (cooking kills what is there), else the inputs' loads
 *     blended by mass, because a lazy warm-through launders nothing;
 *   - **the rate afterward** — NOT set here at all. It comes from the
 *     OUTPUT material's own constants, and `/platform/idea/material/cooked`
 *     tabulates the fastest rate in the library. A cooked dish starts
 *     sterile and goes off faster than the raw stock it was made from,
 *     which is exactly what leftovers do.
 *
 * Bulk draws weigh by litres and discrete inputs by mass — near enough the
 * same units for food, and the blend is the same one a pour uses.
 */
function outputMicrobialLoad(
  effectiveHeatK: number,
  holdS: number,
  matched: readonly MatchedInput[],
  matchedItems: readonly MatchedItemInput[],
): SpoilageOutcome {
  let weighted = 0;
  let total = 0;
  const parts: { loads: PathogenLoads; weight: number }[] = [];
  for (const m of matched) {
    const w = m.measureL;
    if (w <= 0) continue;
    weighted += Freshness.loadOf(m.slot) * w;
    parts.push({ loads: Contamination.loadsFor(m.slot), weight: w });
    total += w;
  }
  for (const m of matchedItems) {
    const unitKg = MixinApi.isTangible(m.stuff)
      ? m.stuff.getMass().rawValue()
      : 0;
    const w = (unitKg > 0 ? unitKg : 0.1) * m.count;
    const load = MixinApi.isFresh(m.stuff) ? m.stuff.getMicrobialLoad() : 0;
    weighted += load * w;
    // ⭐ The contamination the INPUTS brought with them — a carcass cut
    // with a dirty knife makes a contaminated stew, and it must survive
    // the trip from a discrete item into a blend.
    parts.push({
      loads: MixinApi.isContaminable(m.stuff)
        ? m.stuff.getPathogenLoads()
        : {},
      weight: w,
    });
    total += w;
  }
  return resolveSpoilage(
    effectiveHeatK,
    holdS,
    total > 0 ? weighted / total : 0,
    Contamination.blendAll(parts),
  );
}

/**
 * The by-hand twin of {@link outputMicrobialLoad}, over a build buffer's
 * banked snapshot rather than live inputs. Same two facts, same order:
 * the kill wins, else the banked loads blend by mass.
 */
function buildMicrobialLoad(
  effectiveHeatK: number,
  holdS: number,
  contributions: readonly BuildContribution[],
): SpoilageOutcome {
  let weighted = 0;
  let total = 0;
  const parts: { loads: PathogenLoads; weight: number }[] = [];
  for (const c of contributions) {
    const w = c.kind === 'item' ? 0.1 * (c.count ?? 1) : c.measureL;
    if (w <= 0) continue;
    weighted += (c.freshnessLoad ?? 0) * w;
    parts.push({ loads: c.pathogenLoads ?? {}, weight: w });
    total += w;
  }
  return resolveSpoilage(
    effectiveHeatK,
    holdS,
    total > 0 ? weighted / total : 0,
    Contamination.blendAll(parts),
  );
}

/**
 * ⭐⭐ **What the kill actually leaves behind.**
 *
 * Heat destroys the population; it does NOT destroy what the population
 * already made. So a working that reaches the kill temperature takes the
 * load to zero — the dish starts sterile and ages from there at its own
 * material's rate — and *deposits the dose that load had already earned*
 * into the output as a real, formed toxin, authoring no `labileAtK` so
 * nothing later destroys it either.
 *
 * ⚠ Without this half, cooking rotten meat produced a clean dinner: the
 * load reset, the derived dose went with it, and "cooking spoiled food
 * does not make it safe" was true only of the hand-authored doses. A
 * live drive is what found it — the whole point of standing the kitchen
 * up rather than trusting the suite.
 */
function resolveSpoilage(
  effectiveHeatK: number,
  holdS: number,
  blended: number,
  pathogens: PathogenLoads = {},
): SpoilageOutcome {
  // ⭐ Each population answers to its OWN kill temperature and its own
  // survival floor, so this runs whatever the flora did — a working under
  // the flora's kill can still be over some organism's, and a working
  // over both still leaves a spore-former's floor alive.
  const survivors = Contamination.killOver(
    pathogens,
    effectiveHeatK,
    holdS,
    // The working's water activity is the food's; a craft has no cure
    // state to consult mid-working, and the kill does not read `a_w`
    // anyway (only growth does).
    1,
  );
  if (effectiveHeatK < Freshness.killTemperatureK()) {
    // A lazy warm-through launders nothing: the load rides straight
    // through and the dose stays derived from it at the ingest.
    return { load: blended, formed: null, pathogens: survivors };
  }
  // ⭐⭐ **The kill is a rate held for a time.** `holdS === 0` is a recipe
  // that authors no hold, which means the working was as long as it needed
  // — byte-identical to the threshold this replaced, and what keeps every
  // shipped recipe cooking exactly as it did. A hold that IS authored is a
  // claim that the working was brief, and is integrated.
  const load = holdS > 0 ? Freshness.killOver(blended, holdS, effectiveHeatK) : 0;
  // ⚠ And what the killed population already MADE stays in the dish,
  // derived from the load that was there before the heat touched it.
  return { load, formed: Freshness.doseFor(blended), pathogens: survivors };
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
  recipeId: string,
  appearance: string,
  keywords: readonly string[],
  parts: { material: Material; servings: number }[],
  effectiveHeatK = 0,
  makerPath = '',
): BulkPayload {
  // ⭐ The composition: what went in, by PATH, with its servings summed
  // per material and first-seen order kept. Every derived fact below —
  // the tastes, the tags, the label — is a function of exactly this, and
  // carrying it properly is what lets each subsystem compute its own
  // instead of being handed the answer. See the bulk-decomposition plan.
  const composition = new Map<string, number>();
  for (const part of parts) {
    const partPath = part.material.getTemplatePath();
    if (partPath) {
      composition.set(partPath, (composition.get(partPath) ?? 0) + part.servings);
    }
  }
  // ⚠⚠ The nutrition, the toxins and the edibility are NOT computed here
  // any more — they are functions of the composition below, and
  // `BlendLabel` computes them on read. What IS recorded is the heat the
  // working reached, because the heat-labile kill depends on it and no
  // amount of looking at the ingredients recovers it.
  // ⭐ Five facts, and every one of them irreducible: what recipe made it,
  // what went in, how hot the working got, what the making formed. (The
  // fifth, `freshness`, is live state the gauge stamps.) The name, the
  // appearance, the keywords, the discipline, the tags, the nutrition and
  // the tastes are all READ off these — see BlendIdentity and BlendLabel.
  const payload: BulkPayload = {};
  if (recipeId) payload.recipeId = recipeId;
  if (appearance) payload.appearance = appearance;
  if (keywords.length > 0) payload.keywords = [...keywords];
  if (effectiveHeatK > 0) payload.cookedAtK = effectiveHeatK;
  // ⭐ Who made it — the sixth irreducible fact, and the one that makes
  // harm from a meal nameable. A dish reaches a body as
  // `(material, litres, payload)`; the eater never sees the bowl, so the
  // vessel's own `CraftedMixin` stamp cannot answer for it.
  if (makerPath) payload.maker = makerPath;
  if (composition.size > 0) {
    payload.composition = [...composition].map(([materialPath, servings]) => ({
      materialPath,
      servings,
    }));
  }
  return payload;
}

/** The ice bin: a reachable bulk holder whose matter carries `ice`. */
function findIce(bottles: BottleCandidate[], needKg: number): BottleCandidate | null {
  for (const b of bottles) {
    if (!b.material || !b.material.hasTag('ice')) continue;
    if (b.slot.available() >= iceLitres(b.material, needKg) - EPS) return b;
  }
  return null;
}

/** Litres of an ice material that weigh `kg` (density from the row; ~water when unauthored). */
function iceLitres(material: Material, kg: number): number {
  const density = material.getDensity().rawValue();
  return kg / ((density > 0 ? density : 1000) / 1000);
}

/** The kilograms an iced drink takes (the `crafting.iceKg` dial). */
function iceKgPerDrink(): number {
  return dial(AppSettingKeys.craftingIceKg, 0.15);
}

/**
 * The finishing pass every filled glass gets, resolve path or hand path:
 * the working's chill + dilution, the ice from the bin (the plateau —
 * see `CraftVessel`), the garnish moved INTO the glass, the technique
 * stamp, and the soil mark. `inputs` are the drawn holders (their
 * temperatures blend into the fill); `ice` / `garnish` were matched
 * before anything was consumed.
 */
async function finishGlass(
  output: Stuff,
  outSlot: BulkSlot,
  working: ResolvedTechnique,
  inputs: { holder: Stuff; litres: number }[],
  ice: { candidate: BottleCandidate; kg: number; form: string } | null,
  garnish: MatchedItemInput[],
): Promise<void> {
  const { name: technique, effect } = working;
  // Dilution: the working folds water in (a real volume on the slot).
  if (effect.dilutionL > 0) {
    const room = outSlot.remaining();
    const add = Math.min(effect.dilutionL, Number.isFinite(room) ? room : effect.dilutionL);
    if (add > 0) {
      outSlot.setAmount(Quantity.of(outSlot.getAmount().rawValue() + add, 'L'));
    }
  }
  // The fill temperature: the volume-weighted blend of what was drawn,
  // then the working's chill.
  if (MixinApi.isThermal(output)) {
    let sumT = 0;
    let sumL = 0;
    for (const i of inputs) {
      if (!MixinApi.isThermal(i.holder) || i.litres <= 0) continue;
      sumT += i.holder.getTemperature().rawValue() * i.litres;
      sumL += i.litres;
    }
    const fillK = sumL > 0 ? sumT / sumL : output.getTemperature().rawValue();
    output.setContentsTemperature(Math.max(0, fillK - effect.chillK));
  }
  const pool = asPoolGlass(output);
  // Ice: scooped from the bin onto the glass; the plateau does the rest.
  if (ice) {
    const litres = iceLitres(ice.candidate.material!, ice.kg);
    const result = BulkableApi.transfer(ice.candidate.slot, null, {
      kind: 'measure',
      litres,
      mode: 'strict',
    });
    if (Math.abs(result.applied - litres) > EPS) {
      throw new Error(
        `CraftingLogic: conservation breach — scooped ${result.applied} of ${litres} L of ice`,
      );
    }
    if (typeof pool.setIce === 'function') {
      const m = ice.candidate.material!;
      pool.setIce(
        ice.kg,
        ice.form,
        m.getMeltingPoint().rawValue(),
        m.getLatentHeatOfFusion().rawValue(),
      );
    }
  }
  // Garnish: a thing in the glass (a glob splits off the units).
  if (MixinApi.isContainer(output)) {
    for (const g of garnish) {
      let piece: Stuff = g.stuff;
      if (g.glob && MixinApi.isGlobbable(g.stuff) && g.stuff.getQuantity() > g.count) {
        piece = await g.stuff.split(g.count);
      }
      if (MixinApi.isContainable(piece)) ContainmentApi.move(piece, output);
    }
  }
  if (typeof pool.setTechnique === 'function') pool.setTechnique(technique);
  if (typeof pool.soil === 'function') pool.soil();
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
  matchedItems: MatchedItemInput[] = [],
  effectiveHeatK = 0,
  makerPath = '',
): Promise<void> {
  const outSlot = BulkableApi.slotFor(output, undefined);
  if (!outSlot) {
    throw new Error(
      `CraftingLogic: output '${recipe.getOutputTemplate()}' is not Bulkable`,
    );
  }
  // Σ bulk draws; an item-fed bulk output (a pressed lime → juice) yields
  // its authored portion on top (the item's own volume is not the juice).
  const totalL =
    matched.reduce((sum, m) => sum + m.measureL, 0) +
    (matchedItems.length > 0 ? recipe.getOutputPortionL() : 0);
  const authored = recipe.getOutputMaterial();
  if (authored) {
    // The authored-substance override (a recipe may still name its
    // blend; the shipped roster derives).
    const material = await StuffApi.singleton<Material>(authored);
    // Topping up a bottle that already holds this material adds to it.
    const held =
      outSlot.getMaterialPath() === authored ? outSlot.getAmount().rawValue() : 0;
    outSlot.setMaterial(material);
    outSlot.setAmount(Quantity.of(held + totalL, 'L'));
    return;
  }
  // The derived default: the generic blend base + a payload computed
  // from the drawn inputs (each slot's draw = one serving).
  const material = await StuffApi.singleton<Material>(GENERIC_MIXED_MATERIAL);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(totalL, 'L'));
  outSlot.setPayload(
    deriveBlendPayload(
      recipe.getRecipeId(),
      recipe.getOutputAppearance(),
      recipe.getKeywords(),
      [
        ...matched.flatMap((m) =>
          m.material ? [{ material: m.material, servings: 1 }] : [],
        ),
        ...matchedItems.map((m) => ({ material: m.material, servings: m.count })),
      ],
      effectiveHeatK,
      makerPath,
    ),
  );
  // A cold bar mix carries its inputs' spoilage through unchanged — a
  // daiquiri made with yesterday's lime juice is made with yesterday's
  // lime juice, and nothing about shaking it says otherwise.
  applySpoilage(
    outSlot,
    outputMicrobialLoad(effectiveHeatK, recipe.getHoldS(), matched, matchedItems),
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
  matched: MatchedInput[],
  matchedItems: MatchedItemInput[],
  effectiveHeatK: number,
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

  // ⭐⭐ **The matter's own state rides the transform.** A tangible output
  // used to start blank, which was invisible while every such recipe made
  // a metal tool out of ore. It stops being invisible the moment the
  // transform is a PRESERVING one: a cure that reset the microbial load
  // would make salting a way to launder rotten meat, and one that dropped
  // the water state would make the second hurdle undo the first.
  //
  // Both halves, in order: what was already growing in the stock (killed
  // by the working's heat, or blended through if it never got hot), then
  // what the working does to the water.
  if (MixinApi.isFresh(output)) {
    const outcome = outputMicrobialLoad(
      effectiveHeatK,
      recipe.getHoldS(),
      matched,
      matchedItems,
    );
    output.setMicrobialLoad(outcome.load);
    // ⚠ The silent half rides the discrete transform too, or curing a
    // contaminated cut would quietly clean it — which is the exact
    // opposite of what curing does.
    if (MixinApi.isContaminable(output)) {
      output.setPathogenLoads(outcome.pathogens);
    }
  }
  if (MixinApi.isCured(output)) {
    // The input's own water state first — a dried cut smoked is still a
    // dried cut — then the recipe's treatment, stronger-axis-wins.
    const inherited = MixinApi.isCured(primary.stuff)
      ? primary.stuff.getCureState()
      : Cure.untreated();
    const treatment = recipe.getCure();
    output.setCureState(
      treatment ? Cure.applyTreatment(inherited, treatment) : inherited,
    );
  }
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
  matched: MatchedInput[],
  matchedItems: MatchedItemInput[],
  effectiveHeatK: number,
  makerPath = '',
): Promise<void> {
  const outSlot = BulkableApi.slotFor(output, undefined);
  if (!outSlot) {
    throw new Error(
      `CraftingLogic: edible output '${recipe.getOutputTemplate()}' is not ` +
        `Bulkable`,
    );
  }
  // ⭐ The serve SOILS the vessel — dish, platter or the pot itself. A
  // claimed vessel that nobody marked used would be re-claimable forever
  // and the whole wash loop would be decorative; and a pot exempted from
  // it could serve dinner every night and never need cleaning.
  const pool = asPoolGlass(output);
  if (typeof pool.soil === 'function') pool.soil();

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
    // An authored-substance dish carries no derived composition, but it
    // still had a cook — and the harm record has to be able to say so.
    if (makerPath) {
      outSlot.setPayload({ ...(outSlot.getPayload() ?? {}), maker: makerPath });
    }
    applySpoilage(
      outSlot,
      outputMicrobialLoad(effectiveHeatK, recipe.getHoldS(), matched, matchedItems),
    );
    return;
  }
  // The derived default: the generic cooked base + macros summed from
  // the consumed units (macros in = macros out).
  const material = await StuffApi.singleton<Material>(GENERIC_COOKED_MATERIAL);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(recipe.getOutputPortionL(), 'L'));
  outSlot.setPayload(
    deriveBlendPayload(
      recipe.getRecipeId(),
      recipe.getOutputAppearance(),
      recipe.getKeywords(),
      matchedItems.map((m) => ({ material: m.material, servings: m.count })),
      effectiveHeatK,
      makerPath,
    ),
  );
  applySpoilage(
    outSlot,
    outputMicrobialLoad(effectiveHeatK, recipe.getHoldS(), matched, matchedItems),
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
  mediumCaps: ReadonlyMap<RecipeMedium, number> = new Map(),
): Recipe | null {
  let best: Recipe | null = null;
  for (const recipe of recipes) {
    // The medium clamp, the by-hand twin of `craftImpl`'s: a recipe
    // worked THROUGH water was never worked hotter than the water got,
    // no matter what the build's latched heat says. `mediumCaps` is
    // pre-resolved by the async caller so this stays synchronous — the
    // key is present iff SOMETHING banked carries the medium's tag, and
    // its value is that medium's ceiling (0 = it tabulates none).
    const medium = recipe.getMedium();
    let effectiveK = heatedToK;
    if (medium) {
      if (!mediumCaps.has(medium)) continue; // no water banked, no boiling
      const cap = mediumCaps.get(medium)!;
      if (cap > 0 && cap < effectiveK) effectiveK = cap;
    }
    if (recipe.getRequiresHeatK() > effectiveK) continue; // never worked hot enough
    if (!buildSatisfies(recipe, contributions)) continue;
    if (!best || recipe.getRequiresHeatK() > best.getRequiresHeatK()) {
      best = recipe;
    }
  }
  return best;
}

/**
 * Pre-resolve the media the buffer actually banked, so the synchronous
 * {@link matchBuild} can clamp per recipe. A key is present iff some
 * banked contribution's Material carries that medium's tag; the value is
 * the HIGHEST ceiling among them — bank both tallow and butter and you
 * are assumed to reach for the one that takes the heat.
 */
async function resolveMediumCaps(
  contributions: readonly BuildContribution[],
): Promise<Map<RecipeMedium, number>> {
  const caps = new Map<RecipeMedium, number>();
  for (const c of contributions) {
    if (!c.materialPath) continue;
    const material = await StuffApi.singleton<Material>(c.materialPath);
    for (const medium of RECIPE_MEDIA) {
      if (!material.hasTag(medium)) continue;
      const cap = mediumCapK(medium, material);
      const seen = caps.get(medium);
      caps.set(medium, seen === undefined ? cap : Math.max(seen, cap));
    }
  }
  return caps;
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
        // Tags are the authority for BOTH kinds now; an explicitly
        // named `category` still matches (tests and hand-built
        // contributions set one).
        if (
          (c.category === slot.category ||
            (c.tags ?? []).includes(slot.category)) &&
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
  if (MixinApi.isAdvancing(maker))
    await maker.creditDeed({
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
    if (!witness.getIdentityPath()) continue;
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
  const mediumCaps = await resolveMediumCaps(req.contributions);
  const recipe = matchBuild(
    catalogue.allRecipes(),
    req.contributions,
    req.heatedToK ?? 0,
    mediumCaps,
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
  const makerPath = liveMaker?.getIdentityPath() ?? req.makerPath ?? '';
  const makerStuff =
    liveMaker ??
    (makerPath ? (StuffApi.findByTemplatePath<Stuff>(makerPath) ?? null) : null);

  if (req.workpiece) {
    return mintWorkpiece(req.workpiece, recipe, grade, makerPath, makerStuff);
  }
  // The same clamp the reverse-match applied, kept for the output step:
  // what the working actually reached is what killed (or did not kill)
  // the spoilage and the heat-labile doses.
  let effectiveHeatK = req.heatedToK ?? 0;
  const mintMedium = recipe?.getMedium() ?? null;
  if (mintMedium) {
    const cap = mediumCaps.get(mintMedium) ?? 0;
    if (cap > 0 && cap < effectiveHeatK) effectiveHeatK = cap;
  }
  return mintVessel(req, recipe, grade, makerPath, makerStuff, effectiveHeatK);
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
  effectiveHeatK: number,
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
      // ⚠ No recipe here is the by-hand path: the working has a material
      // and no recipe, so the identity falls back to the Material exactly
      // as `BlendIdentity` does for water in a butt.
      deriveBlendPayload(
        recipe ? recipe.getRecipeId() : '',
        recipe ? recipe.getOutputAppearance() : '',
        recipe ? recipe.getKeywords() : material.getKeywords(),
        parts,
        effectiveHeatK,
        makerPath,
      ),
    );
  } else if (makerPath) {
    // An authored-substance build still had a hand behind it.
    outSlot.setPayload({ ...(outSlot.getPayload() ?? {}), maker: makerPath });
  }
  // The spoilage the buffer brought with it: killed off if the working
  // actually got hot enough, otherwise blended through (a lazy
  // warm-through launders nothing) — and either way, what the killed
  // population already made stays in the dish.
  applySpoilage(
    outSlot,
    buildMicrobialLoad(
      effectiveHeatK,
      recipe?.getHoldS() ?? 0,
      req.contributions,
    ),
  );

  // The working finishes the glass: chill + dilution, the technique
  // stamp, the soil mark. Ice and garnish are the hand's own steps
  // (`garnish <glass> with <x>`), not the strain's.
  //
  // ⭐ The hand path NAMES the working by verb (stir / shake / muddle
  // recorded it) but takes its NUMBERS from the instrument in reach —
  // you cannot shake without a shaker, and the shaker is what knows what
  // shaking does. An unauthored word finishes neutral.
  const handMethod = req.method ?? Techniques.BUILT;
  await finishGlass(
    vessel,
    outSlot,
    {
      name: handMethod,
      effect: Techniques.effectFor(handMethod, reachableTools(makerStuff)),
    },
    [],
    null,
    [],
  );

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

  const { bottles, tools, items, glasses } = await gatherMatter(location, maker);

  // Match input slots (per-source no-double-claim), dispatching each slot
  // on its kind: bulk → bottle draw, item → discrete/glob units.
  const claimed = new Map<Stuff, number>();
  const claimedUnits = new Map<Stuff, number>();
  // The player's `with <brand>` token, resolved to a brand KEY once —
  // the one place a word is matched (see `resolveBrandKey`). A token
  // naming no brand that exists resolves to null and the preference is
  // simply not applied.
  const brandKey = req.brand ? resolveBrandKey(req.brand) : null;
  const matched: MatchedInput[] = [];
  const matchedItems: MatchedItemInput[] = [];
  const grades: Grade[] = [];
  // The medium a bulk slot may satisfy this recipe with: one that can
  // actually carry the heat the recipe asks for (see `pickCandidate`).
  const recipeMedium = recipe.getMedium();
  const mediumFloor = recipeMedium
    ? { medium: recipeMedium, minK: recipe.getRequiresHeatK() }
    : null;
  for (const inSlot of recipe.getInputSlots()) {
    if (Recipe.isItemSlot(inSlot)) {
      const picks = pickItemInputs(
        inSlot,
        items,
        claimedUnits,
        brandKey,
        req.target ?? null,
      );
      if (!picks) {
        return { ok: false, reason: 'insufficient-input', detail: inSlot.category };
      }
      matchedItems.push(...picks);
      for (const p of picks) grades.push(p.grade);
      continue;
    }
    // ⭐ Two passes, and the second is what makes the DECLINE honest.
    // First look for a medium that can actually carry the recipe's heat —
    // a cook reaches past the olive oil for the tallow. If none can, take
    // the best there is anyway, so the heat gate below says
    // `insufficient-heat` ("that oil will not take it") rather than
    // `insufficient-input` ("you have no fat"), which would be a lie told
    // over a full bottle.
    const cand =
      pickCandidate(inSlot, bottles, claimed, brandKey, mediumFloor) ??
      pickCandidate(inSlot, bottles, claimed, brandKey);
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
  //
  // ⭐ …and the fire is only half of it. A recipe working THROUGH a medium
  // gets whichever is lower, the fire or what the medium can carry: a wet
  // recipe demanding 450 K declines at a roaring forge because the water
  // stops at 373. Boiling cannot brown, and no table anywhere says so.
  let effectiveHeatK = MixinApi.isThermal(maker) ? maker.reachableHeatK() : 0;
  const medium = recipeMedium;
  if (medium) {
    const mediumMaterial = findMediumMaterial(medium, matched, matchedItems);
    if (!mediumMaterial) {
      // No water in reach is an ordinary missing input, said in the
      // ordinary way — no new reason word for "you have no water".
      return { ok: false, reason: 'insufficient-input', detail: medium };
    }
    const cap = mediumCapK(medium, mediumMaterial);
    if (cap > 0 && cap < effectiveHeatK) effectiveHeatK = cap;
  }
  const requiresHeatK = recipe.getRequiresHeatK();
  if (requiresHeatK > 0 && effectiveHeatK < requiresHeatK) {
    return {
      ok: false,
      reason: 'insufficient-heat',
      detail: `${requiresHeatK}`,
    };
  }
  // ⭐ **What the FOOD reached, as against what the room could deliver.**
  // The gate above asks whether the setup can supply the recipe's heat;
  // this is the temperature the dish was actually held at, and it is the
  // recipe's own demand — a stew simmered beside a roaring forge was
  // simmered, not forged. It is what decides the spoilage kill and the
  // heat-labile doses, so conflating the two would have every dish cooked
  // at the hottest thing in the room.
  const workingHeatK = requiresHeatK;

  // Derive grade (weakest-link, floored at the recipe base if any,
  // then at any used control-bearing instrument's band — skill embedded
  // in the capital raises the floor; the ceiling stays the skill seam's).
  let grade = Grade.deriveAtFixedControl(grades);
  const base = recipe.getBaseGrade();
  if (base) grade = grade.max(base);
  grade = applyControlFloor(grade, usedTools, recipe.getToolCapabilities());

  // The bar's finishing inputs — matched before anything is consumed:
  // ice from a reachable bin, the garnish by category.
  const application = recipe.getOutputApplication();
  let ice: { candidate: BottleCandidate; kg: number; form: string } | null = null;
  const garnish: MatchedItemInput[] = [];
  if (application === 'bulk') {
    if (recipe.wantsIce()) {
      const kg = iceKgPerDrink();
      const bin = findIce(bottles, kg);
      if (!bin) return { ok: false, reason: 'insufficient-input', detail: 'ice' };
      ice = { candidate: bin, kg, form: recipe.getIce() };
    }
    const g = recipe.getGarnish();
    if (g) {
      const picks = pickItemInputs(
        { slot: 'garnish', category: g.category, minGrade: 'fair', kind: 'item', count: g.count ?? 1 },
        items,
        claimedUnits,
        brandKey,
      );
      if (!picks) {
        return { ok: false, reason: 'insufficient-input', detail: g.category };
      }
      garnish.push(...picks);
    }
  }

  // The output form: a bulk output is CLAIMED from the glass pool (the
  // first clean, empty instance of the recipe's template in reach — the
  // bound that makes bussing and washing real work); a tangible / edible
  // output is still cloned (smithing's transform and cooking's plate are
  // the next pools). Then apply its properties (dispatched on the
  // recipe's output-application kind), stamp, consume, wear.
  let output: Stuff;
  if (application === 'bulk' || application === 'edible') {
    const pool = { bottles, tools, items, glasses };
    const glass = claimGlass(pool, recipe, await outputVesselKind(recipe));
    if (glass) {
      output = glass;
    } else if (application === 'bulk') {
      // The bar's asymmetry, and it stays hard: no clean coupe, no
      // martini. Glassware is the constraint that makes bussing work.
      return { ok: false, reason: 'no-glass', detail: recipe.getOutputTemplate() };
    } else {
      // ⭐ **Pot as last resort.** Dinner is not cancelled for want of
      // crockery — the meal lands in the vessel it was cooked in and you
      // eat standing over the fire. That is the campfire case, and it is
      // why `CookPot` is a `CraftVessel`: the pot is a member of the same
      // pool, so this is a claim, not a special case.
      const pot = claimCookVessel(pool, usedTools);
      if (!pot) {
        return {
          ok: false,
          reason: 'no-glass',
          detail: recipe.getOutputTemplate(),
        };
      }
      output = pot;
    }
  } else {
    output = await StuffApi.clone<Stuff>(recipe.getOutputTemplate());
  }
  if (application === 'tangible') {
    applyTangibleOutput(output, recipe, matched, matchedItems, workingHeatK);
  } else if (application === 'edible') {
    await applyEdibleOutput(
      output,
      recipe,
      matched,
      matchedItems,
      workingHeatK,
      maker.getTemplatePath() ?? '',
    );
  } else {
    await applyBulkOutput(
      output,
      recipe,
      matched,
      matchedItems,
      workingHeatK,
      maker.getTemplatePath() ?? '',
    );
    const outSlot = BulkableApi.slotFor(output, undefined)!;
    await finishGlass(
      output,
      outSlot,
      // ⭐ The working comes from the INSTRUMENTS in reach, not from a
      // kernel table keyed on the recipe's capability words: the shaker
      // is what makes a drink shaken and the shaker is what knows what
      // shaking does. A pack that ships a churn authors `churned` on it
      // and the kernel never learns the word.
      Techniques.fromTools(tools, recipe.getToolCapabilities()),
      matched.map((m) => ({ holder: m.slot.getHolder(), litres: m.measureL })),
      ice,
      garnish,
    );
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

  // ⭐⭐ **A working DIRTIES the tools it was done with** — a press that
  // pressed contaminated fruit is a dirty press, the board's route one
  // instrument over.
  //
  // ⚠⚠ **Before the consume, and that ordering is load-bearing.** Placed
  // after it, this read the inputs' loads off objects that had just been
  // destructed — and a destroyed Stuff is an inert proxy whose every call
  // no-ops to `undefined`, so it threw rather than quietly returning
  // nothing. Consumption is what destroys the evidence; take it first.
  //
  // ⚠ Offered to every used tool and taken only by the ones that can HOLD
  // it: `ContaminableMixin` is composed on food kit (`KitchenTool`), not
  // on `ToolItem`, whose host set is a felling axe, a sledge and a shovel.
  // A smith's hammer is offered the same contamination and is structurally
  // unable to take it — the narrowing does the work, not a guard here.
  contaminateTools(usedTools, matched, matchedItems);

  consumeBulkInputs(matched);
  consumeItemInputs(matchedItems);

  // The residue output (fermentation P11/D12): conservation's other
  // half, landed beside the maker — the pomace cake by the press, the
  // spent-grain sack by the tun. Never silently vanished; if nobody
  // buys it, it piles up (the ambient-burden rule).
  const residue = recipe.getOutputResidue();
  if (residue && residue.template) {
    const count = Math.max(1, Math.floor(residue.count ?? 1));
    const here = MixinApi.isContainable(maker) ? maker.getContainer() : null;
    for (let i = 0; i < count; i++) {
      const cake = await StuffApi.clone<Stuff>(residue.template);
      if (
        here !== null &&
        MixinApi.isContainer(here) &&
        MixinApi.isContainable(cake)
      ) {
        ContainmentApi.move(cake, here);
      }
    }
  }
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
    if ((MixinApi.isThermal(maker) ? maker.reachableHeatK() : 0) < heatK) {
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
  const comp = material.elementalComposition();
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
 * Lives at `/platform/idea/api/crafting` (a stateless `Stuff` singleton, no backing
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
