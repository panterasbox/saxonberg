/**
 * Beast — **an animal: a body that acts, and is nobody.**
 *
 * Composition: `Behaved(Actor)` — the `NPC` shape one
 * rung down, and without `Costumed`, because an animal is not dressed.
 *
 * A rangy grey wolf. A fox in the yard, a boar in the wood. It has a
 * brain, it fights back when you hit it, it answers to nobody, it has no
 * name and it never will — `lint:identity` rule 6 refuses a `name:` on
 * it, and that refusal is the point rather than a limitation.
 *
 * ⚠⚠ **The wolf was an `Extra` until the base-class narrowing
 * (2026-09-30), and an `Extra` is a PERSON.** `Extra.ts:2` says so in
 * its first line — *"a character who is a role, not a person"* — and a
 * role is still somebody filling a post. So the wolf composed
 * `CasterMixin`, `MemorizedMixin`, `EmployedMixin`, `PersonaMixin`,
 * `CommandGiverMixin`, `AdvancementMixin`, `SoulMixin` and
 * `VocalMixin`: it could cast spells, memorise them, hold a job, claim
 * an aspiration and a written bio, and type commands. ⭐ The tell was in
 * `Extra`'s own docstring, which had grown the sentence *"An animal
 * answers to nobody forever"* — a line about animals living in a class
 * about people, there only because a wolf was standing on it.
 *
 * ⭐ **Three rows in three packs is the promotion threshold.** The wolf
 * (`newbie-wilds`), the draft horse (`transport`) and the pit pony
 * (`trade-mining`) were each on the person rung by a different route;
 * *promote at the third consumer* is exactly this.
 *
 * What it claims about `Actor`'s other composers: nothing — `Beast` is
 * a leaf. What it claims about itself: `Behaved`, so `talk.yaml` still
 * affords `talk to wolf` and the refusal is the dialogue controller's,
 * which is diegetic, rather than the binder's, which is silent.
 */

import { Actor } from '../../lib/creature/Actor';
import { BehavedMixin } from '../../lib/behavior/Behaved';

const BeastBase = BehavedMixin(Actor);

export class Beast extends BeastBase {}

export default Beast;
