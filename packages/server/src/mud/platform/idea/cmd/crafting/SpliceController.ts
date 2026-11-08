/**
 * SpliceController — `splice [<thing>] [to <other>]` (cordage D9): ONE
 * verb over the `Spliceable` protocol. A rope spliced to a rope, a cut
 * feeder line at its pole; the thing decides. The verb renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface SpliceModel extends CommandModel {
  target?: MqlOneResult;
  other?: MqlOneResult;
}

export default class SpliceController extends CommandController<SpliceModel> {
  async execute(model: SpliceModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const target = model.target?.stuff ?? null;
    const other = model.other?.stuff ?? null;
    if (target === null || !MixinApi.isSpliceable(target)) {
      return this.refuse(context, 'act.deed', 'There is nothing here to splice.', 'no-line');
    }
    const out = await target.spliceBy(giver, other);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} ${out.peers ?? 'splices a line.'}`)
      .send();
  }
}
