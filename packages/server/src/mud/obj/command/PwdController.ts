/**
 * PwdController — print the avatar's current working directory.
 *
 * Default: prints the active tree's cwd (per the `workspace.tree`
 * setting). `-a` / `--all` prints both cwds, labelled.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';

interface PwdModel extends CommandModel {
  all?: boolean;
}

export class PwdController extends CommandController<PwdModel> {
  execute(model: PwdModel, context: CommandContext): CommandResult {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      return {
        success: false,
        summary: 'this character has no workspace',
      };
    }
    const cpwd = giver.getCwd('content');
    const spwd = giver.getCwd('source');
    const body = model.all
      ? Mml.fromMarkup(
          `\ncontent: ${cpwd}\nsource:  ${spwd}\n` +
            `mode:    ${giver.getTreeMode()}\n`,
        )
      : Mml.fromMarkup(`\n${giver.getActiveCwd()}\n`);
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.system.shell.fs)
      .toSelf(body)
      .send();
    return {
      success: true,
      summary: model.all ? `${cpwd} ${spwd}` : giver.getActiveCwd(),
    };
  }
}
