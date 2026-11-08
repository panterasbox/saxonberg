/**
 * ForumListController — `forum list` — the boards you can see (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumListController extends ForumControllerBase {
  async execute(_model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const giver = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const boards = await giver.forumBoards();
    if (boards.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo boards.\n`));
      return;
    }
    const lines = ['Boards:'];
    for (const { subject } of boards) {
      const audience = subject.isOpen() ? 'open' : 'members';
      lines.push(`  ${subject.getTitle()}  [${audience}]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
