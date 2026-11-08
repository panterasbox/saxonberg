/**
 * ChatAnonymityController — `chat anonymity <name> permit|forbid`: the
 * owner's call about their own space. ⭐ A real values question about a
 * community, and the only thing in this build a player can see change
 * (over {@link ChatControllerBase}).
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

export default class ChatAnonymityController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const name = (model.name ?? '').trim();
    const setting = (model.setting ?? '').trim().toLowerCase();
    if (!name || !setting) {
      return this.fail(
        context,
        'chat anonymity <channel> permit|forbid',
        'setting-required',
      );
    }
    if (setting !== 'permit' && setting !== 'forbid') {
      return this.fail(
        context,
        `'${setting}' is not permit or forbid.`,
        'bad-setting',
      );
    }
    const channel = await ChatApi.resolveByName(name);
    if (!channel) {
      return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    }
    // Owner-gated exactly as `disband` is — the Subject holds the owner.
    const subject = channel.subject
      ? await SubjectApi.resolveById(channel.subject)
      : null;
    if (
      subject &&
      PlayerApi.isAvatarStuff(actor) &&
      subject.getOwner() !== actor.getPlayerId()
    ) {
      return this.fail(
        context,
        'Only the owner sets a channel\'s anonymity.',
        'not-owner',
      );
    }
    await ChatApi.setAnonymity(
      name,
      setting === 'permit' ? 'permitted' : 'forbidden',
    );
    this.send(
      context,
      setting === 'permit'
        ? Mml.compose`\n'${channel.name}' now permits anonymous posts.\n`
        : Mml.compose`\n'${channel.name}' now shows every poster's name.\n`,
    );
  }
}
