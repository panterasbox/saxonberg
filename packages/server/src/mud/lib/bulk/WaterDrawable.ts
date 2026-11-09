/**
 * WaterDrawable — ⭐ **water can be drawn from it, here, now**
 * (controller-liquidity W8, Appendix B).
 *
 * `cool`, `rinse` and their siblings each want water in reach before they
 * do anything to a body, and each carried its own copy of the same read —
 * a vessel with something tagged `water` in it, a shore's water unless it
 * is frozen over — which had drifted: `cool` never looked at a shore and
 * never settled what it read (C54). The read is a fact about the THING the
 * water would come from, so it lives there and every verb asks it.
 *
 * **IS for:** a vessel that holds water (a basin, a tub, a can, a butt, a
 * well) and a place beside a named water (`ShoreMixin`, which overrides).
 * **IS NOT for:** every bulk holder — a wine cask is a holder and is no
 * source of water, so the mixin is composed by the vessel classes that hold
 * water, never by `BulkableMixin` at large. A crafted vessel (a glass you
 * were served, a mug) is somebody's drink, not a source, and says no.
 *
 * ⚠ It is a READ with one side effect, the settle: what a vessel holds is
 * brought current before it is judged (a butt filling from its roof, a tap
 * from its main), so the answer is true now. Nothing is drawn — the verb
 * that uses the water decides how much.
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import type { WaterDraw } from '../location/WaterSource';
import { MixinApi } from '../../api/mixin';
import { BulkableApi } from '../../api/bulk';

/** The material tag that makes a holder's contents water. */
const WATER_TAG = 'water';

/** What answered: the thing the water comes from, and (a shore) what it gives. */
export interface WaterDrawnFacts {
  source: Stuff;
  /** A shore's draw — the water's own material and temperature. */
  draw?: WaterDraw;
}

/**
 * ⭐ Every reason a thing gives no water — the verbs word each.
 * `frozen` — the water is there and iced over, with no hole to draw at.
 */
export type WaterDrawRefusal = ActRefusal<'no-water'> | ActRefusal<'frozen'>;

/** What a draw answers: the source, or why not. */
export type WaterDrawAnswer = ActOutcome<WaterDrawnFacts> | WaterDrawRefusal;

/** A thing water can be drawn from. */
export interface WaterDrawable {
  /** Can `actor`, standing where they are, get water from this now? */
  drawWaterFor(actor: Stuff): Promise<WaterDrawAnswer>;
}

/**
 * ⭐ **`WaterDrawableMixin` — the water-source protocol, as a mixin.**
 *
 * The default answers for a VESSEL: its bulk slot, settled, holding
 * something tagged `water`, and the vessel not a crafted drink.
 * `ShoreMixin` overrides with the shore's water (the frozen gate).
 */
export function WaterDrawableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WaterDrawableMixin extends Base implements WaterDrawable {
    static _mixinName: string = 'WaterDrawableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Water from this thing for `actor`, or why none. */
    public async drawWaterFor(_actor: Stuff): Promise<WaterDrawAnswer> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self) || MixinApi.isCrafted(self)) {
        return { ok: false, reason: 'no-water' };
      }
      const slot = BulkableApi.slotFor(self, undefined);
      await slot?.settle();
      if (!slot || slot.isEmpty()) return { ok: false, reason: 'no-water' };
      if (slot.getMaterial()?.hasTag(WATER_TAG) !== true) return { ok: false, reason: 'no-water' };
      return { ok: true, facts: { source: self } };
    }
  };
}
