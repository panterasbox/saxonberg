/**
 * UntieController — `untie <thing>` (cordage D8): the thing decides what
 * casting it off means (`Tieable.untieBy`). The verb renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface UntieModel extends CommandModel {
  target: MqlOneResult;
}

export default class UntieController extends CommandController<UntieModel> {
  async execute(model: UntieModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const target = model.target?.stuff ?? null;
    if (target === null || !MixinApi.isTieable(target)) {
      return this.refuse(context, 'act.deed', 'There is nothing like that tied here.', 'not-tieable');
    }
    const out = await target.untieBy(giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} unties ${Mml.thing(target)}.`)
      .send();
  }
}
