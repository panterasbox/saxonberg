/**
 * GitControllerBase — what the `git` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the shell surface over the in-runtime VCS (`GitApi`).
 * One of two thin surfaces over the one gated core (the other is the CMS
 * git panel); neither reimplements the mechanism or the gate.
 *
 *   - `status` (and bare `git`) / `diff` / `log` — reads, open to any
 *     signed-in avatar (wizard-axis D14): `GitStatusController`,
 *     `GitDiffController`, `GitLogController`.
 *   - `publish -m <msg> [--dry-run]` — `GitPublishController`:
 *     snapshot-and-push the writable dirty files (each asks the one
 *     source-write predicate), or report the split and touch nothing.
 *   - `revert <sha>` — `GitRevertController`: additive,
 *     permission-scoped rollback.
 *
 * Holds **no authz of its own** and passes **no actor** — `GitApi`
 * derives the acting principal from execution context. Read-only output
 * rides `MessageApi.scene`; failures (a `GitError`, a missing
 * message/sha) surface as `controller-rejected` notes — the base holds
 * that translation and the shell words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { GitError } from '../../../../api/git';

export const TOPIC = 'shell.diagnostic';

export interface GitModel extends CommandModel {
  subcommand?: string;
  path?: string;
  sha?: string;
  message?: string;
  limit?: number;
  dryRun?: boolean;
}

export abstract class GitControllerBase extends CommandController<GitModel> {
  /** Run one git act; a `GitError` becomes a `controller-rejected` note. */
  protected static async guarded(
    context: CommandContext,
    act: () => Promise<void>,
  ): Promise<void> {
    try {
      await act();
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

  protected static tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.escape(text))
      .send();
  }
}
