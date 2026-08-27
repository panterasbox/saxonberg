/**
 * PwdController — print the avatar's current working directory.
 *
 * Default: prints the active tree's cwd (per the `workspace.tree`
 * setting). `-a` / `--all` prints both cwds, labelled.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';

interface PwdModel extends CommandModel {
  all?: boolean;
}

export default class PwdController extends CommandController<PwdModel> {
  execute(model: PwdModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      MessageApi.scene(giver)
        .topic('shell.result')
        .toSelf(Mml.fromMarkup('\nthis character has no workspace\n'))
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
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
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}
