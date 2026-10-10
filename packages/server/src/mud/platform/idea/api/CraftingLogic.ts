// CraftingLogic — the hot-reloadable logic singleton behind CraftingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import type { AromaTag } from '../../../lib/metabolism/DissolvedAromatics';
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
import {
  Texture,
  CookingAttempt,
  type CookingMethod,
} from '../../../lib/butchery/Texture';
import { RecipeKnowledge } from '../../../lib/script/RecipeKnowledge';
import { Competence } from '../../../lib/advancement/Competence';
import type { Organization } from '../../../lib/employment/Organization';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import {
  DIFFICULTIES,
  type Difficulty,
} from '../../../lib/advancement/ActSignature';
import type Material from '../../../lib/material/Material';
import { Freshness } from '../../../lib/material/Freshness';
import { ThermalDose } from '../../../lib/thermal/ThermalDose';
import { WaterActivity } from '../../../lib/material/WaterActivity';
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
import { StackableApi } from '../../../api/stackable';
import type RecipeCatalogue from '../RecipeCatalogue';
import type { BulkSlot, BlendPart,
  BulkPayload } from '../../../lib/bulk/Bulkable';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { PartLine, JointState, Assembled, Bill } from '../../../lib/craft/Assembled';
import type { Durable } from '../../../lib/material/Durable';
import type { GradeBand } from '../../../lib/craft/Grade';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '../../../lib/advancement/CompetenceBand';
import type JointCatalogue from '../JointCatalogue';
import type { JointDescriptor } from '../Joint';
import { TemplatePaths } from '../../../lib/paths';
import { GrammarApi } from '../../../api/grammar';
import { PersistableApi } from '../../../api/persistable';
import type {
  CraftRequest,
  CraftOutcome,
  CraftDeclineReason,
  RecipeView,
  MakerMode,
  BuildMintRequest,
  RepairRequest,
  RepairOutcome,
  SalvageRequest,
  SalvageOutcome,
  Landing,
  FitRequest,
  FitOutcome,
} from '../../../api/crafting';
import { MaterialApi } from '../../../api/material';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import Scrap from '../../thing/Scrap';
import CommerceMenu from '../../../lib/commerce/Menu';
import type { BuildContribution } from '../../../lib/craft/ManualBuild';
import { BlendIdentity } from '../../../lib/craft/BlendIdentity';

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

/** A reachable discrete/stack item input candidate. */
interface ItemCandidate {
  stuff: Stuff;
  material: Material;
  /** Graded band, or the `fair` fallback for ungraded stock (an Ingot). */
  grade: Grade;
  /** Stack size; 1 for a plain discrete Tangible. */
  quantity: number;
}

/** A matched item input: the source Stuff + units to consume from it. */
interface MatchedItemInput {
  stuff: Stuff;
  /**
   * The recipe slot this input filled (`head`, `haft`) — the part name an
   * assembly records it under (assembly D3). Set by the craft path's
   * matcher; absent for the manual-build path, which has no slots.
   */
  slotName?: string;
  count: number;
  /** True ⇒ quantity debit (stack); false ⇒ destruct the whole Tangible. */
  stack: boolean;
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
 * present FULFILLING agent in the giver's (the patron's) location: on
 * shift, in a seat whose house lists `discipline` under `fulfills`, and
 * standing somewhere that house operates (`Employed.isFulfilling`).
 *
 * ⚠⚠ **It used to return the first match in container order**, which is
 * insertion order and means nothing. That was invisible while one venue
 * had one fulfilling seat and became wrong the moment the Hearthworks
 * had three over one business: a player kitchen-hand and the cook both
 * standing in the cookhouse made the answer luck, and the smith — whose
 * house also operates that room — was a legal maker for a stew.
 *
 * Two rules now, in order:
 *
 *  1. ⭐ **The seat must serve the recipe's discipline.** That is what
 *     separates a smith from a cook inside one business, and it is the
 *     only leg that can: the discipline is *credited* downstream, never
 *     *gated*, so a wrongly-picked maker succeeds and is credited with a
 *     trade they do not practise.
 *  2. **Then a stable key**, so the answer is at least the SAME wrong
 *     answer twice rather than a different one each order.
 *
 * ⚠ Rule 2 is a placeholder for arbitration, not arbitration. Two
 * equally-qualified cooks in one kitchen wants a queue or first-free,
 * which is the crew substrate's (`docs/slates/builds/crew-slate.md`);
 * picking the lowest identity path just means Odo always serves and his
 * kitchen-hand never does. Predictable beats arbitrary; neither is
 * right.
 */
/**
 * What `resolveMaker` answers: a maker, or a reason the craft declines —
 * carrying, for `not-learned`, who *could* have made it.
 */
type MakerResolution =
  | { ok: true; maker: Stuff }
  | { ok: false; reason: CraftDeclineReason; detail?: string };

/**
 * ⭐⭐⭐ **Can this maker make this thing?** One read, applied to a player
 * and an NPC identically — which is the property that makes it honest.
 *
 * Two ways to be able, and they are different kinds of thing:
 *
 *  1. **The lived deed** — a chronicle row saying you have made this
 *     before. A player earns this by making it by hand, once, and it is
 *     the only way a player ever earns it. *The hands learn.*
 *  2. **The seeded deed** — your authored dossier licensed work of this
 *     difficulty in this Discipline. Only a dossier writes `claim`-kind
 *     Transcript rows, so this leg is **structurally unavailable to a
 *     player**: twenty hand-built gin-tonics raise a player's lived band
 *     and license nothing by assertion.
 *
 * ⭐ That split is what lets Mara mix a Manhattan the first time anybody
 * orders one — *a person who has tended this bar for years has made one
 * before* — without handing a player a shortcut past the same work.
 *
 * ⚠ `formidable` is reachable by no dossier at all (`seedRunFor` tops out
 * at `hard`), so the hardest recipes in the realm are hand-only, for
 * everybody. That is a statement, not an oversight.
 */
async function canMakeImpl(maker: Stuff, recipe: Recipe): Promise<boolean> {
  const recipeId = recipe.getRecipeId();
  if (
    recipeId &&
    MixinApi.isPersona(maker) &&
    (await maker.hasDone(RecipeKnowledge.madeKey(recipeId)))
  ) {
    return true;
  }
  const discipline = recipe.getDiscipline();
  const difficulty = recipe.getDifficulty();
  // A recipe with no ladder placement gates on nothing — the serving rows
  // (a pint is poured, not mixed) and a player's own `def`.
  if (!discipline || !difficulty) return true;
  // ⚠ A maker that cannot hold competence at all is NOT gated. The gate
  // asks *has this person learned it*, and a thing that cannot learn is not
  // failing to have learned — a vending machine is not ignorant. Returning
  // false here would silently disable any future non-character maker, which
  // is the quiet kind of wrong.
  if (!MixinApi.isAdvancing(maker)) return true;
  const band = await maker.seededBandFor(discipline);
  const run = Competence.seedRunFor(band);
  if (!run || run.count <= 0) return false;
  return (
    DIFFICULTIES.indexOf(difficulty as Difficulty) <=
    DIFFICULTIES.indexOf(run.difficulty)
  );
}

/**
 * The present, on-shift, seat-eligible makers in the giver's room — the
 * walk that used to live inside `resolveMaker`, now the caller's so the
 * set can be filtered by capability before anybody is chosen.
 *
 * ⭐⭐ **Somebody else if anybody else; otherwise yourself.** The giver is a
 * candidate **only when nobody else able is present**, which is the one
 * reading that is honest in both directions:
 *
 * - a patron in a staffed bar is never served by themselves, because
 *   somebody was asked and somebody came;
 * - the only able person in the room, asked for something, is the answer.
 *
 * ⚠⚠ **This is why a producer beat could never work.** `cellars` — the
 * fermenting floor's whole crush leg — has the hand force `order <recipe>`
 * off its own work board, and `order` resolves `fulfilling-bartender`. The
 * giver was excluded unconditionally, and every yard outfit rosters exactly
 * ONE hand, so the order declined `no-maker` every time: the hand stood on
 * its own floor, in its own seat, asking a room containing nobody else. No
 * test drove the leg, so nothing said so. ⭐ Self-last rather than
 * self-never fixes it without weakening the staffed case at all — the
 * fallback cannot fire while a second able body is standing there.
 *
 * ⚠ It does mean a player holding a fulfilling seat, alone at the rail, can
 * `order` and be served by themselves. That is correct and carries no
 * loophole: `canMake` refuses them on exactly the terms it refuses an NPC,
 * and `order` still settles the house's charge — so the bartender pays the
 * bar for the drink they poured themselves, which is what a till is for.
 */
function presentFulfillers(giver: Stuff, discipline?: string): Stuff[] {
  if (!MixinApi.isContainable(giver)) return [];
  const loc = giver.getContainer();
  if (!loc || !MixinApi.isContainer(loc)) return [];
  const able: Stuff[] = [];
  for (const c of loc.getContents()) {
    if (c === giver) continue;
    if (!MixinApi.isEmployed(c)) continue;
    if (!c.isFulfilling(discipline)) continue;
    able.push(c);
  }
  if (able.length) return able;
  // The fallback: nobody else able is here, so the asker may answer.
  if (MixinApi.isEmployed(giver) && giver.isFulfilling(discipline)) {
    return [giver];
  }
  return [];
}

/** The house a fulfilling candidate is on shift for, or null. */
function houseOf(candidate: Stuff): (Stuff & Organization) | null {
  if (!MixinApi.isEmployed(candidate)) return null;
  for (const e of candidate.getActiveEmployments()) {
    const org = StuffApi.findByTemplatePath(e.organizationPath);
    if (org && MixinApi.isOrganization(org)) return org;
  }
  return null;
}

/**
 * Resolve the maker. ⭐ `'self'` is the giver (mix/serve — you are the
 * one making it). `'fulfilling-bartender'` hands the able set to the
 * **house's own call rule** and lets it say who comes over.
 *
 * ⚠⚠ **What this replaced**: `[...able].sort(by identity path)[0]`. Every
 * player Avatar's identity path begins `/platform/` and every NPC's
 * `/world/`, so the player won every tie forever — and between two NPCs,
 * one of them served every order of the bar's life while the other stood
 * there. See `lib/employment/CallPolicy.ts`.
 */
async function resolveMaker(
  mode: MakerMode,
  recipe: Recipe,
): Promise<MakerResolution> {
  const giver = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
  if (!giver) return { ok: false, reason: 'no-maker' };
  if (mode === 'self') {
    return { ok: true, maker: giver };
  }

  const discipline = recipe.getDiscipline() || undefined;
  const fulfilling = presentFulfillers(giver, discipline);
  if (fulfilling.length === 0) return { ok: false, reason: 'no-maker' };

  const able: Stuff[] = [];
  for (const c of fulfilling) {
    if (await canMakeImpl(c, recipe)) able.push(c);
  }

  // ⭐⭐ Somebody is tending the bar and NONE of them knows this drink. That
  // is a different answer from "nobody is here", and the difference is the
  // whole of lens 3b: a house offering something its staff cannot make is a
  // standing vacancy, and the refusal has to say so by name.
  if (able.length === 0) {
    return {
      ok: false,
      reason: 'not-learned',
      detail: couldHave(fulfilling, recipe),
    };
  }

  // ⚠ One house per call. Every shipped venue has one house per room, but a
  // shared room with two fulfilling houses must DECLINE rather than route
  // the call to whichever candidate `getContents()` happened to yield
  // first — which is the defect this whole wave retires, wearing a
  // different hat.
  const houses = new Set<Stuff>();
  for (const c of able) {
    const h = houseOf(c);
    if (h) houses.add(h as unknown as Stuff);
  }
  if (houses.size === 0) return { ok: false, reason: 'no-maker' };
  if (houses.size > 1) {
    return { ok: false, reason: 'ambiguous-house' };
  }
  const house = [...houses][0] as unknown as Stuff & Organization;
  const verdict = house.callFor({ patron: giver, candidates: able });
  if (!verdict.ok) {
    return {
      ok: false,
      reason: verdict.reason === 'no-call-policy' ? 'no-call-policy' : 'no-maker',
    };
  }
  return { ok: true, maker: verdict.chosen };
}

/**
 * Who *could* have made it, for the refusal's `detail`. ⭐ Present able
 * makers first, then the house's roster holders who can, then nobody —
 * because "come back at two, Remy can make that" is a different and much
 * better answer than "no".
 */
function couldHave(fulfilling: readonly Stuff[], recipe: Recipe): string {
  const house = fulfilling.length ? houseOf(fulfilling[0]!) : null;
  if (!house) return '';
  const names: string[] = [];
  for (const assignment of house.getRoster().getAssignments()) {
    const who = StuffApi.findByTemplatePath(assignment.assignee);
    if (!who) continue;
    const serves = house.getPosition(assignment.positionKey)?.fulfills ?? [];
    const discipline = recipe.getDiscipline();
    if (discipline && !serves.includes(discipline)) continue;
    names.push(who.getPresentation());
  }
  return names.join(', ');
}

/**
 * The gather walk's yield: bulk holders, tools, discrete/stack items, and
 * the glass pool (every Crafted bulk vessel in reach — a claimed glass is
 * the output form; a glass is never an input).
 */
interface GatheredMatter {
  bottles: BottleCandidate[];
  tools: (Stuff & Tooled)[];
  items: ItemCandidate[];
  glasses: Stuff[];
  /**
   * ⭐ MADE things in reach — tools and crafted goods — that a recipe may
   * consume only as a declared PART (assembly D3). Never ordinary stock:
   * a smith's hammer is not "metal" for the next nail. A slot draws from
   * here only when the output's bill names a part of the slot's name, and
   * only a thing that IS that part (its row, or its keyword).
   */
  parts: ItemCandidate[];
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
 * Whether `c` qualifies as a discrete/stack item-input candidate: a
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
    !MixinApi.isOrganism(c)
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
  if (
    MixinApi.isTangible(c) &&
    (MixinApi.isTool(c) || (MixinApi.isCrafted(c) && !isEdibleMatter(c))) &&
    !MixinApi.isBulkable(c) &&
    !MixinApi.isOrganism(c)
  ) {
    const material = c.getMaterial();
    if (material) {
      into.parts.push({
        stuff: c,
        material,
        grade: MixinApi.isGraded(c) ? c.getGrade() : Grade.of('fair'),
        quantity: MixinApi.isStackable(c) ? c.getQuantity() : 1,
      });
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
      quantity: MixinApi.isStackable(c) ? c.getQuantity() : 1,
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
    parts: [],
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
 * Pick the item inputs for one discrete/stack slot: category tag on the
 * Material + min grade (ungraded stock counts `fair`) + enough un-claimed
 * units across the reachable candidates. Honors a `with <brand>`
 * preference, then the LOWEST sufficient grade (the rail — see
 * `pickBulkInput`); greedy across sources until the slot's
 * `count` is covered (a stack covers many units, a discrete Tangible one).
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
      stack: MixinApi.isStackable(cand.stuff),
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
 * can hold a load is a CLASS decision (`KitchenTool` does, `Tool` does
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
      parts.push({ loads: new Contamination(m.slot).loads(), weight: m.measureL });
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
  new Freshness(outSlot).stampLoad(outcome.load);
  // ⚠⚠ The silent half, and it must ride the SAME stamp. A dish that
  // carried the flora through and dropped the pathogens would be a build
  // whose unit tests all pass and whose contaminated stew is harmless.
  new Contamination(outSlot).stampLoads(outcome.pathogens);
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
 * ⭐⭐ **What the working itself put on the doneness gauge.**
 *
 * A one-shot working "was as long as it needed": the mint stamps exactly
 * the dose the recipe asked for, so every dish comes out of its own
 * working **done**, and only physics after the mint takes it past. That is
 * what keeps the gauge from re-litigating a craft that already succeeded,
 * while still letting the loaf you forgot in the oven burn.
 *
 * ⚠ And the ceiling breach is stamped here, not declined at the gate: a
 * fire too fierce for the working still produces the thing, it produces a
 * **scorched** one. Declining would protect the player from a mistake
 * worth being able to make.
 */
function donenessAtMint(
  recipe: Recipe,
  effectiveHeatK: number,
): { doseS: number; scorchS: number } {
  const requires = recipe.getRequiresHeatK();
  // A working that asks for no heat cooks nothing — a shaken cocktail is
  // not underdone, it is a cocktail.
  if (requires <= 0) return { doseS: 0, scorchS: 0 };
  const doseS = ThermalDose.wantedDoseS(requires, recipe.getHoldS());
  const ceiling = recipe.getMaxHeatK();
  const scorchS =
    ceiling > 0 && effectiveHeatK > ceiling ? ThermalDose.scorchedAtS() : 0;
  return { doseS, scorchS };
}

/**
 * Stamp a working's doneness outcome onto a bulk output slot.
 *
 * ⚠ `deliveredHeatK` is **the heat the setup actually put on the food**,
 * NOT `workingHeatK` (which the resolve deliberately pins to the recipe's
 * own demand, because *a stew simmered beside a roaring forge was
 * simmered*). That pinning is right for the kill and exactly wrong for the
 * ceiling: the ceiling's whole question is whether the fire was FIERCER
 * than the working wanted, and pinning makes the answer permanently no.
 * The medium cap still applies to the delivered figure, so a wet recipe
 * beside a forge genuinely cannot scorch — the water stops at 373 K.
 */
function applyDoneness(
  outSlot: BulkSlot,
  recipe: Recipe,
  deliveredHeatK: number,
): void {
  const { doseS, scorchS } = donenessAtMint(recipe, deliveredHeatK);
  if (doseS <= 0 && scorchS <= 0) return;
  new ThermalDose(outSlot).stampDose(doseS, scorchS);
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
    weighted += new Freshness(m.slot).load() * w;
    parts.push({ loads: new Contamination(m.slot).loads(), weight: w });
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
  // ⭐⭐ **The kill is a rate held for a time, and the hold is never
  // zero.** This used to short-circuit twice — once below the flora's
  // kill temperature, and again when a recipe authored no hold, which
  // sent the load to a flat `0`. Both were thresholds wearing a rate's
  // clothes: a sear and a lazy warm-through came out identical, and a
  // recipe that simply did not mention a hold sterilised perfectly.
  //
  // `killOver` is now always called, and it is the ONE place the
  // threshold lives: it returns the load untouched below `killK`, so
  // nothing under the kill changes. What changes is that every working
  // ABOVE it is integrated as a rate over a real time (`getHoldS()`
  // never returns zero — an unauthored hold reads the dial).
  const load = Freshness.killOver(blended, holdS, effectiveHeatK);
  // ⚠ And what the killed population already MADE stays in the dish,
  // derived from the load that was there before the heat touched it.
  // Only a working that actually reached the kill forms anything.
  const formed =
    effectiveHeatK >= Freshness.killTemperatureK()
      ? Freshness.doseFor(blended)
      : null;
  return { load, formed, pathogens: survivors };
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
  parts: {
    material: Material;
    servings: number;
    /**
     * ⭐⭐ **What this input was itself made of**, when it was already a
     * blend. See the expansion below — this is the whole of D25.
     */
    composition?: readonly BlendPart[];
  }[],
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
    // ⭐⭐ **A consumed input's PARTS, not its identity** (grain-chain
    // D25). "Macros in = macros out" applied to what the input was
    // actually made of: an input that is itself a blend contributes the
    // things it was made from, scaled to the amount consumed, rather than
    // collapsing to its own blend name.
    //
    // ⚠ Without this the whole chain has a hole in the middle. Flour
    // whose payload says *72 % endosperm, 28 % bran* becomes, at the
    // kneading trough, simply "flour" — and the loaf that comes out the
    // far end is white however dark the flour was, silently, with nothing
    // anywhere to say so. Five links carry the extraction from the mill
    // to the plate and this is the one that used to drop it.
    //
    // A parts-less input behaves exactly as before: one part, its own
    // material, its own servings.
    const inner = part.composition ?? [];
    if (inner.length > 0) {
      const innerTotal = inner.reduce((a, b) => a + b.servings, 0);
      if (innerTotal > 0) {
        for (const sub of inner) {
          const share = (sub.servings / innerTotal) * part.servings;
          composition.set(
            sub.materialPath,
            (composition.get(sub.materialPath) ?? 0) + share,
          );
        }
        continue;
      }
    }
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
  // Garnish: a thing in the glass (a stack splits off the units).
  if (MixinApi.isContainer(output)) {
    for (const g of garnish) {
      let piece: Stuff = g.stuff;
      if (g.stack && MixinApi.isStackable(g.stuff) && g.stuff.getQuantity() > g.count) {
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
/**
 * Sum two concentration sets per type — NOT a volume-weighted blend.
 *
 * ⚠ The distinction is the whole of `imparts`. Blending answers *two
 * bodies of matter met*; this answers *a process added something to this
 * matter*, where there is no second volume to weigh against. A kiln that
 * imparts 30 mg/L of smoke means the malt reads 30, whether you kilned
 * one litre or twenty.
 *
 * Local to this logic singleton on purpose: it is domain logic over the
 * payload, which is what a logic singleton is for, and
 * `lint:lib-statics` is counting down statics on value classes rather
 * than up.
 */
function addConcentrations(
  base: readonly { type: string; amount: number }[] | undefined,
  extra: readonly { type: string; amount: number }[],
): { type: string; amount: number }[] {
  const byType = new Map<string, { type: string; amount: number }>();
  for (const tag of base ?? []) {
    if (tag.amount > 0) byType.set(tag.type, { ...tag });
  }
  for (const tag of extra) {
    if (!(tag.amount > 0)) continue;
    const existing = byType.get(tag.type);
    if (existing) existing.amount += tag.amount;
    else byType.set(tag.type, { ...tag });
  }
  return [...byType.values()];
}

/**
 * ⭐⭐ **What the FIRE puts into the work** — the fuel's own
 * `combustionImparts`, weighted by its share of the bed.
 *
 * This is what makes peated malt the fire's doing rather than a second
 * recipe's. The two kiln recipes were identical except that one declared
 * `imparts: [{smoke, 30}]` and took a turf as an ITEM SLOT — which made
 * *the same recipe over a different fire* inexpressible, and made the
 * turf's own moisture invisible, because an item slot cannot see it.
 *
 * ⭐ A mixed bed is weighted: half peat and half oak reads half as
 * smoky, which is both true and the thing a maltster actually controls.
 */
function fireImpartsFor(maker: Stuff): AromaTag[] {
  if (!MixinApi.isThermal(maker)) return [];
  const fire = maker.reachableHeatSource();
  if (fire === null) return [];
  const total = fire.fuelRemaining();
  if (!(total > 0)) return [];
  const out: AromaTag[] = [];
  for (const material of fire.fuelMaterials()) {
    const tags = material.getCombustionImparts();
    if (tags.length === 0) continue;
    const share = fire.fuelShareOf(material);
    if (!(share > 0)) continue;
    for (const tag of tags) {
      out.push({ ...tag, amount: tag.amount * share });
    }
  }
  return out;
}

async function applyBulkOutput(
  output: Stuff,
  recipe: Recipe,
  matched: MatchedInput[],
  matchedItems: MatchedItemInput[] = [],
  effectiveHeatK = 0,
  makerPath = '',
  deliveredHeatK: number = effectiveHeatK,
  fireImparts: AromaTag[] = [],
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
    // ⭐⭐ **An authored substance still had a hand behind it.**
    //
    // ⚠⚠ This branch used to `return` here, and the omission broke the
    // accountability ledger for every `order`ed bulk product in the
    // game — 22 of 49 bulk-output recipes take this path (every press,
    // mash, crush, dough, vermouth, `render-tallow`, `spin-comb`, and
    // all three still runs).
    //
    // The host IS marked: `craftImpl` stamps `CraftedMixin` on the
    // output vessel a few hundred lines below, so `look` reads
    // *"Made by X"*. But a served drink reaches a body as
    // `(material, litres, payload)` — **the eater never sees the
    // bottle** — which is the stated reason `BulkPayload.maker` exists
    // at all. So `Metabolic.noteMealAccountability` reads the PAYLOAD's
    // maker, found none, and returned on its first line: harm from a
    // bought drink was indistinguishable from harm you did to yourself.
    //
    // ⭐ The fix is not invented here. `mintVessel` — the MANUAL-build
    // path in this same file — already carries the identical branch
    // with the identical comment (*"An authored-substance build still
    // had a hand behind it"*). Two mint paths, and only one of them
    // stamped the liquid; this is the other one agreeing.
    //
    // ⚠ Identity only. No `composition` is set, so derived toxicity
    // still falls back to the Material row exactly as before — this
    // changes who a batch names, never what is in it.
    //
    // ⭐⭐ **And what the inputs CARRIED comes with them.** This branch
    // used to set the maker and nothing else, which meant a recipe was
    // the one way matter could move in this game **without its
    // concentrations moving with it** — so a vatting recipe would have
    // LAUNDERED the dose: two badly-cut bottles blended into one would
    // come out reading clean, and the whole point of the cut being a
    // skill with it. `BulkableApi.blendPayloads` is the same fold a pour
    // runs; see its doc for the three call sites.
    //
    // ⚠ The destination's own held litres take part too, so topping up a
    // vessel that already holds the material blends rather than
    // replacing — the `held` arithmetic two lines up already said that
    // about the VOLUME, and the payload has to agree.
    let folded: BulkPayload | null =
      held > 0 ? (outSlot.getPayload() ?? null) : null;
    let foldedL = held;
    for (const m of matched) {
      folded = BulkableApi.blendPayloads(
        m.slot.getPayload() ?? null,
        m.measureL,
        folded,
        foldedL,
      );
      foldedL += m.measureL;
    }
    const carried: BulkPayload = { ...(outSlot.getPayload() ?? {}) };
    if (folded?.dissolvedToxins) {
      carried.dissolvedToxins = folded.dissolvedToxins;
    } else delete carried.dissolvedToxins;
    if (folded?.dissolvedAromatics) {
      carried.dissolvedAromatics = folded.dissolvedAromatics;
    } else delete carried.dissolvedAromatics;
    // ⭐ What the WORKING itself adds, on top of what came in — the kiln's
    // smoke. Additive, not volume-weighted: `imparts` is authored as the
    // concentration in the OUTPUT, so 30 mg/L of smoke means the malt
    // smells of smoke at 30 mg/L however much of it you made.
    const imparts = recipe.getImparts();
    if (imparts.length > 0) {
      carried.dissolvedAromatics = addConcentrations(
        carried.dissolvedAromatics,
        imparts,
      );
    }
    // ⭐⭐ …and what the FIRE adds, on top of what the working does. The
    // smoke in peated malt comes from the fuel bed, so the same recipe
    // over peat and over oak gives two different malts and there is one
    // recipe row.
    if (fireImparts.length > 0) {
      carried.dissolvedAromatics = addConcentrations(
        carried.dissolvedAromatics,
        fireImparts,
      );
    }
    // ⭐ A recipe's own appearance, which this branch IGNORED — see
    // `applyAuthoredAppearance`.
    const authoredLook = recipe.getOutputAppearance();
    if (authoredLook) carried.appearance = authoredLook;
    else delete carried.appearance;
    if (makerPath) carried.maker = makerPath;
    // Keep a payload-free output byte-identical to one from before this
    // existed: a recipe that carries nothing, imparts nothing, authors no
    // appearance and has no maker should not leave an empty object behind.
    if (Object.keys(carried).length > 0 || outSlot.getPayload()) {
      outSlot.setPayload(carried);
    }
    return;
  }
  // The derived default: the generic blend base + a payload computed
  // from the drawn inputs (each slot's draw = one serving).
  const material = await StuffApi.singleton<Material>(GENERIC_MIXED_MATERIAL);
  outSlot.setMaterial(material);
  outSlot.setAmount(Quantity.of(totalL, 'L'));
  // ⭐⭐ **The derived branch drops `imparts` and always did.** A recipe
  // with no `outputMaterial` lands here, and until the fire build the
  // branch computed its payload purely from the inputs — so a recipe that
  // declared what the WORKING adds silently added nothing, and a derived
  // blend worked over a peat fire came out clean.
  //
  // ⚠ Two sources, and they are different claims: `imparts` is what the
  // ACT adds (authored per recipe) and the fire's is what the FUEL adds
  // (authored per material, weighted by its share of the bed).
  const derived = deriveBlendPayload(
      recipe.getRecipeId(),
      recipe.getOutputAppearance(),
      recipe.getKeywords(),
      [
        ...matched.flatMap((m) =>
          m.material
            ? [
                {
                  material: m.material,
                  servings: 1,
                  composition: m.slot.getPayload()?.composition,
                },
              ]
            : [],
        ),
        ...matchedItems.map((m) => ({
          material: m.material,
          servings: m.count,
          composition: MixinApi.isComposed(m.stuff)
            ? m.stuff.getComposition()
            : undefined,
        })),
      ],
      effectiveHeatK,
      makerPath,
    );
  const addedAromas = [...recipe.getImparts(), ...fireImparts];
  if (addedAromas.length > 0) {
    derived.dissolvedAromatics = addConcentrations(
      derived.dissolvedAromatics,
      addedAromas,
    );
  }
  outSlot.setPayload(derived);
  // A cold bar mix carries its inputs' spoilage through unchanged — a
  // daiquiri made with yesterday's lime juice is made with yesterday's
  // lime juice, and nothing about shaking it says otherwise.
  applySpoilage(
    outSlot,
    outputMicrobialLoad(effectiveHeatK, recipe.getHoldS(), matched, matchedItems),
  );
  applyDoneness(outSlot, recipe, deliveredHeatK);
}

/**
 * Domain seam — apply a **tangible** output (smithing's transform): flow
 * the *primary* matched item input's Material + the summed consumed mass
 * onto the cloned output (the `ThermalLogic` casting-stamp surface).
 * Mass-conserving: the output weighs what the consumed matter weighed.
 */
async function applyTangibleOutput(
  output: Stuff,
  recipe: Recipe,
  matched: MatchedInput[],
  matchedItems: MatchedItemInput[],
  effectiveHeatK: number,
  deliveredHeatK: number = effectiveHeatK,
): Promise<void> {
  const primary = matchedItems[0];
  const authoredMaterial = recipe.getOutputMaterial();
  // ⭐⭐ **A tangible made entirely of BULK** (grain-chain D11). This used
  // to throw: the transform arm assumed a primary ITEM input whose
  // material and mass flow onto the output, which is true of every
  // smithing recipe and false of a loaf. A loaf is baked from dough, and
  // dough is a liquid-ish thing in a trough.
  //
  // So when the recipe authors its own `outputMaterial` and no item
  // matched, the material is the authored one and the mass is the summed
  // bulk (litres x each source material's density) — conservation exactly
  // as the item arm does it, over the other kind of matter.
  // ⭐⭐ **And a tangible made of bulk that DERIVES its material.** The
  // arm above needs `outputMaterial` authored; this one is the case where
  // authoring it would be a lie. One recipe dips a candle, and what the
  // candle is made of is **whatever fat was in the pot** — beeswax or
  // tallow, one act, two materials, and a taper that smells of honey or
  // of mutton accordingly.
  //
  // The rule the recipe doc already states for every other arm:
  // *`outputMaterial` empty ⇒ the output material comes from the matched
  // input.* The item arm has always done it (a steel bar makes a steel
  // knife); the bulk arm threw instead, so the only way to make a candle
  // was to weld one material onto the recipe and ship a second recipe for
  // the other feedstock.
  //
  // ⭐ The precedent is in this same file, on the other mint path:
  // `fix/2026-10-03-ordered-maker` found `applyBulkOutput` not stamping a
  // maker that `mintVessel` already stamped — *"Two mint paths, and only
  // one of them stamped the liquid; this is the other one agreeing."*
  // This is two paths disagreeing about deriving a material, and this is
  // the other one agreeing.
  const bulkDerived = !primary && authoredMaterial.length === 0;
  const primaryBulk = bulkDerived
    ? (matched.find((m) => m.material) ?? null)
    : null;
  const bulkOnly = !primary && authoredMaterial.length > 0;
  if (!primary && !bulkOnly && !primaryBulk) {
    throw new Error(
      `CraftingLogic: tangible output '${recipe.getOutputTemplate()}' ` +
        `resolved with no matched item input, no 'outputMaterial', and no ` +
        `bulk input to take a material from`,
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
    // A stack's mass is per-unit (the stack is `quantity` instances).
    totalKg += m.stack ? unitKg * m.count : unitKg;
  }
  // ⭐⭐ **An authored `outputMaterial` wins; otherwise the stock's flows.**
  // The field existed and the edible and bulk paths already read it; the
  // tangible path did not, so a transform that genuinely CHANGES what
  // the matter is had no way to say so and every smithing output was
  // made of whatever went in. That is right for a knife (a steel bar
  // makes a steel knife) and wrong for the one act that is a chemical
  // change rather than a shaping: hammering a BLOOM squeezes the slag
  // out of it, and what is left is iron, not bloom iron.
  //
  // The bulk-only arm (a loaf from dough) is the same rule with no item
  // to fall back on: the authored material, and the mass summed over the
  // bulk by each source material's density.
  if (bulkOnly || primaryBulk) {
    output.setMaterial(
      primaryBulk
        ? primaryBulk.material!
        : await StuffApi.singleton<Material>(authoredMaterial),
    );
    for (const m of matched) {
      const density = m.material?.getDensity().rawValue() ?? 1000;
      totalKg += m.measureL * ((density > 0 ? density : 1000) / 1000);
    }
  } else {
    output.setMaterial(
      authoredMaterial
        ? await StuffApi.singleton<Material>(authoredMaterial)
        : primary!.material,
    );
  }
  if (totalKg > 0) output.setMass(Quantity.of(totalKg, 'kg'));

  // ⭐ The per-instance minor constituents ride the transform when both
  // ends can carry them. That is what keeps a carburized bar's carbon
  // through consolidation: the MATERIAL becomes iron (the kind changed)
  // and the carbon figure is still this piece's own.
  //
  // ⚠ Local narrowing on an output this function is already stamping —
  // not a guard re-narrowing a host set. A knife is not Alloyed and
  // silently takes nothing, which is the intended answer: a blade's
  // metal is its Material row.
  if (primary && MixinApi.isAlloyed(output) && MixinApi.isAlloyed(primary.stuff)) {
    output.setAlloying(primary.stuff.getAlloying());
    output.setTemper(primary.stuff.getTemper());
  }

  // ⭐ …and what it is MADE OF (D26). The bulk inputs' parts, merged and
  // scaled, land on the output's `ComposedMixin` face — the fifth and
  // last link of the chain that carries an extraction from the mill to
  // the plate. A parts-less input contributes its own material, exactly
  // as `derivePayload` does for a blend.
  if (MixinApi.isComposed(output)) {
    const merged = new Map<string, number>();
    const contribute = (path: string, servings: number): void => {
      if (!path || !(servings > 0)) return;
      merged.set(path, (merged.get(path) ?? 0) + servings);
    };
    for (const m of matched) {
      const inner = m.slot.getPayload()?.composition ?? [];
      const innerTotal = inner.reduce((a, b) => a + b.servings, 0);
      if (innerTotal > 0) {
        for (const sub of inner) {
          contribute(sub.materialPath, (sub.servings / innerTotal) * m.measureL);
        }
      } else if (m.material) {
        contribute(m.material.getTemplatePath() ?? '', m.measureL);
      }
    }
    for (const m of matchedItems) {
      const inner = MixinApi.isComposed(m.stuff) ? m.stuff.getComposition() : [];
      const innerTotal = inner.reduce((a, b) => a + b.servings, 0);
      if (innerTotal > 0) {
        for (const sub of inner) {
          contribute(sub.materialPath, (sub.servings / innerTotal) * m.count);
        }
      } else {
        contribute(m.material.getTemplatePath() ?? '', m.count);
      }
    }
    if (merged.size > 0) {
      output.setComposition(
        [...merged].map(([materialPath, servings]) => ({
          materialPath,
          servings,
        })),
      );
    }
  }

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
  if (MixinApi.isWaterActive(output)) {
    // The input's own water state first — a dried cut smoked is still a
    // dried cut — then the recipe's treatment, stronger-axis-wins.
    const inherited =
      primary && MixinApi.isWaterActive(primary.stuff)
        ? primary.stuff.getWaterState()
        : WaterActivity.untreated();
    const treatment = recipe.getCure();
    output.setWaterState(
      treatment ? WaterActivity.applyTreatment(inherited, treatment) : inherited,
    );
  }
  // ⭐ And the doneness the working put on it — the discrete twin of
  // `applyDoneness`. A roast comes out of its working done; what happens
  // to it in the oven afterwards is the gauge's business, not the craft's.
  if (MixinApi.isDosed(output)) {
    const { doseS, scorchS } = donenessAtMint(recipe, deliveredHeatK);
    if (doseS > 0 || scorchS > 0) output.stampThermalDose(doseS, scorchS);
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
  deliveredHeatK: number = effectiveHeatK,
  fireImparts: AromaTag[] = [],
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
    addAromasTo(outSlot, recipe, fireImparts);
    applySpoilage(
      outSlot,
      outputMicrobialLoad(effectiveHeatK, recipe.getHoldS(), matched, matchedItems),
    );
    applyDoneness(outSlot, recipe, deliveredHeatK);
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
      matchedItems.map((m) => ({
        material: m.material,
        servings: m.count,
        composition: MixinApi.isComposed(m.stuff)
          ? m.stuff.getComposition()
          : undefined,
      })),
      effectiveHeatK,
      makerPath,
    ),
  );
  addAromasTo(outSlot, recipe, fireImparts);
  applySpoilage(
    outSlot,
    outputMicrobialLoad(effectiveHeatK, recipe.getHoldS(), matched, matchedItems),
  );
  applyDoneness(outSlot, recipe, deliveredHeatK);
}

/**
 * ⭐⭐ Fold what the ACT adds (`recipe.imparts`) and what the FIRE adds
 * (the fuel's `combustionImparts`, weighted by its share of the bed) into
 * a slot's aromatics.
 *
 * ⚠ **`applyEdibleOutput` handled NEITHER**, and it is the branch cooking
 * actually takes — so a recipe declaring `imparts:` on an edible output
 * added nothing, silently, and smoking meat over a peat fire gave clean
 * meat. One helper, three branches, so the next output kind cannot
 * quietly miss it.
 */
function addAromasTo(
  outSlot: BulkSlot,
  recipe: Recipe,
  fireImparts: readonly AromaTag[],
): void {
  const added = [...recipe.getImparts(), ...fireImparts];
  if (added.length === 0) return;
  const payload: BulkPayload = { ...(outSlot.getPayload() ?? {}) };
  payload.dissolvedAromatics = addConcentrations(
    payload.dissolvedAromatics,
    added,
  );
  outSlot.setPayload(payload);
}

/**
 * Domain seam — consume the matched **item** inputs (conservation), the
 * discrete sibling of {@link consumeBulkInputs}: a stack is debited by
 * exactly the matched units (destructed when fully drawn); a discrete
 * Tangible is destructed whole — its chattel id released by the shipped
 * `onDestruct` path. Mismatches are programmatic conservation breaches →
 * throw (feasibility was already checked).
 */
function consumeItemInputs(matched: MatchedItemInput[]): void {
  for (const m of matched) {
    if (m.stack) {
      if (!MixinApi.isStackable(m.stuff)) {
        throw new Error(
          'CraftingLogic: conservation breach — a stack input lost its stack',
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
 * measure (strict). Stacks/items add sibling `consumeStackInputs` /
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
 *     `easy`).
 *
 *     ⚠ The guard below reads *a recipe authoring no discipline records
 *     nothing*, and this comment used to add "— the bar's rows stay
 *     unrecorded exactly as today". **That has been false since the bar
 *     got a Discipline**: all 25 hospitality rows author
 *     `discipline: bartending`, and so does every other recipe in the
 *     realm — 97 of 97, across thirteen packs, in ten disciplines. So
 *     the guard is a defence against a row that forgot, not a
 *     description of a venue. Pouring a drink credits a bartending deed
 *     and always did.
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
    if (!MixinApi.isPersona(witness)) continue;
    await witness.recordChronicleOnce(
      RecipeKnowledge.knownKey(recipe.getRecipeId()),
      RecipeKnowledge.knownEntry(recipe.getName()),
    );
  }
}

/** The authored bill on a row, read off its template (no clone). */
async function billOfRow(path: string): Promise<Bill | null> {
  try {
    const tpl = await Template.findByPath(path);
    const bill = (tpl?.data as { bill?: unknown } | undefined)?.bill as Bill | undefined;
    return bill && Array.isArray(bill.parts) ? bill : null;
  } catch {
    return null;
  }
}

/**
 * ⭐⭐ **The assembly arm** (assembly D3) — record which input became which
 * part, on an output that is made of parts.
 *
 * The tangible arm above flattens: one material, one summed mass. That is
 * still the whole's material and mass. This keeps what the flatten loses,
 * as a record on the instance — a line per recipe slot, carrying the
 * input's own material, grade, wear, form and maker, and (when the input
 * was itself an assembly) its own record nested inside. The joints come
 * from the row's bill, made at full tension under the assembler's hand.
 *
 * Runs when the output composes `AssembledMixin` AND it is made of parts
 * by declaration (a bill) or by recipe (two or more distinct item slots).
 * ⭐ The pick needs no bill for this: its shipped recipe has a `head` slot
 * and a `haft` slot, and that is two parts.
 *
 * A one-slot craft whose input was itself an assembly carries the record
 * across (re-hafting by recipe keeps what the head was).
 *
 * ⚠ The narrowing here is on an output this function is already writing —
 * the one legitimate narrowing the assembly build allows at the mint.
 */
function applyAssembledOutput(
  output: Stuff,
  matchedItems: MatchedItemInput[],
  makerIdentity: string,
): void {
  if (!MixinApi.isAssembled(output)) return;
  const bill = output.getBill();
  const slots = [
    ...new Set(matchedItems.map((m) => m.slotName).filter((n): n is string => !!n)),
  ];
  if (!bill && slots.length < 2) {
    const only = matchedItems[0];
    if (
      matchedItems.length === 1 &&
      only &&
      MixinApi.isAssembled(only.stuff) &&
      only.stuff.isAssembly()
    ) {
      output.recordAssembly(only.stuff.getParts(), only.stuff.getJoints());
    }
    return;
  }
  const lines: PartLine[] = [];
  for (const slot of slots) {
    const ms = matchedItems.filter((m) => m.slotName === slot);
    const first = ms[0]!;
    const billPart = bill?.parts.find((p) => p.part === slot) ?? null;
    const count = ms.reduce((n, m) => n + m.count, 0);
    // Weakest link across the members that went into the line.
    const grade = ms.reduce((g, m) => g.min(m.grade), first.grade);
    const conditions = ms.map((m) =>
      MixinApi.isDurable(m.stuff) ? m.stuff.getCondition() : 1,
    );
    const condition = conditions.reduce((a, b) => a + b, 0) / conditions.length;
    const makers: string[] = [];
    for (const m of ms) {
      const by = MixinApi.isCrafted(m.stuff) ? m.stuff.getMaker() : '';
      if (by && !makers.includes(by)) makers.push(by);
    }
    if (makerIdentity && !makers.includes(makerIdentity)) makers.push(makerIdentity);
    const line: PartLine = {
      part: slot,
      template: first.stuff.getTemplatePath() ?? billPart?.template ?? '',
      count,
      role: billPart?.role ?? 'structural',
      material: first.material.getTemplatePath() ?? '',
      grade: grade.getBand(),
      condition,
      failed: 0,
      makers,
    };
    if (billPart?.plural) line.plural = billPart.plural;
    if (MixinApi.isConstructed(first.stuff)) {
      const form = first.stuff.getConstructionForm();
      if (form) line.form = form;
    }
    if (MixinApi.isAssembled(first.stuff) && first.stuff.isAssembly()) {
      line.parts = first.stuff.getParts();
      line.joints = first.stuff.getJoints();
    }
    lines.push(line);
  }
  // Bill parts no slot supplied — a wear part the kind declares that the
  // recipe does not consume — read at the bill's defaults.
  if (bill) {
    const ownMaterial = MixinApi.isTangible(output)
      ? (output.getMaterial()?.getTemplatePath() ?? '')
      : '';
    for (const p of bill.parts) {
      if (lines.some((l) => l.part === p.part)) continue;
      lines.push({
        part: p.part,
        template: p.template,
        count: p.count,
        role: p.role,
        material: p.material ?? ownMaterial,
        grade: 'fair',
        condition: 1,
        failed: 0,
        makers: makerIdentity ? [makerIdentity] : [],
        ...(p.plural ? { plural: p.plural } : {}),
      });
    }
  }
  const joints: JointState[] = (bill?.joints ?? []).map((j) => ({
    key: j.key,
    method: j.method,
    members: [...j.members],
    ...(j.fastener ? { fastener: j.fastener } : {}),
    tension: 1,
    maker: makerIdentity,
  }));
  output.recordAssembly(lines, joints);
}

/**
 * ⭐⭐ **Land a minted output** — move it, stamp it to its maker, record
 * where it is, and capture the hosts. The ONE place the mint does this, so
 * that no trade verb can forget (see {@link Landing}).
 *
 * The mechanism is {@link ContainmentApi.land} (move, stamp-if-untitled,
 * `followCustody`, capture); this resolves WHERE from the request's
 * {@link Landing}.
 */
async function landOutput(
  output: Stuff,
  maker: Stuff | null,
  landing: Landing,
): Promise<void> {
  if (landing === 'none' || !maker) return;
  let into: Stuff | null;
  if (landing === 'hands') into = maker;
  else if (landing === 'here') {
    into = MixinApi.isContainable(maker) ? maker.getContainer() : null;
  } else into = landing.into;
  if (
    !into ||
    !MixinApi.isContainer(into) ||
    !MixinApi.isContainable(output)
  ) {
    return;
  }
  await ContainmentApi.land(output, into, maker);
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
  // ⭐⭐⭐ Did the method suit the meat? One band, either way.
  //
  // ⚠ Here, at the ONE place a build's grade is derived, rather than in
  // the vessel sub-path: a workpiece mint and an edible mint both come
  // through this line, so a single hook cannot be bypassed by a route.
  grade = applyMethodFit(
    grade,
    recipe,
    req.contributions.map((c) => c.materialPath),
  );

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
    const minted = await mintWorkpiece(
      req.workpiece,
      recipe,
      grade,
      makerPath,
      makerStuff,
    );
    if (minted.ok) await landOutput(minted.output, makerStuff, req.landing ?? 'hands');
    return minted;
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
 * ⭐⭐⭐ **The cooking law: does the METHOD suit the MEAT?**
 *
 * A muscle that works carries connective tissue; collagen gelatinizes
 * only under long, moist heat. So a shoulder braises and a loin sears,
 * and getting it the wrong way round ruins the dish — real food science,
 * and **predictable without a table**.
 *
 * ⭐⭐ **It reads the MATERIAL, not the cut object**, and that is both
 * simpler and the engine's own law (`response = f(mechanism, material,
 * construction)`). A cut's `_materialPath` IS its muscle, so this works
 * on the one-shot craft path (which has the matched items) and on the
 * by-hand build path (whose contributions are snapshots carrying only a
 * `materialPath`) — one implementation, both routes, and no laundering
 * route where a stewed loin comes out ungraded because it went through a
 * pot.
 *
 * The method is read off the recipe with **no new field anywhere**:
 * `medium: water` plus a long `holdS` is `long-moist`, anything else is
 * `fast-dry`. That vocabulary already existed to model a phase ceiling,
 * and it turns out to describe the method exactly.
 *
 * ⚠ **One band of grade, and that is the whole consequence.** Not a
 * refusal and not a destroyed dish: a stewed loin is still dinner, just a
 * worse one than it should have been. ⭐ And the fit is ASYMMETRIC,
 * because the mistakes are not — a tough cut cooked fast is inedible
 * where a tender cut braised is merely wasted (`Texture.fit`).
 *
 * ⚠ Anything that is not a muscle is untouched: bread is not graded on
 * whether you braised it.
 */
function applyMethodFit(
  grade: Grade,
  recipe: Recipe | null,
  materialPaths: readonly (string | null | undefined)[],
): Grade {
  if (!recipe) return grade;
  const method: CookingMethod = new CookingAttempt(
    recipe.getMedium(),
    recipe.getAuthoredHoldS(),
  ).method();
  let net = 0;
  for (const path of materialPaths) {
    if (!path) continue;
    const material = StuffApi.findByTemplatePath(path);
    if (!material || !MixinApi.isMuscle(material)) continue;
    net += new Texture(material.getWork()).fit(method);
  }
  if (net === 0) return grade;
  // ⚠ Two cuts of opposite texture in one pot net to nothing, which is
  // the honest answer: you cooked one well and the other badly.
  const shifted = Grade.fromOrdinal(
    Math.max(
      0,
      Math.min(Grade.BANDS.length - 1, grade.getOrdinal() + (net > 0 ? 1 : -1)),
    ),
  );
  return shifted;
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
  // ⭐ The reach pool, on-person-first. This hand-rolled the two hops,
  // which also MISSED a tool in a slot — a wielded hammer is reachable
  // by any reading of the word, and the pool includes slot occupants.
  return ContainmentApi.reachableFrom(maker).filter(
    (c): c is Stuff & Tooled => MixinApi.isTool(c),
  );
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
    // ⭐⭐ The same rule as the one-shot path: an authored `outputMaterial`
    // wins, and the stock's material flows otherwise. The consolidate
    // recipe is the one that needs it — a bloom worked into a bar stops
    // being bloom iron, because the slag is on the floor.
    const authoredMaterial = recipe.getOutputMaterial();
    const outMaterial = authoredMaterial
      ? await StuffApi.singleton<Material>(authoredMaterial)
      : material;
    if (outMaterial) output.setMaterial(outMaterial);
    if (massKg > 0) output.setMass(Quantity.of(massKg, 'kg'));
    // ⭐ …and the piece's own carbon rides through, when the output can
    // hold it. A bar minted from a carburized bar is still steel by the
    // number as well as by the row.
    if (MixinApi.isAlloyed(output) && MixinApi.isAlloyed(workpiece)) {
      output.setAlloying(workpiece.getAlloying());
      output.setTemper(workpiece.getTemper());
    }
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
        setKeywords(k: string[]): void;
    setMaterial(m: Material): void;
    setMass(q: Quantity<'kg'>): void;
  };
  // A STEM — the register supplies the article (default indefinite).
  l.setShortDescription(
    `worked lump of ${material?.getName() ?? 'metal'}`,
  );
  // ⚠ Authored keywords: a runtime-minted thing has no row, so the code
  // that names it says what it answers to. (The pool no longer derives.)
  l.setKeywords(['lump', 'worked', ...(material?.getName() ?? 'metal').split(/\s+/)]);
  if (material) l.setMaterial(material);
  if (massKg > 0) l.setMass(Quantity.of(massKg, 'kg'));
  // ⚠ The off-spec lump keeps the carbon too. A player who spent three
  // smelts carburizing a bar and then quenched it at the wrong heat has
  // made a mistake about the FORM; losing the chemistry as well would
  // be the engine punishing them twice for one error, and the `Casting`
  // is re-meltable precisely so the work is recoverable.
  if (MixinApi.isAlloyed(lump) && MixinApi.isAlloyed(workpiece)) {
    lump.setAlloying(workpiece.getAlloying());
    lump.setTemper(workpiece.getTemper());
  }
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
    const parts: {
      material: Material;
      servings: number;
      composition?: readonly BlendPart[];
    }[] = [];
    for (const c of req.contributions) {
      if (!c.materialPath) continue;
      const m = await StuffApi.singleton<Material>(c.materialPath);
      parts.push({
        material: m,
        servings: c.kind === 'item' ? (c.count ?? 1) : 1,
        // The banked pour remembers what its source was made of (D25).
        composition: c.composition,
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
      recipe?.getHoldS() ?? ThermalDose.defaultHoldS(),
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

  const resolution = await resolveMaker(req.makerMode, recipe);
  if (!resolution.ok) {
    return resolution.detail
      ? { ok: false, reason: resolution.reason, detail: resolution.detail }
      : { ok: false, reason: resolution.reason };
  }
  const maker = resolution.maker;
  if (!MixinApi.isContainable(maker)) return { ok: false, reason: 'no-maker' };
  // ⭐⭐ The called maker sets down whatever yields to being called, and the
  // break-off is narrated as one act so the patron sees the person come
  // over rather than a drink appearing. `interruptibleBy` is read for real
  // here — the first thing in the engine's history to read it.
  if (req.makerMode !== 'self' && MixinApi.isBehaved(maker)) {
    if (maker.preemptFor('called')) {
      MessageApi.scene(maker)
        .topic('act.deed')
        .toPeers(
          Mml.compose`${Mml.actor(maker)} sets aside what they were doing and comes over.`,
        )
        .send();
    }
    // Re-decide the moment the drink is served, rather than at the next
    // scheduled beat: being called is exactly the kind of event that
    // should wake an agent.
    maker.requestBeat();
  }
  const location = maker.getContainer();
  if (!location) {
    return { ok: false, reason: 'insufficient-input', detail: 'no-location' };
  }

  const { bottles, tools, items, glasses, parts } = await gatherMatter(location, maker);
  // ⭐ The output's bill, when it has one: a slot named for one of its
  // parts may take a MADE thing that is that part (assembly D3). The shipped
  // pick recipe asks for a `head` and a `haft`, and both are Tool rows — so
  // until the bill existed it could never have matched either.
  const outBill =
    recipe.getOutputApplication() === 'tangible'
      ? await billOfRow(recipe.getOutputTemplate())
      : null;

  // Match input slots (per-source no-double-claim), dispatching each slot
  // on its kind: bulk → bottle draw, item → discrete/stack units.
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
      const billPart = outBill?.parts.find((p) => p.part === inSlot.slot) ?? null;
      const pool = billPart
        ? [
            ...items,
            ...parts.filter(
              (c) =>
                c.stuff.getTemplatePath() === billPart.template ||
                (MixinApi.isPerceptible(c.stuff) && c.stuff.hasKeyword(billPart.part)),
            ),
          ]
        : items;
      const picks = pickItemInputs(
        inSlot,
        pool,
        claimedUnits,
        brandKey,
        req.target ?? null,
      );
      if (!picks) {
        return { ok: false, reason: 'insufficient-input', detail: inSlot.category };
      }
      matchedItems.push(...picks.map((p) => ({ ...p, slotName: inSlot.slot })));
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
  // ⭐ …and the OTHER figure, which the resolve used to throw away. The
  // pinning above is right for the kill and exactly wrong for the ceiling:
  // "was the fire fiercer than this working wanted?" cannot be answered by
  // a number pinned to what the working wanted. This is what the setup
  // actually delivered, medium cap included — so a wet recipe beside a
  // roaring forge still cannot scorch, because the water stops at 373 K.
  const deliveredHeatK = effectiveHeatK;

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
    const pool = { bottles, tools, items, glasses, parts };
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
    await applyTangibleOutput(
      output,
      recipe,
      matched,
      matchedItems,
      workingHeatK,
      deliveredHeatK,
    );
    // ⭐⭐ …and, when the output is made of parts, which input became which
    // part. Before consumption: the inputs are still alive to be read. The
    // joint roster is warmed first, so the wear it will take reads its
    // joints' real figures (the catalogue is lazy — no onCreate).
    if (MixinApi.isAssembled(output) && (output.getBill()?.joints?.length ?? 0) > 0) {
      await (await jointCatalogue()).allWarmed();
    }
    applyAssembledOutput(output, matchedItems, maker.getIdentityPath() ?? '');
  } else if (application === 'edible') {
    await applyEdibleOutput(
      output,
      recipe,
      matched,
      matchedItems,
      workingHeatK,
      maker.getTemplatePath() ?? '',
      deliveredHeatK,
      fireImpartsFor(maker),
    );
  } else {
    await applyBulkOutput(
      output,
      recipe,
      matched,
      matchedItems,
      workingHeatK,
      maker.getTemplatePath() ?? '',
      deliveredHeatK,
      fireImpartsFor(maker),
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
    // ⚠ The IDENTITY path, never the lineage: every player Avatar shares one
    // templatePath, so a lineage stamp named every player maker the same
    // person (antipatterns § Keying a PERSON on getTemplatePath()). The
    // manual-build mint has always stamped identity; this agrees with it.
    maker: maker.getIdentityPath() ?? '',
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
  // on `Tool`, whose host set is a felling axe, a sledge and a shovel.
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
    for (let i = 0; i < count; i++) {
      const cake = await StuffApi.clone<Stuff>(residue.template);
      await landOutput(cake, maker, 'here');
    }
  }
  // Tools wear on use — the durable-good half (a Tool composes
  // DurableMixin alongside ToolMixin).
  //
  // ⭐ A STRIKING tool takes the work as a jar (`shock`), so a made-of-parts
  // tool gives where a jar gives — the haft, never the head (assembly D7).
  // Every other use wears as before.
  const striking = recipe.getToolCapabilities().includes('striking');
  for (const t of usedTools) {
    if (!MixinApi.isDurable(t)) continue;
    t.wear(undefined, striking && t.hasCapability('striking') ? 'shock' : undefined);
  }


  // The evidence tail: advancement deed + watch-=-claim for witnesses
  // (a no-op for recipes authoring no discipline — every bar row).
  await recordCraftEvidence(maker, recipe);

  // ⭐⭐ Land it. A vessel claimed from the pool is already where it
  // belongs (the glass is on the bar), so the Api does not move it unless
  // the verb ASKED — the cook hands you the bowl; the bartender does not.
  await landOutput(
    output,
    maker,
    req.landing ?? (application === 'tangible' ? 'hands' : 'none'),
  );

  return { ok: true, output, grade, recipeId: recipe.getRecipeId() };
}

/**
 * Repair (DECISION K) — the deficit-priced reverse-craft. Maker from
 * context; the deficit `1 − condition` prices the material cost
 * (`item mass × deficit × crafting.repair.costFactor`, doubled broken);
 * the domain gates by matter — `metal` wants forge-grade reachable heat,
 * soft goods a reachable `mending` tool; stock is drawn from the same
 * gather walk a craft uses (a stack debits partially; a discrete donor is
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
  // ⭐⭐ The assembly rungs come FIRST (assembly D6): a slack hoop is not
  // wear, so a sound cask whose hoops have slipped reads as "nothing to
  // repair" to the wear rung below — and it weeps all the same.
  const assembled = MixinApi.isAssembled(item) && item.isAssembly();
  if (assembled) {
    const { tools: jointTools } = await gatherMatter(location, maker);
    const rung = await repairAssemblyRungs(item, maker, jointTools);
    if (rung) return rung;
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
    // Stacks first (partial-mass debits waste nothing).
    donors.sort((a, b) => Number(b.quantity > 1) - Number(a.quantity > 1));
    let remaining = needKg;
    for (const donor of donors) {
      if (remaining <= EPS) break;
      if (!MixinApi.isTangible(donor.stuff)) continue;
      const unitKg = donor.stuff.getMass().rawValue();
      if (unitKg <= 0) continue;
      if (MixinApi.isStackable(donor.stuff)) {
        const take = Math.min(donor.quantity, Math.ceil(remaining / unitKg));
        draws.push({
          stuff: donor.stuff,
          count: take,
          stack: true,
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
          stack: false,
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
  return {
    ok: true,
    item,
    conditionBefore,
    costKg: needKg,
    ...(assembled ? { rung: 'restored' as const } : {}),
  };
}

/**
 * Salvage (DECISION L) — the one generic lossy melt-down. Flatten the
 * item's Material composition; each constituent above the dust floor
 * yields in its natural raw form:
 *   - `metal` → a re-meltable Casting at `crafting.salvageRate` (lossy);
 *   - a **meltable non-metal** (a material with a melting point and no
 *     `metal` tag — glass, wax) → a re-meltable Casting at rate **1.0**,
 *     WHOLE, carrying the piece's instance alloying (its iron history),
 *     because breaking is not melting and glass pays its entropy in
 *     colour, not mass (D7);
 *   - anything else → a Scrap stack (quantity by mass). The rest is
 *     dross (the entropy sink).
 * Conservation asserted per-branch (Σ output ≤ Σ branch ceilings + ε,
 * throw on breach); the destruct releases provenance, grade, and the
 * chattel id with the form. Outputs are returned unplaced — landing
 * them is the controller's job.
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

  // ⭐⭐ An assembly comes apart BY ITS JOINTS first (assembly D6): the
  // members its joints give back whole, and only the remainder — failed
  // members, a glued joint's everything, the fasteners that did not
  // survive — goes down the melt-down below, by mass.
  const outputs: Stuff[] = [];
  let recoveredKg = 0;
  let meltKg = massKg;
  let recoveredParts: { part: string; count: number; of: number }[] | undefined;
  let remnantShares: { material: Material | null; share: number }[] = [];
  if (MixinApi.isAssembled(item)) {
    const byJoints = await salvageByJoints(item, maker);
    if (byJoints) {
      outputs.push(...byJoints.outputs);
      recoveredParts = byJoints.recoveredParts;
      remnantShares = byJoints.remnants;
      // ⚠ Conservation, the reversible half: the members back can never
      // weigh more than the thing did.
      if (byJoints.recoveredKg > massKg + EPS) {
        throw new Error(
          `CraftingLogic: conservation breach — taking apart recovered ` +
            `${byJoints.recoveredKg} kg of parts from ${massKg} kg`,
        );
      }
      meltKg = Math.max(0, massKg - byJoints.recoveredKg);
    }
  }
  const meltOutputs: Stuff[] = [];
  let meltRecoveredKg = 0;

  // What melts: the whole, or — after an assembly came apart by its
  // joints — each part's unrecovered share, in that part's own material.
  const pieces: { material: Material; kg: number }[] =
    recoveredParts && remnantShares.length > 0
      ? remnantShares
          .filter((r) => r.material !== null)
          .map((r) => ({ material: r.material!, kg: r.share * meltKg }))
      : [{ material, kg: meltKg }];

  let maxRateUsed = 0;
  for (const piece of pieces) {
  const pieceKg = piece.kg;
  // The flattened constituents — a pure material is its own whole.
  const comp = piece.material.elementalComposition();
  const constituents: { material: Material; fraction: number }[] = [];
  if (comp.direct.length === 0) {
    constituents.push({ material: piece.material, fraction: 1 });
  } else {
    for (const entry of comp.direct) {
      const m = await StuffApi.singleton<Material>(entry.materialPath);
      constituents.push({ material: m, fraction: entry.fraction });
    }
  }
  for (const c of constituents) {
    const metal = c.material.hasTag('metal');
    // ⭐ A material with a melting point and no `metal` tag — glass, wax —
    // does not shatter into dross: breaking is not melting, and it pays
    // its entropy elsewhere (glass goes one step greener, D9). It comes
    // back as a re-meltable Casting at its FULL mass, remembering the
    // piece's minor constituents (its iron history) so a re-melt cannot
    // launder a tinted lump clear.
    const meltable = !metal && c.material.getMeltingPoint().rawValue() > 0;
    const branchRate = meltable ? 1.0 : rate;
    const yieldKg = pieceKg * c.fraction * branchRate;
    if (yieldKg < SALVAGE_DUST_FLOOR_KG) continue; // dust — lost
    if (metal || meltable) {
      const cast = await StuffApi.clone<Stuff>(WORKED_LUMP_TEMPLATE);
      const lump = cast as unknown as Stuff & {
        setShortDescription(s: string): void;
        setKeywords(k: string[]): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
      };
      lump.setShortDescription(`salvaged lump of ${c.material.getName()}`);
      lump.setKeywords(['lump', 'salvaged', ...c.material.getName().split(/\s+/)]);
      lump.setMaterial(c.material);
      lump.setMass(Quantity.of(yieldKg, 'kg'));
      // The instance's alloying is the piece's, not the constituent
      // material's — glass authors an empty composition, so the whole
      // item is one constituent and this carries its iron forward.
      if (meltable && MixinApi.isAlloyed(item) && MixinApi.isAlloyed(cast)) {
        cast.setAlloying(item.getAlloying());
      }
      meltOutputs.push(cast);
      meltRecoveredKg += yieldKg;
      maxRateUsed = Math.max(maxRateUsed, branchRate);
    } else {
      // Scrap: quantity by mass, floor-rounded to whole units (rounding
      // up would counterfeit matter).
      const units = Math.floor(yieldKg / Scrap.UNIT_KG);
      if (units < 1) continue; // sub-unit — dust
      const scrap = await StuffApi.clone<Stuff>(SCRAP_TEMPLATE);
      const s = scrap as unknown as Stuff & {
        setShortDescription(s: string): void;
        setKeywords(k: string[]): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
        setQuantity(n: number): void;
      };
      s.setShortDescription(`heap of ${c.material.getName()} scrap`);
      s.setKeywords(['scrap', 'heap', ...c.material.getName().split(/\s+/)]);
      s.setMaterial(c.material);
      s.setMass(Quantity.of(Scrap.UNIT_KG, 'kg'));
      s.setQuantity(units);
      meltOutputs.push(scrap);
      meltRecoveredKg += units * Scrap.UNIT_KG;
      maxRateUsed = Math.max(maxRateUsed, branchRate);
    }
  }

  }

  // Conservation ceiling: the melted mass × the BEST rate any of its
  // produced constituents earns — a meltable non-metal comes back WHOLE
  // (rate 1.0), everything else at the lossy salvage rate (D7). Bounding
  // on the mass (not on Σ fraction × rate) is what still catches a rigged
  // composition whose fractions sum past 1 — minting matter.
  if (meltRecoveredKg > meltKg * maxRateUsed + EPS) {
    throw new Error(
      `CraftingLogic: conservation breach — salvage recovered ` +
        `${meltRecoveredKg} kg from ${meltKg} kg (ceiling ` +
        `${meltKg * maxRateUsed} kg at rate ${maxRateUsed}; salvage rate ` +
        `${rate}, meltable non-metals whole)`,
    );
  }
  outputs.push(...meltOutputs);
  recoveredKg += meltRecoveredKg;

  StuffApi.destruct(item); // provenance, grade, chattel die with the form
  for (const out of outputs) await landOutput(out, maker, req.landing ?? 'here');
  return {
    ok: true,
    outputs,
    recoveredKg,
    ...(recoveredParts ? { recoveredParts } : {}),
  };
}

// ────────────────────────────────────────────────────────────────────────
// ⭐⭐ Assembly — the joint reads the three verbs share (assembly D4–D6)
// ────────────────────────────────────────────────────────────────────────

/** How much of a joint's recovery a hand of each band gets back. Grain. */
const RECOVERY_BY_BAND: Record<CompetenceBandName, number> = {
  untrained: 0.5,
  novice: 0.7,
  competent: 0.85,
  proficient: 0.95,
  expert: 1.05,
};

async function jointCatalogue(): Promise<JointCatalogue> {
  return (
    StuffApi.findByTemplatePath<JointCatalogue>(TemplatePaths.jointCatalogue) ??
    (await StuffApi.singleton<JointCatalogue>(TemplatePaths.jointCatalogue))
  );
}

/** The person's band in a Discipline (the floor for an unadvancing body). */
async function bandIn(who: Stuff, discipline: string): Promise<CompetenceBandName> {
  return MixinApi.isAdvancing(who)
    ? await who.competenceBandFor(discipline)
    : CompetenceBand.FLOOR;
}

/**
 * Can `who` make (or re-make) this joint here — its instrument in reach and
 * its band reached? `null` when they can; otherwise the refusal.
 */
async function jointGate(
  who: Stuff,
  joint: JointDescriptor,
  tools: (Stuff & Tooled)[],
): Promise<{ reason: 'missing-tool' | 'not-skilled'; detail: string } | null> {
  if (joint.instrument && !tools.some((t) => t.hasCapability(joint.instrument))) {
    return { reason: 'missing-tool', detail: joint.instrument };
  }
  if (joint.competence) {
    const band = await bandIn(who, joint.competence.discipline);
    if (!CompetenceBand.atOrAbove(band, joint.competence.band)) {
      return {
        reason: 'not-skilled',
        detail: `${joint.label} work wants ${joint.competence.band} ${joint.competence.discipline}`,
      };
    }
  }
  return null;
}

/** The joints a line sits in (as a member or as the fastener). */
function jointsOf(host: Assembled, part: string): JointState[] {
  return host.getJoints().filter((j) => j.members.includes(part) || j.fastener === part);
}

/** The plural-aware noun of a line. */
function lineNoun(l: PartLine, n: number): string {
  if (n === 1) return l.part;
  return l.plural && l.plural.length > 0 ? l.plural : `${l.part}s`;
}

/**
 * Repair's assembly rungs (assembly D6), before wear: ⭐ a slack joint is
 * TIGHTENED (it consumes nothing — a hoop driven back down), and a failed
 * member is REFUSED with its name, because no repair mends a split haft —
 * fitting a new one does. `null` falls through to the material-priced
 * restore.
 */
async function repairAssemblyRungs(
  item: Stuff & Assembled & Durable,
  maker: Stuff,
  tools: (Stuff & Tooled)[],
): Promise<RepairOutcome | null> {
  item.ensureParts();
  const cat = await jointCatalogue();
  const conditionBefore = item.getCondition();
  const slack = item.slackJoints();
  if (slack.length > 0) {
    const tightened: string[] = [];
    for (const j of slack) {
      const row = await cat.warmed(j.method);
      if (!row || !row.tightenable) continue;
      const gate = await jointGate(maker, row, tools);
      if (gate) return { ok: false, reason: gate.reason, detail: gate.detail };
      item.tightenJoint(j.key, maker.getIdentityPath() ?? '');
      tightened.push(j.key);
    }
    if (tightened.length > 0) {
      return {
        ok: true,
        item,
        conditionBefore,
        costKg: 0,
        rung: 'tightened',
        named: GrammarApi.joinList(tightened),
      };
    }
  }
  const failed = item.failedLines()[0];
  if (failed) {
    // ⭐ The diagnosis rung (grain): below the joint's band you can tell
    // something is wrong with the SET, not which member.
    let named = failed.part;
    if (failed.count > 1) {
      named = lineNoun(failed, failed.count);
      for (const j of jointsOf(item, failed.part)) {
        const row = await cat.warmed(j.method);
        if (row?.competence) {
          const band = await bandIn(maker, row.competence.discipline);
          if (!CompetenceBand.atOrAbove(band, row.competence.band)) {
            named = `something about the ${lineNoun(failed, failed.count)}`;
          }
        }
      }
    }
    return { ok: false, reason: 'part-failed', detail: named };
  }
  return null;
}

/**
 * ⭐⭐ Fit (assembly D5). The raise arm is an ordinary craft — its mint keeps
 * the parts' identity — after every joint the kind's bill names has been
 * gated. The replace arm amends one line of a whole.
 */
async function fitImpl(req: FitRequest): Promise<FitOutcome> {
  const maker = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
  if (!maker || !MixinApi.isContainable(maker)) return { ok: false, reason: 'no-maker' };
  const location = maker.getContainer();
  if (!location) return { ok: false, reason: 'insufficient-input', detail: 'no-location' };
  const { tools } = await gatherMatter(location, maker);
  const cat = await jointCatalogue();

  if (req.recipeRef && !req.whole) {
    const catalogue = await requireCatalogue();
    const recipe =
      catalogue.findByKeyword(req.recipeRef) ?? catalogue.getRecipe(req.recipeRef);
    if (!recipe) return { ok: false, reason: 'no-recipe', detail: req.recipeRef };
    // Gate every joint the made thing will carry, before anything is spent.
    const tpl = await Template.findByPath(recipe.getOutputTemplate());
    const bill = (tpl?.data as { bill?: { joints?: { method?: string }[] } } | undefined)?.bill;
    for (const j of bill?.joints ?? []) {
      const row = j.method ? await cat.warmed(j.method) : null;
      if (!row) continue;
      const gate = await jointGate(maker, row, tools);
      if (gate) return { ok: false, reason: gate.reason, detail: gate.detail };
    }
    const made = await craftImpl({ recipeRef: recipe.getRecipeId(), makerMode: 'self' });
    if (!made.ok) return made;
    return {
      ok: true,
      arm: 'raise',
      output: made.output,
      grade: made.grade,
      recipeId: made.recipeId,
    };
  }

  const whole = req.whole ?? null;
  const part = req.part ?? null;
  if (!whole || !part) return { ok: false, reason: 'insufficient-input', detail: 'nothing-to-fit' };
  if (!MixinApi.isAssembled(whole) || !whole.isAssembly()) {
    return { ok: false, reason: 'no-line', detail: 'not-an-assembly' };
  }
  whole.ensureParts();
  const tplPath = part.getTemplatePath() ?? '';
  const fits = (l: PartLine): boolean =>
    l.template === tplPath ||
    (MixinApi.isPerceptible(part) && part.hasKeyword(l.part));
  const candidates = whole.getParts().filter(fits);
  if (candidates.length === 0) {
    return {
      ok: false,
      reason: 'no-line',
      detail: GrammarApi.joinList(whole.getParts().map((l) => l.part)),
    };
  }
  // The line that needs it most: a failed member first, then the most worn.
  candidates.sort((a, b) => b.failed - a.failed || a.condition - b.condition);
  const line = candidates[0]!;
  for (const j of jointsOf(whole, line.part)) {
    const row = await cat.warmed(j.method);
    if (!row) continue;
    const gate = await jointGate(maker, row, tools);
    if (gate) return { ok: false, reason: gate.reason, detail: gate.detail };
  }

  const stack = MixinApi.isStackable(part);
  const have = stack ? part.getQuantity() : 1;
  const k = Math.min(have, line.failed > 0 ? line.failed : 1, line.count);
  // ⭐ A SOUND member swapped out comes back to hand — a haft you are
  // replacing because you want a better one is still a haft. A failed one
  // (split, sprung) is not worth minting: it is the irreversible branch's.
  let returned: Stuff | null = null;
  if (line.count === 1 && line.failed === 0) {
    returned = await mintMember(line, 1);
  }
  const material = MixinApi.isTangible(part) ? (part.getMaterial()?.getTemplatePath() ?? '') : '';
  const grade = MixinApi.isGraded(part) ? part.getGrade().getBand() : ('fair' as GradeBand);
  const form = MixinApi.isConstructed(part) ? part.getConstructionForm() : '';
  const nested =
    MixinApi.isAssembled(part) && part.isAssembly()
      ? { parts: part.getParts(), joints: part.getJoints() }
      : null;
  const makerId = maker.getIdentityPath() ?? '';
  consumeItemInputs([
    {
      stuff: part,
      count: k,
      stack,
      grade: Grade.of(grade),
      material: (MixinApi.isTangible(part) ? part.getMaterial() : null) as Material,
    },
  ]);
  whole.replaceMembers(line.part, k, {
    material,
    grade,
    ...(form ? { form } : {}),
    maker: makerId,
    ...(nested ? nested : {}),
  });
  // The whole is as good as its worst line (weakest link).
  if (MixinApi.isGraded(whole)) {
    const worst = whole
      .getParts()
      .reduce((g, l) => g.min(Grade.of(l.grade)), Grade.of(whole.getParts()[0]!.grade));
    whole.setGrade(worst);
  }
  if (returned && MixinApi.isContainable(returned) && MixinApi.isContainer(maker)) {
    await ContainmentApi.land(returned, maker, maker);
  }
  try {
    await PersistableApi.captureHostOf(whole);
  } catch (err) {
    console.warn('CraftingLogic: fit capture failed:', err);
  }
  return { ok: true, arm: 'replace', whole, part: line.part, replaced: k, returned };
}

/**
 * Mint `n` members of a line back into the world — the line's own row,
 * carrying the line's material, grade, form, wear and nested record. A
 * stackable row comes back as one stack; anything else as `n` things.
 */
async function mintMember(line: PartLine, n: number, gradeDown = false): Promise<Stuff | null> {
  if (n <= 0 || !line.template) return null;
  let out: Stuff;
  try {
    out = await StuffApi.clone<Stuff>(line.template);
  } catch (err) {
    console.warn(`CraftingLogic: cannot mint a '${line.part}' from '${line.template}':`, err);
    return null;
  }
  const m = line.material ? StuffApi.findByTemplatePath<Material>(line.material) : null;
  if (m && MixinApi.isTangible(out)) out.setMaterial(m);
  if (MixinApi.isGraded(out)) {
    let g = Grade.of(line.grade);
    if (gradeDown) g = Grade.fromOrdinal(g.getOrdinal() - 1);
    out.setGrade(g);
  }
  if (MixinApi.isDurable(out)) out.setCondition(line.condition);
  if (line.form && MixinApi.isConstructed(out)) out.setConstructionForm(line.form);
  if (line.parts && MixinApi.isAssembled(out)) out.recordAssembly(line.parts, line.joints ?? []);
  if (MixinApi.isStackable(out)) out.setQuantity(n);
  return out;
}

/**
 * ⭐⭐ Salvage's REVERSIBLE branch (assembly D6): an assembly taken apart BY
 * ITS JOINTS. Each sound member of a line comes back whole at the joint's
 * recovery × the salvager's hand; fasteners mostly do not survive; a
 * `never` joint sends its members down the irreversible branch, and so does
 * every failed member. Returns null when the thing is not an assembly with
 * joints — the melt-down is the whole answer then.
 */
async function salvageByJoints(
  item: Stuff & Assembled & Durable,
  maker: Stuff,
): Promise<{
  outputs: Stuff[];
  recoveredKg: number;
  recoveredParts: { part: string; count: number; of: number }[];
  /** What did NOT come back, as each part's share of the remainder by
   * mass, in that part's own material — the melt-down's input. */
  remnants: { material: Material | null; share: number }[];
} | null> {
  if (!item.isAssembly()) return null;
  item.ensureParts();
  const joints = item.getJoints();
  if (joints.length === 0) return null;
  const cat = await jointCatalogue();
  const outputs: Stuff[] = [];
  const recoveredParts: { part: string; count: number; of: number }[] = [];
  const lost: { material: Material | null; kg: number }[] = [];
  let recoveredKg = 0;
  for (const line of item.getParts()) {
    const sound = line.count - line.failed;
    const mine = jointsOf(item, line.part);
    let rec = mine.length === 0 ? 0 : 1;
    let factor = 1;
    for (const j of mine) {
      const row = await cat.warmed(j.method);
      if (!row || row.reversible === 'never') {
        rec = 0;
        break;
      }
      const isFastener = j.fastener === line.part || line.role === 'fastener';
      rec = Math.min(rec, isFastener ? row.fastenerRecovery : row.structuralRecovery);
      if (row.competence) {
        factor = Math.min(
          factor,
          RECOVERY_BY_BAND[await bandIn(maker, row.competence.discipline)],
        );
      }
    }
    const back = Math.max(0, Math.min(sound, Math.round(sound * rec * factor)));
    recoveredParts.push({ part: line.part, count: back, of: line.count });
    // The members that did not come back (failed, or lost to the joint),
    // weighed by the row's own unit mass — the melt-down's share.
    if (line.count - back > 0) {
      const tpl = line.template ? await Template.findByPath(line.template) : null;
      const unit = Number((tpl?.data as { mass?: unknown } | undefined)?.mass);
      lost.push({
        material: line.material
          ? (StuffApi.findByTemplatePath<Material>(line.material) ?? null)
          : null,
        kg: (Number.isFinite(unit) && unit > 0 ? unit : 1) * (line.count - back),
      });
    }
    if (back === 0) continue;
    // ⭐ Knocked apart is not as good as made: a member taken out of a set
    // by a hand short of the joint's craft comes back one band worse.
    const minted = await mintMember(line, back, factor < 1);
    if (!minted) continue;
    outputs.push(minted);
    if (MixinApi.isTangible(minted)) {
      const unit = minted.getMass().rawValue();
      recoveredKg += MixinApi.isStackable(minted) ? unit * minted.getQuantity() : unit;
    }
    // A non-stackable row with more than one member back: the rest.
    if (!MixinApi.isStackable(minted)) {
      for (let i = 1; i < back; i++) {
        const more = await mintMember(line, 1, factor < 1);
        if (!more) continue;
        outputs.push(more);
        if (MixinApi.isTangible(more)) recoveredKg += more.getMass().rawValue();
      }
    }
  }
  const total = lost.reduce((a, b) => a + b.kg, 0);
  const remnants = total > 0 ? lost.map((l) => ({ material: l.material, share: l.kg / total })) : [];
  return { outputs, recoveredKg, recoveredParts, remnants };
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

  /** See {@link CraftingApi.fit}. */
  @CallSecurity(CraftingApiCallers)
  public async fit(request: FitRequest): Promise<FitOutcome> {
    return fitImpl(request);
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

  /** See {@link CraftingApi.canMake}. */
  @CallSecurity(CraftingApiCallers)
  public async canMake(recipeRef: string): Promise<boolean> {
    const catalogue = await requireCatalogue();
    const recipe =
      catalogue.findByKeyword(recipeRef) ?? catalogue.getRecipe(recipeRef);
    // ⚠ A ref that resolves to no recipe passes: it is a player's own `def`,
    // which they wrote, and gating what somebody authored on whether they
    // have done it would be a lock with no key.
    if (!recipe) return true;
    const actor = (ExecutionContextApi.getActingAuthor() ?? null) as Stuff | null;
    if (!actor) return false;
    return canMakeImpl(actor, recipe);
  }

  // ---------- what a blend IS, read back off the recipe ----------
  //
  // ⭐ The three doors onto `BlendIdentity`, which was a class of public
  // statics on a `lib/` value holder — callable and invisible. The bodies
  // stay there beside the module-private `recipeOf` walk they share; what
  // moves is the callable surface, and it lands on CRAFTING because the
  // answer is the recipe's. A blend has no Material of its own.

  /** See {@link CraftingApi.blendName}. */
  @CallSecurity(CraftingApiCallers)
  public blendName(
    payload: BulkPayload | null,
    material: Material | null,
  ): string {
    return BlendIdentity.nameOf(payload, material);
  }

  /** See {@link CraftingApi.blendAppearance}. */
  @CallSecurity(CraftingApiCallers)
  public blendAppearance(
    payload: BulkPayload | null,
    material: Material | null,
  ): string {
    return BlendIdentity.appearanceOf(payload, material);
  }

  /** See {@link CraftingApi.blendDiscipline}. */
  @CallSecurity(CraftingApiCallers)
  public blendDiscipline(payload: BulkPayload | null): string {
    return BlendIdentity.disciplineOf(payload);
  }
}
