/**
 * InnerWarren — **a warren whose members are ROOMS.**
 *
 * One of the two tiers every warren belongs to (see {@link OuterWarren}
 * for the other). The distinction is not decorative: it decides what
 * "who is in here" means, and getting it wrong reaps an occupied space.
 *
 *   - **Inner**: members are leaf spaces. A lounge and its satellites; a
 *     holding and its rooms. Occupancy is who is standing in a member.
 *   - **Outer**: members are themselves warrens. A dorm and its units; a
 *     subdivision and its houses. Occupancy is who is anywhere inside a
 *     member's own rooms.
 *
 * An inner warren is the bottom of the nesting — its members are places
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

export abstract class InnerWarren extends Warren {
  /** Occupants of a room member: whoever is standing in it. */
  protected occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    return this.leafOccupants(m);
  }

  /**
   * The tier invariant, enforced rather than assumed: a room, never
   * another warren. A warren handed to an inner warren would have its
   * occupants counted as zero (its people are one level further in),
   * and the reap that followed would take an occupied space down.
   */
  public override addMember(m: MemberStuff): boolean {
    if (m instanceof Warren) {
      throw new Error(
        `InnerWarren.addMember: ${m.stuffId} is a warren, and an inner ` +
          `warren holds rooms. A warren whose members are warrens is an ` +
          `OuterWarren.`,
      );
    }
    return super.addMember(m);
  }
}

export default InnerWarren;
