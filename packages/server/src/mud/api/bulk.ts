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
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link BulkableLogic} singleton at `/obj/api/bulk`,
 * reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/bulk` reloads it.
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
  BulkSlot,
  BulkAffordance,
  ClosureLevel,
} from '../lib/bulk/Bulkable';
import type Material from '../lib/material/Material';
import type { MqlQuantity } from './mql';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { BulkableLogic } from '../obj/api/BulkableLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

/**
 * The note kinds `transfer` ever emits — reused from glob's set.
 * Controllers forward `result.notes` straight into `ctx.note(...)`.
 */
export type BulkNote =
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
 *     drained through to the floor's surface puddle.
 * Absent on a clean full transfer.
 */
export type TransferStatus = 'partial' | 'declined' | 'drained';

export interface TransferResult {
  /** Litres actually moved into the final destination. */
  applied: number;
  status?: TransferStatus;
  notes: BulkNote[];
}

const LOGIC_PATH = '/obj/api/bulk';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/BulkableLogic', import.meta.url)
);

/** Resolve the HMR-able BulkableLogic singleton (sync). */
function logic(): BulkableLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'BulkableLogic'
      ) as typeof BulkableLogic | null) ?? BulkableLogic)()
  );
}

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
    return logic().slotFor(holder, affordance);
  }

  /**
   * Sign-only comparison of two closure levels by rank — same shape
   * as `Array.prototype.sort`'s comparator. Negative when `a` is the
   * looser closure.
   */
  static compareClosure(a: ClosureLevel, b: ClosureLevel): number {
    return logic().compareClosure(a, b);
  }

  /**
   * The closure level a contained `material` requires to be retained.
   * v1: every bulk material is liquid → `'liquidTight'`. The gas /
   * granular branches are the documented extension point.
   */
  static requiredClosureFor(material: Material | null): ClosureLevel {
    return logic().requiredClosureFor(material);
  }

  /**
   * Hand consumed matter to an actor's `ingest` seam (a `Creature`
   * method; v1 no-op). Used by `drink` / `sip`. Duck-typed so a
   * non-Creature giver can't crash the verb; `null` material is a
   * no-op. The bridge lives in the Api layer so both verbs route
   * through one place.
   */
  static ingest(actor: Stuff, material: Material | null, litres: number): void {
    logic().ingest(actor, material, litres);
  }

  /**
   * Solid analog of {@link ingest} — the `eat` bridge. Routes the
   * consumed solid through the same `Creature.ingest` seam with the
   * `'solid'` phase so it fills the digestion buffer's solid
   * sub-volume. Returns the litres the body actually accepted (the
   * digestion-buffer cap may refuse the excess of an over-full
   * stomach), so `eat` can hold to the partial-transfer contract; a
   * non-Creature giver or `null` material accepts nothing.
   */
  static ingestSolid(
    actor: Stuff,
    material: Material | null,
    litres: number,
  ): number {
    return logic().ingestSolid(actor, material, litres);
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
    return logic().amountFromQuantity(quantity, fallback);
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
    return logic().transfer(from, to, amount);
  }

  /**
   * A one-line room-view summary of any puddle pooling on `location`'s
   * floor — e.g. "A puddle of clear water pools on the floor." Returns
   * `null` when the location has no floor or the floor's surface slot
   * is empty. Consumed by `LookController` so a spill surfaces in the
   * bare `look` (the floor's own `look floor` description carries the
   * puddle too, via the Bulkable markup augmenter).
   */
  static floorPuddleSummary(location: Stuff): string | null {
    return logic().floorPuddleSummary(location);
  }

  /**
   * Find the surface-bulk slot of the floor in `near`'s location — the
   * drain target for the `spill` verb and the open-vessel drain-through
   * cascade. Returns `null` when the location has no floor (the
   * defensive no-floor case).
   */
  static floorSurfaceNear(near: Stuff): BulkSlot | null {
    return logic().floorSurfaceNear(near);
  }
}

SecurityApi.decorateApiClass(BulkableApi);
