/**
 * Extra — a character who is **a role, not a person.**
 *
 * *A* sentry. *A* sellsword. *A* hewer on tutwork. A rangy grey wolf.
 * Somebody fills the post; which somebody is not a fact the world keeps,
 * and nothing pretends otherwise: an Extra carries no proper name and no
 * written history, and asking for one says so plainly rather than
 * returning an empty answer.
 *
 * It is the plain substrate with no identity rung — deliberately NOT a
 * singleton, because two sentries are the point. What an Extra lacks is a
 * *person* to attribute to, so the party that fields it is the only
 * attribution its harms carry (`AffiliatedMixin`), and a sentient Extra
 * that answers to nobody is a build error (`lint:identity`): if hurting
 * something is a crime, the victim must be *someone*. An animal answers
 * to nobody forever.
 *
 * ⚠ **A role-filler still has a personality**, and it reads the same as
 * anyone's — `dispositions:` stays on `BehavedMixin`, which both rungs
 * carry. It simply never changes: a role is a mask, not a life.
 *
 * This replaces the former `platform/agent/NPC`, which named neither rung.
 * The twin renames because the concrete class genuinely **split into two
 * things** — the `Corpse` precedent, not the shared-name default.
 */

import { NPC } from '../../lib/npc/NPC';

export class Extra extends NPC {}

export default Extra;
