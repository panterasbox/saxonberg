/**
 * ErrorsController — the `errors` verb: the shell reader over the
 * author-diagnostics store (Reader A of the diagnostics subsystem).
 *
 * Three forms, dispatched on the subcommand:
 *   - `list` (default) — structured diagnostics matching the filters,
 *     newest-first. Author-tier (the verb is AuthorMixin-afforded and
 *     `requiresAuthor`-gated); non-wizards never see TS-source `compile`
 *     rows (the redaction lives in `DiagnosticApi.list`).
 *   - `raw` — the raw console ring (`DiagnosticApi.rawTail`). Wizard-only,
 *     enforced here (the ring can carry engine internals).
 *   - `clear <path>` — drop a path's diagnostics (`DiagnosticApi.clear`
 *     returns `-1` when the actor is neither a wizard nor the author).
 *
 * Read-only output rides the message pipeline (`MessageApi.scene`); the
 * gates surface as `controller-rejected` notes.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { AccessApi } from '../../../api/access';
import { Mml } from '../../../api/mml';
import { DiagnosticApi } from '../../../api/diagnostics';
import type {
  DiagnosticDoc,
  DiagnosticSeverity,
  DiagnosticSource,
  RawConsoleLine,
} from '@saxonberg/types';

const TOPIC = 'system.log.compile';

interface ErrorsModel extends CommandModel {
  subcommand?: string;
  path?: string;
  channel?: string;
  severity?: string;
  source?: string;
  mine?: boolean;
  limit?: number;
  grep?: string;
}

export default class ErrorsController extends CommandController<ErrorsModel> {
  async execute(model: ErrorsModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand ?? 'list';
    if (sub === 'clear') return this.clear(model, context);
    if (sub === 'raw') return this.raw(model, context);
    return this.list(model, context);
  }

  private async list(
    model: ErrorsModel,
    context: CommandContext
  ): Promise<void> {
    const actor = context.commandGiver;
    const rows = await DiagnosticApi.list({
      channels: model.channel ? [model.channel] : undefined,
      severity: asSeverity(model.severity),
      source: asSource(model.source),
      pathPrefix: model.path?.trim() || undefined,
      author: model.mine ? actor.getTemplatePath() ?? undefined : undefined,
      limit: model.limit,
    });

    if (rows.length === 0) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.escape('No diagnostics match.'))
        .send();
      return;
    }

    const body = Mml.fromMarkup(
      [
        Mml.strong(`${rows.length} diagnostic(s)`).toString(),
        Mml.unorderedList(rows.map((r) => renderRow(r))).toString(),
      ].join('\n\n')
    );
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }

  private async raw(
    model: ErrorsModel,
    context: CommandContext
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!(await AccessApi.isWizard(actor))) {
      context.note({
        kind: 'controller-rejected',
        reason: 'wizard-only',
        detail: 'errors raw is wizard-only (the console ring may carry internals)',
      });
      return;
    }
    const lines = DiagnosticApi.rawTail({ grep: model.grep, limit: model.limit });
    if (lines.length === 0) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.escape('Console ring is empty.'))
        .send();
      return;
    }
    const body = Mml.fromMarkup(
      Mml.unorderedList(lines.map((l) => renderRaw(l))).toString()
    );
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }

  private async clear(
    model: ErrorsModel,
    context: CommandContext
  ): Promise<void> {
    const actor = context.commandGiver;
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
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.escape(`Cleared ${n} diagnostic(s) for ${path}.`))
      .send();
  }
}

function asSeverity(v: string | undefined): DiagnosticSeverity | undefined {
  return v === 'error' || v === 'warning' || v === 'info' ? v : undefined;
}

function asSource(v: string | undefined): DiagnosticSource | undefined {
  return v === 'runtime' || v === 'compile' || v === 'console' ? v : undefined;
}

function renderRow(r: DiagnosticDoc): Mml {
  const where = r.path
    ? `${r.path}${r.line != null ? `:${r.line}` : ''}`
    : r.channel;
  const head = `[${r.severity}] ${r.channel} ${where}`;
  return Mml.compose`${Mml.strong(head)} — ${Mml.escape(r.message)}`;
}

function renderRaw(l: RawConsoleLine): Mml {
  return Mml.compose`${Mml.strong(`[${l.level}]`)} ${Mml.escape(l.text)}`;
}
