/**
 * DressingMixin — the **dressing** first-aid capability: an item that can
 * dress a wound (a bandage / gauze / a clean rag). A dressing is not a
 * *kind* — it's a role an item plays, marked by this mixin so `treat`
 * gates on the capability (`MixinApi.isDressing`), NOT `instanceof Bandage`
 * (any dressing-capable item qualifies).
 *
 * ⭐ Its **quality** is DERIVED, never authored (cleanliness D14): a
 * dressing is as good as it is clean, in the tiers — boiled (disinfected)
 * or sterile `1`, sanitised `0.8`, washed clean `0.6`, raw or dirty
 * `0.3`. The authored `dressingQuality` field is retired: a row could
 * claim a sterile bandage nobody ever boiled. A dressing that cannot be
 * soiled at all reads as clean as it was made (`1`). The dressing is
 * **single-use**: `treat` spends it via `StuffApi.destruct`. See
 * docs/subsystems/harm.md.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CleanTier } from '../cleanliness/Soilable';
import { MixinApi } from '../../api/mixin';

export interface Dressing {
  /** Dressing quality, 0 (filthy) .. 1 (sterile) — from its clean tier. */
  getDressingQuality(): number;
}

/** What each clean tier is worth as a dressing (D14). */
const QUALITY_BY_TIER: Record<CleanTier, number> = {
  dirty: 0.3,
  presentable: 0.3,
  clean: 0.6,
  sanitised: 0.8,
  disinfected: 1,
  sterile: 1,
};

export function DressingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DressingMixin extends Base implements Dressing {
    static _mixinName: string = 'DressingMixin';

    getDressingQuality(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSoilable(self)) return 1;
      return QUALITY_BY_TIER[self.cleanTier()];
    }
  };
}
