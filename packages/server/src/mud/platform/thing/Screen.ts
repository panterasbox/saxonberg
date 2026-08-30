/**
 * Screen — a wall-mounted display: `DisplayMixin` on a self-seating
 * `Fixture` Thing. A wall TV is a row over this with `pairing: remote`,
 * `remote: <the remote's row>` and no `shows` (all three kinds) — no row
 * ships yet; the lounge's themed booths are its first home. Pairing is
 * the screen's field, never the remote's — a `Remote` is a plain thing
 * you carry.
 *
 * ⭐ **Mounted, not immovable.** It defaults to `fixedInPlace`, which
 * says exactly one thing: *no agent picks it up or carries it off.* It
 * shipped as a `canMove` veto refusing every destination but a
 * `Location`, which was both too low (that hook fires inside
 * `ContainmentApi.move`, the chokepoint a remodel, a `place` and an
 * author rearranging scenery all go through — none of which is a person
 * pocketing a television) and too rigid (a screen standing on a counter
 * is the same class, and a class-level veto could never say so). The row
 * decides now.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { FixtureMixin } from '../../lib/stuff/Fixture';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { DisplayMixin } from '../../lib/display/Display';

const ScreenBase = DisplayMixin(
  PostRegistrationMixin(FixtureMixin(DetailedMixin(Thing))),
);

export default class Screen extends ScreenBase {
  constructor() {
    super();
    // A wall TV is mounted by default; a row that stands one on a
    // counter authors `fixedInPlace: false`.
    this.fixedInPlace = true;
  }

  /** Seat into the declared `seatIn` target, if any. */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seatSelf();
  }
}
