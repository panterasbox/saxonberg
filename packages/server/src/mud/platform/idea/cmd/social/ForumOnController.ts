/**
 * ForumOnController — `forum on <subject>` — attach a board to a subject you own (`--ordered`) (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import { SubjectApi } from '../../../../api/subject';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumOnController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const title = (model.name ?? '').trim();
    if (!title) return this.fail(context, 'subject name required', 'name-required');
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    if (!this.ownsSubject(actor, subject)) {
      return this.fail(context, 'Only the subject owner may attach a surface.', 'not-owner');
    }
    const ordered = model.ordered === true;
    try {
      await ForumsApi.createBoardOnSubject(subject, {
        organizer: ordered ? 'ordered' : 'open',
      });
      const kind = ordered ? 'an ordered forum' : 'a forum';
      this.send(
        context,
        Mml.compose`\nAttached ${kind} to '${subject.getTitle()}'.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'attach-failed');
    }
  }
}
