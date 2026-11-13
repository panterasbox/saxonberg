/**
 * ErrorsRawController — `errors raw [--grep <text>] [--limit <n>]` — tail
 * the raw console ring, the Prime Minister's (over {@link
 * ErrorsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { DiagnosticApi } from '../../../../api/diagnostics';
import type { RawConsoleLine } from '@saxonberg/types';
import { ErrorsControllerBase, type ErrorsModel } from './ErrorsControllerBase';

export default class ErrorsRawController extends ErrorsControllerBase {
  async execute(model: ErrorsModel, context: CommandContext): Promise<void> {
    // Default to a short tail — the ring holds the whole session's console
    // (boot included), so an unbounded dump is a wall of text. The PM gate
    // is the read's own (DiagnosticLogic.rawTail); null = refused.
    const lines = await DiagnosticApi.rawTail({
      grep: model.grep,
      limit: model.limit ?? 30,
    });
    if (lines === null) {
      context.note({
        kind: 'controller-rejected',
        reason: 'pm-only',
        detail:
          "errors raw is the Prime Minister's: the console ring carries other players' lines",
      });
      return;
    }
    if (lines.length === 0) {
      ErrorsControllerBase.tell(context, 'Console ring is empty.');
      return;
    }
    const text = lines.map((l) => ErrorsRawController.renderRaw(l)).join('\n');
    ErrorsControllerBase.tell(context, text);
  }

  /** One raw console line as a plain text line. */
  private static renderRaw(l: RawConsoleLine): string {
    return `• [${l.level}] ${l.text}`;
  }
}
