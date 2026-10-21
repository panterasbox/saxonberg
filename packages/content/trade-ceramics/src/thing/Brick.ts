/**
 * Brick — ⭐ a moulded block (ceramics D17): brick, tile, firebrick. A STACK
 * (a day at the table is one pallet of green bricks), green until fired,
 * carrying its clay's composition and its maker, worn by weather (W7).
 * Bricks of one firing grade apart by where they stood in the clamp, so a
 * stack fired as one is split by position (W5).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

/** Where a brick sat in a clamp (ceramics D15) — `''` when it has not. */
export type ClampPosition = 'channel' | 'middle' | 'skin' | '';

const BrickBase = GreenwareMixin(
  WaterActivityMixin(
    StackableMixin(DurableMixin(CraftedMixin(CompositionMixin(ThermalMixin(Good))))),
  ),
);

export default class Brick extends BrickBase {
  static fieldMeta: FieldMeta = {
    clampPosition: { persistent: true, runtimeState: true },
  };

  /**
   * ⭐ Where this stack sat in the clamp it was last set in (ceramics D15):
   * the clamp's setter puts it there when the firing starts, and the
   * clamp's fire answers it by it. Borne by the BRICK, not the clamp, so
   * it survives a restart mid-burn (a stuff id would not).
   */
  public clampPosition: ClampPosition = '';

  public getClampPosition(): ClampPosition {
    return this.clampPosition;
  }

  public setClampPosition(value: ClampPosition): void {
    this.clampPosition = value;
  }

  /**
   * ⭐ Bricks taken off a stack are the stack's bricks (the `Clay` and
   * `Ore` precedent): the split-off is a fresh clone of the ROW, so without
   * this a clay's composition, its water, its heat and its firing so far
   * would all reset to the row's — a pallet of fired brick split in two
   * would come back half green.
   */
  public override onSplit(splitoff: Stuff): void {
    const cut = splitoff as unknown as Partial<Brick>;
    const material = this.getMaterial();
    if (material && typeof cut.setMaterial === 'function') cut.setMaterial(material);
    if (typeof cut.setAlloying === 'function') cut.setAlloying(this.getAlloying());
    if (typeof cut.setWaterState === 'function') cut.setWaterState(this.getWaterState());
    if (MixinApi.isThermal(splitoff)) {
      const k = this.getTemperature().rawValue();
      splitoff.setStampedTemperatureK(k);
      splitoff.setLastAmbientK(this.lastAmbientK);
      const rec = this.getHeatWork();
      if (rec !== null) splitoff.adoptHeatWork(rec);
    }
    if (MixinApi.isCrafted(splitoff)) {
      splitoff.setMaker(this.getMaker());
      splitoff.setMark(this.getMark());
    }
    const self = this as unknown as Stuff;
    if (MixinApi.isGraded(self) && MixinApi.isGraded(splitoff)) splitoff.setGrade(self.getGrade());
    super.onSplit(splitoff);
  }
}
