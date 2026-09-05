/**
 * Crafter — a maker NPC: a `Character` that can fulfill orders.
 *
 * General substrate (any maker NPC — bartender, smith, cook), not bar-
 * specific: `MakerMixin` is the order-fulfiller role marker `order` resolves
 * from the patron's location. Composes over `NPC`, so a Crafter inherits the
 * full behavior layer (`Behaved` + the brains a cast seed wires via its
 * `behaviors:` list) — the bar's staff are Crafters: behaviored cast members
 * that also fulfill `order`. `MakerMixin` adds only `isMaker()` (no
 * `postRegister`), so the clone pipeline's `postRegister` still resolves to
 * `BehavedMixin` and behaviors wire unchanged.
 */

import NPC from '../../lib/npc/NPC';
import { MakerMixin } from '../../lib/craft/Maker';
import { CastMixin } from '../../lib/npc/Cast';

/**
 * ⭐ **Both axes, one line** — the composition D5 turns on. Identity
 * (`CastMixin`) is outermost so a Crafter is a singleton by row; the
 * capability (`MakerMixin`) sits below, unchanged. Neither adds a
 * `postRegister`, so the clone pipeline's still resolves to `BehavedMixin`
 * and behaviors wire exactly as before.
 *
 * ⚠ All seven shipped Crafter rows happen to carry a proper name, so the
 * two axes look perfectly correlated. They are not — see `CastMixin`. A
 * capability NPC who is only a role composes `MakerMixin(NPC)` and does
 * not exist yet.
 */
export default class Crafter extends CastMixin(MakerMixin(NPC)) {}
