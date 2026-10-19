/**
 * FloatController — `float`: lie back on the water and rest (underwater
 * D12). The body decides — whether it can swim, whether the water will
 * hold it — and returns its refusal in its own words; the verb renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

export default class FloatController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isRespiration(giver)) {
      return this.refuse(context, 'act.deed', 'You cannot float.', 'not-a-swimmer');
    }
    const out = await giver.float();
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You lie back on the water and let it hold you up.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lies back and floats.`)
      .send();
  }
}
