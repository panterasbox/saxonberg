/**
 * ChatHistoryController — `chat history <name>` — the channel's history
 * ring (over {@link ChatControllerBase}). Who may read it is the
 * catalogue's question (controller-liquidity D9).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatHistoryController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const reader = context.commandGiver as Stuff;
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    const channelId: string = channel ? (channel._id ?? channel.name) : name;
    const res = await ChatApi.historyFor(reader, channelId);
    if (!res.ok) {
      return this.fail(context, this.refusalLine(res.reason, name), res.reason);
    }
    if (res.frames.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo history for ${name}.\n`));
      return;
    }
    const lines: string[] = [`History for ${name}:`];
    for (const f of res.frames) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
