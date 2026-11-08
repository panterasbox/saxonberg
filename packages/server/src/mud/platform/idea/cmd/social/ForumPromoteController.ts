/**
 * ForumPromoteController — `forum promote <board> <thread> <name>` — mint a thread-subject (light its chat with `chat on`) (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumPromoteController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const handle = (model.board ?? '').trim();
    const threadId = (model.thread ?? '').trim();
    const name = (model.name ?? '').trim();
    if (!handle || !threadId || !name) {
      return this.fail(context, 'board, thread and name required', 'arg-required');
    }
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    if (!this.ownsSubject(actor, view.subject)) {
      return this.fail(context, 'Only the board owner may promote a thread.', 'not-owner');
    }
    const thread = await ForumsApi.getEntry(threadId);
    if (!thread) return this.fail(context, `No thread '${threadId}'.`, 'no-such-thread');
    try {
      const subject = await actor.promoteThread(thread, name);
      this.send(
        context,
        Mml.compose`\nPromoted thread to '${subject.getTitle()}'. Light its chat with \`chat on ${subject.getTitle()}\`.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'promote-failed');
    }
  }
}
