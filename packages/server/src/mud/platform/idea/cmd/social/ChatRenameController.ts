/**
 * ChatRenameController — `chat rename <old> <new>` (over {@link ChatControllerBase}).
 * Who may rename is the catalogue's question, asked with the actor
 * (controller-liquidity D9); this controller words the answer.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatRenameController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const oldName = (model.old_name ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!oldName || !newName) {
      return this.fail(context, 'old and new names required', 'name-required');
    }
    const res = await ChatApi.renamePlayerChannel(actor, oldName, newName);
    if (!res.ok) {
      const named =
        res.reason === 'reserved-name' || res.reason === 'name-taken'
          ? newName
          : oldName;
      return this.fail(context, this.refusalLine(res.reason, named), res.reason);
    }
    this.send(context, Mml.compose`\nRenamed to '${res.channel.name}'.\n`);
  }
}
