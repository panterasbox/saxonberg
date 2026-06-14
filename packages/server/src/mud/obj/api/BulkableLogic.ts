// BulkableLogic — the hot-reloadable logic singleton behind
// BulkableApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  BulkSlot,
  BulkAffordance,
  ClosureLevel,
} from '../../lib/bulk/Bulkable';
import { CLOSURE_ORDER } from '../../lib/bulk/Bulkable';
import type Material from '../../lib/material/Material';
import type { MqlQuantity } from '../../api/mql';
import { Quantity } from '../../lib/quantity';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import type {
  BulkNote,
  TransferAmount,
  TransferResult,
  TransferStatus,
} from '../../api/bulk';

const BULK_FIELD = 'bulk';

// `AnyOf(FromModule, SelfOnly)`: `FromModule` admits the `BulkableApi`
// facade forwarders; `SelfOnly` admits the intra-singleton self-calls
// inside `transfer` (recursive `this.transfer` for drain-through, plus
// `this.floorSurfaceNear`).
const BulkableApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('mud/api/bulk#BulkableApi'),
  SecurityPolicies.SelfOnly
);

/**
 * BulkableLogic — the hot-reloadable logic singleton behind
 * {@link BulkableApi}.
 *
 * Lives at `/obj/api/bulk` (a stateless `Stuff` singleton, no backing
 * `Template`); `BulkableApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): `transfer` makes
 * intra-singleton self-calls — a recursive `this.transfer` for the
 * open-vessel drain-through cascade and a `this.floorSurfaceNear` for
 * the drain target — so every method carries `AnyOf`. The clamp helper
 * (`computeApplied`) is a module-private free function (off-class,
 * ungated, un-callable from outside).
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
export class BulkableLogic extends Idea {
  /** See {@link BulkableApi.slotFor}. */
  @CallSecurity(BulkableApiCallers)
  public slotFor(
    holder: Stuff,
    affordance: BulkAffordance | undefined,
  ): BulkSlot | null {
    if (!MixinApi.isBulkable(holder)) return null;
    try {
      return holder.getBulk(affordance);
    } catch {
      return null;
    }
  }

  /** See {@link BulkableApi.compareClosure}. */
  @CallSecurity(BulkableApiCallers)
  public compareClosure(a: ClosureLevel, b: ClosureLevel): number {
    return CLOSURE_ORDER[a] - CLOSURE_ORDER[b];
  }

  /** See {@link BulkableApi.requiredClosureFor}. */
  @CallSecurity(BulkableApiCallers)
  public requiredClosureFor(_material: Material | null): ClosureLevel {
    // Gas extension point: when a Material carries a 'gas' phase, return
    // 'sealed'; 'granular' → 'open'. v1 has only liquid.
    return 'liquidTight';
  }

  /** See {@link BulkableApi.ingest}. */
  @CallSecurity(BulkableApiCallers)
  public ingest(actor: Stuff, material: Material | null, litres: number): void {
    if (material === null) return;
    const eater = actor as unknown as {
      ingest?: (m: Material, q: Quantity<'L'>, phase?: 'solid' | 'liquid') => void;
    };
    if (typeof eater.ingest === 'function') {
      eater.ingest(material, Quantity.of(litres, 'L'), 'liquid');
    }
  }

  /** See {@link BulkableApi.ingestSolid}. */
  @CallSecurity(BulkableApiCallers)
  public ingestSolid(
    actor: Stuff,
    material: Material | null,
    litres: number,
  ): number {
    if (material === null) return 0;
    const eater = actor as unknown as {
      ingest?: (
        m: Material,
        q: Quantity<'L'>,
        phase?: 'solid' | 'liquid',
      ) => number | void;
    };
    if (typeof eater.ingest !== 'function') return 0;
    const accepted = eater.ingest(material, Quantity.of(litres, 'L'), 'solid');
    return typeof accepted === 'number' ? accepted : litres;
  }

  /** See {@link BulkableApi.amountFromQuantity}. */
  @CallSecurity(BulkableApiCallers)
  public amountFromQuantity(
    quantity: MqlQuantity | undefined,
    fallback: TransferAmount,
  ): TransferAmount {
    if (!quantity) return fallback;
    const v = quantity.value;
    if (v.kind === 'measure') {
      const litres = Quantity.of(v.value, v.unit).to('L').rawValue();
      return { kind: 'measure', litres, mode: quantity.mode };
    }
    if (v.kind === 'all') return { kind: 'all' };
    return fallback;
  }

  /** See {@link BulkableApi.transfer}. */
  @CallSecurity(BulkableApiCallers)
  public transfer(
    from: BulkSlot,
    to: BulkSlot | null,
    amount: TransferAmount,
  ): TransferResult {
    const notes: BulkNote[] = [];

    const material = from.getMaterial();
    if (from.isEmpty() || material === null) {
      notes.push({ kind: 'empty-result', field: BULK_FIELD, query: '' });
      return { applied: 0, status: 'declined', notes };
    }

    // 2. Material compatibility on the destination.
    if (to !== null && !to.isEmpty()) {
      const toPath = to.getMaterialPath();
      if (toPath !== null && toPath !== from.getMaterialPath()) {
        notes.push({
          kind: 'target-declined',
          target: MessageApi.refOf(to.getHolder()),
          reason: 'material-mismatch',
        });
        return { applied: 0, status: 'declined', notes };
      }
    }

    // 3. Closure on an interior destination — drain through when open.
    if (
      to !== null &&
      to.affordance === 'interior' &&
      this.compareClosure(to.getClosure(), this.requiredClosureFor(material)) <
        0
    ) {
      const floor = this.floorSurfaceNear(to.getHolder());
      if (floor === null) {
        // Defensive no-floor guard (never exercised by the demo, where
        // every location has a floor): discard the matter with a note
        // rather than silently retaining it in an open vessel.
        const discarded = computeApplied(from, null, amount, notes);
        if (discarded > 0) from.debit(discarded);
        return {
          applied: discarded,
          status: 'drained',
          notes,
        };
      }
      const inner = this.transfer(from, floor, amount);
      return {
        applied: inner.applied,
        status: 'drained',
        notes: inner.notes,
      };
    }

    // 4. Clamp.
    const applied = computeApplied(from, to, amount, notes);
    if (applied <= 0) {
      // computeApplied already pushed the appropriate note (strict
      // rejection or empty); declined.
      return { applied: 0, status: 'declined', notes };
    }

    // 5. Apply.
    from.debit(applied);
    if (to !== null) {
      if (to.isEmpty()) to.setMaterial(material);
      to.setAmount(to.getAmount().add(Quantity.of(applied, 'L')));
    }

    const clampedShort =
      amount.kind === 'measure' && applied < amount.litres;
    const status: TransferStatus | undefined = clampedShort
      ? 'partial'
      : undefined;
    return { applied, status, notes };
  }

  /** See {@link BulkableApi.floorPuddleSummary}. */
  @CallSecurity(BulkableApiCallers)
  public floorPuddleSummary(location: Stuff): string | null {
    if (!MixinApi.isAdornable(location)) return null;
    for (const fixture of location.getFixtures()) {
      if (!MixinApi.isBulkable(fixture) || !fixture.hasSurfaceBulk()) continue;
      const slot = fixture.getBulk('surface');
      if (slot.isEmpty()) continue;
      const appearance = slot.getMaterial()?.getAppearance();
      if (appearance) return `A puddle of ${appearance} pools on the floor.`;
    }
    return null;
  }

  /** See {@link BulkableApi.floorSurfaceNear}. */
  @CallSecurity(BulkableApiCallers)
  public floorSurfaceNear(near: Stuff): BulkSlot | null {
    // Walk up the containment chain — a held vessel's immediate
    // container is the actor, not the room — until an Adornable host
    // (the location) carries a bulkable surface fixture (the floor).
    let cur: Stuff | null = MixinApi.isContainable(near)
      ? near.getContainer()
      : null;
    while (cur !== null) {
      if (MixinApi.isAdornable(cur)) {
        for (const fixture of cur.getFixtures()) {
          if (MixinApi.isBulkable(fixture) && fixture.hasSurfaceBulk()) {
            return fixture.getBulk('surface');
          }
        }
      }
      cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private, off-class, not part of the public surface).
// ---------------------------------------------------------------------------

/**
 * Compute the clamped litres to move and push any clamp note.
 * Returns 0 (with a `quantity-clamped-rejected` note) on a strict
 * shortfall. `to === null` is the discard sink (no remaining cap).
 */
function computeApplied(
  from: BulkSlot,
  to: BulkSlot | null,
  amount: TransferAmount,
  notes: BulkNote[],
): number {
  const sourceAvail = from.available();
  const destRoom = to === null ? Infinity : to.remaining();
  if (amount.kind === 'all') {
    // Take the whole source, bounded by the destination's room.
    return Math.max(0, Math.min(sourceAvail, destRoom));
  }
  const requested = amount.litres;
  const fittable = Math.min(sourceAvail, destRoom);
  if (requested <= fittable) return requested;
  // Shortfall.
  if (amount.mode === 'strict') {
    notes.push({
      kind: 'quantity-clamped-rejected',
      field: BULK_FIELD,
      requested,
      available: Number.isFinite(fittable) ? fittable : requested,
    });
    return 0;
  }
  notes.push({
    kind: 'quantity-clamped',
    field: BULK_FIELD,
    requested,
    applied: fittable,
  });
  return fittable;
}
