/**
 * Melt — a pot of molten glass, the batch's fired output (glass build
 * D3). `AlloyedMixin(ThermalMixin(Good))`: it has a temperature (it cools
 * when the kiln goes out and is re-fired with the remelt recipe) and a
 * composition (the iron from the sand, plus the pot's own pickup). It is
 * ONE tangible — the pot and its glass together, consumed with the
 * campaign — and is deliberately **not** `Meltable` and **not**
 * `Bulkable`: the firing path is item-only and clones cold, so making the
 * melt a liquid pool would need a seam the firing path does not have.
 *
 * `dip` draws gathers from it by mass (`takeGather`); a melt that has
 * stiffened below its working heat refuses the pipe and is simply fired
 * again.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { ThermalMixin } from "@saxonberg/server/mud/lib/thermal/Thermal";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { AppApi } from "@saxonberg/server/mud/api/app";
import type { CompositionEntry } from "@saxonberg/server/mud/lib/material/Material";

/** Numeric pack-setting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const MeltBase = AlloyedMixin(ThermalMixin(Good));

export default class Melt extends MeltBase {
  /**
   * Fluid enough to gather from — at or above 0.9× the glass's own
   * melting point. A cooled melt is a solid pot of glass that refuses the
   * pipe until it is fired again.
   */
  public isFluid(): boolean {
    const mp = this.getMaterial()?.getMeltingPoint().rawValue() ?? 0;
    if (mp <= 0) return false;
    return this.getTemperature().rawValue() >= 0.9 * mp;
  }

  /**
   * Draw one gather's worth of mass off the melt, returning the alloying
   * the gather should carry (the melt's own composition — a gather is a
   * sample of the pot). Debits this melt's mass; when what is left is
   * under half a gather, the pot is spent and destructs itself.
   */
  public takeGather(kg: number): CompositionEntry[] {
    const alloying = this.getAlloying().map((e) => ({ ...e }));
    const have = this.getMass().rawValue();
    const drawn = Math.min(kg, have);
    const left = have - drawn;
    this.setMass(Quantity.of(left, "kg"));
    const gatherKg = dial("glass.hotwork.gatherKg", 0.4);
    if (left < gatherKg * 0.5) {
      void StuffApi.destruct(this);
    }
    return alloying;
  }
}
