/**
 * ChatOnController — `chat on <subject>` — attach a chat surface to a subject you own (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { SubjectApi } from '../../../../api/subject';
import { PlayerApi } from '../../../../api/player';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatOnController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars attach surfaces in v1.', 'avatar-required');
    }
    const title = (model.name ?? '').trim();
    if (!title) return this.fail(context, 'subject name required', 'name-required');
    if (model.ordered) {
      return this.fail(
        context,
        'The rules-of-order chat surface is not available yet.',
        'rules-deferred',
      );
    }
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) {
      return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    }
    if (subject.getOwner() !== actor.getPlayerId()) {
      return this.fail(context, 'Only the subject owner may attach a surface.', 'not-owner');
    }
    try {
      const c = await ChatApi.attachChatToSubject(subject, 'open');
      this.send(context, Mml.compose`\nAttached chat to '${c.name}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'attach-failed');
    }
  }
}
