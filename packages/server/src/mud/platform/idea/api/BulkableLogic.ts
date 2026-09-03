// BulkableLogic — the hot-reloadable logic singleton behind
// BulkableApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type {
  BulkSlot,
  BulkAffordance,
  BulkPayload,
  ClosureLevel,
} from '../../../lib/bulk/Bulkable';
import { CLOSURE_ORDER, BULK_VOLUME_UNIT } from '../../../lib/bulk/Bulkable';
import type Material from '../../../lib/material/Material';
import { Freshness } from '../../../lib/material/Freshness';
import type { MqlQuantity } from '../../../api/mql';
import { Quantity } from '../../../lib/quantity';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { QuantityApi } from '../../../api/quantity';
import type {
  BulkNote,
  TransferAmount,
  TransferResult,
  TransferStatus,
} from '../../../api/bulk';

const BULK_FIELD = 'bulk';

// `AnyOf(FromModule, SelfOnly)`: `FromModule` admits the `BulkableApi`
// facade forwarders; `SelfOnly` admits the intra-singleton self-calls
// inside `transfer` (recursive `this.transfer` for drain-through, plus
// `this.floorSurfaceNear`).
const BulkableApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/bulk#BulkableApi'),
  SecurityPolicies.SelfOnly
);

/**
 * BulkableLogic — the hot-reloadable logic singleton behind
 * {@link BulkableApi}.
 *
 * Lives at `/platform/idea/api/bulk` (a stateless `Stuff` singleton, no backing
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
@Unshadowable
export class BulkableLogic extends ApiLogic {
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
  public ingest(
    actor: Stuff,
    material: Material | null,
    litres: number,
    payload: BulkPayload | null = null,
  ): void {
    if (material === null) return;
    const eater = actor as unknown as {
      ingest?: (
        m: Material,
        q: Quantity<'L'>,
        phase?: 'solid' | 'liquid',
        payload?: BulkPayload | null,
      ) => void;
    };
    if (typeof eater.ingest === 'function') {
      eater.ingest(material, Quantity.of(litres, 'L'), 'liquid', payload);
    }
    // The substance's own leg, duck-typed exactly as the drinker's is
    // two lines above. A potion is a liquid that carries a working
    // (magic-items D4), and this is the one bridge `drink` and `sip`
    // both route through — so firing it here means every ingestion path
    // fires it, and bulk still never imports magic. An ordinary liquid
    // has no such method and this is a no-op.
    const substance = material as unknown as {
      dischargeInto?: (drinker: Stuff, litres: number) => Promise<string[]>;
    };
    if (typeof substance.dischargeInto === 'function') {
      // Fire-and-forget: the working's own prose rides the scene, and a
      // failure inside it must never abort the swallow that already
      // happened.
      void substance.dischargeInto(actor, litres).catch(() => {});
    }
  }

  /** See {@link BulkableApi.ingestSolid}. */
  @CallSecurity(BulkableApiCallers)
  public ingestSolid(
    actor: Stuff,
    material: Material | null,
    litres: number,
    payload: BulkPayload | null = null,
  ): number {
    if (material === null) return 0;
    const eater = actor as unknown as {
      ingest?: (
        m: Material,
        q: Quantity<'L'>,
        phase?: 'solid' | 'liquid',
        payload?: BulkPayload | null,
      ) => number | void;
    };
    if (typeof eater.ingest !== 'function') return 0;
    const accepted = eater.ingest(
      material,
      Quantity.of(litres, 'L'),
      'solid',
      payload,
    );
    return typeof accepted === 'number' ? accepted : litres;
  }

  /** See {@link BulkableApi.amountFromOption}. */
  @CallSecurity(BulkableApiCallers)
  public amountFromOption(
    raw: string | undefined,
    fallback: TransferAmount,
    exact = false,
  ): TransferAmount {
    if (typeof raw !== 'string' || raw.trim().length === 0) return fallback;
    try {
      // ⚠ `Quantity.parse` wants `<number> <exact-token>` — `2 cup`
      // parses and `2cups`, `2 cups`, `100ml` and `0.5L` all throw.
      // That is right for authored data and far too strict for a player
      // typing an option, so the normalising happens HERE, at the
      // player boundary, rather than by loosening the parser everything
      // else depends on.
      const m = /^([0-9]*\.?[0-9]+)\s*([a-zA-Z]+)$/.exec(raw.trim());
      if (!m) return fallback;
      const n = Number(m[1]);
      const word = m[2]!;
      const unit =
        QuantityApi.resolveUnitToken(word) ??
        // plural → singular, the one form a player reliably types
        (word.endsWith('s')
          ? QuantityApi.resolveUnitToken(word.slice(0, -1))
          : null);
      if (!unit || !Number.isFinite(n)) return fallback;
      const litres = Quantity.of(n, unit as 'L').to(BULK_VOLUME_UNIT).rawValue();
      if (!Number.isFinite(litres) || litres <= 0) return fallback;
      return {
        kind: 'measure',
        litres,
        mode: exact ? 'strict' : 'lenient',
      };
    } catch {
      // An unparseable measure falls back rather than throwing: the
      // player typed something, and taking the whole slot is a worse
      // surprise than saying so — the CALLER reports the miss.
      return fallback;
    }
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

    // 2. Material compatibility on the destination. Before declining a
    // mismatch, offer it to a Fermenting destination as an INOCULATION
    // (fermentation D14/P12): a strain-bearing pour into a sterile
    // batch is a PITCH, sugar into a culture jar is a FEED — the same
    // seam that carries band and mark carries strain. Anything else
    // declines exactly as before.
    if (to !== null && !to.isEmpty()) {
      const toPath = to.getMaterialPath();
      if (toPath !== null && toPath !== from.getMaterialPath()) {
        const inoculated = tryInoculate(from, to, amount, notes);
        if (inoculated !== null) return inoculated;
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

    // Capture pre-transfer thermal state for the calorimetric blend
    // (Step 1.7) — the fidelity tier on the primitive. Gated on both
    // holders being Thermal so non-thermal transfers are unchanged.
    const fromHolder = from.getHolder();
    const toHolder = to?.getHolder() ?? null;
    const toAmountBefore = to !== null ? to.getAmount().rawValue() : 0;
    const blendFromK =
      toHolder !== null && MixinApi.isThermal(fromHolder)
        ? fromHolder.getTemperature().rawValue()
        : null;
    const blendToK =
      toHolder !== null && MixinApi.isThermal(toHolder)
        ? toHolder.getTemperature().rawValue()
        : null;

    // 5. Apply. Capture the source's blend payload BEFORE the debit — a
    // full drain clears it with the material. ⭐ Same for the spoilage
    // gauge, which rides the MATTER — and which, unlike the payload
    // (identity, riding into an EMPTY destination only), blends by mass on
    // EVERY pour. Otherwise decanting a spoiled pot into a fresh one would
    // launder it: the pour-to-reset exploit.
    const fromLoad = Freshness.loadOf(from);
    const toLoadBefore = to !== null ? Freshness.loadOf(to) : 0;
    const fromPayload = from.getPayload();
    const toWasEmpty = to !== null && to.isEmpty();
    from.debit(applied);
    if (to !== null) {
      if (toWasEmpty) {
        to.setMaterial(material);
        // A blend poured into an empty vessel stays that blend (a copy).
        // Same-material pours into a non-empty vessel keep the
        // destination's payload — blend merging is out of scope.
        if (fromPayload) to.setPayload(fromPayload);
        // The grade seam (fermentation D6/W0): a fresh fill from a
        // graded batch carries the batch's identity — band, and the
        // maker's mark when both sides can hold one. Same rule as the
        // payload: identity rides into an EMPTY destination only; a
        // top-up keeps the destination's own identity (blend identity
        // is out of scope, like blend merging above).
        carryBatchIdentity(fromHolder, toHolder);
      }
      to.setAmount(to.getAmount().add(Quantity.of(applied, 'L')));
      // Mass(volume)-weighted blend of the two loads. A pour into an empty
      // slot just carries the source's load across (the arithmetic degrades
      // to that on its own when `toAmountBefore` is 0).
      if (to.getPayload()?.freshness || fromLoad > 0) {
        Freshness.stampLoad(
          to,
          Freshness.blendLoads(fromLoad, applied, toLoadBefore, toAmountBefore),
        );
      }
    }

    // 6. Thermal coupling (gated). Same material both sides (enforced at
    // step 2), so specific heats cancel — the blend is a volume-weighted
    // average. Refill into an empty vessel adopts the incoming
    // temperature; a partial pour leaves the source hotter-per-unit but
    // re-anchors so its now-smaller heat capacity cools the remainder
    // faster.
    if (toHolder !== null && MixinApi.isThermal(toHolder) && blendFromK !== null) {
      const newK =
        toAmountBefore <= 0 || blendToK === null
          ? blendFromK
          : (applied * blendFromK + toAmountBefore * blendToK) /
            (applied + toAmountBefore);
      toHolder.setContentsTemperature(newK);
    }
    if (MixinApi.isThermal(fromHolder)) {
      // Freeze-and-re-anchor at the reduced capacity (pour cools faster).
      fromHolder.setContentsTemperature(fromHolder.getTemperature().rawValue());
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
/**
 * Carry a graded batch's identity across a fresh fill (the fermentation
 * grade seam, D6). Module-private free function beside `computeApplied`
 * for the same reason: pure glue on already-narrowed holders, not
 * external surface.
 *
 * - Band: source Graded + target Graded → the target adopts the
 *   source's grade.
 * - Maker's mark: source Crafted + target Crafted → maker, recipe and
 *   craftedAt ride along too (Crafted extends Graded, so the band case
 *   above already fired).
 * - Anything else is a no-op — an ungraded source or an unmarkable
 *   target leaves the transfer exactly as before.
 */
/**
 * The inoculation branch of the transfer seam (fermentation D14): a
 * cross-material pour into a Fermenting interior may be a PITCH (a
 * strain-bearing source into a sterile batch) or a FEED (sugar into a
 * culture). The poured volume joins the destination's batch — the
 * material identity stays the batch's — and the classified effect is
 * applied by the vessel itself. Returns `null` when the pour is a
 * plain mismatch (the caller declines as before).
 */
function tryInoculate(
  from: BulkSlot,
  to: BulkSlot,
  amount: TransferAmount,
  notes: BulkNote[],
): TransferResult | null {
  if (to.affordance !== 'interior') return null;
  const toHolder = to.getHolder();
  if (!MixinApi.isFermenting(toHolder)) return null;
  const material = from.getMaterial();
  if (material === null) return null;
  const fromHolder = from.getHolder();
  const strain = MixinApi.isFermenting(fromHolder)
    ? fromHolder.getBatchStrain()
    : strainTagOf(material);
  const kind = toHolder.classifyForeignPour(material, strain);
  if (kind === null) return null;
  const applied = computeApplied(from, to, amount, notes);
  if (applied <= 0) return { applied: 0, status: 'declined', notes };
  from.debit(applied);
  to.setAmount(to.getAmount().add(Quantity.of(applied, 'L')));
  toHolder.applyForeignPour(kind, strain, applied);
  return { applied, notes };
}

/** A material's authored strain (`strain:<x>` tag), or `''`. */
function strainTagOf(material: Material): string {
  for (const tag of material.getTags()) {
    if (tag.startsWith('strain:')) return tag.slice('strain:'.length);
  }
  return '';
}

function carryBatchIdentity(
  fromHolder: Stuff,
  toHolder: Stuff | null,
): void {
  if (toHolder === null) return;
  if (!MixinApi.isGraded(fromHolder) || !MixinApi.isGraded(toHolder)) return;
  toHolder.setGrade(fromHolder.getGrade());
  if (MixinApi.isCrafted(fromHolder) && MixinApi.isCrafted(toHolder)) {
    toHolder.setMaker(fromHolder.getMaker());
    toHolder.setRecipe(fromHolder.getRecipe());
    toHolder.setCraftedAt(fromHolder.getCraftedAt());
  }
}

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
