/**
 * Ladder — ⭐ the first instanceable `Climbable`.
 *
 * `climb` shipped with the locomotion build, `ClimbableMixin` beside it,
 * and for a year nothing in the game composed the mixin: not a class, not
 * a row. The Ferrow winze head said it *"is CLIMBED"* in its header and
 * had no `down` exit. The verb was reachable by nobody.
 *
 * A ladder is a THING in the room, not a property of the exit, because
 * the enablement walk (`LocomotionLogic.checkEnablementScope`) looks in
 * the actor's container and its contents for a host composing the mode's
 * `enablementMixin` — a ladder standing in the room is exactly what makes
 * the vertical exit climbable, and taking it away is what makes it not.
 *
 * `axes` says which directions it serves (`[down, up]` for a shaft
 * ladder); `difficulty: null` means anybody may. What the climb COSTS is
 * the body's business (`ExertingMixin.exertTraverse` at the climb mode's
 * `costMultiplier`): a fresh body stops on the way for its breath, a
 * conditioned one does not.
 */

import Thing from './Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';

const LadderBase = ClimbableMixin(DetailedMixin(Thing));

export default class Ladder extends LadderBase {}
