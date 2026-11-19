/**
 * ForceController — `force <who> <command>`: make a character run a command.
 *
 * ⭐ A thin door (call-security pass, the owner's ask): it calls the body's
 * own `forceCommand`, and the compulsion gate in
 * `CommandGiverMixin.executeCommand` decides — the same rule every other
 * piece of code that drives a body meets. A body nobody plays is driven by
 * its KEEPER (title over its row) with no consent and no never-list, and
 * the drive is recorded; a player's body is asked, and only for what may be
 * asked of anyone. This controller decides nothing of its own.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Refusal } from '../../../../lib/errors';

interface ForceModel extends CommandModel {
  target?: MqlOneResult;
  line?: string;
}

export default class ForceController extends CommandController<ForceModel> {
  async execute(model: ForceModel, context: CommandContext): Promise<void> {
    const target = model.target?.stuff;
    const line = (model.line ?? '').trim();
    if (!target || !MixinApi.isCommandGiver(target) || !line) return;
    try {
      await target.forceCommand(line);
    } catch (err) {
      if (err instanceof Refusal) return this.refuse(context, err);
      throw err;
    }
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.compose`You make ${Mml.actor(target)} run ${Mml.text(`\`${line}\``)}.`)
      .send();
  }
}
