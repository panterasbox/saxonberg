/**
 * ReservedMixin — a host that carries a keyed collection of `Reserve`
 * capacity axes. Composed onto every `Creature` (the body's biological
 * reserves) and, deferred, onto magic-side hosts (authored thematic
 * reserves on the same substrate).
 *
 * What this is NOT for:
 * - NOT vitals. Reserves are a broader axis than biology; the body's
 *   biological reserves are just instances. Vitals reads the reserve
 *   surface for its derived band, but does not own it.
 * - NOT agent-state. A reserve is body/capacity state.
 * - "Reserve" is the engine word — content names ride on `theme`/`key`
 *   ("mana"/"charge"/"essence" are never engine identifiers).
 *
 * Storage is a decomposed-scalar Record (free hydration); the `Reserve`
 * value objects are reconstructed on read. The collection surface is
 * collections.md Shape B (keyed Map).
 */

import type { MixinConstructor } from '../mixin';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import type { Reserve, ReserveStored } from './Reserve';
import {
  reserveFromStored,
  reserveToStored,
  defaultBiologicalReserves,
} from './Reserve';

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

    public reserves: Record<string, ReserveStored> = {};

    public getReserve(key: string): Reserve | undefined {
      const s = this.reserves[key];
      return s ? reserveFromStored(key, s) : undefined;
    }

    public getReserves(): ReadonlyMap<string, Reserve> {
      const map = new Map<string, Reserve>();
      for (const [key, s] of Object.entries(this.reserves)) {
        map.set(key, reserveFromStored(key, s));
      }
      return map;
    }

    public setReserve(reserve: Reserve): void {
      // Per-field invariant on the setter: unit match + current clamped
      // to [0, capacity] (reserveToStored enforces both).
      this.reserves[reserve.key] = reserveToStored(reserve);
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
      for (const [key, s] of Object.entries(defaultBiologicalReserves())) {
        if (!this.hasReserve(key)) this.reserves[key] = s;
      }
    }
  };
}
