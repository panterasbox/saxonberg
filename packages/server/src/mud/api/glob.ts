/**
 * GlobbableApi — split / merge / canMerge / applyQuantity for
 * fungible-stack hosts (`GlobbableMixin`).
 *
 * Two concerns:
 *
 *   - **Mechanics** (`split`, `merge`, `canMerge`): the two-Stuff
 *     transitions that produce or consume a stack. `split` and
 *     `merge` are `@CallSecurity(SecurityPolicies.ApiOnly)` —
 *     bypassing the merge-on-arrival ripple and the matter-was-
 *     already-there semantics of `placeDirect` is too powerful for
 *     player- or author-tier code.
 *   - **Dispatch helper** (`applyQuantity`): the workhorse every
 *     quantity-bearing verb routes through. Owns empty-list /
 *     pre-check / scored-order walk / split-and-reglob / clamp-note
 *     emission. The action callback runs per-operand; the helper
 *     handles the rest.
 *
 * Display rendering (`"30 coins"`) lives on
 * {@link Stuff.getPresentation} — the count folds in as an affix on
 * the universal self-presentation render. The viewer-aware
 * recognition pipeline composes on top of that baseline.
 *
 * Notes use the canonical `@saxonberg/types` shapes — `applyQuantity`
 * stamps `field` from the caller's opts so glob notes drop into
 * `ctx.note(...)` without re-shaping at the controller.
 *
 * Thin, security-gated forwarding shell: the mechanics live in the
 * hot-reloadable {@link GlobbableLogic} singleton at `/obj/api/glob`,
 * reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/glob` reloads it. The `split` / `merge` forwarders keep
 * their `ApiOnly` guard so the powerful public surface stays Api-tier.
 *
 * Operational reference: `docs/subsystems/glob.md`. The bulk-form
 * extension story lives in `docs/slates/tails/bulkable-slate.md`.
 */

import type {
  EmptyResultNote,
  QuantityClampedNote,
  QuantityClampedRejectedNote,
  TargetDeclinedNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Globbable } from '../lib/stuff/Globbable';
import type { MqlQuantity } from './mql';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ContainmentApi } from './containment';
import { GlobbableLogic } from '../obj/api/GlobbableLogic';
import { fileURLToPath } from 'url';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { SecurityApi } from './security';

/**
 * Status flag the helper returns when the outcome diverged from
 * "everything succeeded": `'partial'` when some progress was made but
 * not all (clamp, target-decline mixed with progress); `'declined'`
 * when nothing happened (empty list, strict pre-check rejected, every
 * target declined). Absent on a clean run.
 */
export type GlobApplyStatus = 'partial' | 'declined';

/**
 * Action callback contract for {@link GlobbableApi.applyQuantity}.
 *
 *   - `ok: true` → the action succeeded on this operand. `payload`
 *     rides on the helper's payloads list for controller post-
 *     processing (typically the {operand, applied count} pair used
 *     in prose).
 *   - `ok: false` → the action declined this candidate (e.g.,
 *     destination full, cursed item, recipient refused). `reason` is
 *     an open enumeration carried into a `target-declined` note.
 *     The helper reglobs the operand back into the candidate (if a
 *     split occurred) and continues the walk.
 *
 * Action callbacks should NOT throw to signal soft failures —
 * throws propagate and the helper does not clean up. See G5 in the
 * plan; `ok: false` is the only soft-failure signal.
 */
export type GlobActionResult<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: string };

/**
 * Quantity shape consumed by `applyQuantity` — alias of MQL's
 * {@link MqlQuantity}. Kept under a glob-side name so controller
 * call sites read naturally; the underlying shape is identical.
 */
export type GlobApplyQuantity = MqlQuantity;

/**
 * The four note kinds `applyQuantity` ever emits. Controllers consume
 * the canonical types directly from `@saxonberg/types` and forward
 * `result.notes` into `ctx.note(...)` without naming the kinds
 * individually.
 */
type GlobNote =
  | QuantityClampedNote
  | QuantityClampedRejectedNote
  | EmptyResultNote
  | TargetDeclinedNote;

export interface ApplyQuantityResult<R> {
  ok: boolean;
  applied: number;
  status?: GlobApplyStatus;
  notes: GlobNote[];
  payloads: R[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

type GlobbableStuff = Stuff & Globbable;

const LOGIC_PATH = '/obj/api/glob';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/GlobbableLogic', import.meta.url)
);

/** Resolve the HMR-able GlobbableLogic singleton (sync). */
function logic(): GlobbableLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'GlobbableLogic'
      ) as typeof GlobbableLogic | null) ?? GlobbableLogic)()
  );
}

export class GlobbableApi {
  /**
   * Symmetric kind-equality check used by both the merge-on-arrival
   * ripple in `ContainmentApi.move` and the explicit
   * `GlobbableApi.merge` happy path. Defers to the host's
   * `canMergeWith` (the shadow-friendly seam); falls through to
   * `false` for non-Globbable peers.
   */
  static canMerge(a: Stuff, b: Stuff): boolean {
    return logic().canMerge(a, b);
  }

  /**
   * Split `n` units off `source` into a new Stuff. Semantics:
   *
   *   - Validates `n` is a positive integer ≤ `source.getQuantity()`.
   *     Programmatic-contract violation throws.
   *   - Runs `source.canSplit(n)` (shadow seam). Veto throws.
   *   - **Whole-stack short circuit**: when `n === source.getQuantity()`
   *     returns `source` itself. The caller is going to move the
   *     whole stack; a no-op split avoids the clone churn and
   *     matches the slate's "destruct-on-zero" rule (no orphan
   *     splitoff to clean up).
   *   - Otherwise: clones a fresh Stuff at `source.getTemplatePath()`,
   *     copies every `globIdentityFields` value over, sets quantities
   *     (splitoff = n, source = M - n), `placeDirect`s the splitoff
   *     into source's environment (no arrival witnesses), and fires
   *     `source.onSplit(splitoff)`.
   *
   * `placeDirect` is what makes split silent on movement events —
   * subdividing matter already in the room is not the same as
   * matter arriving there. See
   * [`docs/subsystems/glob.md § GlobbableApi.split`](../../../docs/subsystems/glob.md).
   */
  @CallSecurity(SecurityPolicies.ApiOnly)
  static async split(
    source: GlobbableStuff,
    n: number
  ): Promise<GlobbableStuff> {
    return logic().split(source, n);
  }

  /**
   * Fold `absorbed` into `survivor`. Validates both are Globbable and
   * that `survivor.canMergeWith(absorbed)` returns true. Increments
   * the survivor's quantity, destructs the absorbed Stuff (which
   * fires its own `onDestruct` chain — that's where "this Stuff is
   * going away" subscribers belong), then fires
   * `survivor.onMerged(absorbed)`.
   *
   * `merge` itself emits no movement events. Used by:
   *   - The merge-on-arrival ripple in `ContainmentApi.move` (after
   *     the arrival's `onContainableAdded` has fired, so subscribers
   *     see the arrival before the destruct).
   *   - The reglob path inside `applyQuantity` when an action
   *     returns `{ ok: false }` after a split.
   */
  @CallSecurity(SecurityPolicies.ApiOnly)
  static merge(survivor: GlobbableStuff, absorbed: GlobbableStuff): void {
    logic().merge(survivor, absorbed);
  }

  /**
   * Walk `candidates` in scored order, distributing `quantity` across
   * matches. Non-globbable matches contribute 1 unit each; globbable
   * matches contribute up to their full `getQuantity()`. The
   * action callback runs per operand with the contribution applied.
   *
   * See `docs/subsystems/glob.md § GlobbableApi.applyQuantity` for
   * the full contract.
   *
   * Behavior:
   *   - **Empty candidate list**: immediate `{ ok: false, status:
   *     'declined' }` with an `empty-result` note. No actions run.
   *   - **Strict pre-check** (`mode: 'strict'`, `kind: 'count'`):
   *     `sum(units(c) for c in candidates) < n` → immediate decline
   *     with `quantity-clamped-rejected`. No actions run.
   *   - **All-kind**: act on every candidate at its full
   *     contribution; no clamp.
   *   - **Count-kind**: walk in scored order; for each candidate
   *     `contribution = min(units(c), remaining)`. Split when the
   *     candidate is globbable and `contribution < c.getQuantity()`,
   *     else operand = c.
   *   - **Action ok:false**: emit a `target-declined` note (target =
   *     the candidate, not the operand); if a split occurred, merge
   *     the operand back into c (reglob); continue the walk; remaining
   *     is unchanged.
   *   - **Lenient overflow** (`mode: 'lenient'`, count kind,
   *     remaining > 0 after walk): emit `quantity-clamped`; status
   *     `'partial'`.
   *   - **Status rule**: `'partial'` when any progress was made (any
   *     successful action) AND something diverged (target-declined
   *     or clamp); `'declined'` when `applied === 0`; absent on a
   *     clean run.
   *
   * Throw propagation (G5): if the action throws, the helper does
   * NOT catch — the throw propagates. Partial state may be left in
   * place (a successful split with no reglob). The controller's
   * outer error handler is responsible.
   */
  static async applyQuantity<R>(
    candidates: Stuff[],
    quantity: GlobApplyQuantity,
    action: (
      operand: Stuff,
      applied: number
    ) => Promise<GlobActionResult<R>>,
    opts: { field: string; query?: string }
  ): Promise<ApplyQuantityResult<R>> {
    return logic().applyQuantity(candidates, quantity, action, opts);
  }

  /**
   * Install the merge-on-arrival ripple (a boot-lifecycle call from
   * `BootstrapManager.installFrameworkWiring` — never a module-scope
   * side effect). Fires after `onContainableAdded` for every
   * `ContainmentApi.move` into a container that ends up holding a
   * mergeable sibling of the arriving Stuff. Non-globbable arrivals
   * are skipped; a sole mergeable sibling absorbs the arrival via
   * `GlobbableApi.merge`. Idempotent (the containment slot holds one
   * hook).
   * @internal
   */
  static installMergeOnArrival(): void {
    ContainmentApi._registerMergeOnArrivalHook((moved, to) => {
      if (!MixinApi.isGlobbable(moved)) return;
      if (!MixinApi.isContainer(to)) return;
      for (const sibling of to.getContents()) {
        if (sibling === (moved as unknown as Stuff)) continue;
        if (!MixinApi.isGlobbable(sibling)) continue;
        if (!GlobbableApi.canMerge(sibling, moved)) continue;
        // Resident absorbs the arrival. First mergeable sibling wins —
        // multiple mergeable globs in the same container should never
        // exist by invariant; if they do (initial-state seed, an edge
        // case the slate's "PostRegistration sweep" defers), absorbing
        // into the first one is the conservative pick.
        GlobbableApi.merge(sibling, moved);
        return;
      }
    });
  }
}

SecurityApi.decorateApiClass(GlobbableApi);
