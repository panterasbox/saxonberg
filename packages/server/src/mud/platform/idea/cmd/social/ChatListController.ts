/**
 * ChatListController — `chat list` — the channels you can see, persistent and ad-hoc (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatListController extends ChatControllerBase {
  async execute(_model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const { persistent, adHoc } = await actor.visibleChannels();
    if (persistent.length === 0 && adHoc.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo channels.\n`));
      return;
    }
    const lines = ['Channels:'];
    for (const c of persistent) {
      lines.push(`  ${c.name}  [${c.kind}]`);
    }
    for (const ad of adHoc) {
      lines.push(`  ${ad.handle}  [ad-hoc, ${ad.members.size} members]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
