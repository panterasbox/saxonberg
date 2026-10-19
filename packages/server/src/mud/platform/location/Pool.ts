/**
 * Pool — ⭐ **a place that IS a small water**: a cove, a pool, the
 * shallows of a mere — a water small enough to see across, and so a
 * place you are IN (maritime review, 2026-10-13; supersedes the
 * `StillWater` thing).
 *
 * Two things this class is, and both are facts about the PLACE:
 *
 * - **you swim here** — {@link SwimmableMixin} on the room itself.
 *   `LocomotionLogic`'s enablement walk asks the actor's container first,
 *   so being in the pool is what makes its exits swimmable, and the
 *   far-side rule (an exit whose destination is the medium) is what lets
 *   you swim INTO it from the strand. A ladder is a thing in a room
 *   because it is an instrument you can take away; water is not — it is
 *   the place, or what the place is beside ({@link Shore}).
 * - **its water is a named water** — {@link ShoreMixin}'s citation
 *   (`waters: { pool: /stuff/idea/WaterExpanse/greywater }`), so the pool
 *   reads the water it is: `look pool` is the author's words and then the
 *   water's read, and `fill` / `drink` / `wash` draw it. ⚠ ShoreMixin says
 *   *beside* a water; a pool is that water all round you, and the one
 *   seam serves both — the citation and the read are the same question.
 *
 * ⭐ Swimming is DERIVED from the water, never authored on top of it: a
 * pool whose water reads frozen cannot be swum (the ice is its own
 * build's — walking on it, how thick it is).
 */

import Locale from './Locale';
import { ShoreMixin } from '../../lib/location/Shore';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';

export default class Pool extends SwimmableMixin(ShoreMixin(Locale)) {
  /** A pool is swum every way it opens; a row may narrow it. */
  public override axes: string[] = ['*'];

  /** Swimmable unless the water it is reads frozen. */
  public override canEngageAxis(direction: string): boolean {
    const pick = this.waterFor();
    if ('key' in pick && this.peekWaterRead(pick.key)?.frozen === true) return false;
    return super.canEngageAxis(direction);
  }
}
