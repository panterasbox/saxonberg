/**
 * DigController — `dig [<what>] [with <tool>]`: **turn the ground over and
 * see what comes up.**
 *
 * ⚠⚠ **This verb shipped once and was WITHDRAWN in review.** The fishing
 * build designed it and cut it (MR !268) for one reason: *the yield was
 * hard-coded to a worm.* Everything in this file is arranged so that
 * mistake is not expressible — there is no product name anywhere in it, no
 * branch on what kind of digging is happening, and no list of what a place
 * might give. What comes up is the ground's to say.
 *
 * ## ⭐ The resolution ladder, and why it has three rungs
 *
 *   1. **the bound target**, if it answers the shape — `dig the bank`.
 *   2. **the room**, if it answers — a quarry floor, a turbary. This is the
 *      rung extraction uses, because a working is a Location.
 *   3. **the room's floor**, if it answers — every Location has one since
 *      the ground build, so this is the rung a `Soil` host will be found
 *      on when foraging asks the topsoil what is living in it.
 *
 * Writing all three now is what makes the foraging drop-in free instead of
 * a controller edit — which is the difference between a seam and a promise.
 *
 * ⭐ A bare word that binds nothing (`dig clay`) is passed through as the
 * player's own word, because a band in the column is not a bindable object.
 * The `fell.yaml` shape.
 *
 * ⭐ The ground answers reasons and facts; the words are here
 * (controllers-are-io D4) — what the ground refused for, what came up.
 */

import { WorkedActController, type WorkedActModel, type WorkWords } from './WorkedActController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type {
  DigBegin,
  DigDone,
  DigRefusal,
  DigWon,
  Diggable,
} from '../../../../lib/ground/Workable';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

/**
 * ⭐ The one host of the `dig` shape, BY NAME: the quarry pack's open
 * working (a quarry face, a turbary). ⚠ Not a kernel marker — `Diggable`
 * has one host and is a property of it (controllers-are-io D8a); a pack
 * mixin's name is federated at discovery, so naming it imports nothing. A
 * second host (the topsoil's `Soil`) is the day this earns a protocol mixin.
 */
const DIGGABLE_HOST = 'OpenWorkingMixin';

export default class DigController extends WorkedActController<DigBegin, DigDone, DigRefusal> {
  protected async subjectOf(
    model: WorkedActModel,
    giver: Stuff,
  ): Promise<(Stuff & Diggable) | null> {
    const bound = model.target?.stuff ?? null;
    const asBound = asDiggable(bound);
    if (asBound !== null) return asBound;

    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room === null) return null;
    const asRoom = asDiggable(room as unknown as Stuff);
    if (asRoom !== null) return asRoom;

    // ⭐ The floor. Every Location has minted one since the ground build, so
    // this rung is where a `Soil` host gets found — the recorded next
    // consumer, and the reason the ladder is written out now.
    if (!MixinApi.isContainer(room)) return null;
    for (const content of (room as Stuff & Container).getContents()) {
      const asFloor = asDiggable(content);
      if (asFloor !== null) return asFloor;
    }
    return null;
  }

  protected nothingHere(model: WorkedActModel): ReturnType<typeof Mml.compose> {
    const named = model.target?.raw;
    if (named && !model.target?.stuff) {
      // They named a band and there is no such ground here.
      return Mml.compose`You turn a spadeful over and put it back. There is no ${named} here.`;
    }
    return Mml.compose`You turn a spadeful over and put it back. There is nothing here worth digging.`;
  }

  protected nothingHereReason(): string {
    return 'nothing-to-dig';
  }

  protected workWords(giver: Stuff): WorkWords<DigBegin, DigDone, DigRefusal> {
    return {
      beginSelf: (b) =>
        b.earth
          ? Mml.compose`You set into the ${b.face}, cutting and casting back.`
          : Mml.compose`You set the point of it into the ${b.face} and start working a block free.`,
      // ⭐ Named, as the room sees them: a bare "Somebody" read in full
      // daylight to everyone at the pit (ceramics browser walk).
      beginPeers: (b) =>
        b.earth
          ? Mml.compose`${Mml.actor(giver)} starts stripping the face.`
          : Mml.compose`${Mml.actor(giver)} starts working stone out of the face.`,
      onRefused: digRefusal,
      onDone: (d) => ({ self: Mml.compose`${wonLine(d.face, d.won)}${d.last ? ' That is the last of this face.' : ''}` }),
    };
  }
}

/** ⭐ The words for a refused dig — every reason, exhaustively. */
function digRefusal(out: DigRefusal): Composed {
  switch (out.reason) {
    case 'no-face-above':
      return Mml.compose`There is no face above you. The ground stops at the surface, and there is nothing over your head but sky.`;
    case 'under-overburden':
      return out.facts.band !== null
        ? Mml.compose`The ${out.facts.band} is under your feet yet. The floor has to come down to it — strip what is over it first.`
        : Mml.compose`There is drift over this ground yet. Take a spade to that before you look for stone under it.`;
    case 'no-such-face':
      return out.facts.asked
        ? Mml.compose`There is no ${out.facts.asked} in this ground. Look at the wall and see what is in it.`
        : Mml.compose`There is no face here to work.`;
    case 'no-spade': {
      // ⚠⚠ Bare-handed and WRONG-TOOL are different sentences (the browser
      // walk): "A pick will not shift drift" named a tool never picked up.
      const held = out.facts.held;
      return held === null
        ? Mml.compose`You will not shift ${out.facts.face} with your hands — take a spade to it.`
        : Mml.compose`${held.charAt(0).toUpperCase() + held.slice(1)} will not shift ${out.facts.face} — take a spade to it.`;
    }
    case 'no-pick':
      return out.facts.held === null
        ? Mml.compose`You would want a pick. That is ${out.facts.face}, and it wants winning — not bare hands.`
        : Mml.compose`You would want a pick. That is ${out.facts.face}, and it wants winning — not ${out.facts.held}.`;
    case 'worked-out':
      return Mml.compose`This face is worked out. There is no ${out.facts.face} left in it that anybody could reach from here.`;
    case 'at-the-water':
      return Mml.compose`The floor is standing in water. Anything below this wants pumping, and nobody here has a pump.`;
    case 'face-changed':
      return Mml.compose`The face has changed under you. Look again.`;
    default: {
      const never: never = out;
      return never;
    }
  }
}

/** What came up, in words. */
function wonLine(face: string, won: DigWon): string {
  switch (won.kind) {
    case 'load':
      return `You work a load of ${face} free.`;
    case 'thing':
      return `You work ${won.called} free, ${won.toTip ? 'and it goes to the tip' : 'and it lies where it fell'}.`;
    case 'spilled':
      return `You break ${face} loose and it runs away between your fingers. You want something to carry it in.`;
    case 'shoveled':
      return `You break ${face} loose and shovel it into ${won.into}.`;
    default: {
      const never: never = won;
      return never;
    }
  }
}

/** Narrow to the `dig` shape's one host, by its mixin's name. */
function asDiggable(stuff: Stuff | null): (Stuff & Diggable) | null {
  if (stuff === null || !MixinApi.hasMixin(stuff, DIGGABLE_HOST)) return null;
  return stuff as Stuff & Diggable;
}
