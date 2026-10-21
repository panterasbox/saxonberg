/**
 * RingController — `ring <thing>`. ⭐ Dumb (ceramics M5, D8): the THING
 * answers how it sounds (`TangibleMixin.ring`) — clear when sound and hard,
 * dead when soft, a buzzing clack when cracked somewhere, even where no eye
 * can find it. The controller binds and asks.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

interface RingModel extends CommandModel {
  target?: MqlOneResult;
}

export default class RingController extends CommandController<RingModel> {
  execute(model: RingModel, context: CommandContext): void {
    const target = model.target?.stuff ?? null;
    if (target === null || !MixinApi.isTangible(target)) {
      MessageApi.scene(context.commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Ring what? There is nothing there to tap.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-target', detail: 'no-target' });
      return;
    }
    // ⭐ The thing answers how it sounds; this tells it, and it carries
    // by its loudness to whoever can hear (a bell to the next street).
    const giver = context.commandGiver;
    const { sound, db, rings, carries } = target.ringSound();
    const scene = MessageApi.scene(giver)
      .topic('act.deed')
      .meta({ acousticDb: db })
      .toSelf(Mml.compose`You tap ${Mml.thing(target)}. It gives ${sound}.`);
    if (MixinApi.isContainable(giver)) {
      scene.toAudible(
        carries !== undefined
          ? Mml.compose`${carries}`
          : Mml.compose`${Mml.actor(giver)} taps ${Mml.thing(target)}: ${sound}.`,
        { descriptor: rings ? 'something ringing' : 'a knock' },
      );
    }
    scene.send();
  }
}
