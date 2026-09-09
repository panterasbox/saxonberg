// StackableLogic — the hot-reloadable logic singleton behind
// StackableApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import type {
  EmptyResultNote,
  QuantityClampedNote,
  QuantityClampedRejectedNote,
  TargetDeclinedNote,
} from '@saxonberg/types';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Stackable } from '../../../lib/stuff/Stackable';
import type { AnyConstructor } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import type {
  ApplyQuantityResult,
  StackActionResult,
  StackApplyQuantity,
  StackApplyStatus,
} from '../../../api/stackable';

/**
 * The four note kinds `applyQuantity` ever emits. Internal alias —
 * controllers consume the canonical types directly from
 * `@saxonberg/types` and forward `result.notes` into `ctx.note(...)`
 * without naming the kinds individually.
 */
type StackNote =
  | QuantityClampedNote
  | QuantityClampedRejectedNote
  | EmptyResultNote
  | TargetDeclinedNote;

type StackableStuff = Stuff & Stackable;

// `AnyOf(FromModule, SelfOnly)`: `FromModule` admits the `StackableApi`
// facade forwarders (and the merge-on-arrival hook callback, which calls
// through them); `SelfOnly` admits the intra-singleton `this.split()` /
// `this.merge()` self-calls inside `applyQuantity`.
const StackableApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/stackable#StackableApi'),
  SecurityPolicies.SelfOnly
);
/** The F1 object face: a Stackable host forwards its own split/absorb. */
const StackCallers = SecurityPolicies.AnyOf(
  StackableApiCallers,
  SecurityPolicies.FromMixin('StackableMixin', {
    // Compare by stuffId — the caller may surface as the raw target
    // while the argument is the proxy (or vice versa).
    where: (caller, _target, _method, args) =>
      (caller as { stuffId?: string }).stuffId !== undefined &&
      (caller as { stuffId?: string }).stuffId ===
        (args[0] as { stuffId?: string } | undefined)?.stuffId,
  }),
);

/**
 * StackableLogic — the hot-reloadable logic singleton behind
 * {@link StackableApi}.
 *
 * Lives at `/platform/idea/api/stackable` (a stateless `Stuff` singleton, no backing
 * `Template`); `StackableApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). The
 * `applyQuantity` orchestrator makes intra-singleton `this.split()` /
 * `this.merge()` self-calls, so every method carries
 * `AnyOf(FromModule, SelfOnly)` (the guts-variant recipe): `FromModule`
 * admits the facade forwarders, `SelfOnly` admits the self-calls.
 * Stateless unit-count helpers are module-private free functions
 * (off-class, ungated, un-callable from outside).
 *
 * `split` / `merge` keep their `@CallSecurity(ApiOnly)` guard on the
 * *facade* (see {@link StackableApi}) — bypassing the merge-on-arrival
 * ripple / `placeDirect` semantics is too powerful for player- or
 * author-tier code, and that public-surface protection is preserved by
 * the forwarder's decorator.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class StackableLogic extends ApiLogic {
  /** See {@link StackableApi.split}. */
  @CallSecurity(StackCallers)
  public async split(
    source: StackableStuff,
    n: number
  ): Promise<StackableStuff> {
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(
        `StackableApi.split: n must be a positive integer (got ${n})`
      );
    }
    if (n > source.getQuantity()) {
      throw new Error(
        `StackableApi.split: n=${n} exceeds source quantity ${source.getQuantity()}`
      );
    }
    if (!source.canSplit(n)) {
      throw new Error(
        `StackableApi.split: canSplit(${n}) vetoed`
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
        `StackableApi.split: source has no templatePath; cannot clone a sibling`
      );
    }

    const splitoff = (await StuffApi.clone<StackableStuff>(path));
    if (!MixinApi.isStackable(splitoff)) {
      // Defensive: cloning at the source's templatePath should produce
      // an instance of the same class. If it doesn't compose
      // Stackable, the world is misconfigured — bail loudly.
      throw new Error(
        `StackableApi.split: clone at '${path}' did not produce a Stackable Stuff`
      );
    }

    // Copy stack-identity fields. The walk is the union of both
    // classes' lists (canonically, `splitoff` has the same shape as
    // source, but the union form keeps subclass cases honest).
    const fields = MixinApi.getAllStackIdentityFields(
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
    // also has none — both stacks exist in the same null-container state.

    source.onSplit(splitoff);
    return splitoff;
  }

  /** See {@link StackableApi.merge}. */
  @CallSecurity(StackCallers)
  public merge(survivor: StackableStuff, absorbed: StackableStuff): void {
    if (!MixinApi.isStackable(survivor) || !MixinApi.isStackable(absorbed)) {
      throw new Error(
        'StackableApi.merge: both arguments must compose StackableMixin'
      );
    }
    if (survivor === absorbed) {
      throw new Error('StackableApi.merge: cannot merge a stack into itself');
    }
    if (!survivor.canMergeWith(absorbed)) {
      throw new Error(
        'StackableApi.merge: survivor.canMergeWith(absorbed) returned false'
      );
    }
    survivor.setQuantity(survivor.getQuantity() + absorbed.getQuantity());
    StuffApi.destruct(absorbed);
    survivor.onMerged(absorbed);
  }

  /** See {@link StackableApi.applyQuantity}. */
  @CallSecurity(StackableApiCallers)
  public async applyQuantity<R>(
    candidates: Stuff[],
    quantity: StackApplyQuantity,
    action: (
      operand: Stuff,
      applied: number
    ) => Promise<StackActionResult<R>>,
    opts: { field: string; query?: string }
  ): Promise<ApplyQuantityResult<R>> {
    const field = opts.field;
    const notes: StackNote[] = [];
    const payloads: R[] = [];

    if (candidates.length === 0) {
      notes.push({
        kind: 'empty-result',
        field,
        query: opts.query ?? '',
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
          field,
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
      let splitInto: StackableStuff | null = null;
      if (MixinApi.isStackable(c) && contribution < c.getQuantity()) {
        operand = await this.split(c, contribution);
        splitInto = operand as StackableStuff;
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
          target: MessageApi.refOf(c),
          reason: result.reason,
        });
        if (splitInto !== null && MixinApi.isStackable(c)) {
          // Restack the splitoff back into the candidate (un-subdivision,
          // symmetric to split). canMergeWith should hold since both
          // sides share the same templatePath + stack-identity state.
          this.merge(c, splitInto);
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
        field,
        requested,
        applied,
      });
    }

    let status: StackApplyStatus | undefined;
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
// Helpers (module-private, off-class, not part of the public surface).
// ---------------------------------------------------------------------------

/**
 * Per-candidate unit contribution: a stackable's full quantity, else
 * 1 unit per non-stackable Stuff.
 */
function unitCount(s: Stuff): number {
  return MixinApi.isStackable(s) ? s.getQuantity() : 1;
}

function sumUnits(candidates: Stuff[]): number {
  let total = 0;
  for (const c of candidates) total += unitCount(c);
  return total;
}
