/**
 * SplitController — `split <thing> [with <tool>]`: **divide an oversized or
 * aggregated thing into usable units.**
 *
 * ⭐⭐ **The verb exists because the shape already had a second member.**
 * `fell bole` cross-cuts a felled trunk a length at a time — under a verb
 * that means *take a tree down*, as its own view admits (*"Fell a standard
 * with an axe, or cross-cut a felled one"*). A quarried block is the same
 * act: a mass no body can lift, and one carryable piece per swing. A
 * `Stackable` is the third candidate. So this is a named pattern with three
 * members rather than three ad-hoc overloads, which is what the coming
 * RGO-interface unification inherits.
 *
 * ⚠ `dig block` would have been bad English and `quarry block` kept a whole
 * verb alive to serve one target.
 *
 * The thing itself decides what a piece is, what it takes, and when there is
 * nothing left — this file names no product and no material.
 */

import { WorkedActController, type WorkedActModel } from './WorkedActController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Splittable, Workable } from '../../../../lib/ground/Workable';
import { Mml } from '../../../../api/mml';

export default class SplitController extends WorkedActController {
  protected async subjectOf(
    model: WorkedActModel,
    _giver: Stuff,
  ): Promise<Workable | null> {
    // ⚠ Only the bound target, and no room fallback: `split` with nothing
    // named is a question, not an act on your surroundings. `dig` has a
    // ladder because the ground under you is always a candidate; there is
    // no ambient thing to divide.
    return asSplittable(model.target?.stuff ?? null);
  }

  protected nothingHere(model: WorkedActModel): ReturnType<typeof Mml.compose> {
    const named = model.target?.raw;
    if (named && !model.target?.stuff) {
      return Mml.compose`You don't see any '${named}' here.`;
    }
    const bound = model.target?.stuff;
    if (bound) {
      return Mml.compose`${Mml.thing(bound)} does not come apart like that.`;
    }
    return Mml.compose`Split what?`;
  }

  protected nothingHereReason(): string {
    return 'not-splittable';
  }
}

/** Narrow to the declared {@link Splittable} shape. See `DigController`. */
function asSplittable(stuff: Stuff | null): (Stuff & Splittable) | null {
  if (stuff === null) return null;
  const candidate = stuff as unknown as Partial<Splittable>;
  if (candidate.splittable !== true) return null;
  if (typeof candidate.planWork !== 'function') return null;
  if (typeof candidate.completeWork !== 'function') return null;
  return stuff as Stuff & Splittable;
}
