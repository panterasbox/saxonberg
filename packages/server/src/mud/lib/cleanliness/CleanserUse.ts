/**
 * CleanserUse — **what a wash or a bath spends** (cleanliness B12): each
 * cleanser's `consumesPerWash` off the thing it came from — a bar loses
 * mass (and is gone when worn away), a flask loses litres, and a volatile
 * one goes into the room as vapour (D22: naphtha by the hearth is a fire).
 * One owner for the one rule, so `wash` and `bathe` (and any other
 * controller for them) spend alike.
 */

import type { WashCleanser } from './Soilable';
import { MixinApi } from '../../api/mixin';
import { BulkableApi } from '../../api/bulk';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../quantity';

export class CleanserUse {
  constructor(private readonly cleansers: readonly WashCleanser[]) {}

  /** Spend `washes` washes' worth of every cleanser off its source. */
  public spend(washes: number): void {
    for (const c of this.cleansers) {
      const src = c.source;
      if (!src || src.isDestroyed()) continue;
      const per = c.row.consumesPerWash * washes;
      if (!(per > 0)) continue;
      if (MixinApi.isBulkable(src)) {
        const slot = BulkableApi.slotFor(src, undefined);
        if (slot && !slot.isEmpty()) {
          // ⭐ (cleanliness D22) A volatile cleanser spent in a wash goes into
          // the room as vapour — naphtha by the hearth is a fire.
          const m = slot.getMaterial();
          const room = MixinApi.isContainable(src) ? src.getContainer() : null;
          const outer = room && room.isAgent() && MixinApi.isContainable(room) ? room.getContainer() : room;
          if (m && m.getVapourMaterial() && outer && MixinApi.isAtmospheric(outer)) {
            outer.addAtmosphereContent(m.getVapourMaterial(), Math.min(per, slot.getAmount().rawValue()) * m.getVapourLPerLPerHour());
          }
          const left = Math.max(0, slot.getAmount().rawValue() - per);
          slot.setAmount(Quantity.of(left, "L"));
          if (left <= 0) {
            slot.setMaterial(null);
            slot.setPayload(null);
          }
          continue;
        }
      }
      if (MixinApi.isTangible(src)) {
        const left = src.getMass().rawValue() - per;
        if (left <= 0.001) void StuffApi.destruct(src);
        else src.setMass(Quantity.of(left, "kg"));
      }
    }
  }
}
