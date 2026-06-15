/**
 * AirTank — worn gear that carries a breathable-air supply: the
 * carried-supply / budget archetype of the respiration build (the scuba
 * loop). `WearableMixin(SlottableMixin(BulkableMixin(Thing)))` — worn
 * gear with an `interior` bulk slot of compressed air.
 *
 * `Thing` contributes Visible / Perceptible / Tangible / Containable;
 * `BulkableMixin` adds the interior bulk slot (the air budget);
 * `SlottableMixin` + `WearableMixin` make it occupy a body-plan slot
 * (worn on the torso/back) so the respiration driver's worn-slot walk
 * (`RespirationMixin.findWornAirSupply`) finds it.
 *
 * Per-tank authoring — capacity (the air budget), `slotClaims`, the
 * starting fill — lives in each seed's `data:` block, not subclassed.
 * The respiration driver taps a worn tank whose interior material name
 * is in the body's breathable set; when it runs dry the body falls into
 * the supply-exhausted crisis (`cause: 'supply'`).
 */

import Thing from '../lib/stuff/Thing';
import { SlottableMixin } from '../lib/slot/Slottable';
import { WearableMixin } from '../lib/slot/Wearable';
import { BulkableMixin } from '../lib/bulk/Bulkable';
import type { Stuff } from '../lib/stuff/Stuff';
import type { SubscribableFieldDescriptor } from '../api/mql-subscription';

const AirTankBase = WearableMixin(SlottableMixin(BulkableMixin(Thing)));

export default class AirTank extends AirTankBase {
  /**
   * The air-gauge fraction — interior air remaining over capacity, in
   * `[0, 1]` (the watched, depleting budget). `undefined` when the tank
   * carries no interior bulk slot (omitted from projection). With no
   * authored capacity, reads `1` while any air remains, else `0`.
   */
  getAirGauge(): number | undefined {
    if (!this.hasInteriorBulk()) return undefined;
    const slot = this.getBulk('interior');
    const amount = slot.getAmount().rawValue();
    const cap = slot.getCapacity();
    if (!cap || cap.rawValue() <= 0) return amount > 0 ? 1 : 0;
    return Math.max(0, Math.min(1, amount / cap.rawValue()));
  }

  /**
   * The gauge as an MQL-projected field so the inspection pane can show
   * the air remaining. Marked `static` (not field-change-driven): the
   * bulk substrate does not fire `FieldChangedEvent` on debit today, so
   * the gauge re-reads on each projection rather than live-pushing on
   * every tap (a refresh-on-debit hook is a future bulk-substrate wiring).
   */
  static subscribableFields: SubscribableFieldDescriptor[] = [
    {
      name: 'airGauge',
      read: (stuff: Stuff): unknown => (stuff as AirTank).getAirGauge(),
      static: true,
    },
  ];
}
