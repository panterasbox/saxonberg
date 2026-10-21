/**
 * Bell — ⭐⭐ **a diving bell** (underwater C2, D26): an open-bottomed iron
 * bell lowered on a hoist, its air trapped inside by the water it stands
 * in. You swim in under its rim and stand in air; the deeper it goes the
 * higher the water rises inside it; every breath fouls it; an air barrel
 * carried in and opened freshens it.
 *
 * Every part of that is the water pack's `AirPocketMixin` over the
 * kernel's `ExitableVessel` (a thing you can go inside is a place with
 * air). The bell is fixed in place: it does not sink when it is let down
 * into the water — it hangs where its hoist puts it.
 */

import ExitableVessel from '@saxonberg/server/mud/lib/boundary/ExitableVessel';
import { AirPocketMixin } from '@saxonberg/content-water/src/lib/AirPocket';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class Bell extends AirPocketMixin(ExitableVessel) {
  /** The pocket's air, authored on the bell's row (AirPocketMixin's field). */
  static fieldMeta: FieldMeta = {
    airM3: { persistent: true, authorable: true },
  };
}
