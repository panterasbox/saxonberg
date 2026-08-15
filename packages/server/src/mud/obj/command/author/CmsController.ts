/**
 * CmsController — `cms`, the content editor's front door.
 *
 * ⭐⭐ **The verb opens a CARD and nothing else.** The editor's body is
 * a `client`-source card: the explorer, the tree and Monaco all speak
 * the `/api/cms/*` REST routes, which is where what a wizard may SEE
 * and WRITE is actually decided. A controller that tried to answer that
 * here would be a second authorization surface for one question.
 *
 * ⚠ The card is pinned by default and declares `noProse`. An editor
 * that aged out of a relevance window mid-edit would be a data-loss bug
 * wearing a lifetime rule; and a `terminal`-only `shell.result` must
 * not take Monaco away, which is what the declaration prevents.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { CardApi } from '../../../api/card';
import { Mml } from '../../../api/mml';

export default class CmsController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const opened = CardApi.open(context, 'cms');
    if (opened === null) {
      MessageApi.scene(context.commandGiver)
        .topic('shell.result')
        .toSelf(Mml.fromMarkup('\nthe editor needs a connection to open in\n'))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-interactive',
        detail: 'cms is a card, and a card belongs to a connection',
      });
      return;
    }
    /*
     * ⚠ No `carded` marker on this line: the card carries no prose to
     * be the duplicate OF, so the confirmation is the only rendering
     * there is and `shell.result: card` must not suppress it.
     */
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.fromMarkup('\ncontent editor open\n'))
      .send();
  }
}
