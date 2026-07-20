/**
 * Idea - Top-level branch for incorporeal identity.
 *
 * One of the six top-level branches sitting on Stuff (Thing,
 * Location, Idea, Agent, Vessel, Shadow). Idea is the
 * branch for things that have identity and state but no physical
 * presence in the world — `Exit`, `Login`, `Zone`, command-staging
 * Stuff, etc. Concrete in-world things use `Thing` (item-scale
 * movable), `Location` (stationary place), `Vessel` (mobile place),
 * or `Agent` (sentient actor).
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
