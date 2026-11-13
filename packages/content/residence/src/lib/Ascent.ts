/**
 * Ascent — **the residence ladder's gate** (residences P10/D6): acquiring
 * the next rung reads the condition of every residential holding the
 * person already has, and refuses below the shipped threshold — money
 * necessary, condition binding. Holding nothing passes (the gate compares
 * you to your record).
 *
 * ⭐ One rule, asked by every act that hands somebody a rung — the land sale
 * (`PlatBook.sell`) and a let (`LettingWarren.let`). It used to be two
 * verbatim copies in two controllers in two packs (controller-liquidity
 * W13).
 *
 * A value object (pack `lib/` — substrate, never instanced from a row): it
 * reads the threshold dial when it is made and answers a fact. The words a
 * refusal is told in are the asking verb's.
 */

import { AppApi } from "@saxonberg/server/mud/api/app";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import { CirculationWarren } from "@saxonberg/server/mud/lib/location/CirculationWarren";

/** The holding that fails the gate: its extent, its leaf, its condition band. */
export interface AscentRefusal {
  extent: string;
  leaf: string;
  band: string;
}

/** The shipped threshold when the dial is unset or unreadable. */
const DEFAULT_MIN_CONDITION = 0.5;

export class Ascent {
  /** The condition below which a held home refuses the next rung. */
  private readonly minCondition: number;

  constructor() {
    let min = DEFAULT_MIN_CONDITION;
    try {
      const raw = Number.parseFloat(
        AppApi.setting("residence.ascent.minCondition"),
      );
      if (Number.isFinite(raw) && raw > 0) min = raw;
    } catch {
      /* cold cache — the shipped default */
    }
    this.minCondition = min;
  }

  /**
   * The first residential holding of `holderPath` (an identity path) whose
   * condition is below the threshold, or null — the gate passes.
   */
  public async refusalFor(holderPath: string): Promise<AscentRefusal | null> {
    for (const record of await ParcelApi.heldUnitsOf(holderPath)) {
      const extent = record.getExtent();
      let cond: { condition: number; band: string } | null = null;
      try {
        cond = await CirculationWarren.conditionOf(extent);
      } catch {
        cond = null;
      }
      if (cond && cond.condition < this.minCondition) {
        return {
          extent,
          leaf: extent.slice(extent.lastIndexOf("/") + 1),
          band: cond.band,
        };
      }
    }
    return null;
  }
}
