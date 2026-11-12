/**
 * GitStatusController — `git status` (and bare `git`) — the branch,
 * divergence and dirty files (over {@link GitControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { CardApi } from '../../../../api/card';
import { GitApi } from '../../../../api/git';
import type { GitStatusResult } from '@saxonberg/types';
import { GitControllerBase, type GitModel } from './GitControllerBase';

export default class GitStatusController extends GitControllerBase {
  async execute(_model: GitModel, context: CommandContext): Promise<void> {
    /*
     * ⭐ Bare `git` (which falls through to `status`) opens the version
     * -control CARD as well as printing. The card's body is the
     * client's own `/api/git/*` surface, so this is the open and
     * nothing more — and it declares `noProse`, so a `terminal`-only
     * `shell.result` cannot take the panel away.
     *
     * ⚠ Only the bare/status form. `git publish` is an ACT, and an act
     * that also rearranged your workspace would be doing two things on
     * one keystroke.
     */
    CardApi.open(context, 'git');
    return GitControllerBase.guarded(context, async () => {
      const s: GitStatusResult = await GitApi.status();
      GitControllerBase.tell(context, GitStatusController.renderStatus(s));
    });
  }

  private static renderStatus(s: GitStatusResult): string {
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
}
