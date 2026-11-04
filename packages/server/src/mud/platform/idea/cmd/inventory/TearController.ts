/**
 * TearController — `tear <thing> [page <n>]` (paper D13). Dumb: the thing
 * torn decides what tearing it makes (`Tearable.tear`); the verb renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface TearModel extends CommandModel {
  thing: MqlOneResult;
  page?: string | number;
}

export default class TearController extends CommandController<TearModel> {
  async execute(model: TearModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const thing = model.thing?.stuff ?? null;
    if (thing === null) {
      const named = model.thing?.raw;
      return this.refuse(context, 'act.deed', named ? `You have no ${named} to tear.` : 'Tear what?', 'no-target');
    }
    if (!MixinApi.isTearable(thing)) {
      return this.refuse(context, 'act.deed', `${thing.getPresentation()} will not tear.`, 'not-tearable');
    }
    let page: number | undefined;
    if (model.page !== undefined && model.page !== '') {
      page = Number(model.page);
      if (!Number.isInteger(page) || page < 1) {
        return this.refuse(context, 'act.deed', 'Which page? Give its number: `tear <book> page 3`.', 'bad-page');
      }
    }
    const out = await thing.tear(giver, page);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.text(out.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} tears ${Mml.thing(thing)}.`)
      .send();
  }
}
