/**
 * Lounge — the lounge room. The ONE room template every live lounge
 * instance is a clone of. "Host" and "satellite" are runtime *roles* the
 * LoungeWarren assigns; there is no separate class for either. Every live
 * lounge room — the commons and every satellite — is a clone of this.
 *
 * ⭐⭐ **A grid cell, because every location plots on some coordinate
 * system.** This was authored as a deliberately non-coordinate,
 * zone-less social pocket — but the Warren's star topology was spatial
 * all along (`attachmentFor` reserves a compass direction off the host),
 * so the rooms had positions and simply never stamped them. A satellite
 * budded at runtime is now placed in `/world/lounge`'s grid at the
 * host's cell plus that direction's offset, which is exactly the
 * warren-manages-them-dynamically case: the ROW declares no coords
 * because the warren assigns them.
 *
 * Composition — the member-side mixins plus coordinates and the usual
 * description/exit surface:
 *   WarrenMember → Lounge(Mixin) → Visible → Detailed → Cartesian → Exitable → PostRegistration
 *
 * Still no `SingletonMixin`: repeated clones are the whole point.
 */

import Location from '../../../lib/stuff/Location';
import { CartesianCoordinatesMixin } from '../../../lib/location/CartesianCoordinates';
import { WarrenMemberMixin } from '../../../lib/location/WarrenMember';
import { LoungeMixin } from '../LoungeMixin';
import { VisibleMixin } from '../../../lib/description/Visible';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ExitableMixin } from '../../../lib/boundary/Exitable';
import { PopulatesMixin } from '../../../lib/stuff/Populates';
import { PostRegistrationMixin } from '../../../lib/stuff/PostRegistration';
import type { FieldMeta } from '../../../lib/mixin';

/*
 * ⭐ `PopulatesMixin` so the room can carry `props:` — the wardrobe, the
 * sandbox's door. Every lounge room is a clone of the one template, so
 * every satellite the warren buds gets one, which is the honest reading
 * of *any wardrobe anywhere opens onto your own circle*: reachable from
 * the commons wherever you were seated, with no one magic room.
 */
const LoungeBase = PostRegistrationMixin(
  PopulatesMixin(
    ExitableMixin(
      CartesianCoordinatesMixin(
        DetailedMixin(VisibleMixin(LoungeMixin(WarrenMemberMixin(Location)))),
      ),
    ),
  ),
);

export default class Lounge extends LoungeBase {
  static fieldMeta: FieldMeta = {};

  /**
   * Wire any inverse exit pointers (host fixtures are imperatively
   * installed by the Warren, so there is rarely pending work). The
   * instruction-field `warren` self-registration has already run via the
   * Hydrator's Phase 2 (`applyWarren`) by the time this hook fires.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  // onDestruct inherited: ExitableMixin (exit teardown) → Location (zone
  // detach, a no-op here) → … → Stuff terminal. WarrenMember's static
  // cleanupOnDestruct unhooks from the Warren's set on the destruct walk.
}
