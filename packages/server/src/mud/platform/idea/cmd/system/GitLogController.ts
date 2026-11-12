/**
 * GitLogController — `git log [<path>] [--limit <n>]` — recent commits
 * (over {@link GitControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { GitApi } from '../../../../api/git';
import type { GitLogEntry } from '@saxonberg/types';
import { GitControllerBase, type GitModel } from './GitControllerBase';

export default class GitLogController extends GitControllerBase {
  async execute(model: GitModel, context: CommandContext): Promise<void> {
    return GitControllerBase.guarded(context, async () => {
      const rows = await GitApi.log({
        limit: model.limit,
        pathArg: model.path?.trim() || undefined,
      });
      if (rows.length === 0) {
        GitControllerBase.tell(context, 'No commits.');
        return;
      }
      GitControllerBase.tell(context, rows.map(GitLogController.renderLogEntry).join('\n'));
    });
  }

  private static renderLogEntry(c: GitLogEntry): string {
    const shortSha = c.sha.slice(0, 8);
    return `• ${shortSha} ${c.author} — ${c.message}`;
  }
}
