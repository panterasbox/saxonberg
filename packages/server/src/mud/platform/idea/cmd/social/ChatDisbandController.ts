/**
 * ChatDisbandController — `chat disband <name>` — the owner ends a
 * player-created channel (over {@link ChatControllerBase}). Who may is
 * the catalogue's question, asked with the actor (controller-liquidity D9).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatDisbandController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const name = (model.name ?? '').trim();
    const res = await ChatApi.disbandPlayerChannel(actor, name);
    if (!res.ok) {
      return this.fail(context, this.refusalLine(res.reason, name), res.reason);
    }
    this.send(context, Mml.compose`\nDisbanded '${name}'.\n`);
  }
}
