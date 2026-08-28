/**
 * CraftingApi — the craft-resolve surface: the **force that mints
 * particles**, location-agnostic. Transforms input `Tangible` matter
 * (consumed) + reachable tools into a new stamped output `Thing`, cloned
 * from a recipe's output template. The primitive is `recipe + maker +
 * reachable tools/inputs → output`; there is no "venue" concept —
 * feasibility is emergent (is the matter reachable from the maker?).
 *
 * Crafting's spine, encoded here: conservation (inputs debited, output a new
 * stamped thing, nothing from nothing); quality is a verdict (an ordinal
 * {@link Grade}, never a number); provenance carries worth (a per-instance
 * maker's mark via {@link CraftedMixin}); skill = control through one seam
 * (v1 resolves at a fixed control level — no scatter/defects/extremes).
 *
 * **Maker is never passed.** A {@link CraftRequest} carries a `makerMode`
 * *enum*, not a principal. `CraftingLogic` derives the actual maker — the
 * command giver from the execution context (`'self'`, for `serve`/`mix`) or
 * the venue-free fulfilling bartender resolved from world state
 * (`'fulfilling-bartender'`, for `order`). A value off the wire is ignored.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link CraftingLogic} singleton at `/platform/idea/api/crafting`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Grade } from '../lib/craft/Grade';
import type { BuildContribution, BuildMethod } from '../lib/craft/ManualBuild';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { CraftingLogic } from '../platform/idea/api/CraftingLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

/**
 * How the output's maker is resolved — an enum, never a principal:
 * - `'self'` — the command giver (the maker themselves). Used by
 *   `serve` / `mix`.
 * - `'fulfilling-bartender'` — a present maker (a `MakerMixin` agent) in the
 *   giver's location, resolved from world state. Used by `order` (the giver
 *   is the patron).
 */
export type MakerMode = 'self' | 'fulfilling-bartender';

/** The craft request. Carries no maker — only the `makerMode` enum. */
export interface CraftRequest {
  /** Recipe id or keyword. */
  recipeRef: string;
  makerMode: MakerMode;
  /** Optional `with <brand>` input choice — a keyword matched against present inputs. */
  brand?: string;
}

/** Why a craft was infeasible (rendered diegetically by the controller). */
export type CraftDeclineReason =
  | 'no-recipe'
  | 'no-maker'
  | 'missing-tool'
  | 'insufficient-input'
  | 'insufficient-heat'
  | 'no-glass'
  | 'no-output';

export interface CraftSuccess {
  ok: true;
  /** The new stamped output Thing. */
  output: Stuff;
  /** Its derived quality grade. */
  grade: Grade;
  /**
   * The recipe this was made from — `''` for a generic (recipe-unmatched)
   * manual build. Demonstration capture (P8) names the transcribed
   * recipe-script after it; the knowledge ladder (P9) gates on it.
   */
  recipeId: string;
}

export interface CraftFailure {
  ok: false;
  reason: CraftDeclineReason;
  /** Optional detail — the missing capability, the understocked category. */
  detail?: string;
}

/**
 * The outcome of a craft. A discriminated union (not a throw) so a
 * controller renders the diegetic decline cleanly. Programmatic-contract
 * violations (a conservation breach) still throw.
 */
export type CraftOutcome = CraftSuccess | CraftFailure;

/** A display view of a recipe (no behavior) for menu/order rendering. */
export interface RecipeView {
  recipeId: string;
  name: string;
  keywords: readonly string[];
}

/**
 * The manual-build terminal-mint request. The shaker's accumulated
 * buffer is reverse-matched to a recipe (for the output material + grade
 * floor + recipe id) and the destination vessel is filled + stamped. The
 * maker is derived from execution context, never the wire (as with
 * {@link CraftRequest}); the inputs were already debited off the bottles
 * at pour-time, so the mint does not re-consume.
 */
export interface BuildMintRequest {
  /**
   * The destination vessel for a bulk/edible mint — a Crafted + Bulkable
   * glass or dish. Absent for a smithing (workpiece) mint.
   */
  vessel?: Stuff;
  /**
   * The smithing workpiece (the heated, hammered stock — itself the
   * build buffer). A tangible mint consumes it: its Material + mass flow
   * onto the recipe's cloned output (or the generic worked lump).
   */
  workpiece?: Stuff;
  /** The accumulated build buffer (banked contributions). */
  contributions: BuildContribution[];
  /** The highest heat (K) the build was worked at (the vessel's latch);
   * a recipe with `requiresHeatK` above it never reverse-matches. */
  heatedToK?: number;
  /** How the build was worked (recorded; not yet quality-affecting in v1). */
  method?: BuildMethod | null;
  /**
   * The maker's `templatePath`, **captured from `getActingAuthor` at the
   * strain command's dispatch** (a genuine command frame) and carried
   * because the mint runs at engaged-completion, *outside* that frame —
   * the same capture-at-dispatch / use-at-completion pattern
   * `ScheduleApi` uses for `causingCommandId`. The mint still prefers a
   * live `getActingAuthor` when one is present (completed-sync / tests);
   * this is the fallback, never a wire value.
   */
  makerPath?: string;
}

/**
 * The repair request — the item to service. The maker is derived from
 * the execution context, never the wire (as with {@link CraftRequest}).
 */
export interface RepairRequest {
  /** The durable good to restore (already resolved held/reachable). */
  item: Stuff;
  /**
   * The maker's `templatePath`, captured from `getActingAuthor` at the
   * repair command's dispatch and carried because the engaged repair
   * completes *outside* that frame — the same capture-at-dispatch /
   * use-at-completion pattern {@link BuildMintRequest.makerPath} uses.
   * A live `getActingAuthor` is always preferred; this is the
   * fallback, never a wire value.
   */
  makerPath?: string;
}

/** Why a repair was infeasible (rendered diegetically). */
export type RepairDeclineReason =
  | 'no-maker'
  | 'missing-tool'
  | 'insufficient-heat'
  | 'insufficient-input';

export interface RepairSuccess {
  ok: true;
  item: Stuff;
  /** The condition the repair started from (it ends at 1). */
  conditionBefore: number;
  /** The material mass (kg) the repair consumed. */
  costKg: number;
}

export interface RepairFailure {
  ok: false;
  reason: RepairDeclineReason;
  detail?: string;
}

/** The outcome of a repair — declines are data, breaches throw. */
export type RepairOutcome = RepairSuccess | RepairFailure;

/** The salvage request — the form to break down for its matter. */
export interface SalvageRequest {
  /** The Tangible to break down (already resolved held/reachable). */
  item: Stuff;
}

/** Why a salvage was refused (rendered diegetically). */
export type SalvageDeclineReason = 'no-maker' | 'insufficient-input';

export interface SalvageSuccess {
  ok: true;
  /** The recovered raw forms (castings / scrap stacks), unplaced — the
   * controller lands them in the actor's location. */
  outputs: Stuff[];
  /** Total recovered mass (kg) — always ≤ input mass × salvageRate. */
  recoveredKg: number;
}

export interface SalvageFailure {
  ok: false;
  reason: SalvageDeclineReason;
  detail?: string;
}

/** The outcome of a salvage — declines are data, breaches throw. */
export type SalvageOutcome = SalvageSuccess | SalvageFailure;

const LOGIC_PATH = '/platform/idea/api/crafting';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/CraftingLogic', import.meta.url),
);

/** Resolve the HMR-able CraftingLogic singleton (sync). */
function logic(): CraftingLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CraftingLogic',
      ) as typeof CraftingLogic | null) ?? CraftingLogic)(),
  );
}

export class CraftingApi {
  /**
   * Resolve a recipe against the maker's reachable inputs + tools at a fixed
   * control level into a cloned, stamped output Thing, consuming the inputs.
   * Returns a {@link CraftOutcome}; throws only on a programmatic
   * conservation breach. See {@link CraftingLogic.craft}.
   */
  public static async craft(request: CraftRequest): Promise<CraftOutcome> {
    return logic().craft(request);
  }

  /**
   * Mint a drink from a completed manual build — the terminal-step
   * sibling of {@link craft}. Reverse-matches the accumulated buffer to a
   * recipe (generic `mixed drink` if none), derives the weakest-link
   * grade, fills the destination vessel, and stamps it with the maker's
   * mark — reusing the **one** quality model (`Grade` +
   * `CraftedMixin.stamp`). The inputs were debited at pour-time, so this
   * does not re-consume. See {@link CraftingLogic.mintFromBuild}.
   */
  public static async mintFromBuild(
    request: BuildMintRequest,
  ): Promise<CraftOutcome> {
    return logic().mintFromBuild(request);
  }

  /**
   * Repair a durable good — the deficit-priced reverse-craft: material
   * (same category as the item's matter) × the condition deficit × the
   * `crafting.repair.*` dials, doubled when broken; metal wants forge
   * heat, soft goods a `mending` tool. Restores toward full — no
   * permanent-degradation ceiling. The maker is derived from context.
   * See {@link CraftingLogic.repair}.
   */
  public static async repair(request: RepairRequest): Promise<RepairOutcome> {
    return logic().repair(request);
  }

  /**
   * Salvage a Tangible — the one generic lossy melt-down: each
   * constituent material returns `mass × fraction × crafting.salvageRate`
   * in its natural raw form (metal → a re-meltable casting, organics → a
   * scrap stack); the rest is dross. Provenance, grade, and the chattel
   * stamp die with the form. See {@link CraftingLogic.salvage}.
   */
  public static async salvage(
    request: SalvageRequest,
  ): Promise<SalvageOutcome> {
    return logic().salvage(request);
  }

  /**
   * Wash a used glass — return it to the pool: the dregs go to the
   * discard sink, whatever was in it (the garnish) is destructed, the ice
   * is tipped, and the soil mark clears so `craft` will claim it again.
   * The `wash` verb's effect (its controller checks the water). Returns
   * false when `glass` is not a pool glass (not Crafted + Bulkable).
   */
  public static washGlass(glass: Stuff): boolean {
    return logic().washGlass(glass);
  }

  /** Resolve a recipe id/keyword to a display view, or null. */
  public static async lookupRecipe(ref: string): Promise<RecipeView | null> {
    return logic().lookupRecipe(ref);
  }

  /** The display views for a `Menu`'s offered recipes. */
  public static async offeredRecipes(menu: Stuff): Promise<RecipeView[]> {
    return logic().offeredRecipes(menu);
  }
}

SecurityApi.decorateApiClass(CraftingApi);
