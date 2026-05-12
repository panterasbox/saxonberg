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
 * {@link DescribeApi.formatName} — presentation concerns belong with
 * the rest of the description Api. `DescribeApi v2` (recognition
 * slate) supersedes the seam.
 *
 * Notes are returned as a plain list of typed objects in v1 (no
 * response-envelope substrate yet). When the envelope lands,
 * controllers switch from "fold into summary Mml" to `ctx.note(n)`;
 * `applyQuantity`'s return shape is stable across that swap.
 *
 * Operational reference: `docs/subsystems/glob.md`. The bulk-form
 * extension story lives in `docs/slates/bulkable-slate.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Globbable } from '../lib/stuff/Globbable';
import type { AnyConstructor } from './mixin';
import type { MqlQuantity } from './mql';
import {
  ContainmentApi,
  _registerMergeOnArrivalHook,
} from './containment';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';

// ---------------------------------------------------------------------------
// Note types (v1 inline; will fold into the response-envelope slate later).
// ---------------------------------------------------------------------------

/**
 * Lenient overflow: the requested count was higher than the available
 * supply; the helper clamped and ran the action against everything
 * available.
 */
export interface QuantityClampedNote {
  kind: 'quantity-clamped';
  requested: number;
  applied: number;
}

/**
 * Strict pre-check decline: the requested count was higher than the
 * available supply under `mode: 'strict'`. No actions ran.
 */
export interface QuantityClampedRejectedNote {
  kind: 'quantity-clamped-rejected';
  requested: number;
  available: number;
}

/**
 * The candidate list was empty going into `applyQuantity` — no
 * actions ran. `query` is the post-desugar text the resolver saw,
 * paralleling `MqlOneResult.raw` / `MqlManyResult.raw`.
 */
export interface EmptyResultNote {
  kind: 'empty-result';
  query: string;
  reason: 'no-matches';
}

/**
 * An action callback returned `{ ok: false, reason }` for a specific
 * candidate. `target` is the **candidate** (not the post-split
 * operand) so subscribers can pair the decline with the player's
 * intent. `reason` is open-enumeration per controller — e.g.,
 * `'cursed'`, `'too-heavy'`, `'destination-full'`.
 */
export interface TargetDeclinedNote {
  kind: 'target-declined';
  target: Stuff;
  reason: string;
}

export type GlobNote =
  | QuantityClampedNote
  | QuantityClampedRejectedNote
  | EmptyResultNote
  | TargetDeclinedNote;

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

export class GlobbableApi {
  /**
   * Symmetric kind-equality check used by both the merge-on-arrival
   * ripple in `ContainmentApi.move` and the explicit
   * `GlobbableApi.merge` happy path. Defers to the host's
   * `canMergeWith` (the shadow-friendly seam); falls through to
   * `false` for non-Globbable peers.
   */
  static canMerge(a: Stuff, b: Stuff): boolean {
    if (a === b) return false;
    if (!MixinApi.isGlobbable(a) || !MixinApi.isGlobbable(b)) return false;
    return a.canMergeWith(b) && b.canMergeWith(a);
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
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(
        `GlobbableApi.split: n must be a positive integer (got ${n})`
      );
    }
    if (n > source.getQuantity()) {
      throw new Error(
        `GlobbableApi.split: n=${n} exceeds source quantity ${source.getQuantity()}`
      );
    }
    if (!source.canSplit(n)) {
      throw new Error(
        `GlobbableApi.split: canSplit(${n}) vetoed`
      );
    }
    if (n === source.getQuantity()) {
      // Whole-stack short circuit. Caller will move the entire stack;
      // no new Stuff is needed.
      return source;
    }

    const path = source.getTemplatePath();
    if (path === null) {
      throw new Error(
        `GlobbableApi.split: source has no templatePath; cannot clone a sibling`
      );
    }

    const splitoff = (await StuffApi.clone<GlobbableStuff>(path));
    if (!MixinApi.isGlobbable(splitoff)) {
      // Defensive: cloning at the source's templatePath should produce
      // an instance of the same class. If it doesn't compose
      // Globbable, the world is misconfigured — bail loudly.
      throw new Error(
        `GlobbableApi.split: clone at '${path}' did not produce a Globbable Stuff`
      );
    }

    // Copy glob-identity fields. The walk is the union of both
    // classes' lists (canonically, `splitoff` has the same shape as
    // source, but the union form keeps subclass cases honest).
    const fields = MixinApi.getAllGlobIdentityFields(
      source.constructor as AnyConstructor
    );
    for (const f of fields) {
      StuffApi.copyField(source, splitoff, f);
    }

    splitoff.setQuantity(n);
    source.setQuantity(source.getQuantity() - n);

    // Note: the slate uses "environment" colloquially; the codebase's
    // Containable surface is `getContainer` / `setContainer`. Same
    // concept, the method names differ.
    const env = MixinApi.isContainable(source)
      ? source.getContainer()
      : null;
    if (env !== null) {
      ContainmentApi.placeDirect(
        splitoff as unknown as Stuff & Containable,
        env as Stuff & Container
      );
    }
    // If source has no container (sitting in limbo), the splitoff
    // also has none — both globs exist in the same null-container state.

    source.onSplit(splitoff);
    return splitoff;
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
  static merge(
    survivor: GlobbableStuff,
    absorbed: GlobbableStuff
  ): void {
    if (!MixinApi.isGlobbable(survivor) || !MixinApi.isGlobbable(absorbed)) {
      throw new Error(
        'GlobbableApi.merge: both arguments must compose GlobbableMixin'
      );
    }
    if (survivor === absorbed) {
      throw new Error('GlobbableApi.merge: cannot merge a stack into itself');
    }
    if (!survivor.canMergeWith(absorbed)) {
      throw new Error(
        'GlobbableApi.merge: survivor.canMergeWith(absorbed) returned false'
      );
    }
    survivor.setQuantity(survivor.getQuantity() + absorbed.getQuantity());
    StuffApi.destruct(absorbed);
    survivor.onMerged(absorbed);
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
    opts: { query?: string } = {}
  ): Promise<ApplyQuantityResult<R>> {
    const notes: GlobNote[] = [];
    const payloads: R[] = [];

    if (candidates.length === 0) {
      notes.push({
        kind: 'empty-result',
        query: opts.query ?? '',
        reason: 'no-matches',
      });
      return {
        ok: false,
        applied: 0,
        status: 'declined',
        notes,
        payloads,
      };
    }

    const isCount = quantity.value.kind === 'count';
    const isStrict = quantity.mode === 'strict';
    const requested = isCount
      ? (quantity.value as { kind: 'count'; n: number }).n
      : Infinity;

    // Strict pre-check: under count + strict, sum total available units
    // and decline if short. The action never runs in that case.
    if (isCount && isStrict) {
      const total = sumUnits(candidates);
      if (total < requested) {
        notes.push({
          kind: 'quantity-clamped-rejected',
          requested,
          available: total,
        });
        return {
          ok: false,
          applied: 0,
          status: 'declined',
          notes,
          payloads,
        };
      }
    }

    let applied = 0;
    let remaining = isCount ? requested : Infinity;
    let anyOk = false;
    let anyDecline = false;

    for (const c of candidates) {
      if (remaining <= 0) break;
      const units = unitCount(c);
      const contribution = Math.min(units, remaining);
      if (contribution <= 0) continue;

      let operand: Stuff = c;
      let splitInto: GlobbableStuff | null = null;
      if (MixinApi.isGlobbable(c) && contribution < c.getQuantity()) {
        operand = await GlobbableApi.split(c, contribution);
        splitInto = operand as GlobbableStuff;
      }

      const result = await action(operand, contribution);

      if (result.ok) {
        anyOk = true;
        applied += contribution;
        remaining -= contribution;
        payloads.push(result.payload);
      } else {
        anyDecline = true;
        notes.push({
          kind: 'target-declined',
          target: c,
          reason: result.reason,
        });
        if (splitInto !== null && MixinApi.isGlobbable(c)) {
          // Reglob the splitoff back into the candidate (un-subdivision,
          // symmetric to split). canMergeWith should hold since both
          // sides share the same templatePath + glob-identity state.
          GlobbableApi.merge(c, splitInto);
        }
        // remaining unchanged — the requested count still has its
        // budget; continue the walk to next candidate.
      }
    }

    // Lenient clamp: count + lenient + remaining > 0 means we ran out
    // of supply before reaching the requested count.
    if (
      isCount &&
      !isStrict &&
      remaining > 0 &&
      (anyOk || !anyDecline)
    ) {
      notes.push({
        kind: 'quantity-clamped',
        requested,
        applied,
      });
    }

    let status: GlobApplyStatus | undefined;
    if (applied === 0) {
      status = 'declined';
    } else if (anyDecline || (isCount && !isStrict && remaining > 0)) {
      status = 'partial';
    }

    const ok = applied > 0;
    return { ok, applied, status, notes, payloads };
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-local, not part of the public surface).
// ---------------------------------------------------------------------------

/**
 * Per-candidate unit contribution: a globbable's full quantity, else
 * 1 unit per non-globbable Stuff.
 */
function unitCount(s: Stuff): number {
  return MixinApi.isGlobbable(s) ? s.getQuantity() : 1;
}

function sumUnits(candidates: Stuff[]): number {
  let total = 0;
  for (const c of candidates) total += unitCount(c);
  return total;
}

SecurityApi.decorateApiClass(GlobbableApi);

// Install the merge-on-arrival ripple. Fires after
// `onContainableAdded` for every `ContainmentApi.move` into a
// container that ends up holding a mergeable sibling of the
// arriving Stuff. Non-globbable arrivals are skipped here; a sole
// mergeable sibling absorbs the arrival via `GlobbableApi.merge`.
_registerMergeOnArrivalHook((moved, to) => {
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
