/**
 * LoungeRoom — the one room template every lounge instance is a clone of.
 *
 * "Host" and "satellite" are runtime *roles* the `LoungeWarren` assigns;
 * there is no separate class for either. Every live lounge room — the one
 * currently acting as the commons and every satellite — is a clone of this
 * template. A plain (non-coordinate, zone-less) `Location` — a social
 * pocket, not a grid cell — composing the member-side mixins plus the
 * usual description/exit surface.
 *
 * Composition (inner → outer):
 *   WarrenMember → Lounge → Visible → Detailed → Exitable → PostRegistration
 *
 * The Warren coordinates these instances; the room itself stays an
 * ordinary containment root (`getContainer()` → null). No `SingletonMixin`
 * (repeated clones are the whole point), no coordinate mixin, no zone
 * stamp (the `/domain/lounge` FolderZone is not a SpatialZone).
 */

import Location from '../stuff/Location';
import { WarrenMemberMixin } from './WarrenMember';
import { LoungeMixin } from './Lounge';
import { VisibleMixin } from '../description/Visible';
import { DetailedMixin } from '../description/Detailed';
import { ExitableMixin } from '../boundary/Exitable';
import { PostRegistrationMixin } from '../stuff/PostRegistration';

const LoungeRoomBase = PostRegistrationMixin(
  ExitableMixin(
    DetailedMixin(VisibleMixin(LoungeMixin(WarrenMemberMixin(Location)))),
  ),
);

export default class LoungeRoom extends LoungeRoomBase {
  static persistentFields: string[] = [];

  /**
   * Wire any inverse exit pointers (host fixtures are imperatively
   * installed by the Warren, so there is rarely pending work) and let
   * the instruction-field `warren` self-registration run via the
   * Hydrator's Phase 2 (`applyWarren`) — which has already fired by the
   * time this hook runs.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  // onDestruct inherited: ExitableMixin (exit teardown) → Location (zone
  // detach, a no-op here) → … → Stuff terminal. WarrenMember's static
  // cleanupOnDestruct unhooks from the Warren's set on the destruct walk.
}
