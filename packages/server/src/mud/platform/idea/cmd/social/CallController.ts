/**
 * CallController — `call [name]`, ⭐⭐ **a noise you make, not a thing you
 * target.**
 *
 * Calling an animal is a sound. It goes out over the shipped acoustic
 * graph at a shout's level, carries into adjacent rooms attenuated and
 * directional, and **whatever hears it decides for itself**. You do not
 * reach through a wall and select a dog; you call, and the dog that can
 * hear you comes.
 *
 * ⚠⚠ **This replaced a targeted `call <animal>` scoped to `reachable`**,
 * which was wrong twice over. It emitted `act.deed` — a modality-neutral
 * frame with no acoustic content at all, so a mute player could call, a
 * deaf one heard it, and a shut door meant nothing. And because MQL has
 * no adjacency scope, an animal in the next room could not be NAMED by
 * the player, so the plan's "it comes from next door" was unreachable.
 * ⭐ Making it an emission dissolves both: the physics already knows who
 * can hear you, and the targeting problem simply stops existing.
 *
 * The name is **spoken, not a query**. It matches an animal's name or a
 * keyword it answers to, and omitting it calls everything that knows you
 * — because shouting in a yard reaches every dog in the yard, which is
 * how shouting works.
 *
 * ⚠ What stops it is what stops a sound: a shut door, distance, and a
 * room the walk cannot carry into. Compare `stay`, which is a GESTURE
 * and needs line of sight instead — the two verbs fail in different
 * places, and that is the honest difference between them.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { LocomotionApi } from '../../../../api/locomotion';
import { AudienceGather } from '../../../../lib/perception/AudienceGather';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const TOPIC = 'act.deed';

/**
 * How loud calling an animal is. A raised voice — well above a
 * conversation, well under the storm-lightning `130`. The acoustic walk
 * takes roughly 20 dB out of it per room, so it carries next door and
 * not much further, which is about right for shouting a dog's name.
 */
const CALL_DB = 85;

interface CallModel extends CommandModel {
  animalName?: string;
}

export default class CallController extends CommandController<CallModel> {
  async execute(model: CallModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const wanted = (model.animalName ?? '').trim().toLowerCase();

    if (!MixinApi.isContainable(actor)) return;
    const here = actor.getContainer();
    if (!here || !MixinApi.isContainer(here)) return;

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        wanted
          ? Mml.compose`You call for ${wanted}.`
          : Mml.compose`You call.`,
      )
      .toAudible(
        wanted
          ? Mml.compose`${Mml.actor(actor)} calls for ${wanted}.`
          : Mml.compose`${Mml.actor(actor)} calls out.`,
        { descriptor: 'a voice calling' },
      )
      .send();

    // ⭐ Who actually heard it — the same walk the prose went out on.
    let answered = 0;
    for (const { sensor } of AudienceGather.gather(here, CALL_DB)) {
      const animal = sensor as unknown as Stuff;
      if (!MixinApi.isBonded(animal)) continue;
      if (wanted && !answersTo(animal, wanted)) continue;

      // ⚠ Attention first: an animal that is busy is not disobeying, and
      // it is the one refusal the player genuinely needs told apart.
      const status = MixinApi.isStatus(animal) ? animal.getStatus() : '';
      if (status) {
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`${Mml.actor(animal)} is ${status}, and does not come.`,
          )
          .send();
        answered += 1;
        continue;
      }

      if (!animal.wouldComply(actor)) {
        // The cat's answer and the stranger's answer, and they are the
        // same because from outside they are the same.
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`${Mml.actor(animal)} looks at you.`)
          .send();
        answered += 1;
        continue;
      }

      animal.setWaiting(false);
      answered += 1;
      await this.comeTo(animal, actor, here);
    }

    if (answered === 0) {
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-answered',
        detail: wanted,
      });
    }
  }

  /** Already here it comes over; next door it takes the open way through. */
  private async comeTo(
    animal: Stuff,
    actor: Stuff,
    here: Stuff,
  ): Promise<void> {
    if (!MixinApi.isContainable(animal)) return;
    const there = animal.getContainer();
    if (there === here) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} comes to you.`)
        .toPeers(Mml.compose`${Mml.actor(animal)} goes to ${Mml.actor(actor)}.`)
        .send();
      return;
    }
    if (!there || !MixinApi.isExitable(there) || !MixinApi.isMobile(animal)) {
      return;
    }
    for (const exit of there.getExits().values()) {
      if (exit.getDestination() !== here) continue;
      if (!exit.canTraverse(animal, 'walk').ok) continue;
      await LocomotionApi.traverseWithDefault(animal, exit);
      return;
    }
  }
}

/** Does it answer to that word — its name, or something it is called? */
function answersTo(animal: Stuff, word: string): boolean {
  if (MixinApi.isNamed(animal) && (animal.getName() ?? '').toLowerCase() === word) {
    return true;
  }
  return MixinApi.isPerceptible(animal) && animal.hasKeyword(word);
}
