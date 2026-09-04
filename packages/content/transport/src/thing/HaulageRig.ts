/**
 * HaulageRig — a wagon, a dray, a sledge: a wheeled load you **hitch and
 * pull**, that also carries continuous matter.
 *
 * ⭐ **Deliberately NOT `Mobile`.** A wagon does not steer itself; it is
 * pulled, and the shipped haulage tow inside `Mobile.traverse` already
 * carries it and its cargo through an exit as a unit. Making it Mobile
 * would have meant a second thing that moves — which is exactly the
 * duplication AC5 forbids — and it would have put the risky new
 * composition (`MobileMixin` on a non-Character host) on the shape that
 * needs it least.
 *
 * `BulkableMixin(HaulableMixin(Vessel))`, and every part is doing work:
 *
 * | | |
 * |---|---|
 * | `Vessel` | discrete cargo — crates, tools, bottles — plus the frame's own mass |
 * | `Haulable` | the hitch coupling, and `draftFactor`-attenuated draft load on the team rather than the full cargo weight |
 * | `Bulkable` | continuous matter — grain, ore, water — in slots, because half of freight is not countable |
 *
 * ⭐ Variety is **data, not subclassing**, per the shipped `Handcart`
 * note: a heavy wagon, a light barrow and a dragged sledge differ in
 * `mass` and `draftFactor` and in nothing else. The sledge's high
 * `draftFactor` is the second-variant probe, answered in a row.
 *
 * ⭐ **Whether passengers can see out is also data**: an open rig is an
 * open container, and `MixinApi.isOpenContainer` is the single rule
 * `canReach`, the MQL `peers` walk and `VisionModality` all ask. No seam
 * is needed here for that (logistics D3).
 */

import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import { HaulableMixin } from '@saxonberg/server/mud/lib/slot/Haulable';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const HaulageRigBase = BulkableMixin(HaulableMixin(Vessel));

export default class HaulageRig extends HaulageRigBase {
  /**
   * ⭐ **Content affords content.** `journey` lights up because a rig is
   * here, never because a core mixin says so — which is what lets a
   * second realm ship a second kind of cart with zero pack code.
   */
  static commandContributions: CommandContributions = {
    // `peers` and `environment`: the rig grants `journey` to whoever is
    // standing beside it, and to anyone riding in it.
    peers: ['system/transport/cmd/movement/journey.yaml'],
    environment: ['system/transport/cmd/movement/journey.yaml'],
  };
}
