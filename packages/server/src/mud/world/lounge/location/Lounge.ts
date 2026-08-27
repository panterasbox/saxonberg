/**
 * Lounge — the lounge room. The ONE room template every live lounge
 * instance is a clone of. "Host" and "satellite" are runtime *roles* the
 * LoungeWarren assigns; there is no separate class for either. Every live
 * lounge room — the commons and every satellite — is a clone of this.
 *
 * A plain (non-coordinate, zone-less) `Location` — a social pocket, not a
 * grid cell — composing the member-side mixins plus the usual
 * description/exit surface:
 *   WarrenMember → Lounge(Mixin) → Visible → Detailed → Exitable → PostRegistration
 *
 * The Warren coordinates these instances; the room itself stays an
 * ordinary containment root. No `SingletonMixin` (repeated clones are the
 * whole point), no coordinate mixin, no zone stamp.
 */

import Location from '../../../lib/stuff/Location';
import { WarrenMemberMixin } from '../../../lib/location/WarrenMember';
import { LoungeMixin } from '../LoungeMixin';
import { VisibleMixin } from '../../../lib/description/Visible';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ExitableMixin } from '../../../lib/boundary/Exitable';
import { PostRegistrationMixin } from '../../../lib/stuff/PostRegistration';
import type { FieldMeta } from '../../../lib/mixin';

const LoungeBase = PostRegistrationMixin(
  ExitableMixin(
    DetailedMixin(VisibleMixin(LoungeMixin(WarrenMemberMixin(Location)))),
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
