/**
 * Cast — a character who is **somebody.**
 *
 * Odile, who is the city's entire civil service. Dave, whose bar carries
 * his name. *The* collier, who has no name and is unmistakably one
 * person. A Cast member can be wronged, has a history worth writing down,
 * and answers for what they do alongside whoever fields them.
 *
 * The generic clone target for the identity rung, so a row's `class:`
 * says which rung it is out loud. Combinations that also need a
 * capability stay one-liners over the same mixin —
 * `Crafter = CastMixin(MakerMixin(NPC))`.
 *
 * `CastMixin` brings `SingletonMixin`: a second live clone of a Cast row
 * throws. That is the enforcement, and it is why *"every NPC row is
 * instanced exactly once"* stops being an accident that happens to hold
 * across 39 rows and becomes something the engine refuses to break.
 */

import { NPC } from '../../lib/npc/NPC';
import { CastMixin } from '../../lib/npc/Cast';

export class Cast extends CastMixin(NPC) {}

export default Cast;
