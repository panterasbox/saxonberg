/**
 * Reserve — a depletable-and-replenishing capacity axis, plus the mixin
 * that carries a keyed collection of them.
 *
 * A cross-cutting substrate (top-level, next to `lib/quantity.ts`): a
 * reserve is a neutral capacity primitive that *consumers* name and
 * drive. The body's biological reserves (endurance / satiation /
 * hydration) and, deferred, magic-side reserves (a guild's "charge", a
 * tradition's "essence") are all instances — they differ only in what
 * drains them, what replenishes them, and their theme. So the engine
 * ships the *axis* and content names the instances. **"Reserve" is the
 * engine word**; "mana"/"charge"/"essence" ride `theme`/`key`, never the
 * engine surface.
 *
 * No Api, no registry (the `lib/quantity.ts` precedent — value shape +
 * helpers + the mixin in one substrate module). Persistence is by
 * **decomposition to scalars** (the `AmbientLit` precedent): a `Reserve`
 * holds `Quantity` capacity/current, but the stored form is plain scalars
 * in the host's keyed Record, so it hydrates free with no per-element
 * marshaller; the value objects are reconstructed on read.
 *
 * Parking note: this lives at `lib/` root until the RPG layer reveals a
 * better organizing principle (game systems consuming a common physics
 * substrate). It is NOT biology and NOT a game system — keep it neutral.
 */

import type { MixinConstructor } from './mixin';
import { Quantity } from './quantity';
import type { Unit } from './quantity';

// ---------- value shape ----------

/** The decomposed persistence form held in the host's keyed Record. */
export interface ReserveStored {
  capacityValue: number;
  currentValue: number;
  unit: Unit;
  theme: string;
  floorEffect: string | null;
}

/** The engine's biological reserve keys (theme `'biological'`). */
export const BIOLOGICAL_RESERVE_KEYS = [
  'endurance',
  'satiation',
  'hydration',
] as const;

/**
 * The runtime value — a reserve with real-units capacity + current.
 * A value class (peer of `Quantity` / `Light`): immutable readonly
 * fields set through the constructor. Built via `new Reserve(...)` or
 * `Reserve.fromStored(...)`; decomposed for persistence via
 * `toStored()`.
 */
export class Reserve {
  constructor(
    /** Identity within a host's reserve collection (= the Record map key). */
    public readonly key: string,
    /** Maximum. */
    public readonly capacity: Quantity<Unit>,
    /** Current level (always clamped to `[0, capacity]`). */
    public readonly current: Quantity<Unit>,
    /** `'biological'` for the body's reserves; a content theme otherwise. */
    public readonly theme: string,
    /** Named effect when current hits the floor. Seam — no consumer v1. */
    public readonly floorEffect: string | null,
  ) {}

  /** Decompose to the scalar persistence form. */
  public toStored(): ReserveStored {
    if (this.capacity.unit !== this.current.unit) {
      throw new TypeError(
        `Reserve '${this.key}': capacity unit '${this.capacity.unit}' != ` +
          `current unit '${this.current.unit}'`,
      );
    }
    const cap = this.capacity.rawValue();
    const cur = Math.max(0, Math.min(this.current.rawValue(), cap));
    return {
      capacityValue: cap,
      currentValue: cur,
      unit: this.capacity.unit,
      theme: this.theme,
      floorEffect: this.floorEffect,
    };
  }

  /** Reconstruct a `Reserve` instance from the stored scalar form. */
  public static fromStored(key: string, s: ReserveStored): Reserve {
    return new Reserve(
      key,
      Quantity.of(s.capacityValue, s.unit),
      Quantity.of(s.currentValue, s.unit),
      s.theme,
      s.floorEffect,
    );
  }

  /**
   * The default biological reserves at full capacity (`%`). Installed
   * on every living body (Creature) at construction. Their floor
   * effects feed the derived condition band (a floored reserve
   * degrades the body).
   */
  public static defaultBiological(): Record<string, ReserveStored> {
    const full = (floorEffect: string): ReserveStored => ({
      capacityValue: 100,
      currentValue: 100,
      unit: '%',
      theme: 'biological',
      floorEffect,
    });
    return {
      endurance: full('collapse'),
      satiation: full('starvation'),
      hydration: full('dehydration'),
    };
  }
}

// ---------- the mixin ----------

export interface Reserved {
  getReserve(key: string): Reserve | undefined;
  getReserves(): ReadonlyMap<string, Reserve>;
  /** Add or replace a reserve (key derives from the value). */
  setReserve(reserve: Reserve): void;
  /** Move current by `delta`, clamped to `[0, capacity]`. */
  adjustReserve(key: string, delta: Quantity<Unit>): void;
  hasReserve(key: string): boolean;
  removeReserve(key: string): boolean;
  /** Install the default biological reserves if absent (idempotent). */
  installBiologicalReserves(): void;
  /** Storage — public for the Hydrator. */
  reserves: Record<string, ReserveStored>;
}

export function ReservedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ReservedMixin extends Base implements Reserved {
    static _mixinName = 'ReservedMixin';

    static persistentFields = ['reserves'];

    /** @runtimeState */
    public reserves: Record<string, ReserveStored> = {};

    public getReserve(key: string): Reserve | undefined {
      const s = this.reserves[key];
      return s ? Reserve.fromStored(key, s) : undefined;
    }

    public getReserves(): ReadonlyMap<string, Reserve> {
      const map = new Map<string, Reserve>();
      for (const [key, s] of Object.entries(this.reserves)) {
        map.set(key, Reserve.fromStored(key, s));
      }
      return map;
    }

    public setReserve(reserve: Reserve): void {
      // Per-field invariant on the setter: unit match + current clamped
      // to [0, capacity] (Reserve.toStored enforces both).
      this.reserves[reserve.key] = reserve.toStored();
    }

    public adjustReserve(key: string, delta: Quantity<Unit>): void {
      const s = this.reserves[key];
      if (!s) {
        throw new Error(`ReservedMixin.adjustReserve: no reserve '${key}'`);
      }
      if (delta.unit !== s.unit) {
        throw new TypeError(
          `ReservedMixin.adjustReserve('${key}'): delta unit '${delta.unit}' ` +
            `!= reserve unit '${s.unit}'`,
        );
      }
      s.currentValue = Math.max(
        0,
        Math.min(s.currentValue + delta.rawValue(), s.capacityValue),
      );
    }

    public hasReserve(key: string): boolean {
      return Object.prototype.hasOwnProperty.call(this.reserves, key);
    }

    public removeReserve(key: string): boolean {
      if (this.hasReserve(key)) {
        delete this.reserves[key];
        return true;
      }
      return false;
    }

    public installBiologicalReserves(): void {
      for (const [key, s] of Object.entries(Reserve.defaultBiological())) {
        if (!this.hasReserve(key)) this.reserves[key] = s;
      }
    }
  };
}
