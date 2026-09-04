/**
 * Coach — a conveyance with a **navigable interior**: you go inside it,
 * the door shuts, and the road happens outside.
 *
 * ⭐ This is the consumer CLAUDE.md records `ExitableVessel` as waiting
 * for — *"deferred until a consumer needs a concrete class."* The whole
 * enterable-container machinery (the synthesized `out` exit, the
 * `go <coach>` entry exit, the defining door) is exactly a carriage, and
 * it has been shipped and unused since the boundary build.
 *
 * `SeatedDrivableMixin(DrivableMixin(SlottedMixin(MobileMixin(ExitableVessel))))`
 * — driver-on-the-box, because a coach's controller seat is an object in
 * its contents rather than a slot on its frame. That is the shipped
 * cross-Stuff Drivable override; nothing new.
 *
 * ⚠ **A sealed coach is opaque, and that is the point** (AC8): a
 * passenger in an open wagon perceives the road, one in a shut
 * `Sealable` van does not, and the difference is one `data` field rather
 * than any code here. It is also why the interior needs its own light —
 * unlit is pitch black, and every object in a dark carriage reads as
 * *"something."*
 *
 * ⭐ **A passenger needs no new verb.** Boarding is the shipped
 * `go <coach>` / `enter`, alighting is `out`, and a passenger holds no
 * engagement at all — the journey is the driver's `hands`. AC15o falls
 * out of substrate that already shipped.
 */

import ExitableVessel from '@saxonberg/server/mud/lib/boundary/ExitableVessel';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { SlottedMixin } from '@saxonberg/server/mud/lib/slot/Slotted';
import {
  DrivableMixin,
  SeatedDrivableMixin,
} from '@saxonberg/server/mud/lib/slot/Drivable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

const CoachBase = SeatedDrivableMixin(
  DrivableMixin(SlottedMixin(MobileMixin(ExitableVessel))),
);

export default class Coach extends CoachBase {
  static commandContributions: CommandContributions = {
    peers: ['system/transport/cmd/movement/journey.yaml'],
    environment: ['system/transport/cmd/movement/journey.yaml'],
  };

  /** See {@link Barge.canEvict} — a parked coach is capital. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'a parked vehicle is capital, not clutter' };
  }
}
