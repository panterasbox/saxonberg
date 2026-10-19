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
 *   Lounge(Mixin) → WarrenMember → Location
 *
 * Still no `SingletonMixin`: repeated clones are the whole point.
 */

import Location from '../../../lib/location/Location';
import { WarrenMemberMixin } from '../../../lib/location/WarrenMember';
import { LoungeMixin } from '../LoungeMixin';
import type { FieldMeta } from '../../../lib/mixin';

// ⭐ `PerceptibleMixin` — a room is addressable by keyword. ⚠ Composed
// per class because `Place` does NOT carry it (only
// `Location` does), so every room class built directly on
// `Place` has to remember. These rows were authoring `primaryKeyword`
// into a void until 2026-09-11; `lint:presentation` clause (d) found it.
const LoungeBase = LoungeMixin(WarrenMemberMixin(Location));

export default class Lounge extends LoungeBase {
  static fieldMeta: FieldMeta = {};

  /** Sized by its own `extent`, not the lounge zone's cell — its rows'
   *  light was tuned for an unsized room (the place taxonomy, B53). */
  protected override sizedByZoneCell(): boolean {
    return false;
  }

  // onCreate inherited: `Location.onCreate` wires the inverse exit
  // pointers. onDestruct inherited: ExitableMixin (exit teardown) → Place
  // (zone detach) → … → Stuff terminal. WarrenMember's static
  // cleanupOnDestruct unhooks from the Warren's set on the destruct walk.
}
