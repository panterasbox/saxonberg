/**
 * PingController — health check. The auto-emit at
 * `system.log.command.info` is the visible output; no separate prose
 * scene is needed (kept intentionally bland to match its diagnostic
 * purpose).
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';

export interface PingInput {}

export class PingController extends CommandController<PingInput> {
  execute(_input: PingInput, _context: CommandContext): CommandResult {
    return { success: true, summary: 'pong' };
  }
}
