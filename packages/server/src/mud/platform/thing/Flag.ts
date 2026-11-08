/**
 * Flag — ⭐ **a government's colors, as a thing**.
 *
 * A branded good whose brand is a polity's mark (`Brand.government`): run
 * up a ship's flagstaff (`put flag on flagstaff`), it is the colors she
 * flies — `Ship.flownFlag()`. ⚠ The flown flag is only a claim: it may
 * differ from her register, and false colors are found out by anybody who
 * reads the register (the flag state is the REGISTER's, never the cloth's).
 */

import Good from '../../lib/stuff/Good';
import { BrandedMixin } from '../../lib/corpo/Branded';
import type { FieldMeta } from '../../lib/mixin';

export default class Flag extends BrandedMixin(Good) {
  static fieldMeta: FieldMeta = {};

  /** The government whose colors these are, off the brand — `''` for a flag of no polity. */
  public colorsOf(): string {
    return this.getBrand()?.government ?? '';
  }
}
