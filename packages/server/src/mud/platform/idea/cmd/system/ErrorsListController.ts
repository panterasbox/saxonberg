/**
 * ErrorsListController — `errors list [<path>]` (and bare `errors`) —
 * recent diagnostics matching the filters (over {@link
 * ErrorsControllerBase}).
 *
 * No door: everyone is an author (content-packs wave 3). What you SEE is
 * what you hold — `DiagnosticApi.list` filters rows to the extents you
 * hold and the packs you maintain; a nobody gets an empty list, never a
 * refusal.
 */

import type { CommandContext } from '../../../../api/command';
import { DiagnosticApi } from '../../../../api/diagnostics';
import type {
  DiagnosticDoc,
  DiagnosticSeverity,
  DiagnosticSource,
} from '@saxonberg/types';
import { ErrorsControllerBase, type ErrorsModel } from './ErrorsControllerBase';

export default class ErrorsListController extends ErrorsControllerBase {
  async execute(model: ErrorsModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const rows = await DiagnosticApi.list({
      channels: model.channel ? [model.channel] : undefined,
      severity: ErrorsListController.asSeverity(model.severity),
      source: ErrorsListController.asSource(model.source),
      pathPrefix: model.path?.trim() || undefined,
      author: model.mine ? actor.getIdentityPath() ?? undefined : undefined,
      limit: model.limit,
    });

    if (rows.length === 0) {
      ErrorsControllerBase.tell(context, 'No diagnostics match.');
      return;
    }

    const text =
      `${rows.length} diagnostic(s):\n\n` +
      rows.map((r) => ErrorsListController.renderRow(r)).join('\n');
    ErrorsControllerBase.tell(context, text);
  }

  private static asSeverity(v: string | undefined): DiagnosticSeverity | undefined {
    return v === 'error' || v === 'warning' || v === 'info' ? v : undefined;
  }

  private static asSource(v: string | undefined): DiagnosticSource | undefined {
    return v === 'runtime' || v === 'compile' || v === 'console' ? v : undefined;
  }

  /** One diagnostic row as a plain text line (the whole block is escaped once). */
  private static renderRow(r: DiagnosticDoc): string {
    const where = r.path
      ? `${r.path}${r.line != null ? `:${r.line}` : ''}`
      : r.channel;
    const code = r.code != null ? ` (TS${r.code})` : '';
    return `• [${r.severity}] ${r.channel}  ${where}${code} — ${r.message}`;
  }
}
