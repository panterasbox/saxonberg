/**
 * PingController — health check. The auto-emit at
 * `system.log.command.info` is the visible output; no separate prose
 * scene is needed (kept intentionally bland to match its diagnostic
 * purpose).
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';

export class PingController extends CommandController {
  execute(_model: CommandModel, _context: CommandContext): void {
    return;
  }
}
