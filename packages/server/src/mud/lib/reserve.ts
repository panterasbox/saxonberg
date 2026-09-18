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
 *
 * ## The reserve landscape (the index — one place to find them)
 *
 * Every known instance, its owner, and the **contract surface** to read
 * it. The keyed `getReserve`/`adjustReserve` calls are each owner's
 * internal plumbing — consumers use the owner's domain method (the
 * inter-Stuff methods-are-the-contract rule), which bundles the
 * owner's reconcile-on-read where one exists:
 *
 * | key | unit | owner (installs/drives) | read it via |
 * |---|---|---|---|
 * | `endurance` | `%` | Creature + `MetabolicMixin` (recovery) | `Creature.getEndurance()`; drained internally by Vitals (limp), LoadBearing (traversal) — same-host keyed writes are the body's own economy |
 * | `satiation` | `%` | Creature + `MetabolicMixin` | `Creature.getSatiation()`; spent internally by ThermalRegulation (setpoint defense) |
 * | `hydration` | `%` | Creature + `MetabolicMixin` | `Creature.getHydration()` (the tighter recovery leash) |
 * | `flesh` | `%` | Creature + `MetabolicMixin` (the partition leg) | `Creature.getFlesh()`; ⭐ **the STOCK the flow deposits into** — `satiation` is hours, flesh is months. Read as a BAND (`Creature.bodyConditionBand`), never as a number, unless somebody lays hands on the animal |
 * | `lean` | `%` | Creature + `MetabolicMixin` (relaxation to the seed) + `ExertingMixin` (overload gain) | `Creature.getLean()`; ⭐ **the second stock — muscle.** Fat is what you ate; lean is what you did. Read as a band (`Creature.leanBand`) inside the build phrase, never as a number; no floor effect — a body at 0 is *gaunt* in the mirror, not sick |
 * | `protein` | `%` | Creature + `MetabolicMixin` (routing + turnover) | `Creature.getProtein()`; the amino pool the `protein` tag fills and muscle gain spends. Nothing floors it |
 * | `wind` | `%` | Creature + `MetabolicMixin` (half-life decay) + `ExertingMixin` (duration at pace) | `Creature.getWind()`; conditioning — the stock the `wind` Discipline's band is a threshold over. Seeded at 0 (untrained); fades while you PLAY, never while you are away |
 * | `vitamin-c` | `%` | Creature + `MetabolicMixin` (basal drain, the `vitamin-c` tag) | `Creature.getVitaminC()`; the years clock — full to empty over `body.vitaminCDrainDays` of active play; floor effect `scurvy` off the shipped cascade |
 * | `alcohol-tolerance` | `%` | Creature + `MetabolicMixin` (fed at alcohol absorption; half-life decay) | keyed read inside `lib/metabolism` only; the `alcohol-tolerance` Discipline's band is a threshold over it |
 * | `fuel` | `%` | `CombustibleMixin` / `FurnaceMixin` (theme `combustion`) | `getFuelRemaining()` |
 * | `air` | `%` | an enclosed scope's Location (fire chemistry) | `FireLogic`-internal (no external reader) |
 * | `mana` | `pt` | `CasterMixin` (theme `arcane`; capacity from the depth band) | `getMana()` / `getManaFraction()` — raw keyed reads SKIP the recovery reconcile, never use them outside `lib/magic` |
 *
 * New instances (a guild's "charge", a tradition's "essence") follow the
 * same shape: the owning mixin installs the reserve, fronts it with a
 * domain method, and adds a row here.
 */

import type { MixinConstructor, FieldMeta } from './mixin';
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
  'flesh',
  'lean',
  'protein',
  'wind',
  'vitamin-c',
  'alcohol-tolerance',
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
  static defaultBiological(): Record<string, ReserveStored> {
    const seeded = (
      currentValue: number,
      floorEffect: string | null,
    ): ReserveStored => ({
      capacityValue: 100,
      currentValue,
      unit: '%',
      theme: 'biological',
      floorEffect,
    });
    const full = (floorEffect: string): ReserveStored =>
      seeded(100, floorEffect);
    return {
      endurance: full('collapse'),
      satiation: full('starvation'),
      hydration: full('dehydration'),
      // ⭐⭐ **Body condition is fat cover, which is a STOCK.** It is not
      // a summary of history and not a derived buffer — it is a reserve
      // in exactly the sense this module already means, and the
      // substrate was not merely available, it was already biological.
      //
      // ⚠ It starts at 55 rather than full, and that is the one place
      // this table is not uniform. A body at 100 % fat cover is not a
      // healthy default, it is an obese one; 55 is *in good flesh*,
      // which is where an animal you would buy actually sits and what
      // leaves room in both directions for the partition cascade to
      // mean something.
      flesh: {
        capacityValue: 100,
        currentValue: 55,
        unit: '%',
        theme: 'biological',
        floorEffect: 'emaciation',
      },
      // ⭐⭐ **The second stock — muscle.** Fat is what you ate; lean is
      // what you did. Seeded at the ordinary middle so the mirror reads
      // *in good flesh* and nothing more on a fresh body, and so both
      // directions have room: overload trains it up, idleness relaxes it
      // back. ⚠ No floor effect — a body at 0 is *gaunt* in the mirror,
      // and starvation/emaciation already own the lethal and the chronic
      // floors; a third condition here would be a gauge in a costume.
      lean: seeded(50, null),
      // The amino pool: the `protein` tag used to drain into nothing.
      // Now it lands here, muscle gain spends it, and turnover drains it
      // slowly — so a body that never eats protein cannot build muscle
      // however hard it works. Healing may read the same pool later.
      protein: seeded(50, null),
      // ⭐ Conditioning — the stock the `wind` Discipline's band is a
      // threshold over. Starts EMPTY: a fresh body is untrained, which is
      // the honest baseline and what makes the first run break.
      wind: seeded(0, null),
      // ⭐ The years clock. Full on a fresh body (the enrol diet was
      // varied), drained by the metabolism slice over `body.vitaminCDrainDays`
      // of ACTIVE play, refilled by the `vitamin-c` tag. Its floor is the
      // one new condition this build ships, and it rides the shipped
      // cascade exactly as emaciation does.
      'vitamin-c': seeded(100, 'scurvy'),
      // Fed where alcohol is absorbed; fades on the active clock. The
      // `alcohol-tolerance` Discipline's band reads it.
      'alcohol-tolerance': seeded(0, null),
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

    static fieldMeta: FieldMeta = {
      reserves: { persistent: true, runtimeState: true },
    };

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
