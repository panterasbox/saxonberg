/**
 * SlaughterController — `slaughter <animal>`, and ⭐⭐ **it is a kill and
 * nothing else.**
 *
 * ## What this replaced, and why it had to
 *
 * There used to be a `butcher` verb here as well as in the kitchen. Two
 * verbs of one name, and they had been designed by two builds that never
 * met:
 *
 *   - the stockyard's killed the animal AND took it apart, out of a
 *     module-level table of five hardcoded fractions that was the same
 *     for a hen and a bullock, crediting `stockmanship`, with no
 *     contamination anywhere;
 *   - the kitchen's took a *carcass* apart, off the species' own
 *     declared yield, crediting `butchery`, starting the spoilage clock
 *     at the kill and spilling gut flora by the butcher's band.
 *
 * So an animal gave different things depending on which word you typed at
 * it, neither answer was the animal's own, and `KNOWN_COLLISIONS` carried
 * the `butcher` collision with the note *"both trades — undiagnosed."*
 * It is diagnosed: **killing and dressing are two acts**, and the corpse
 * is the join between them.
 *
 * ⭐ Which is why this file is short. It reads the book, it kills, it
 * writes the book. `ConditionApi.die` mints the body — the same body a
 * fight, a fox, a fall or old age leaves — and `butcher` takes it apart
 * with a blade. A kill in the stockyard and a kill in a hedgerow now
 * produce the same object, on the same clock, cut by the same skill.
 *
 * ## ⚠ The ordering, and it is the substance
 *
 * Everything the record needs is read off the LIVE animal, because it
 * will not exist afterwards. Then the kill. Then the book.
 *
 * The reverse order is tempting — *write the record first, so a failed
 * write never loses an animal that is still in the book* was this file's
 * predecessor's own comment — and it is wrong here. A failed write after
 * the kill leaves a dead head still marked `drafted`: the herd is
 * over-counted by one, recoverable by hand, and nothing alive is lost. A
 * failed kill after the write leaves a live animal out of its own book,
 * which is a ghost.
 *
 * ## ⭐ Three refusals, and they do not read alike
 *
 * A person, an animal you named, and an animal with nothing on it are
 * three different noes, in that order. The named one is the whole of the
 * design's position on killing: *a number in the herdbook is easy to cull
 * and an animal you named is not* — and naming it is the player's act,
 * not the game's.
 *
 * ⚠ The view binds on `HandlingMixin` so the farm dog BINDS rather than
 * failing at the binder, because a refusal you cannot hear is not a
 * refusal. It is then refused for having no yield, which is the species'
 * answer and not a guard.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { SlaughterRefusal } from '@saxonberg/server/mud/lib/species/Organism';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { RANCHING_TOPIC } from './DraftController';
import { STOCKMANSHIP } from './HandleController';

type Composed = ReturnType<typeof Mml.compose>;

interface SlaughterModel extends CommandModel {
  target?: MqlOneResult;
  /** ⭐ The edge — declared by the view, not hunted for. */
  blade?: MqlManyResult;
}

/**
 * ⭐⭐ **The animal answers** (controller-liquidity W10): whether it may be
 * slaughtered — alive, known, not somebody, not named, worth the killing,
 * and (a herd's head) yours to cull — and the kill itself, with the book
 * written after it, are `Organism.slaughterRefusal` / `slaughter`. This
 * file binds the edge and writes the words.
 */
export default class SlaughterController extends CommandController<SlaughterModel> {
  async execute(model: SlaughterModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.target?.stuff;
    if (!animal) {
      this.decline(context, Mml.compose`You don't see any '${model.target?.raw ?? ''}' here.`, 'no-target');
      return;
    }
    if (!MixinApi.isOrganism(animal)) {
      this.decline(context, SlaughterController.refusalWords('not-an-animal', animal), 'not-an-animal');
      return;
    }
    const refusal = await animal.slaughterRefusal(giver);
    if (refusal !== null && refusal !== 'not-keeper') {
      this.decline(context, SlaughterController.refusalWords(refusal, animal), refusal);
      return;
    }
    // ⭐ An edge, or no kill (C19): a blade is a CONSTRUCTION, the same
    // read the kitchen's `butcher` makes of what the view hands over.
    const blades = model.blade?.stuff ?? [];
    if (!blades.some((b) => MixinApi.isConstructed(b) && b.getConstructionForm() === 'bladed')) {
      this.decline(context, Mml.compose`You would need an edge for that — a knife, something bladed.`, 'no-blade');
      return;
    }
    if (refusal === 'not-keeper') {
      this.decline(context, SlaughterController.refusalWords(refusal, animal), refusal);
      return;
    }
    const presentation = animal.getPresentation();
    const done = await animal.slaughter(giver);
    // ⚠ The animal is dead and the body stands; an over-counted herd is
    // recoverable, so the failed write is noted, not thrown.
    if (done.recordFailed !== null) {
      context.note({ kind: 'controller-rejected', reason: 'book-write-failed', detail: done.recordFailed });
    }
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(Mml.compose`It is quick. ${presentation} goes down where it stood, and what is left is a body.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} slaughters ${presentation}.`)
      .send();
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: STOCKMANSHIP, difficulty: 'standard', outcome: 'success' });
    }
  }

  protected static refusalWords(reason: SlaughterRefusal, animal: Stuff): Composed {
    switch (reason) {
      case 'not-an-animal':
        return Mml.compose`${Mml.thing(animal)} is not something you slaughter.`;
      case 'unidentified-species':
        return Mml.compose`You cannot make out what ${Mml.thing(animal)} is, and you are not putting a knife into that.`;
      case 'sentient':
        return Mml.compose`You put the knife away. Whatever ${Mml.thing(animal)} is, it is somebody.`;
      case 'named-animal':
        return Mml.compose`That is ${Mml.thing(animal)}. You named it, and it is not meat.`;
      case 'no-yield':
        return Mml.compose`There is nothing on ${Mml.thing(animal)} worth the killing.`;
      case 'not-keeper':
        return Mml.compose`${animal.getPresentation()} is out of somebody's herd, and it is not yours to cull.`;
      default: {
        const never: never = reason;
        return Mml.compose`${String(never)}`;
      }
    }
  }

  protected decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
