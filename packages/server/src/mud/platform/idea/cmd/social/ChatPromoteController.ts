/**
 * ChatPromoteController — `chat promote <handle> <new_name>` — an ad-hoc thread becomes a managed channel (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatPromoteController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const handle = (model.handle ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!handle || !newName) {
      return this.fail(context, 'handle and new_name required', 'arg-required');
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
      const c = await ChatApi.promoteAdHocToManaged(handle, newName, context.commandGiver);
      this.send(
        context,
        Mml.compose`\nPromoted ad-hoc ${handle} into '${c.name}'.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'promote-failed');
    }
  }
}
