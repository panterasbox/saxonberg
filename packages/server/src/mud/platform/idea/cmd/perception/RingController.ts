/**
 * RingController — `ring <thing>`. ⭐ Dumb (ceramics M5, D8;
 * controller-liquidity W7c): the THING answers the act (`IntegrityMixin.
 * ringBy`) — how it sounded (clear when sound and hard, dead when soft, a
 * buzzing clack when cracked somewhere, even where no eye can find it) and
 * whether it rang as a SIGNAL (a Ringable bell, struck and sounded from
 * itself). The controller binds, asks, and words what came back.
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
    const giver = context.commandGiver;
    if (target === null || !MixinApi.isIntegrity(target)) {
      this.refuse(context, 'act.deed', 'Ring what? There is nothing there to tap.', 'no-target', 'no-target');
      return;
    }
    const { sound, signal } = target.ringBy(giver).facts;
    if (signal) {
      // A bell is seen struck; the street hears the bell itself (its own emit).
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You strike ${Mml.thing(target)}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} strikes ${Mml.thing(target)}.`)
        .send();
      return;
    }
    // Anything else is heard as the act: a tapped jug, by its loudness.
    const scene = MessageApi.scene(giver)
      .topic('act.deed')
      .meta({ acousticDb: sound.db })
      .toSelf(Mml.compose`You tap ${Mml.thing(target)}. It gives ${sound.description}.`);
    if (MixinApi.isContainable(giver)) {
      scene.toAudible(Mml.compose`${Mml.actor(giver)} taps ${Mml.thing(target)}: ${sound.description}.`, {
        descriptor: sound.rings ? 'something ringing' : 'a knock',
      });
    }
    scene.send();
  }
}
