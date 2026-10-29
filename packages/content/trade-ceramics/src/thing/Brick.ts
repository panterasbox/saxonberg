/**
 * Brick — ⭐ a moulded block (ceramics D17): brick, tile, firebrick. A STACK
 * (a day at the table is one pallet of green bricks), green until fired,
 * carrying its clay's composition and its maker, worn by weather (W7).
 * Bricks of one firing grade apart by where they stood in the clamp, so a
 * stack fired as one is split by position (W5).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

/** Where a brick sat in a clamp (ceramics D15) — `''` when it has not. */
export type ClampPosition = 'channel' | 'middle' | 'skin' | '';

const BrickBase = GreenwareMixin(
  MarkedMixin(MoistureMixin(
    StackableMixin(DurableMixin(CraftedMixin(CompositionMixin(ThermalMixin(Good))))),
  )),
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
   * ⭐ A fired brick is named for its body — *earthenware brick*, *clinker
   * brick* — the way a candle is named for its fat. The row's stem is
   * "green brick", and a burnt brick still read "green" (drive A, run 37).
   */
  override getShortDescription(): string {
    const stem = super.getShortDescription();
    // `isGreen`, not `greenState`: a name is read on every look and must not
    // run the weather reconcile.
    if (this.isGreen()) return stem;
    // Only a stem that SAYS green is renamed: "firebrick" is already the
    // fired thing's name (run 39 read "a refractory fireclay brick").
    if (!/^green\b/i.test(stem)) return stem;
    const name = this.getMaterial()?.getName() ?? '';
    if (!name) return stem.replace(/^green\s+/i, '');
    return `${name} brick`;
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
    if (typeof cut.setMakeup === 'function') cut.setMakeup(this.getMakeup());
    if (typeof cut.setWaterState === 'function') cut.setWaterState(this.getWaterState());
    if (MixinApi.isThermal(splitoff)) {
      const k = this.getTemperature().rawValue();
      splitoff.setStampedTemperatureK(k);
      splitoff.setLastAmbientK(this.lastAmbientK);
      const rec = this.getKineticRecord();
      if (rec !== null) splitoff.adoptKineticRecord(rec);
    }
    // The maker and the mark's device are stack identity: the split copies
    // them. The mark's FORM (inked or embossed) is not, so it rides here.
    if (MixinApi.isMarked(splitoff)) splitoff.setMarkForm(this.getMarkForm());
    const self = this as unknown as Stuff;
    if (MixinApi.isGraded(self) && MixinApi.isGraded(splitoff)) splitoff.setGrade(self.getGrade());
    super.onSplit(splitoff);
  }
}
