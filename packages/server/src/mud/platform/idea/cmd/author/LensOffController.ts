/**
 * LensOffController — `lens off`: put the builder lens down
 * (size-and-carrying D25; `AuthorMixin.lensOff`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

export default class LensOffController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (MixinApi.isAuthor(giver)) giver.lensOff();
    MessageApi.scene(giver)
      .topic('shell.result')
      .toSelf(Mml.compose`The builder lens is off; you see what anyone would.`)
      .send();
  }
}
