/**
 * CharcoalPit — the clamp: a covered heap of cordwood, burned WITHOUT
 * enough air to burn.
 *
 * ⭐⭐ **Airflow is the decision, and the failure mode is the point.**
 *
 * Charring is not lighting a fire — it is running a fire that is
 * deliberately starving. The volatiles cook out and leave, the carbon
 * stays, and the collier's whole job for three days is holding the
 * draught between two ways of losing everything:
 *
 *  - **too much air** and the charge burns all the way through: the
 *    carbon goes up as well, and you open a clamp full of **ash**;
 *  - **too little** and the middle never reaches charring heat at all:
 *    you draw **half-burnt brands**, heavy and worth a fraction.
 *
 * ⭐ **You can lose a whole burn**, and losing it costs a week's cutting
 * and three days' watching. That is a real judgment craft with a real
 * downside — and it is what makes charcoal expensive enough for the
 * smelter's margin to be an interesting number.
 *
 * The draught is one authored dial (`draught`, 0–1) the collier sets and
 * adjusts; the yield is a pure function of it, so nothing rolls and a
 * collier who learns the number gets it right every time. What competence
 * is FOR here is knowing what to set, not being allowed to.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { FurnaceMixin } from '@saxonberg/server/mud/lib/fire/Furnace';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** What a burn can come out as. */
export type BurnOutcome = 'charcoal' | 'brands' | 'ash';

/**
 * The draught band that actually chars. Outside it in either direction is
 * a lost burn — narrow enough that the craft is real, wide enough that a
 * collier who is paying attention is not being punished for existing.
 */
export const CHARS_FROM = 0.3;
export const CHARS_TO = 0.62;

const CharcoalPitBase = FurnaceMixin(
  ContainerMixin(ReservedMixin(ThermalMixin(Thing))),
);

export default class CharcoalPit extends CharcoalPitBase {
  static fieldMeta: FieldMeta = {
    draught: { persistent: true, authorable: true },
    charMaterialPath: { persistent: true, authorable: true },
    charcoalTemplate: { persistent: true, authorable: true },
    brandsTemplate: { persistent: true, authorable: true },
    ashTemplate: { persistent: true, authorable: true },
    yieldRatio: { persistent: true, authorable: true },
  };

  /**
   * How far the vents are open, 0 (sealed) … 1 (wide). ⭐ The ONE dial,
   * and the whole craft. Set with `char <n>` and adjusted while the burn
   * runs.
   */
  protected draught: number = 0.45;

  /** The rows a burn yields, supplied by the LOCALITY that owns the yard. */
  protected charcoalTemplate: string = '';
  protected brandsTemplate: string = '';
  protected ashTemplate: string = '';

  /**
   * Baskets of charcoal per length of cordwood at a perfect burn. ⚠ Well
   * under 1: charring throws away most of the mass, which is the reason
   * charcoal costs what it costs and the reason the yard sits next to the
   * coppice rather than next to the smelter.
   */
  protected yieldRatio: number = 0.35;

  public getDraught(): number { return this.draught; }
  public setDraught(value: number): void {
    this.draught = value < 0 ? 0 : value > 1 ? 1 : value;
  }

  public getCharcoalTemplate(): string { return this.charcoalTemplate; }
  public setCharcoalTemplate(v: string): void { this.charcoalTemplate = v; }
  public getBrandsTemplate(): string { return this.brandsTemplate; }
  public setBrandsTemplate(v: string): void { this.brandsTemplate = v; }
  public getAshTemplate(): string { return this.ashTemplate; }
  public setAshTemplate(v: string): void { this.ashTemplate = v; }
  public getYieldRatio(): number { return this.yieldRatio; }
  public setYieldRatio(v: number): void { this.yieldRatio = v; }

  /**
   * What this draught produces — ⭐ **a threshold, never a roll.** The
   * collier's uncertainty is epistemic: the number was always going to do
   * this, and a collier who learns it gets it right every time.
   */
  public outcomeFor(draught: number = this.draught): BurnOutcome {
    if (draught > CHARS_TO) return 'ash';
    if (draught < CHARS_FROM) return 'brands';
    return 'charcoal';
  }

  /**
   * Baskets from `lengths` of cordwood at this draught.
   *
   * ⭐ Inside the band the yield still VARIES: dead centre is the best
   * burn, and drifting toward either edge costs you some of it. So there
   * is a right answer and there is a nearly-right answer, which is what
   * makes a burn worth watching rather than worth setting and leaving.
   */
  public yieldFor(lengths: number, draught: number = this.draught): number {
    if (this.outcomeFor(draught) !== 'charcoal') return 0;
    const centre = (CHARS_FROM + CHARS_TO) / 2;
    const halfWidth = (CHARS_TO - CHARS_FROM) / 2;
    const off = Math.abs(draught - centre) / halfWidth;
    const efficiency = 1 - 0.4 * off;
    return Math.max(0, Math.floor(lengths * this.yieldRatio * efficiency));
  }
}
