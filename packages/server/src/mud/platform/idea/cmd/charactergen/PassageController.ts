/**
 * PassageController — the floor beneath coming back.
 *
 * A shade calls this and returns to the world in a new body, at the wake
 * point, carrying nothing. It asks nothing and gives nothing back.
 *
 * **Why the engine ships a way back at all.** The engine's whole
 * involvement in re-embodiment is `ConditionApi.reembody`, which content
 * calls on its own terms — a temple, a clinic, a quest, someone owed a
 * favour. Being a ghost is an authoring space and this build deliberately
 * writes no schema over it. But a player must never be stranded because
 * the content that would have brought them back does not exist, is
 * unreachable, or was deleted: that is the same failure class as the
 * snapshot defect, wearing a third costume. So the engine keeps exactly
 * one route, always available, and content is free to be better than it.
 *
 * You come back where you are standing — there is no wake point, and
 * nothing gets relocated. A shade that wants to return somewhere in
 * particular walks there first, which is the same thing a living person
 * would do.
 *
 * Zero arguments, and no `requiresEmbodied` — this is the one verb whose
 * entire purpose is to be usable by someone with no body. It is afforded
 * by `IncorporealMixin`, so only something incorporeal ever sees it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { BiomeApi } from '../../../../api/biome';
import { ConditionApi } from '../../../../api/condition';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Quantity } from '../../../../lib/quantity';
import { TemplatePaths } from '../../../../lib/paths';

const TOPIC = 'act.deed';

/**
 * Where the floor route leaves each biological reserve (`%`): a full one
 * less the cost of coming back. Enough to be felt and to be worth paying
 * someone to avoid; not enough to put anybody back in danger.
 *
 * ⭐ A LEVEL, not a deduction (found by the underwater browser walk): the
 * returned body carried the dead one's reserves, so a diver who had never
 * drunk came back with nothing to lose 60 from and died of thirst within
 * a minute of returning.
 */
const RECOVERY_RESERVE_LEVEL = 40;

export default class PassageController extends CommandController<CommandModel> {
  async execute(
    _model: CommandModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;

    if (!MixinApi.isIncorporeal(giver)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-shade',
        detail: 'You already have a body.',
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You already have a body.`)
        .send();
      return;
    }

    // No wake point, and nothing is moved: you take a body where you are
    // standing. The shade walked here; this is where it stops being one.
    //
    // Deliberately never consults the corpse either: a body decays, and
    // nothing on the path back may depend on one existing.
    // ⭐ Not in the water (found by the underwater browser walk): a diver
    // who drowned took a body on the bed where they died, with no breath
    // in it, and drowned again — a loop. The floor route must never put
    // anybody back in danger, so it waits until you are out; a shade
    // swims up and climbs out like anyone (`ascend`, the steps).
    if (BiomeApi.mediumFor(giver).immersed) {
      const detail =
        'There is no taking a body in the water — it would drown before it drew breath. Get out first.';
      context.note({ kind: 'controller-rejected', reason: 'in-the-water', detail });
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${detail}`).send();
      return;
    }

    const body = await ConditionApi.reembody(giver);

    // THE PRICE OF COMING BACK CHEAP.
    //
    // Deliberately applied HERE, by the floor route, and not inside
    // `reembody`. `reembody` hands back a clean body; what it costs you is
    // the caller's business, which is exactly what lets a temple or a
    // clinic offer a better return than this one. A free revival at full
    // strength would make every such service strictly worse than doing
    // nothing, and there would be no market for coming back at all.
    //
    // Reserves only, never a vital sign: diminishment that could carry a
    // body back across a lethal threshold would re-open the death loop
    // through a side door. It clears itself as metabolism refills, so
    // nobody has to build a cure for it.
    if (MixinApi.isReserved(body)) {
      for (const key of ['satiation', 'hydration', 'endurance']) {
        const reserve = body.getReserve(key);
        if (reserve) {
          const delta = RECOVERY_RESERVE_LEVEL - reserve.current.rawValue();
          body.adjustReserve(key, Quantity.of(delta, '%'));
        }
      }
    }
    if (MixinApi.isVitals(body)) {
      body.afflict({
        kind: 'affliction',
        templatePath: TemplatePaths.mortalityRecovering,
        stage: 0,
        elapsed: 0,
      });
    }

    MessageApi.scene(body)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You take a breath, and it is your own. The between lets go — and leaves you with nothing to spare.`,
      )
      .toPeers(Mml.compose`${Mml.actor(body)} draws a first breath.`)
      .send();
  }
}
