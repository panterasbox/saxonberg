/**
 * ChatRenameController — `chat rename <old> <new>` (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatRenameController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const oldName = (model.old_name ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!oldName || !newName) {
      return this.fail(context, 'old and new names required', 'name-required');
    }
    const cat = await ChatApi.catalogue();
    if (cat.reservedNames().has(newName.toLowerCase())) {
      return this.fail(
        context,
        `'${newName}' is a reserved subcommand; pick another.`,
        'reserved-name',
      );
    }
    try {
      const c = await ChatApi.renamePlayerChannel(oldName, newName);
      this.send(context, Mml.compose`\nRenamed to '${c.name}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'rename-failed');
    }
  }
}
