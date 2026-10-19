/**
 * JotController — `jot <slate> <words>` (underwater C5). The slate
 * decides; the verb renders.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Slate from '../../../thing/Slate';

interface JotModel extends CommandModel {
  slate: MqlOneResult;
  words: string;
}

export default class JotController extends CommandController<JotModel> {
  async execute(model: JotModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const slate = model.slate?.stuff ?? null;
    if (!(slate instanceof Slate)) {
      return this.refuse(context, 'act.deed', 'You can only jot on a slate.', 'not-a-slate');
    }
    const out = slate.jot(giver, model.words ?? '');
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} scratches something on a slate.`)
      .send();
  }
}
