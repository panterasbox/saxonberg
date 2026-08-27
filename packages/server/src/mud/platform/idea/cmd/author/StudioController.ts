/**
 * StudioController — `studio`, the composer's front door.
 *
 * ⭐⭐ **The verb opens a CARD and nothing else.** The composer's body
 * is a `client`-source card: the blueprint catalogue, the template form
 * and the class composer speak the Studio REST routes, which is where
 * what a wizard may compose is actually decided.
 *
 * ⚠ Pinned by default and `noProse`, for the same two reasons the
 * content editor is — see `CmsController`.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import { Mml } from '../../../../api/mml';

export default class StudioController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const opened = CardApi.open(context, 'studio');
    if (opened === null) {
      MessageApi.scene(context.commandGiver)
        .topic('shell.result')
        .toSelf(
          Mml.fromMarkup('\nthe composer needs a connection to open in\n'),
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-interactive',
        detail: 'studio is a card, and a card belongs to a connection',
      });
      return;
    }
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.fromMarkup('\ncomposer open\n'))
      .send();
  }
}
