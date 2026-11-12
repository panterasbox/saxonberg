/**
 * ErrorsControllerBase — what the `errors` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the shell reader over the author-diagnostics store
 * (Reader A of the diagnostics subsystem).
 *
 *   - `list` (and bare `errors [<path>]`) — `ErrorsListController`:
 *     structured diagnostics matching the filters, newest-first. Compile
 *     rows are open to anyone (reading source is open — wizard-axis D14);
 *     a row with a path is readable by whoever holds it (the redaction
 *     lives in `DiagnosticApi.list`).
 *   - `raw` — `ErrorsRawController`: the raw console ring
 *     (`DiagnosticApi.rawTail`). The Prime Minister's, enforced by the
 *     read itself (wizard-axis D19): the ring is the box's console and
 *     carries other players' command lines — what it protects is their
 *     privacy, not code trust.
 *   - `clear <path>` — `ErrorsClearController`: drop a path's
 *     diagnostics (`DiagnosticApi.clear` returns `-1` when the actor
 *     neither holds title there nor authored it).
 *
 * Read-only output rides the message pipeline (`MessageApi.scene`); the
 * gates surface as `controller-rejected` notes.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

export const TOPIC = 'shell.diagnostic';

export interface ErrorsModel extends CommandModel {
  subcommand?: string;
  path?: string;
  channel?: string;
  severity?: string;
  source?: string;
  mine?: boolean;
  limit?: number;
  grep?: string;
}

export abstract class ErrorsControllerBase extends CommandController<ErrorsModel> {
  /** A plain-text block, escaped once, on the diagnostics topic. */
  protected static tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.escape(text))
      .send();
  }
}
