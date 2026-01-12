/**
 * SayController - Broadcast message to everyone in the room
 *
 * Syntax:
 * - say <message>   - Broadcast message to all in location
 * - '<message>      - Shortcut alias for say
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';

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
    const message = input.message;

    // Use VocalMixin.say() method (already implemented)
    // VocalMixin handles MML formatting and MessageApi broadcasting
    (avatar as any).say(message);

    // Return success (no output text needed - say() handles message delivery)
    return {
      success: true,
      output: { text: '' },
    };
  }
}
