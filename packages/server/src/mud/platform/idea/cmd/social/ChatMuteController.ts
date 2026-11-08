/**
 * ChatMuteController — `chat mute <name>` (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatMuteController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    return this.mute(model, context, true);
  }
}
