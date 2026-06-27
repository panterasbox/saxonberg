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
 * {@link CraftingLogic} singleton at `/obj/api/crafting`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Grade } from '../lib/craft/Grade';
import type { BuildContribution, BuildMethod } from '../lib/craft/ManualBuild';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { CraftingLogic } from '../obj/api/CraftingLogic';
import { fileURLToPath } from 'url';

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
  | 'no-output';

export interface CraftSuccess {
  ok: true;
  /** The new stamped output Thing. */
  output: Stuff;
  /** Its derived quality grade. */
  grade: Grade;
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
 * floor + recipe id) and the destination glass is filled + stamped. The
 * maker is derived from execution context, never the wire (as with
 * {@link CraftRequest}); the inputs were already debited off the bottles
 * at pour-time, so the mint does not re-consume.
 */
export interface BuildMintRequest {
  /** The destination glass — a Crafted + Bulkable empty cocktail glass. */
  glass: Stuff;
  /** The accumulated build buffer (banked contributions). */
  contributions: BuildContribution[];
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

const LOGIC_PATH = '/obj/api/crafting';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/CraftingLogic', import.meta.url),
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
   * grade, fills the destination glass, and stamps it with the maker's
   * mark — reusing the **one** quality model (`Grade` +
   * `CraftedMixin.stamp`). The inputs were debited at pour-time, so this
   * does not re-consume. See {@link CraftingLogic.mintFromBuild}.
   */
  public static async mintFromBuild(
    request: BuildMintRequest,
  ): Promise<CraftOutcome> {
    return logic().mintFromBuild(request);
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
