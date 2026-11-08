/**
 * ChatMakeController — `chat make <name>` — create a player channel (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatMakeController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'channel name required', 'name-required');
    const cat = await ChatApi.catalogue();
    if (cat.reservedNames().has(name.toLowerCase())) {
      return this.fail(
        context,
        `'${name}' is a reserved subcommand; pick another.`,
        'reserved-name',
      );
    }
    try {
      const c = await ChatApi.createPlayerChannel(context.commandGiver, name);
      this.send(context, Mml.compose`\nCreated channel '${c.name}'.\n`);
    } catch (err) {
      return this.fail(
        context,
        (err as Error).message,
        'create-failed',
      );
    }
  }
}
