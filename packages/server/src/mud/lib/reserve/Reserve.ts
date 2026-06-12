/**
 * Reserve — a depletable-and-replenishing capacity axis. The substrate
 * shared by the body's biological reserves (endurance / satiation /
 * hydration) and, deferred, magic-side reserves (a guild's "charge", a
 * tradition's "essence"). Reserves differ only in what drains them,
 * what replenishes them, and their theme — so the engine ships the
 * *axis* and content names the instances.
 *
 * This module is the value shape + the decomposed persistence form +
 * the biological-key constant — a substrate module (the `lib/quantity.ts`
 * precedent), NOT an Api and NOT a registry. "Reserve" is the engine
 * word; "mana" / "charge" / "essence" are content (ride `theme`/`key`).
 *
 * Persistence is by **decomposition to scalars** (the `AmbientLit`
 * precedent): a `Reserve` holds `Quantity` capacity/current, but the
 * stored form is plain scalars in the host's keyed Record, so it
 * hydrates free with no per-element marshaller.
 */

import { Quantity } from '../quantity';
import type { Unit } from '../quantity';

/** The runtime value — a reserve with real-units capacity + current. */
export interface Reserve {
  /** Identity within a host's reserve collection (= the Record map key). */
  key: string;
  /** Maximum. */
  capacity: Quantity<Unit>;
  /** Current level (always clamped to `[0, capacity]`). */
  current: Quantity<Unit>;
  /** `'biological'` for the body's reserves; a content theme otherwise. */
  theme: string;
  /** Named effect when current hits the floor. Seam — no consumer v1. */
  floorEffect: string | null;
}

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

export function reserveToStored(r: Reserve): ReserveStored {
  if (r.capacity.unit !== r.current.unit) {
    throw new TypeError(
      `Reserve '${r.key}': capacity unit '${r.capacity.unit}' != current ` +
        `unit '${r.current.unit}'`,
    );
  }
  const cap = r.capacity.rawValue();
  const cur = Math.max(0, Math.min(r.current.rawValue(), cap));
  return {
    capacityValue: cap,
    currentValue: cur,
    unit: r.capacity.unit,
    theme: r.theme,
    floorEffect: r.floorEffect,
  };
}

export function reserveFromStored(key: string, s: ReserveStored): Reserve {
  return {
    key,
    capacity: Quantity.of(s.capacityValue, s.unit),
    current: Quantity.of(s.currentValue, s.unit),
    theme: s.theme,
    floorEffect: s.floorEffect,
  };
}

/**
 * The default biological reserves at full capacity (`%`). Installed on
 * every living body (Creature) at construction. Their floor effects
 * feed the derived condition band (a floored reserve degrades the body).
 */
export function defaultBiologicalReserves(): Record<string, ReserveStored> {
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
