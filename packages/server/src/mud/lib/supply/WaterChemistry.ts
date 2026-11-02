/**
 * WaterChemistry — **what a water IS, besides wet** (water-supply D8): its
 * acidity, its hardness and its salt. It rides the water — the reach's seed
 * at the intake, carried down the main, settled into a tap's water, and
 * carried in a pail — and it is what decides what the water does: soft acid
 * water dissolves a lead pipe (the lead law reads the payload's pH and
 * softness), and salt water poured on a field salts it.
 *
 * The declaration merge below adds `pH` and `salinityPpt` to `BulkPayload`
 * beside the hardness `WaterHardness` already carries (the blood precedent),
 * so a pour blends them by volume with no new transfer code.
 */

import { SOFT_BELOW_DGH } from '../cleanliness/WaterHardness';

declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** The water's pH — its source's, blended by volume. Absent ⇒ unsaid. */
    pH?: number;
    /** The water's salinity, parts per thousand — what it leaves in a soil. */
    salinityPpt?: number;
  }
}

export class WaterChemistry {
  constructor(
    public readonly pH: number,
    public readonly hardnessDgh: number,
    public readonly salinityPpt: number,
  ) {}

  /**
   * This water (`litresA` of it) mixed with `litresB` of `b` — every term by
   * volume (pH by volume is the honest first cut).
   */
  public blendWith(litresA: number, b: WaterChemistry, litresB: number): WaterChemistry {
    const a = this;
    const total = litresA + litresB;
    if (!(total > 0)) return a;
    const mix = (x: number, y: number): number => (x * litresA + y * litresB) / total;
    return new WaterChemistry(
      mix(a.pH, b.pH),
      mix(a.hardnessDgh, b.hardnessDgh),
      mix(a.salinityPpt, b.salinityPpt),
    );
  }

  /**
   * ⭐ How SOFT it is, 0..1 — 1 for rain, 0 at and above the soft/hard line.
   * A hard water lays a scale inside a lead pipe that keeps the lead out of
   * it; a soft one does not, which is why soft-water towns poisoned
   * themselves and hard-water towns did not.
   */
  public softness(): number {
    const s = (SOFT_BELOW_DGH - this.hardnessDgh) / SOFT_BELOW_DGH;
    return Math.max(0, Math.min(1, s));
  }

  /** The payload fields this chemistry writes. */
  public toPayload(): { pH: number; hardnessDgh: number; salinityPpt: number } {
    return { pH: this.pH, hardnessDgh: this.hardnessDgh, salinityPpt: this.salinityPpt };
  }
}
