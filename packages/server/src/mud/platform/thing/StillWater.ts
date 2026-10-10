/**
 * StillWater — a water you can swim: the instrument of swimming, as a
 * ladder is of climbing (maritime D27).
 *
 * `swim` shipped with the locomotion build and nothing composed
 * `SwimmableMixin`, so the verb sat `unreachable:` waiting for the
 * navigable-water design to say what you swim IN. The answer it reached:
 * a small water you can see across is a PLACE — a cove, a pool — and the
 * water there is a thing in the room, exactly as a ladder standing in a
 * shaft is what makes the shaft climbable. `LocomotionApi`'s enablement
 * check looks in the actor's container and its contents for a host
 * composing the mode's enablement mixin, so this standing in the pool
 * (and on the strand you wade in from) is what makes the `media: [water]`
 * exits between them swimmable, and its absence is the stated refusal.
 *
 * ⛔ Never on a `Shore` or a deck's gunwale: a shore CITES a water you are
 * not in, and making every riverbank and every deck swimmable is the
 * wrong host by construction. A fixture: authored `fixedInPlace: true`.
 */

import Good from '../../lib/stuff/Good';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';
import type { CommandContributions } from '../../api/command';

const SWIM = ['platform/cmd/movement/swim.yaml'];

export default class StillWater extends SwimmableMixin(Good) {
  static commandContributions: CommandContributions = {
    environment: SWIM,
    peers: SWIM,
  };
}
