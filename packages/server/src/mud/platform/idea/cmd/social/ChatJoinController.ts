/**
 * ChatJoinController — `chat join <name>` — tune in to a channel (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatJoinController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    return this.tune(model, context, true);
  }
}
