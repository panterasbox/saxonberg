/**
 * ErrorsClearController — `errors clear <path>` — drop a path's
 * diagnostics (over {@link ErrorsControllerBase}). `DiagnosticApi.clear`
 * returns `-1` when the actor neither holds title there nor authored it.
 */

import type { CommandContext } from '../../../../api/command';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { ErrorsControllerBase, type ErrorsModel } from './ErrorsControllerBase';

export default class ErrorsClearController extends ErrorsControllerBase {
  async execute(model: ErrorsModel, context: CommandContext): Promise<void> {
    const path = model.path?.trim();
    if (!path) {
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-path',
        detail: 'errors clear needs a path',
      });
      return;
    }
    const n = await DiagnosticApi.clear(path);
    if (n < 0) {
      context.note({
        kind: 'controller-rejected',
        reason: 'denied',
        detail: `not authorised to clear ${path}`,
      });
      return;
    }
    ErrorsControllerBase.tell(context, `Cleared ${n} diagnostic(s) for ${path}.`);
  }
}
