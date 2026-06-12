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
 * check later. An unbounded source (the coffee urn) sets
 * `unboundedSource` so `available()` returns `∞`.
 *
 * Operational reference: `docs/subsystems/bulk.md`. Discrete sibling:
 * `docs/subsystems/glob.md`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';
import { StuffApi } from '../../api/stuff';
import type Material from '../material/Material';

/**
 * Ordered liquid-retention scale on a bulk holder. The vessel retains
 * matter when its `closure` meets-or-exceeds the matter's required
 * level. v1 bulk is all liquid (requires {@link requiredClosureFor} →
 * `'liquidTight'`), so an `open` vessel does not retain it — it drains
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

/**
 * Sign-only comparison of two closure levels by rank — same shape as
 * `Array.prototype.sort`'s comparator. `retains` is the readable
 * predicate built on it.
 */
export function compareClosure(a: ClosureLevel, b: ClosureLevel): number {
  return CLOSURE_ORDER[a] - CLOSURE_ORDER[b];
}

/** Which bulk slot a holder offers / a match arrived through. */
export type BulkAffordance = 'interior' | 'surface';

/**
 * Canonical storage unit for every liquid bulk amount. All amounts and
 * capacities are `Quantity<'L'>`; cross-unit measures (`cup`, `mL`)
 * convert to litres at the parse / transfer boundary.
 */
export const BULK_VOLUME_UNIT = 'L' as const;

/**
 * The closure level a contained `material` requires to be retained.
 * v1: every bulk material is liquid → `'liquidTight'`. The gas /
 * granular branches are the documented extension point (gas →
 * `'sealed'`, granular → `'open'`); a future per-`Material` phase
 * descriptor drives the mapping. The parameter is accepted now so the
 * call sites don't churn when phases land.
 */
export function requiredClosureFor(_material: Material | null): ClosureLevel {
  // Gas extension point: when a Material carries a 'gas' phase, return
  // 'sealed'; 'granular' → 'open'. v1 has only liquid.
  return 'liquidTight';
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

  /** Whether the slot is an unbounded source (the coffee urn). */
  isUnboundedSource(): boolean {
    return this.host.isBulkUnboundedSource(this.affordance);
  }

  /**
   * Empty ⇔ no material assigned, or a non-positive amount. An
   * unbounded source (the urn) with a material set is never empty —
   * it never runs dry, so its stored amount is ignored.
   */
  isEmpty(): boolean {
    if (this.getMaterialPath() === null) return true;
    if (this.isUnboundedSource()) return false;
    return this.getAmount().rawValue() <= 0;
  }

  /**
   * Litres available to draw FROM this slot. `∞` for an unbounded
   * source; otherwise the current amount.
   */
  available(): number {
    if (this.isUnboundedSource()) return Infinity;
    return this.getAmount().rawValue();
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

  // Per-affordance slot state (the BulkSlot handle delegates here).
  getBulkMaterialPath(affordance: BulkAffordance): string | null;
  getBulkMaterial(affordance: BulkAffordance): Material | null;
  setBulkMaterial(affordance: BulkAffordance, material: Material | null): void;
  getBulkAmount(affordance: BulkAffordance): Quantity<'L'>;
  setBulkAmount(affordance: BulkAffordance, amount: Quantity<'L'>): void;
  getBulkCapacity(affordance: BulkAffordance): Quantity<'L'> | null;
  isBulkUnboundedSource(affordance: BulkAffordance): boolean;

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
      environment: [
        'bulk/fill.yaml',
        'bulk/pour.yaml',
        'bulk/spill.yaml',
        'bulk/drink.yaml',
        'bulk/sip.yaml',
      ],
      inventory: [
        'bulk/fill.yaml',
        'bulk/pour.yaml',
        'bulk/spill.yaml',
        'bulk/drink.yaml',
        'bulk/sip.yaml',
      ],
      peers: [
        'bulk/fill.yaml',
        'bulk/pour.yaml',
        'bulk/spill.yaml',
        'bulk/drink.yaml',
        'bulk/sip.yaml',
      ],
    };

    // ---- affordance presence flags (authored per host) ----
    /** Whether this host offers an interior bulk slot. */
    public interiorBulk: boolean = false;
    /** Whether this host offers a surface bulk slot. */
    public surfaceBulk: boolean = false;

    // ---- interior slot ----
    /** Interior material templatePath (Pattern A). `null` ⇒ empty. */
    public interiorMaterial: string | null = null;
    private _interiorAmount: Quantity<'L'> = Quantity.of(0, BULK_VOLUME_UNIT);
    private _interiorCapacity: Quantity<'L'> | null = null;

    // ---- surface slot ----
    /** Surface material templatePath (Pattern A). `null` ⇒ empty. */
    public surfaceMaterial: string | null = null;
    private _surfaceAmount: Quantity<'L'> = Quantity.of(0, BULK_VOLUME_UNIT);
    private _surfaceCapacity: Quantity<'L'> | null = null;

    // ---- vessel-inherent state ----
    /** Liquid-retention scale; default `liquidTight`. */
    public closure: ClosureLevel = 'liquidTight';
    /** Source-end dial — `available()` returns ∞ when set (the urn). */
    public unboundedSource: boolean = false;

    static persistentFields = [
      'interiorBulk',
      'surfaceBulk',
      'interiorMaterial',
      'interiorAmount',
      'interiorCapacity',
      'surfaceMaterial',
      'surfaceAmount',
      'surfaceCapacity',
      'closure',
      'unboundedSource',
    ];

    static fieldMarshallers = {
      interiorAmount: VOLUME_MARSHALLER,
      interiorCapacity: VOLUME_MARSHALLER,
      surfaceAmount: VOLUME_MARSHALLER,
      surfaceCapacity: VOLUME_MARSHALLER,
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
      } else {
        this.surfaceMaterial = path;
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

    public isBulkUnboundedSource(_affordance: BulkAffordance): boolean {
      return this.unboundedSource;
    }
  };
}
