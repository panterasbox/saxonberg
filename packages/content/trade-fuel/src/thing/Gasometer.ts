/**
 * Gasometer — ⭐⭐ **a vessel you can read from across the yard**, which is
 * the whole reason a Victorian gasworks looked the way it did.
 *
 * A bell floating in a water seal rises as gas goes in and sinks as it
 * is drawn off, so the town's gas stock is a thing anybody walking past
 * can SEE. That is what makes it worth building as an object rather than
 * a number: the level is public, it is the same for every viewer, and
 * nobody needs an instrument.
 *
 * ⭐ The level is derived — `getGasPressureAtm()` is amount over
 * capacity, rendered in five level words by `Bulkable`'s own contents
 * augmenter. No field, no digit, and two players always read the same
 * thing.
 *
 * **Composition.** `Bulkable(Thermal(Thing))` and `Thing` rather than
 * `Good`, because a gasometer is plant: it is not picked up, not owned
 * as chattel, and not concealed. ⚠ `closure: sealed` on the row is
 * construction — a bell in a water seal is gas-tight by being one — and
 * it is what makes `requiredClosureFor` let coal gas in at all.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';

const GasometerBase = BulkableMixin(ThermalMixin(Thing));

export default class Gasometer extends GasometerBase {
  /**
   * Take gas in off a condenser's outlet. ⭐ The same `receive` shape the
   * condenser answers to, so the chain is *retort → condenser →
   * gasometer* with no class knowing more than its neighbour.
   */
  public receive(materialPath: string, litres: number): number {
    if (!(litres > 0)) return 0;
    const material =
      StuffApi.findByTemplatePath<Material>(materialPath) ?? null;
    if (material === null) return 0;
    const slot = this.getBulk('interior');
    const existing = slot.getMaterialPath();
    if (existing !== null && existing !== materialPath) return 0;
    const put = Math.min(slot.remaining(), litres);
    if (!(put > 0)) return 0;
    if (existing === null) this.setBulkMaterial('interior', material);
    this.setBulkAmount(
      'interior',
      Quantity.of(slot.getAmount().rawValue() + put, 'L'),
    );
    return put;
  }
}
