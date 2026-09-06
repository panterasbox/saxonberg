/**
 * Barge — a self-propelled hull that carries freight on the water.
 *
 * `BulkableMixin(DrivableMixin(MobileMixin(Vessel)))`. Unlike the rig it
 * genuinely steers, so it IS `Mobile`: the vessel traverses and the
 * shipped conveyance ripple carries whoever is aboard.
 *
 * ⚠ **`MobileMixin` had exactly one composer before this — `Character`.**
 * Three things had therefore only ever seen a person move, and each is
 * verified live rather than assumed: `ContainmentApi.move`'s rule about
 * where a vessel may live, residency (a barge tied up on a reach must not
 * be swept), and arrival narration on a host with no `Interactive`.
 *
 * ⭐ **An open deck is why passengers see the river go by**, and it needs
 * no code: an open container is an open container, and
 * `MixinApi.isOpenContainer` is the single rule `canReach`, the MQL
 * `peers` walk and `VisionModality` all ask. Whether a hold is covered is
 * a per-row `data` decision (logistics D3/AC8).
 */

import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { DrivableMixin } from '@saxonberg/server/mud/lib/slot/Drivable';
import { SlottedMixin } from '@saxonberg/server/mud/lib/slot/Slotted';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { VehicularMixin } from '../lib/Vehicular';

const BargeBase = VehicularMixin(
  BulkableMixin(DrivableMixin(SlottedMixin(MobileMixin(Vessel)))),
);

export default class Barge extends BargeBase {}
