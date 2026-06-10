/**
 * PingController — diagnostic. Emits nothing of its own; the
 * round-trip is visible through:
 *   - the input-echo MessageFrame the dispatcher fires at
 *     `system.log.command.info` (carrying `kind: 'issued'`,
 *     `rawText: 'ping'`)
 *   - the dispatch-response envelope's `outcome.status: 'ok'`
 *
 * No player-facing prose is needed for a health check; once the
 * client grows envelope-aware UI the success status renders on
 * its own. If a richer signal is desired, future work can add a
 * `pong` Scene.send here — the assertion that `received` has
 * exactly one frame (the input echo) in
 * `CommandGiver.test.ts` would need to widen.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';

export default class PingController extends CommandController {
  execute(_model: CommandModel, _context: CommandContext): void {
    // Diagnostic-only: outcome rides on the dispatch-response
    // envelope and the input echo.
  }
}
