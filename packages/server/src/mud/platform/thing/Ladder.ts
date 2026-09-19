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
 *
 * ⭐ **And the ladder AFFORDS `climb`.** The drive found the verb was
 * `unknown-verb` at the winze head: `Mobile` contributes `go`/`run`/
 * `sneak` to every mover, and nothing anywhere contributed `climb` — a
 * verb with no way to invoke it, the first reachability link failing
 * closed. The instrument affords the verb (the standing rule): a ladder
 * in the room is what makes climbing a thing you can do here, in the
 * `environment` bucket, exactly as a watering can affords `water`.
 */

import Thing from './Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';
import type { CommandContributions } from '../../api/command';

const LadderBase = ClimbableMixin(DetailedMixin(Thing));

const CLIMB = ['platform/cmd/movement/climb.yaml'];

export default class Ladder extends LadderBase {
  static commandContributions: CommandContributions = {
    environment: CLIMB,
    peers: CLIMB,
  };
}
