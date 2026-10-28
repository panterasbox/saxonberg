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
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

/** Where a brick sat in a clamp (ceramics D15) — `''` when it has not. */
export type ClampPosition = 'channel' | 'middle' | 'skin' | '';

const BrickBase = GreenwareMixin(
  MarkedMixin(WaterActivityMixin(
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
   * ⭐ Green bricks stack only with bricks in the SAME green state and the
   * same ruin. A stack has one water state, so a fresh wet brick set down
   * beside a bone-dry one merged into "2 green bricks" of the dry one's
   * state and the wet brick's water was lost — the frost the drive left it
   * out for had nothing to burst (the ceramics drive A, run 21). Fired
   * bricks stack by the ordinary rule.
   */
  public override canMergeWith(other: Stuff): boolean {
    if (!super.canMergeWith(other)) return false;
    // ⭐ And only with bricks of the same MAKER. A stack bears no title (it
    // is owned by possession), so the maker is the one thing that says
    // whose a pile of bricks set out on a hack is — and a player's nine
    // folded into the gang's fourteen would be the gang's (drive A, run 32).
    if (MixinApi.isCrafted(other) && other.getMaker() !== this.getMaker()) return false;
    // ⭐ And only with bricks of the same BODY: a stack has one material, so
    // the clamp's three grades — clinker, earthenware, a soft place brick —
    // picked up together were folded into one stack of whichever came first
    // (drive A, run 37).
    const theirMaterial = MixinApi.isTangible(other) ? other.getMaterial() : null;
    if ((theirMaterial?.getTemplatePath() ?? null) !== (this.getMaterial()?.getTemplatePath() ?? null)) return false;
    const o = other as unknown as Partial<Brick>;
    const mineGreen = this.greenState();
    const theirsGreen = typeof o.greenState === 'function' ? o.greenState() : null;
    if (mineGreen === null && theirsGreen === null) return true;
    return mineGreen === theirsGreen && this.getRuin() === (typeof o.getRuin === 'function' ? o.getRuin() : null);
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
      const rec = this.getHeatWork();
      if (rec !== null) splitoff.adoptHeatWork(rec);
    }
    if (MixinApi.isCrafted(splitoff)) splitoff.setMaker(this.getMaker());
    if (MixinApi.isMarked(splitoff)) {
      splitoff.setMarkDevice(this.getMarkDevice());
      splitoff.setMarkForm(this.getMarkForm());
    }
    const self = this as unknown as Stuff;
    if (MixinApi.isGraded(self) && MixinApi.isGraded(splitoff)) splitoff.setGrade(self.getGrade());
    super.onSplit(splitoff);
  }
}
