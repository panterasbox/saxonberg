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
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

const BargeBase = BulkableMixin(DrivableMixin(SlottedMixin(MobileMixin(Vessel))));

export default class Barge extends BargeBase {
  static commandContributions: CommandContributions = {
    peers: ['system/transport/cmd/movement/journey.yaml'],
    environment: ['system/transport/cmd/movement/journey.yaml'],
  };

  /**
   * ⚠ **Residency veto.** A vehicle standing on a road or tied up on a
   * reach is *not* cold clutter — it is somebody's capital, parked
   * exactly where they left it. The self-eviction sweep would otherwise
   * cull an idle barge and the owner would come back to nothing, with no
   * error anywhere. The shipped `Exit` precedent, applied to the one
   * other kind of object that legitimately sits still for a long time.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'a moored vehicle is capital, not clutter' };
  }
}
