/**
 * ForumFollowController — `forum follow <subject>` — follow every lit surface of a subject (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SubjectApi } from '../../../../api/subject';
import { PlayerApi } from '../../../../api/player';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumFollowController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars follow in v1.', 'avatar-required');
    }
    const title = (model.name ?? '').trim();
    if (!title) return this.fail(context, 'subject name required', 'name-required');
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    await actor.followSubject(subject._id!, true);
    this.send(context, Mml.compose`\nFollowing '${subject.getTitle()}'.\n`);
  }
}
