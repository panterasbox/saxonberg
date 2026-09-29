/**
 * Paddle — a handheld octagonal STOP paddle (a sign on a stick).
 *
 * Composition: `Wieldable` (held in a hand slot — the only body-side
 * affordance it needs), `Slottable` (so it can be wielded), `Detailed`
 * (the STOP face + the crazed retroreflective sheeting — purely visual,
 * NOT wired into LightApi) over a `Thing` (molded plastic, via
 * `Tangible`).
 *
 * The class is `Paddle` — the reusable kind is "a sign-on-a-stick";
 * STOP-only is Gus's instance's content. It carries no command and no
 * movement gate: raising it is theatrical, never a barrier. The soft-wall
 * down the avenue is Gus's dialogue, not this object.
 */

import Movable from '../../lib/stuff/Movable';
import { WieldableMixin } from '../../lib/slot/Wieldable';
import { SlottableMixin } from '../../lib/slot/Slottable';

const PaddleBase = WieldableMixin(SlottableMixin(Movable));

export default class Paddle extends PaddleBase {}
