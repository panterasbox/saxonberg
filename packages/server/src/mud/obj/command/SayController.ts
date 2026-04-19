/**
 * SayController - Broadcast message to everyone in the room
 *
 * Syntax:
 * - say <message>   - Broadcast message to all in location
 * - '<message>      - Shortcut alias for say
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import { MixinApi } from '../../api/mixin';

/**
 * Input model for say command
 */
export interface SayInput {
  message: string;
}

/**
 * Output model for say command
 */
export interface SayOutput {
  text: string;
}

/**
 * SayController - Handles broadcasting messages to room
 */
export class SayController extends CommandController<SayInput, SayOutput> {
  execute(input: SayInput, context: CommandContext): CommandResult<SayOutput> {
    const avatar = context.avatar;

    // Character always composes VocalMixin; this guards against a future
    // speaker that lacks it and narrows the type so .say() compiles cleanly.
    if (!MixinApi.isVocal(avatar)) {
      return { success: false, error: 'You cannot speak.' };
    }

    avatar.say(input.message);

    return {
      success: true,
      output: { text: '' },
    };
  }
}
