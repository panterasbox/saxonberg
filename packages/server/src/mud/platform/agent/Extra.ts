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
 * attribution its harms carry (`EmployedMixin.institutionPath`), and a
 * sentient Extra that answers to nobody is a build error
 * (`lint:identity`): if hurting something is a crime, the victim must be
 * *someone*. An animal answers to nobody forever.
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

export class Extra extends NPC {
  /**
   * ⭐⭐ A role holds no personal opinion of you — the rung declaring the
   * fact that names it.
   *
   * What the watch thinks of you belongs to the watch, not to whichever
   * body is on the gate tonight, and an Extra is exactly "whichever
   * body": the same row stands up any number of them, so there is no
   * *somebody* for an opinion to belong to. ⚠ Two sentries would also
   * have shared one belief record before `viewerKey` was fixed — but
   * that was the symptom. This is the cause, and it is why the fix is a
   * declared hook rather than a key trick: a kept animal is also neither
   * `Cast` nor singleton and it MUST hold regard, so "not Cast ⇒ no
   * regard" is simply false.
   *
   * Recognition is untouched: an Extra still learns who you are for the
   * session and can greet you by name. Knowing you is a role behaviour;
   * having a view about you is not.
   *
   * The institution-held opinion this leaves room for
   * (`EmployedMixin.institutionPath()` as the viewer) is designed and
   * deferred to the pets slate's Wave 2 — it attaches at this hook.
   */
  public override keepsPersonalRegard(): boolean {
    return false;
  }
}

export default Extra;
