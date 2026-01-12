/**
 * PingController - Simple echo test command
 *
 * Responds with "pong" to verify command framework is working.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';

/**
 * Input model for ping command (no fields)
 */
export interface PingInput {
  // No fields - ping takes no arguments
}

/**
 * Output model for ping command
 */
export interface PingOutput {
  text: string;
}

/**
 * PingController - Echo test command
 */
export class PingController extends CommandController<PingInput, PingOutput> {
  execute(input: PingInput, context: CommandContext): CommandResult<PingOutput> {
    return {
      success: true,
      output: { text: 'pong' },
    };
  }
}
