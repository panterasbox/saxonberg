/**
 * ChatUnmuteController — `chat unmute <name>` (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatUnmuteController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    return this.mute(model, context, false);
  }
}
