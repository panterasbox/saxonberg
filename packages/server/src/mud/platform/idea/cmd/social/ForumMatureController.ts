/**
 * ForumMatureController — `forum mature <board>` — the owner marks an ordered forum matured (the decoupled `mature` event; no consumer in v1) (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumMatureController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const handle = (model.board ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    if (view.board.getOrganizer() !== 'ordered') {
      return this.fail(
        context,
        'Only an ordered forum can be matured.',
        'not-ordered',
      );
    }
    if (!this.ownsSubject(actor, view.subject)) {
      return this.fail(
        context,
        'Only the owner may mature this deliberation.',
        'not-owner',
      );
    }
    try {
      await actor.matureArgument(view.board);
      // The vote consumer is the deferred governance layer; be honest.
      this.send(
        context,
        Mml.compose`\nMatured '${view.subject.getTitle()}'. The vote layer will pick it up when it ships.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'mature-failed');
    }
  }
}
