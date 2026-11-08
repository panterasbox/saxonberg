/**
 * ChatHistoryController — `chat history <name>` — the channel's history ring (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatHistoryController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    const channelId: string =
      channel?._id ?? (channel ? channel.name : name);
    const ring = await ChatApi.historyFor(channelId);
    if (ring.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo history for ${name}.\n`));
      return;
    }
    const lines: string[] = [`History for ${name}:`];
    for (const f of ring) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
