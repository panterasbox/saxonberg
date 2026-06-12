/**
 * BulkableApi — the single `transfer` primitive over the bulk
 * substrate ({@link BulkableMixin}). Sibling of {@link GlobbableApi}:
 * glob moves discrete fungible units, bulk moves continuous measured
 * matter. Every bulk verb (`fill` / `pour` / `spill` / `drink` /
 * `sip`) is a thin direction over `transfer`.
 *
 * `transfer` is the verb-facing dispatch surface — the bulk analog of
 * `GlobbableApi.applyQuantity` (not of `split` / `merge`): it owns the
 * clamp, the material-compatibility check, the closure / drain-through
 * cascade, and the structured-notes envelope, and every bulk verb is a
 * thin direction over it. Like `applyQuantity`, it is ungated so the
 * controllers can call it directly; the raw slot writes it composes
 * (`BulkSlot.setAmount` / `setMaterial`) are the low-level primitives,
 * mirroring `Globbable.setQuantity`. Programmatic-contract violations
 * throw; user-input failures (clamp, material mismatch, empty source)
 * ride the notes, reusing glob's canonical `@saxonberg/types` note
 * kinds (no new kinds).
 *
 * Operational reference: `docs/subsystems/bulk.md`.
 */

import type {
  EmptyResultNote,
  QuantityClampedNote,
  QuantityClampedRejectedNote,
  TargetDeclinedNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  Bulkable,
  BulkSlot,
  BulkAffordance,
} from '../lib/bulk/Bulkable';
import { compareClosure, requiredClosureFor } from '../lib/bulk/Bulkable';
import type Material from '../lib/material/Material';
import type { MqlQuantity } from './mql';
import { Quantity } from '../lib/quantity';
import { MessageApi } from './message';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

/**
 * The note kinds `transfer` ever emits — reused from glob's set.
 * Controllers forward `result.notes` straight into `ctx.note(...)`.
 */
type BulkNote =
  | EmptyResultNote
  | QuantityClampedNote
  | QuantityClampedRejectedNote
  | TargetDeclinedNote;

/**
 * How much matter to move.
 *
 *   - `{ kind: 'all' }` — the whole of the source slot (`drink`,
 *     `spill`). No clamp note; you get what's there.
 *   - `{ kind: 'measure'; litres; mode }` — a specific volume in the
 *     canonical unit (`fill`-to-capacity, `sip`, `pour 2 cups`). When
 *     it overflows the source or destination, `mode` decides:
 *     `'strict'` rejects entirely (`quantity-clamped-rejected`),
 *     `'lenient'` moves what fits (`quantity-clamped`).
 */
export type TransferAmount =
  | { kind: 'all' }
  | { kind: 'measure'; litres: number; mode: 'strict' | 'lenient' };

/**
 * Outcome of a `transfer`. `status`:
 *   - `'declined'` — nothing moved (empty source, material mismatch,
 *     strict shortfall).
 *   - `'partial'` — some but not all of a measure moved (lenient clamp).
 *   - `'drained'` — an `open` destination didn't retain the liquid; it
 *     drained through to `drainedTo` (the floor's surface puddle).
 * Absent on a clean full transfer.
 */
export type TransferStatus = 'partial' | 'declined' | 'drained';

export interface TransferResult {
  /** Litres actually moved into the final destination. */
  applied: number;
  status?: TransferStatus;
  notes: BulkNote[];
  /**
   * Set when a drain-through cascade re-targeted an `open`
   * destination's pour to a surface puddle — the holder the matter
   * actually landed in. The controller narrates "drains through to a
   * puddle on the floor."
   */
  drainedTo?: Stuff & Bulkable;
}

const BULK_FIELD = 'bulk';

export class BulkableApi {
  /**
   * Resolve a holder's bulk slot handle for a verb. `affordance`
   * comes from `model.field.via?.bulk?.affordance` (set by the `:b`
   * transform or material-keyword resolution); when absent, the
   * holder's single present slot is used. Returns `null` when the
   * holder isn't Bulkable or the slot can't be resolved (ambiguous /
   * missing) — the controller renders the player-facing decline.
   */
  static slotFor(
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

  /**
   * Hand consumed matter to an actor's `ingest` seam (a `Creature`
   * method; v1 no-op). Used by `drink` / `sip`. Duck-typed so a
   * non-Creature giver can't crash the verb; `null` material is a
   * no-op. The bridge lives in the Api layer so both verbs route
   * through one place.
   */
  static ingest(actor: Stuff, material: Material | null, litres: number): void {
    if (material === null) return;
    const eater = actor as unknown as {
      ingest?: (m: Material, q: Quantity<'L'>) => void;
    };
    if (typeof eater.ingest === 'function') {
      eater.ingest(material, Quantity.of(litres, 'L'));
    }
  }

  /**
   * Translate an MQL quantity hint into a {@link TransferAmount}. A
   * `'measure'` converts to canonical litres (via the unit
   * converters); a missing hint or `'all'` yields the verb's
   * `fallback` (`drink`/`spill` pass `{ kind: 'all' }`, `fill` passes
   * its capacity target). A `'count'` is meaningless for bulk and
   * falls back too.
   */
  static amountFromQuantity(
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

  /**
   * Move matter from one bulk slot to another (or to a discard sink,
   * `to === null`, for `drink`).
   *
   * Pipeline:
   *   1. Empty / unresolved source → `empty-result`, declined.
   *   2. Material compatibility on `to` — a non-empty destination must
   *      hold the same material → `target-declined { material-mismatch }`.
   *   3. Closure on an `interior` `to` — if its closure can't retain
   *      the matter, drain through to the floor's surface puddle (one
   *      level of redirection, not recursive).
   *   4. Clamp `applied = min(requested, from.available(),
   *      to.remaining())`; strict shortfall rejects, lenient clamps.
   *   5. Apply: debit the source (skipped for an unbounded source),
   *      credit the destination (adopting the material when it was
   *      empty); a `null` sink just discards.
   */
  static transfer(
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
          target: MessageApi.refOf(to.getHolder() as unknown as Stuff),
          reason: 'material-mismatch',
        });
        return { applied: 0, status: 'declined', notes };
      }
    }

    // 3. Closure on an interior destination — drain through when open.
    if (
      to !== null &&
      to.affordance === 'interior' &&
      compareClosure(to.getClosure(), requiredClosureFor(material)) < 0
    ) {
      const floor = BulkableApi.floorSurfaceNear(to.getHolder());
      if (floor === null) {
        // Defensive no-floor guard (never exercised by the demo, where
        // every location has a floor): discard the matter with a note
        // rather than silently retaining it in an open vessel.
        const discarded = BulkableApi.computeApplied(from, null, amount, notes);
        if (discarded > 0) from.debit(discarded);
        return {
          applied: discarded,
          status: 'drained',
          notes,
        };
      }
      const inner = BulkableApi.transfer(from, floor, amount);
      return {
        applied: inner.applied,
        status: 'drained',
        notes: inner.notes,
        drainedTo: floor.getHolder(),
      };
    }

    // 4. Clamp.
    const applied = BulkableApi.computeApplied(from, to, amount, notes);
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

    const requested =
      amount.kind === 'all' ? from.available() : amount.litres;
    const clampedShort =
      amount.kind === 'measure' && applied < amount.litres;
    const status: TransferStatus | undefined = clampedShort
      ? 'partial'
      : undefined;
    void requested;
    return { applied, status, notes };
  }

  /**
   * Compute the clamped litres to move and push any clamp note.
   * Returns 0 (with a `quantity-clamped-rejected` note) on a strict
   * shortfall. `to === null` is the discard sink (no remaining cap).
   */
  private static computeApplied(
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

  /**
   * Find the surface-bulk slot of the floor in `near`'s location — the
   * drain target for the `spill` verb and the open-vessel drain-through
   * cascade. The floor is an `Adornment` fixture on the location
   * (excluded from enumerated contents); we read the location's
   * fixtures and pick the bulkable surface holder. Returns `null` when
   * the location has no floor (the defensive no-floor case).
   */
  static floorSurfaceNear(near: Stuff): BulkSlot | null {
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

SecurityApi.decorateApiClass(BulkableApi);
