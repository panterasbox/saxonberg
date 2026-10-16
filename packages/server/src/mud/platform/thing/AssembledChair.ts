/**
 * AssembledChair — a seat or a bed made of parts: a pegged frame and a
 * stitched cushion or mattress (assembly W6, the nesting case). Everything
 * a {@link Chair} is, and an assembly: it rests you as well as its WORST
 * part does, and a failed cushion leaves you on the bare frame.
 *
 * ⭐ Its own class, not mixins on `Chair`: a stool, a tub and a cot are
 * seats with no parts (`lint:bills` holds both directions).
 */

import Chair from './Chair';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { CraftedMixin } from '../../lib/craft/Crafted';
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
const AssembledChairBase = AssembledMixin(CraftedMixin(DurableMixin(Chair)));

export default class AssembledChair extends AssembledChairBase {
  /**
   * ⭐ A seat rests you as well as its WORST part does (assembly D8,
   * AC 11): the frame's soundness scales it, and a failed cushion (any
   * non-structural line that has failed) leaves you on the bare frame.
   */
  public override getRestQuality(): number {
    let q = super.getRestQuality();
    let bare = false;
    for (const line of this.getParts()) {
      if (line.role === 'structural') q *= line.failed > 0 ? 0 : line.condition;
      else if (line.failed > 0) bare = true;
    }
    if (bare) q *= seatDial(AppSettingKeys.chairBareFrameRest, 0.5);
    return Math.max(0, Math.min(1, q));
  }
}
