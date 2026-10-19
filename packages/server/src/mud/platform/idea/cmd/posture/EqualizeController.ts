/**
 * EqualizeController — `equalize`: clear your ears against the water's
 * weight (underwater D15).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

export default class EqualizeController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isRespiration(giver)) {
      return this.refuse(context, 'act.deed', 'You have nothing to clear.', 'no-ears');
    }
    const had = giver.getPressureDebtM() > 0;
    giver.equalize();
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(
        had
          ? Mml.compose`You pinch your nose and blow; your ears clear with a soft pop.`
          : Mml.compose`You pinch your nose and blow. Your ears were already clear.`,
      )
      .send();
  }
}
