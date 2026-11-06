/**
 * SealController — `seal <thing> [with <gum|wax>]`. Dumb: the
 * sealable decides (`Sealable.sealWith`); the verb renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface SealModel extends CommandModel {
  thing: MqlOneResult;
  seal?: string;
}

export default class SealController extends CommandController<SealModel> {
  async execute(model: SealModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const thing = model.thing?.stuff ?? null;
    if (thing === null) {
      const named = model.thing?.raw;
      return this.refuse(context, 'act.deed', named ? `You have no ${named} to seal.` : 'Seal what?', 'no-target');
    }
    if (!MixinApi.isSealable(thing)) {
      return this.refuse(context, 'act.deed', `${thing.getPresentation()} has nothing to seal.`, 'not-sealable');
    }
    const kind = (model.seal ?? '').trim().toLowerCase() || 'gum';
    const out = thing.sealWith(kind, giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.text(out.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} seals ${Mml.thing(thing)}.`)
      .send();
  }
}
