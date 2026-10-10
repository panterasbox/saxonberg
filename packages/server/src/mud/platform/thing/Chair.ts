/**
 * Chair — a sittable seat. Its collapsible variant is {@link FoldingChair}
 * (its own file, so seeds can resolve it by path as `/platform/thing/FoldingChair`).
 *
 * `Chair` composition: `Postured` (it offers a posture-bearing `sit`
 * slot the global `sit` verb targets) over `Slotted` (the host slot
 * substrate Postured extends), `Detailed` (the frame + seat sub-features,
 * the natural carriers of per-detail materials) over a `Thing`. The
 * actual `sit:1` slot spec is authored per-seed; the class just supplies
 * the capability. The reusable seat kind the whole campus wants.
 */

import Good from '../../lib/stuff/Good';
import { PosturedMixin } from '../../lib/slot/Postured';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';

// ⭐ Durable + Assembled (assembly D8): every seat and bed wears, and may be
// a frame and a cushion — the rest it gives is the worst of them.
const ChairBase = PosturedMixin(
  SlottedMixin(AssembledMixin(DurableMixin(Good))),
);

export default class Chair extends ChairBase {
  constructor() {
    super();
    // ⭐ Fixed in place. A stool, a bed, a tub, an armchair: furniture.
    // You rearrange it with `place`; you do not pocket it. A live drive
    // walked out of Dave's Bar carrying four bar stools.
    this.fixedInPlace = true;
  }

  /**
   * ⭐ A seat rests you as well as its WORST part does (assembly D8,
   * AC 11): the frame's soundness scales it, and a failed cushion (any
   * non-structural line that has failed) leaves you on the bare frame. A
   * stool with no parts rests exactly as its row says.
   */
  public override getRestQuality(): number {
    const base = super.getRestQuality();
    if (!this.isAssembly()) return base;
    let q = base;
    let bare = false;
    for (const line of this.getParts()) {
      if (line.role === 'structural') q *= line.failed > 0 ? 0 : line.condition;
      else if (line.failed > 0) bare = true;
    }
    if (bare) q *= chairDial(AppSettingKeys.chairBareFrameRest, 0.5);
    return Math.max(0, Math.min(1, q));
  }
}

/** Numeric AppSetting read with the seeded fallback. */
function chairDial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
