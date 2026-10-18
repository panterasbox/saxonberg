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
 *
 * ⭐ A seat of parts or of one piece is one class (repair D4, D6): an
 * armchair is a pegged frame and a stitched cushion, a stool is one piece,
 * and it rests you as well as its WORST part does — which, for a thing of
 * one piece, is unchanged. (`AssembledChair` folded in 2026-10-17.)
 */

import Good from '../../lib/stuff/Good';
import { PosturedMixin } from '../../lib/slot/Postured';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { SoilableMixin } from '../../lib/cleanliness/Soilable';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';

/** Numeric AppSetting read with the seeded fallback. */
function seatDial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

// Crafted: `fit armchair` stamps what it raised. Durable beneath
// Assembled: an assembly's wear has to have somewhere to go.
// ⭐ Soilable OUTERMOST (cleanliness D16): every seat and bed may be
// filthy, and a filthy bed rests you worse — a factor that sits OUTSIDE
// whatever structural factor the chain below it applies.
const ChairBase = SoilableMixin(
  AssembledMixin(CraftedMixin(DurableMixin(PosturedMixin(SlottedMixin(Good))))),
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
   * seat of one piece has no lines, and rests as it always did.
   */
  public override getRestQuality(): number {
    let q = super.getRestQuality();
    let bare = false;
    for (const line of this.getParts()) {
      if (line.role === 'structural') q *= line.failed > 0 ? 0 : line.condition;
      else if (line.failed > 0) bare = true;
    }
    if (bare) q *= seatDial(AppSettingKeys.chairBareFrameRest, 0.5);
    // ⚠ Floored, never capped: a four-poster rests at 2 and a clinic cot at
    // 1.5 (the convalescence factor reads it) — the cap the folded
    // `AssembledChair` carried flattened every bed to a stool.
    return Math.max(0, q);
  }
}
