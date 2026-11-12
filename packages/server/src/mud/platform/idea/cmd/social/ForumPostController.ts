/**
 * ForumPostController — `forum post <board> <body>` — start a thread, or an ordered board's **spine** (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumPostController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const handle = (model.board ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
    // Body: inline-greedy / fields side-channel / interactive compose prompt.
    const body = await this.resolveBody(model, context, 'Compose your post:');
    if (body === null) return; // needs-input, noted (a script has no editor)
    if (!body) return this.fail(context, 'body required', 'body-required');
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    const title = (model.title ?? this.deriveTitle(body)).trim();
    try {
      const entry = await actor.postThread(view.board, title, body);
      this.send(
        context,
        Mml.compose`\nPosted thread '${title}' (#${entry._id ?? '?'}).\n`,
      );
    } catch (err) {
      return this.failFrom(context, err, 'post-failed');
    }
  }

  private deriveTitle(body: string): string {
    const firstLine = body.split('\n')[0]?.trim() ?? '';
    if (!firstLine) return '(untitled)';
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
  }
}
