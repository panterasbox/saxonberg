/**
 * TugController — `tug [line]` (underwater C1; kernel since cordage D8):
 * a signal up the line whose end you hold. The end decides; the verb
 * renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import LineEnd from '../../../thing/LineEnd';

interface TugModel extends CommandModel {
  line: MqlOneResult;
}

export default class TugController extends CommandController<TugModel> {
  async execute(model: TugModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const end = model.line?.stuff ?? null;
    if (!(end instanceof LineEnd)) {
      return this.refuse(context, 'act.deed', 'You have no line to tug on.', 'no-line');
    }
    const out = end.tug(giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`${out.line}`).send();
  }
}
