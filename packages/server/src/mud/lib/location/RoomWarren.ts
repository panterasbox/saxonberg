/**
 * RoomWarren — **a warren whose members are ROOMS.**
 *
 * One of the two tiers every warren belongs to (see {@link CirculationWarren}
 * for the other). The distinction is not decorative: it decides what
 * "who is in here" means, and getting it wrong reaps an occupied space.
 *
 *   - **`RoomWarren`**: members are ROOMS you stand in. A lounge and its
 *     satellites; a holding and its rooms. Occupancy is who is standing
 *     in a member.
 *   - **`CirculationWarren`**: members are HOLDINGS, reached by the
 *     circulation it owns. A dorm and its units off its corridors; a
 *     plat and its houses along its lanes. Occupancy is who is anywhere
 *     inside a member's own rooms.
 *
 * ⭐ Each is named for what it IS, not as the other's opposite (they were
 * `InnerWarren`/`OuterWarren` until the cleanliness review, 2026-10-18).
 *
 * A `RoomWarren` is the bottom of the nesting — its members are places
 * you walk into, never containers of further places — and `addMember`
 * says so out loud rather than leaving it to convention.
 *
 * The tier is chosen by which base you extend, and `Warren` declares
 * `occupantsOf` abstract so the choice cannot be skipped.
 */

import { Warren } from './Warren';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';

type MemberStuff = Stuff & Container;

export abstract class RoomWarren extends Warren {
  /** Occupants of a room member: whoever is standing in it. */
  protected occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    return this.leafOccupants(m);
  }

  /**
   * The tier invariant, enforced rather than assumed: a room, never
   * another warren. A warren handed to a room warren would have its
   * occupants counted as zero (its people are one level further in),
   * and the reap that followed would take an occupied space down.
   */
  public override addMember(m: MemberStuff): boolean {
    if (m instanceof Warren) {
      throw new Error(
        `RoomWarren.addMember: ${m.stuffId} is a warren, and a room ` +
          `warren holds rooms. A warren whose members are holdings is a ` +
          `CirculationWarren.`,
      );
    }
    return super.addMember(m);
  }
}

export default RoomWarren;
