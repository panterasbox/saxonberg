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

import NPC from '../npc/NPC';
import { MakerMixin } from '../craft/Maker';

export default class Crafter extends MakerMixin(NPC) {}
