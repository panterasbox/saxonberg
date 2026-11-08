/**
 * ChatWhoController — `chat who <name>` — the channel's audience (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatWhoController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    const cat = await ChatApi.catalogue();
    const audience = await cat.audienceFor(channel);
    if (audience.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo one in ${name}.\n`));
      return;
    }
    const lines = [`In ${name}:`];
    for (const a of audience) {
      lines.push(`  ${a.getPresentation()}`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
