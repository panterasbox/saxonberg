/**
 * ChatDisbandController — `chat disband <name>` — the owner ends a player-created channel (over {@link ChatControllerBase}).
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

export default class ChatDisbandController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars disband in v1.', 'avatar-required');
    }
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    if (channel.kind !== 'player-created') {
      return this.fail(
        context,
        `'${name}' is not a player-created channel.`,
        'not-disbandable',
      );
    }
    const subject = channel.subject
      ? await SubjectApi.resolveById(channel.subject)
      : null;
    if (subject && subject.getOwner() !== actor.getPlayerId()) {
      return this.fail(context, 'Only the owner may disband.', 'not-owner');
    }
    await ChatApi.disbandPlayerChannel(name);
    this.send(context, Mml.compose`\nDisbanded '${name}'.\n`);
  }
}
