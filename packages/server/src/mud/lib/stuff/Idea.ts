/**
 * Idea - Top-level branch for incorporeal identity.
 *
 * One of the **five** top-level branches sitting on Stuff: `Thing`,
 * `Location`, `Idea`, `Agent`, `Shadow`. ⚠ This said SIX and listed
 * `Vessel`, which is not a branch and never was — it is a class on the
 * Thing branch (`Container(Movable)`), and saying otherwise here made
 * the one file that defines a branch disagree with
 * `Stuff._registerTopLevelBranch`, which allows exactly five.
 *
 * `Idea` is the branch for things that have identity and state but no
 * physical presence — a zone, a material, a species, a spell, an exit,
 * a login, a controller. ⭐ It composes **nothing**: alone of the five
 * roots it adds no mixin to `Stuff`, which is why the base-class
 * narrowing found nothing to strip here. What a descendant needs, it
 * composes.
 *
 * ⚠⚠ And nothing on this branch is addressable by KEYWORD. An exit is
 * addressed by direction as a feature of the ROOM; a spell, a topic, a
 * reading and a discipline by a string key through their catalogue;
 * `Material` is the one Idea composing `Perceptible` and it LENDS its
 * keywords to the good made of it (`race.md`: *"material keywords never
 * leak into room scope"*). That is the owner's rule — *every branch
 * wants `Perceptible` on the base except Idea* — and it holds without
 * a rung to enforce it.
 *
 * Concrete in-world things use `Thing` (matter) / `Movable` (a good),
 * `Location` (a place) or `Agent` (a body).
 *
 * See [docs/architecture.md § Top-level branches](../../../../../../docs/architecture.md).
 */

import { Stuff } from './Stuff';

/**
 * Base class for incorporeal game objects with identity but no
 * physical presence.
 */
export class Idea extends Stuff {
  /**
   * Constructor - calls parent Stuff constructor.
   */
  constructor() {
    super();
  }

  /**
   * Get a string representation of this idea (for debugging).
   * Subclasses should override to provide more specific information.
   */
  public toString(): string {
    return `[Idea ${this.stuffId}${this.isDestroyed() ? ' (destroyed)' : ''}]`;
  }
}


// Self-register as a top-level branch (the one sanctioned module-scope
// self-registration — see `Stuff._registerTopLevelBranch` for why the
// hierarchy's root invariant must populate at branch-module load, and
// `scripts/check-module-scope.ts`'s allowlist).
Stuff._registerTopLevelBranch(Idea);
