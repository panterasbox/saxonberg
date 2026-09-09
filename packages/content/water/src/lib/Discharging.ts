/**
 * DischargingMixin — **anything that puts something back into a reach.**
 *
 * An outfall, a treated return, a sewer's mouth. The catalogue adds
 * every discharge on a reach to that reach's contaminant load, so — as
 * with {@link WithdrawingMixin} — it has to be able to find them all.
 *
 * The two halves are separate mixins rather than one, because they are
 * separate facts: a headgate draws and returns nothing, a stormwater
 * outfall returns and draws nothing, and a conduit does both. Composing
 * one does not claim the other.
 *
 * Lives in `/system/water/lib/` — the water pack's own substrate,
 * inherited and never instanced.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ContaminantKind } from '../idea/WatercourseCatalogue';

/** The registry name — the key `world:[mixin.DischargingMixin]` reads. */
export const DISCHARGING_MIXIN = 'DischargingMixin';

/** The surface a discharger presents to the catalogue. */
export interface Discharging {
  /** The reach it outfalls into, or `''`. */
  getDischargeReach(): string;
  /** Load units per second, and what kind of dirt they are. */
  dischargeLoad(): { load: number; kind: ContaminantKind };
}

export function DischargingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class DischargingMixin extends Base implements Discharging {
    static _mixinName = DISCHARGING_MIXIN;

    /** Outfalls nowhere until a composer says otherwise. */
    public getDischargeReach(): string {
      return '';
    }

    /** Returns nothing until a composer says otherwise. */
    public dischargeLoad(): { load: number; kind: ContaminantKind } {
      return { load: 0, kind: 'sediment' as ContaminantKind };
    }
  };
}
