/**
 * GitController — the `git` verb: the shell surface over the in-runtime
 * VCS (`GitApi`). One of two thin surfaces over the one gated core (the
 * other is the CMS git panel); neither reimplements the mechanism or the
 * gate.
 *
 * Dispatches on the subcommand (default `status`):
 *   - `status` / `diff` / `log` — reads (wizard-tier, enforced by the YAML
 *     `requiresWizard` validator + `GitApi` itself).
 *   - `publish -m <msg>` — snapshot-and-push the writable dirty files.
 *   - `revert <sha>` — additive, permission-scoped rollback.
 *
 * Holds **no authz beyond the YAML validator** and passes **no actor** —
 * `GitApi` derives the acting principal from execution context. Read-only
 * output rides `MessageApi.scene`; failures (a `GitError`, a missing
 * message/sha) surface as `controller-rejected` notes.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { GitApi, GitError } from '../../../api/git';
import type {
  GitStatusResult,
  GitLogEntry,
  GitPublishResult,
  GitRevertResult,
} from '@saxonberg/types';

const TOPIC = 'shell.diagnostic';

interface GitModel extends CommandModel {
  subcommand?: string;
  path?: string;
  sha?: string;
  message?: string;
  limit?: number;
}

export default class GitController extends CommandController<GitModel> {
  async execute(model: GitModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand ?? 'status';
    try {
      switch (sub) {
        case 'diff':
          return await this.diff(model, context);
        case 'log':
          return await this.log(model, context);
        case 'publish':
          return await this.publish(model, context);
        case 'revert':
          return await this.revert(model, context);
        default:
          return await this.status(model, context);
      }
    } catch (err) {
      if (err instanceof GitError) {
        context.note({
          kind: 'controller-rejected',
          reason: err.code,
          detail: err.message,
        });
        return;
      }
      throw err;
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.escape(text))
      .send();
  }

  private async status(
    _model: GitModel,
    context: CommandContext
  ): Promise<void> {
    const s: GitStatusResult = await GitApi.status();
    this.tell(context, renderStatus(s));
  }

  private async diff(model: GitModel, context: CommandContext): Promise<void> {
    const d = await GitApi.diff(model.path?.trim() || undefined);
    this.tell(context, d.patch.length > 0 ? d.patch : 'No changes.');
  }

  private async log(model: GitModel, context: CommandContext): Promise<void> {
    const rows = await GitApi.log({
      limit: model.limit,
      pathArg: model.path?.trim() || undefined,
    });
    if (rows.length === 0) {
      this.tell(context, 'No commits.');
      return;
    }
    this.tell(context, rows.map(renderLogEntry).join('\n'));
  }

  private async publish(
    model: GitModel,
    context: CommandContext
  ): Promise<void> {
    const message = model.message?.trim();
    if (!message) {
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-message',
        detail: 'git publish needs a message: git publish -m "<message>"',
      });
      return;
    }
    const r: GitPublishResult = await GitApi.publish(message);
    this.tell(context, renderPublish(r));
  }

  private async revert(
    model: GitModel,
    context: CommandContext
  ): Promise<void> {
    const sha = model.sha?.trim();
    if (!sha) {
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-sha',
        detail: 'git revert needs a commit sha',
      });
      return;
    }
    const r: GitRevertResult = await GitApi.revert(sha);
    this.tell(context, renderRevert(r));
  }
}

function renderStatus(s: GitStatusResult): string {
  const lines: string[] = [];
  lines.push(
    `On branch ${s.branch}` +
      (s.tracking ? ` (tracking ${s.tracking})` : ' (no upstream)')
  );
  if (s.diverged) {
    lines.push(`  ahead ${s.ahead}, behind ${s.behind}`);
  }
  for (const w of s.warnings) lines.push(`⚠ ${w}`);
  if (s.files.length === 0) {
    lines.push('Working tree clean.');
  } else {
    lines.push(`${s.files.length} dirty file(s):`);
    for (const f of s.files) {
      lines.push(`  ${f.index}${f.workingDir} ${f.path}`);
    }
  }
  return lines.join('\n');
}

function renderLogEntry(c: GitLogEntry): string {
  const shortSha = c.sha.slice(0, 8);
  return `• ${shortSha} ${c.author} — ${c.message}`;
}

function renderPublish(r: GitPublishResult): string {
  const lines: string[] = [];
  if (!r.committed) {
    lines.push(`Nothing committed: ${r.detail}`);
  } else {
    lines.push(
      `Committed ${r.committedPaths.length} file(s)${
        r.sha ? ` as ${r.sha.slice(0, 8)}` : ''
      }.`
    );
    lines.push(r.pushed ? `Pushed ${r.branch}.` : `Not pushed: ${r.detail}`);
  }
  if (r.skippedPaths.length > 0) {
    lines.push(`Left dirty (you may not write): ${r.skippedPaths.join(', ')}`);
  }
  return lines.join('\n');
}

function renderRevert(r: GitRevertResult): string {
  if (!r.reverted) return `Not reverted: ${r.detail}`;
  return `Reverted${r.sha ? ` as ${r.sha.slice(0, 8)}` : ''}: ${r.detail}`;
}
