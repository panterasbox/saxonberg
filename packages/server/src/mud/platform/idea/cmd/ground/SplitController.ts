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

import { WorkedActController, type WorkedActModel, type WorkWords } from './WorkedActController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SplitBegin, SplitDone, SplitRefusal } from '../../../../lib/ground/Workable';
import type { Splittable } from '../../../../lib/ground/Splittable';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

export default class SplitController extends WorkedActController<SplitBegin, SplitDone, SplitRefusal> {
  protected async subjectOf(
    model: WorkedActModel,
    _giver: Stuff,
  ): Promise<(Stuff & Splittable) | null> {
    // ⚠ Only the bound target, and no room fallback: `split` with nothing
    // named is a question, not an act on your surroundings. `dig` has a
    // ladder because the ground under you is always a candidate; there is
    // no ambient thing to divide.
    const stuff = model.target?.stuff ?? null;
    return stuff !== null && MixinApi.isSplittable(stuff) ? stuff : null;
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

  /** ⭐ `split`'s words (D4) — what the thing being divided answered. */
  protected workWords(giver: Stuff, subject: Stuff): WorkWords<SplitBegin, SplitDone, SplitRefusal> {
    return {
      beginSelf: (b) => {
        switch (b.kind) {
          case 'colony':
            return Mml.compose`You start going through the frames, looking for brood and eggs to take across.`;
          case 'cheese':
            return Mml.compose`You set the blade at the centre and lean on it.`;
          case 'stone':
            return Mml.compose`You set the wedge, find the grain, and start working a piece off it.`;
          default: {
            const never: never = b.kind;
            return never;
          }
        }
      },
      beginPeers: (b) =>
        b.kind === 'colony'
          ? Mml.compose`${Mml.actor(giver)} is working slowly through an open hive.`
          : b.kind === 'cheese'
            ? Mml.compose`${Mml.actor(giver)} starts cutting into a wheel of cheese.`
            : Mml.compose`Somebody starts splitting a block of stone.`,
      onRefused: (out) => splitRefusal(out, subject),
      onDone: (d) => {
        switch (d.kind) {
          case 'colony':
            return {
              self: Mml.compose`You lift four frames of brood and bees across into a box of their own. They have no queen; they will have to make one.`,
              peers: Mml.compose`Somebody divides a hive into two.`,
            };
          case 'cheese':
            return {
              self: d.last
                ? Mml.compose`The last wedge comes away — ${d.wedge}.`
                : Mml.compose`A wedge comes away clean — ${d.wedge}.`,
            };
          case 'stone': {
            const tail = d.last ? ' That is the last of it; what is left would not build anything.' : '';
            return {
              self:
                d.piece === null
                  ? Mml.compose`A piece comes away.${tail}`
                  : Mml.compose`A piece comes away clean — ${d.piece}.${tail}`,
            };
          }
          default: {
            const never: never = d;
            return never;
          }
        }
      },
    };
  }
}

/** ⭐ The words for a refused split — every reason, exhaustively. */
function splitRefusal(out: SplitRefusal, subject: Stuff): Composed {
  switch (out.reason) {
    case 'not-splittable':
      return Mml.compose`${subject.getPresentation()} does not come apart like that.`;
    case 'no-colony':
      return Mml.compose`There are no bees in it to divide.`;
    case 'no-queen':
      return Mml.compose`They have no queen as it is. Splitting them would leave you two halves of nothing.`;
    case 'too-weak':
      return Mml.compose`There is not enough of them to make two.`;
    case 'wheel-spent':
      return Mml.compose`There is nothing left of it to cut.`;
    case 'no-edge':
      return Mml.compose`You want an edge for that — a knife, or a wire.`;
    case 'wedge-failed':
      return Mml.compose`It will not come apart cleanly.`;
    case 'block-spent':
      return Mml.compose`There is nothing left in it worth splitting — only rubble.`;
    case 'no-striker':
      return Mml.compose`Not with your hands. You want something to strike it with — a sledge, or the back of a pick.`;
    default: {
      const never: never = out;
      return never;
    }
  }
}
