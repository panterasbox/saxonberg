/**
 * Copper — ⭐ **a wash boiler set in brick over its own fire** (cleanliness
 * D28, B30): the laundry's and the bathhouse's hot water. A `WaterFixture`
 * (it fills from its main, or is its own source) whose water is HOT while
 * its fire is in: what you draw from it, and what a tub is filled from,
 * comes at `heatsToK`; with the fire out it is whatever the room is.
 *
 * ⚠ The fire is the house's to keep, and the abstraction is legitimate
 * because it still costs somebody the activity: the attendant's wage and
 * the house's fuel par pay for it, and nobody pays for a lit copper in a
 * house that has none. `lit: false` on a row is a cold copper.
 */

import WaterFixture from './WaterFixture';
import type { FieldMeta } from '../../lib/mixin';
import { Quantity } from '../../lib/quantity';

export default class Copper extends WaterFixture {
  static fieldMeta: FieldMeta = {
    copperLit: { persistent: true, authorable: true },
    heatsToK: { persistent: true, authorable: true },
  };

  /** Is the fire under it in? */
  public copperLit = true;
  /** The heat its water is held at while the fire is in, K. */
  public heatsToK = 330;

  public isCopperLit(): boolean {
    return this.copperLit;
  }
  public setCopperLit(value: boolean): void {
    this.copperLit = value;
  }

  /** ⭐ Its water is at the copper's heat while the fire is in. */
  public override getTemperature(): Quantity<'K'> {
    return this.copperLit ? Quantity.of(this.heatsToK, 'K') : super.getTemperature();
  }
}
