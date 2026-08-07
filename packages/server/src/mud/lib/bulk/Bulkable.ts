/**
 * BulkableMixin — holds-as-attribute substrate for continuous,
 * formless, measured matter (liquid in v1).
 *
 * A `Bulkable` host carries up to two **bulk slots**, one per
 * affordance:
 *
 *   - **interior** — a vessel holds liquid (thermos, mug, urn).
 *   - **surface** — liquid pools on a surface (the floor's puddle).
 *
 * A slot is `{ material, amount }`: a Pattern-A material-path ref
 * (resolved on read, HMR-safe) plus a `Quantity<'L'>` amount. Bulk is
 * NOT a Stuff — it has no containment node; it is an attribute of the
 * holder. Matter moves between slots through the single
 * `BulkableApi.transfer` primitive; every bulk verb is a direction
 * over it.
 *
 * The two affordances are **independent of the spatial mixins**:
 * interior-bulk does not require `Container` (a fluid-only thermos
 * holds no pens); surface-bulk does not require `Surfaced` (the floor
 * carries a puddle without being a discrete-resting surface). Each
 * slot is gated by an authored boolean flag (`interiorBulk` /
 * `surfaceBulk` in template `data:`) so composition is explicit per
 * host — the auto-compose-on-every-Container question is deferred.
 *
 * **This mixin is NOT** discrete containment (that's `Container`), a
 * fungible-stack of discrete units (that's `Globbable`), or a lid's
 * open/close state (that's `Sealable`). The `closure` scale here is
 * the vessel's inherent construction (a steel bucket vs a steel
 * sieve), gating only the bulk domain.
 *
 * Canonical storage unit is `'L'` ({@link BULK_VOLUME_UNIT}); authored
 * or player-typed `cup` / `mL` measures convert to `L` at the
 * boundary. Capacity is interim-authored here (`interiorCapacity` /
 * `surfaceCapacity`); it folds into collision's volume-kind capacity
 * check later. An **inexhaustible** source (the coffee urn) is a
 * separate, narrow capability — `UnboundedSourceMixin`
 * (`UnboundedSource.ts`) — composed only on source fixtures; the base
 * substrate knows nothing about it.
 *
 * Operational reference: `docs/subsystems/bulk.md`. Discrete sibling:
 * `docs/subsystems/glob.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../obj/persistence/QuantityMarshaller';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { RecognitionApi } from '../../api/recognition';
import type { MarkupAugmenter } from '../../api/mml';
import type Material from '../material/Material';

/**
 * Ordered liquid-retention scale on a bulk holder. The vessel retains
 * matter when its `closure` meets-or-exceeds the matter's required
 * level. v1 bulk is all liquid (requires `BulkableApi.requiredClosureFor`
 * → `'liquidTight'`), so an `open` vessel does not retain it — it drains
 * through to the surface below. `sealed` (gas) and the
 * phase→required-level mapping are defined here but unexercised until
 * gas content lands.
 */
export type ClosureLevel = 'open' | 'liquidTight' | 'sealed';

/** Numeric rank for {@link ClosureLevel} comparison. */
export const CLOSURE_ORDER: Record<ClosureLevel, number> = {
  open: 0,
  liquidTight: 1,
  sealed: 2,
};

/** Which bulk slot a holder offers / a match arrived through. */
export type BulkAffordance = 'interior' | 'surface';

/**
 * Canonical storage unit for every liquid bulk amount. All amounts and
 * capacities are `Quantity<'L'>`; cross-unit measures (`cup`, `mL`)
 * convert to litres at the parse / transfer boundary.
 */
export const BULK_VOLUME_UNIT = 'L' as const;

/**
 * A **per-instance blend payload** — the identity + metabolism face of
 * a *derived mixture* held in a bulk slot (a plated stew, a mixed
 * drink): what an anonymous per-blend `Material` row would have said,
 * carried on the holding instance instead. This is what keeps the
 * material library a **fixed, curated vocabulary**: a blend's slot
 * points at one generic substance Material (physics + routing home)
 * while the payload carries the *derived* name/prose/macros — macros in
 * = macros out, computed by `CraftingLogic` from the consumed inputs,
 * never authored per dish.
 *
 * Semantics mirror a Material row exactly (per-serving amounts, tag
 * routing, per-ingest toxin doses), so every reader treats `payload ??
 * material` uniformly: the MQL bulk candidate (`look stew`), the
 * contents augmenter ("It holds …"), the NutritionLabel, and
 * metabolism's `ingest`. A slot with no payload behaves byte-identically
 * to before. Cleared whenever the slot empties; a transfer into an
 * empty slot carries a copy (blend-merging into a non-empty slot is out
 * of scope — the material-mismatch guard already declines cross-material
 * pours, and same-material pours keep the destination's payload).
 *
 * Plain JSON-able record (the `reserves` precedent) — round-trips
 * through the default Hydrator with no marshaller.
 */
export interface BulkPayload {
  /** Display name ("hearty stew") — the blend's `Material.name`. */
  name: string;
  /** Optional appearance prose — the blend's `Material.appearance`. */
  appearance?: string;
  /** Resolution keywords (`look stew`) — the blend's keywords. */
  keywords?: string[];
  /** Nutrient routing tags (metabolism's per-litre routes). */
  nutrients: string[];
  /** Label amounts (tag → mg per serving) — display, like Material's. */
  nutrientAmounts: Record<string, number>;
  /** Per-serving toxin doses (each ingest is one serving). */
  toxicity: { type: string; amount: number }[];
  /** Whether the blend is edible (the label + eat gates read this). */
  edible: boolean;
}


// `via.bulk` facet — declaration-merged onto MqlMatchVia, colocated
// with the owning subsystem (mirrors `via.detailPath` / `via.exit`).
// Compile-time only; at runtime `via.bulk` is a plain property the
// resolver and controllers read.
declare module '../../api/mql/types' {
  interface MqlMatchVia {
    /**
     * Set when a match arrived through a holder's bulk slot (the
     * `:b` transform or material-keyword resolution). The matched
     * Stuff is the holder; `affordance` tells the controller which
     * slot (`interior` vessel vs `surface` puddle).
     */
    bulk?: { affordance: BulkAffordance };
  }
}

/**
 * A live handle onto one of a holder's bulk slots. Not persistent —
 * produced on demand by {@link Bulkable.getBulk}; reads and writes the
 * host's flat slot fields. `BulkableApi.transfer` operates on these
 * handles (and accepts `null` for the discard sink — `drink`).
 */
export class BulkSlot {
  constructor(
    private readonly host: Stuff & Bulkable,
    public readonly affordance: BulkAffordance,
  ) {}

  /** The holder Stuff this slot belongs to. */
  getHolder(): Stuff & Bulkable {
    return this.host;
  }

  /** Material-path ref (`null` ⇒ empty slot). */
  getMaterialPath(): string | null {
    return this.host.getBulkMaterialPath(this.affordance);
  }

  /** Resolve the material singleton (`null` when empty / unresolved). */
  getMaterial(): Material | null {
    return this.host.getBulkMaterial(this.affordance);
  }

  /** Current amount (always `Quantity<'L'>`; `0 L` when empty). */
  getAmount(): Quantity<'L'> {
    return this.host.getBulkAmount(this.affordance);
  }

  /** Authored capacity, or `null` for an uncapped slot (a puddle). */
  getCapacity(): Quantity<'L'> | null {
    return this.host.getBulkCapacity(this.affordance);
  }

  /** This slot's closure level (the holder's inherent construction). */
  getClosure(): ClosureLevel {
    return this.host.getClosure();
  }

  /**
   * Empty ⇔ no material, or a non-positive amount. Delegated to the
   * host so a capability mixin can override the policy (an
   * inexhaustible source is never empty — see `UnboundedSource.ts`).
   */
  isEmpty(): boolean {
    return this.host.isBulkEmpty(this.affordance);
  }

  /**
   * Litres available to draw FROM this slot. Host policy (the base is
   * the current amount; an inexhaustible source returns `∞`).
   */
  available(): number {
    return this.host.getBulkAvailable(this.affordance);
  }

  /**
   * Debit `litres` from this slot. Host policy (the base subtracts and
   * clears the material at zero; an inexhaustible source is a no-op).
   */
  debit(litres: number): void {
    this.host.debitBulk(this.affordance, litres);
  }

  /**
   * Litres of headroom remaining to pour INTO this slot. `∞` for an
   * uncapped slot (a puddle); otherwise `capacity − amount` (floored
   * at 0).
   */
  remaining(): number {
    const cap = this.getCapacity();
    if (cap === null) return Infinity;
    return Math.max(0, cap.rawValue() - this.getAmount().rawValue());
  }

  /** The slot's blend payload, or `null` (an un-blended substance). */
  getPayload(): BulkPayload | null {
    return this.host.getBulkPayload(this.affordance);
  }

  /** Set / clear the slot's blend payload (a copy is stored). */
  setPayload(payload: BulkPayload | null): void {
    this.host.setBulkPayload(this.affordance, payload);
  }

  /** Assign / clear the slot's material (writes the path on the host). */
  setMaterial(material: Material | null): void {
    this.host.setBulkMaterial(this.affordance, material);
  }

  /** Overwrite the slot's amount (canonical-unit `Quantity<'L'>`). */
  setAmount(amount: Quantity<'L'>): void {
    this.host.setBulkAmount(this.affordance, amount);
  }
}

/** Public shape contributed by BulkableMixin. */
export interface Bulkable {
  hasInteriorBulk(): boolean;
  hasSurfaceBulk(): boolean;
  /**
   * Resolve a bulk slot handle. With no argument, returns the single
   * present slot and throws when the holder has both or neither (the
   * caller must disambiguate via `affordance`). With an argument,
   * returns that slot and throws when the holder lacks it.
   */
  getBulk(affordance?: BulkAffordance): BulkSlot;

  /**
   * What `viewer` sees in a slot — the per-viewer contents phrase, or
   * `null` when there is nothing to report. The one viewer-aware read
   * on the substrate; see the implementation for why identification is
   * the case that earns it.
   */
  getContentsDescriptionFor(
    viewer: Stuff,
    affordance?: BulkAffordance,
  ): string | null;

  // Per-affordance slot state (the BulkSlot handle delegates here).
  getBulkMaterialPath(affordance: BulkAffordance): string | null;
  getBulkMaterial(affordance: BulkAffordance): Material | null;
  setBulkMaterial(affordance: BulkAffordance, material: Material | null): void;
  getBulkPayload(affordance: BulkAffordance): BulkPayload | null;
  setBulkPayload(affordance: BulkAffordance, payload: BulkPayload | null): void;
  getBulkAmount(affordance: BulkAffordance): Quantity<'L'>;
  setBulkAmount(affordance: BulkAffordance, amount: Quantity<'L'>): void;
  getBulkCapacity(affordance: BulkAffordance): Quantity<'L'> | null;

  // Generic slot-policy seams (the BulkSlot handle delegates here).
  // Overridable by capability mixins — `UnboundedSourceMixin` makes a
  // holder inexhaustible without the base substrate knowing the
  // concept. NOT unbounded-specific: these are the plain available /
  // empty / debit operations every slot has.
  getBulkAvailable(affordance: BulkAffordance): number;
  isBulkEmpty(affordance: BulkAffordance): boolean;
  debitBulk(affordance: BulkAffordance, litres: number): void;

  getClosure(): ClosureLevel;
  setClosure(level: ClosureLevel): void;
}

const VOLUME_MARSHALLER = QuantityMarshaller.pathFor(BULK_VOLUME_UNIT);

function assertVolume(q: Quantity<'L'>, field: string): void {
  if (!(q instanceof Quantity) || q.unit !== BULK_VOLUME_UNIT) {
    throw new TypeError(
      `BulkableMixin.${field} must be a Quantity<'${BULK_VOLUME_UNIT}'>; got ` +
        (q instanceof Quantity ? `Quantity<'${q.unit}'>` : typeof q),
    );
  }
}

export function BulkableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class BulkableMixin extends Base {
    static _mixinName = 'BulkableMixin';

    /**
     * The bulk verbs are **carried by the holder** (the
     * Thermometer-carries-`measure` pattern): they light up on a giver
     * whenever a Bulkable is in their inventory, among their peers, or
     * in their environment — not minted from a bespoke verb mixin.
     * Thin directions over `BulkableApi.transfer`; see
     * `obj/command/bulk/`.
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: [
        'bulk/fill.yaml',
        'bulk/pour.yaml',
        'bulk/spill.yaml',
        'bulk/drink.yaml',
        'bulk/sip.yaml',
      ],
      environment: [
        'bulk/fill.yaml',
        'bulk/pour.yaml',
        'bulk/spill.yaml',
        'bulk/drink.yaml',
        'bulk/sip.yaml',
      ],
    };

    /**
     * Compose the contained matter into the holder's long description
     * (`look thermos` → "… It holds dark, steaming coffee."). Rides the
     * same `getMarkupLong` augmenter pipeline `DetailedMixin` uses, so
     * a non-empty bulk slot's `Material.appearance` surfaces wherever a
     * host's description is rendered. The surface affordance renders as
     * a puddle (`look floor`).
     */
    static markupAugmenters: MarkupAugmenter[] = [bulkContentsAugmenter];

    // ---- affordance presence flags (authored per host) ----
    /**
     * Whether this host offers an interior bulk slot.
     */
    public interiorBulk: boolean = false;
    /**
     * Whether this host offers a surface bulk slot.
     */
    public surfaceBulk: boolean = false;

    // ---- interior slot ----
    /**
     * Interior material templatePath (an identity ref). `null` ⇒ empty.
     */
    public interiorMaterial: string | null = null;
    /**
     * Interior blend payload (a derived mixture's identity + macros);
     * `null` ⇒ the held substance is exactly its Material row.
     */
    public interiorPayload: BulkPayload | null = null;
    private _interiorAmount: Quantity<'L'> = Quantity.of(0, BULK_VOLUME_UNIT);
    private _interiorCapacity: Quantity<'L'> | null = null;

    // ---- surface slot ----
    /**
     * Surface material templatePath (an identity ref). `null` ⇒ empty.
     */
    public surfaceMaterial: string | null = null;
    /**
     * Surface blend payload — the interior's sibling.
     */
    public surfacePayload: BulkPayload | null = null;
    private _surfaceAmount: Quantity<'L'> = Quantity.of(0, BULK_VOLUME_UNIT);
    private _surfaceCapacity: Quantity<'L'> | null = null;

    // ---- vessel-inherent state ----
    /**
     * Liquid-retention scale; default `liquidTight`.
     */
    public closure: ClosureLevel = 'liquidTight';

    static fieldMeta: FieldMeta = {
      interiorBulk: { persistent: true, authorable: true },
      surfaceBulk: { persistent: true, authorable: true },
      interiorMaterial: { persistent: true, authorable: true, authorPicker: 'Material' },
      interiorPayload: { persistent: true, runtimeState: true },
      interiorAmount: { persistent: true, marshaller: VOLUME_MARSHALLER, runtimeState: true },
      interiorCapacity: { persistent: true, marshaller: VOLUME_MARSHALLER, authorable: true },
      surfaceMaterial: { persistent: true, authorable: true, authorPicker: 'Material' },
      surfacePayload: { persistent: true, runtimeState: true },
      surfaceAmount: { persistent: true, marshaller: VOLUME_MARSHALLER, runtimeState: true },
      surfaceCapacity: { persistent: true, marshaller: VOLUME_MARSHALLER, authorable: true },
      closure: { persistent: true, authorable: true },
    };

    // ---- accessor pairs (strict-Quantity invariants, Pattern D) ----
    protected get interiorAmount(): Quantity<'L'> {
      return this._interiorAmount;
    }
    protected set interiorAmount(value: Quantity<'L'>) {
      assertVolume(value, 'interiorAmount');
      this._interiorAmount = value;
    }
    protected get interiorCapacity(): Quantity<'L'> | null {
      return this._interiorCapacity;
    }
    protected set interiorCapacity(value: Quantity<'L'> | null) {
      if (value === null || value === undefined) {
        this._interiorCapacity = null;
        return;
      }
      assertVolume(value, 'interiorCapacity');
      this._interiorCapacity = value;
    }
    protected get surfaceAmount(): Quantity<'L'> {
      return this._surfaceAmount;
    }
    protected set surfaceAmount(value: Quantity<'L'>) {
      assertVolume(value, 'surfaceAmount');
      this._surfaceAmount = value;
    }
    protected get surfaceCapacity(): Quantity<'L'> | null {
      return this._surfaceCapacity;
    }
    protected set surfaceCapacity(value: Quantity<'L'> | null) {
      if (value === null || value === undefined) {
        this._surfaceCapacity = null;
        return;
      }
      assertVolume(value, 'surfaceCapacity');
      this._surfaceCapacity = value;
    }

    // ---- public field accessors (Hydrator Phase-1 dispatch) ----
    public getInteriorAmount(): Quantity<'L'> {
      return this._interiorAmount;
    }
    public setInteriorAmount(value: Quantity<'L'>): void {
      this.interiorAmount = value;
    }
    public getInteriorCapacity(): Quantity<'L'> | null {
      return this._interiorCapacity;
    }
    public setInteriorCapacity(value: Quantity<'L'> | null): void {
      this.interiorCapacity = value;
    }
    public getSurfaceAmount(): Quantity<'L'> {
      return this._surfaceAmount;
    }
    public setSurfaceAmount(value: Quantity<'L'>): void {
      this.surfaceAmount = value;
    }
    public getSurfaceCapacity(): Quantity<'L'> | null {
      return this._surfaceCapacity;
    }
    public setSurfaceCapacity(value: Quantity<'L'> | null): void {
      this.surfaceCapacity = value;
    }

    public hasInteriorBulk(): boolean {
      return this.interiorBulk;
    }
    public hasSurfaceBulk(): boolean {
      return this.surfaceBulk;
    }

    public getClosure(): ClosureLevel {
      return this.closure;
    }
    public setClosure(level: ClosureLevel): void {
      this.closure = level;
    }

    public getBulk(affordance?: BulkAffordance): BulkSlot {
      const self = this as unknown as Stuff & Bulkable;
      const present: BulkAffordance[] = [];
      if (this.interiorBulk) present.push('interior');
      if (this.surfaceBulk) present.push('surface');
      if (affordance !== undefined) {
        if (!present.includes(affordance)) {
          throw new Error(
            `BulkableMixin.getBulk: host has no '${affordance}' bulk slot`,
          );
        }
        return new BulkSlot(self, affordance);
      }
      if (present.length === 1) return new BulkSlot(self, present[0]!);
      if (present.length === 0) {
        throw new Error('BulkableMixin.getBulk: host has no bulk slot');
      }
      throw new Error(
        'BulkableMixin.getBulk: host has both interior and surface bulk; ' +
          'specify an affordance',
      );
    }

    /**
     * **What `viewer` sees in this slot** — the per-viewer contents
     * phrase, or `null` when there is nothing to report.
     *
     * Bulk prose is otherwise viewer-blind, and rightly so: a puddle of
     * water is a puddle of water to everybody. A **potion** is the case
     * that breaks it — what a draught *looks* like and what it *is* are
     * different facts, and which one you get depends on what you have
     * learned (magic-items D24/D26). Identity rides the **material**,
     * not the flask, so one identification covers every flask of that
     * substance and decanting carries the knowledge.
     *
     * So an identifiable substance routes through
     * `RecognitionApi.describe` — the same rendering path an
     * unidentified item on the floor uses, not a parallel one. Anything
     * else keeps the shipped convention exactly: the blend payload
     * first (a mixed drink names itself, not its base material), then
     * the material's own appearance.
     */
    public getContentsDescriptionFor(
      viewer: Stuff,
      affordance?: BulkAffordance,
    ): string | null {
      let slot: BulkSlot;
      try {
        slot = this.getBulk(affordance);
      } catch {
        // No slot, or both slots and no affordance named. Callers on
        // the render path ask about arbitrary targets, so the boring
        // case is silent rather than throwing.
        return null;
      }
      if (slot.isEmpty()) return null;
      const material = slot.getMaterial();
      if (!material) return null;

      if (MixinApi.isIdentifiable(material)) {
        const described = RecognitionApi.describe(
          viewer,
          material as unknown as Stuff,
        );
        if (described) return described;
      }
      return slot.getPayload()?.appearance ?? material.getAppearance() ?? null;
    }

    public getBulkMaterialPath(affordance: BulkAffordance): string | null {
      return affordance === 'interior'
        ? this.interiorMaterial
        : this.surfaceMaterial;
    }

    public getBulkMaterial(affordance: BulkAffordance): Material | null {
      const path = this.getBulkMaterialPath(affordance);
      if (path === null) return null;
      return StuffApi.findByTemplatePath<Material>(path) ?? null;
    }

    public setBulkMaterial(
      affordance: BulkAffordance,
      material: Material | null,
    ): void {
      const path = material ? (material.getTemplatePath() ?? null) : null;
      if (affordance === 'interior') {
        this.interiorMaterial = path;
        // The payload describes the held matter; no matter, no payload.
        if (path === null) this.interiorPayload = null;
      } else {
        this.surfaceMaterial = path;
        if (path === null) this.surfacePayload = null;
      }
    }

    public getBulkPayload(affordance: BulkAffordance): BulkPayload | null {
      return affordance === 'interior'
        ? this.interiorPayload
        : this.surfacePayload;
    }

    public setBulkPayload(
      affordance: BulkAffordance,
      payload: BulkPayload | null,
    ): void {
      const copy = payload === null ? null : structuredClone(payload);
      if (affordance === 'interior') {
        this.interiorPayload = copy;
      } else {
        this.surfacePayload = copy;
      }
    }

    public getBulkAmount(affordance: BulkAffordance): Quantity<'L'> {
      return affordance === 'interior'
        ? this._interiorAmount
        : this._surfaceAmount;
    }

    public setBulkAmount(
      affordance: BulkAffordance,
      amount: Quantity<'L'>,
    ): void {
      if (affordance === 'interior') {
        this.interiorAmount = amount;
      } else {
        this.surfaceAmount = amount;
      }
    }

    public getBulkCapacity(affordance: BulkAffordance): Quantity<'L'> | null {
      return affordance === 'interior'
        ? this._interiorCapacity
        : this._surfaceCapacity;
    }

    // ---- slot-policy seams (overridable by capability mixins) ----
    public getBulkAvailable(affordance: BulkAffordance): number {
      return this.getBulkAmount(affordance).rawValue();
    }

    public isBulkEmpty(affordance: BulkAffordance): boolean {
      if (this.getBulkMaterialPath(affordance) === null) return true;
      return this.getBulkAmount(affordance).rawValue() <= 0;
    }

    public debitBulk(affordance: BulkAffordance, litres: number): void {
      const next = this.getBulkAmount(affordance).subtract(
        Quantity.of(litres, BULK_VOLUME_UNIT),
      );
      const remaining = Math.max(0, next.rawValue());
      this.setBulkAmount(affordance, Quantity.of(remaining, BULK_VOLUME_UNIT));
      if (remaining <= 0) this.setBulkMaterial(affordance, null);
    }
  };
}

/**
 * `MarkupAugmenter` for the bulk-contents description pass. Appends a
 * sentence per non-empty bulk slot: an interior slot reads "It holds
 * <contents>." and a surface slot reads "A puddle of <contents> pools
 * here." A holder with empty (or no) slots is unchanged. Module-level
 * (not an inline arrow) so it's identifiable by name in stack traces,
 * mirroring `DetailedMixin`'s `wrapDetailKeysAugmenter`.
 *
 * The phrase comes from `getContentsDescriptionFor(viewer)`, so it is
 * **per-viewer**: coffee reads as coffee to everybody, and an
 * unidentified draught reads as what it looks like until you have
 * learned it. The `viewer` parameter was always on the augmenter
 * contract; identification is the first thing that needed it.
 */
function bulkContentsAugmenter(
  text: string,
  host: Stuff,
  viewer: Stuff,
): string {
  if (!MixinApi.isBulkable(host)) return text;
  const lines: string[] = [];
  for (const [affordance, present] of [
    ['interior', host.hasInteriorBulk()],
    ['surface', host.hasSurfaceBulk()],
  ] as [BulkAffordance, boolean][]) {
    if (!present) continue;
    const contents = host.getContentsDescriptionFor(viewer, affordance);
    if (!contents) continue;
    lines.push(
      affordance === 'surface'
        ? `A puddle of ${contents} pools here.`
        : `It holds ${contents}.`,
    );
  }
  if (lines.length === 0) return text;
  return `${text}\n\n${lines.join(' ')}`;
}
