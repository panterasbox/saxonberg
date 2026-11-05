/**
 * Flagstaff — ⭐ **where a ship's colors are flown**.
 *
 * A fixed fixture that takes ONE flag `on` it — `put flag on flagstaff`,
 * `get flag` to strike it. What is on her entrance room's flagstaff is the
 * flag she flies (`Ship.flownFlag()`); a staff with nothing on it flies
 * nothing. It refuses anything that is not a flag, and a second flag while
 * one is flying.
 */

import Good from '../../lib/stuff/Good';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { MixinApi } from '../../api/mixin';
import Flag from './Flag';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { VetoResult } from '../../lib/errors';
import type { FieldMeta } from '../../lib/mixin';

export default class Flagstaff extends PlacingMixin(Good) {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  /** The flag flying from it, or `null`. */
  public flying(): Flag | null {
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return null;
    for (const x of room.getContents()) {
      if (!(x instanceof Flag)) continue;
      if (x.getPlacement()?.host === (self as unknown)) return x;
    }
    return null;
  }

  /** ⭐ One flag, and only a flag. */
  public override canPlace(item: Stuff & Containable, name: string): VetoResult {
    if (!(item instanceof Flag)) return { ok: false, reason: 'only-a-flag' };
    const flying = this.flying();
    if (flying !== null && flying !== item) return { ok: false, reason: 'a-flag-flies' };
    return super.canPlace(item, name);
  }
}
