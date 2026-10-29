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
    // ⭐ The thing answers how it sounds; this tells it.
    const giver = context.commandGiver;
    const sound = target.ringSound();
    if (MixinApi.isRingable(target)) {
      // ⭐ A bell, a gong — a SIGNAL (review R2-D4): you are seen to strike
      // it, and the sound is the bell's own, emitted through the audible
      // system to everybody it reaches (you included) — the street hears a
      // bell, not a hand. It remembers it was struck, so whoever listens
      // for it (a ferryman across the water) can answer (river W16).
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You strike ${Mml.thing(target)}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} strikes ${Mml.thing(target)}.`)
        .send();
      if (MixinApi.isAudible(target)) target.emit(sound);
      target.struck();
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
