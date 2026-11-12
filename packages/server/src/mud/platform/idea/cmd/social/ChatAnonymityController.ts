/**
 * ChatAnonymityController — `chat anonymity <name> permit|forbid`: the
 * owner's call about their own space. ⭐ A real values question about a
 * community, and the only thing in this build a player can see change
 * (over {@link ChatControllerBase}). Who may make the call is the
 * catalogue's question, asked with the actor (controller-liquidity D9).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatAnonymityController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
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
    const res = await ChatApi.setAnonymity(
      actor,
      name,
      setting === 'permit' ? 'permitted' : 'forbidden',
    );
    if (!res.ok) {
      return this.fail(context, this.refusalLine(res.reason, name), res.reason);
    }
    this.send(
      context,
      setting === 'permit'
        ? Mml.compose`\n'${res.channel.name}' now permits anonymous posts.\n`
        : Mml.compose`\n'${res.channel.name}' now shows every poster's name.\n`,
    );
  }
}
