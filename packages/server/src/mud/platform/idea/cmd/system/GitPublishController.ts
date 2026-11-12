/**
 * GitPublishController — `git publish -m <message> [--dry-run]` —
 * snapshot-and-push the writable dirty files, or report the split and
 * touch nothing (over {@link GitControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { GitApi } from '../../../../api/git';
import type { GitPublishResult } from '@saxonberg/types';
import { GitControllerBase, type GitModel } from './GitControllerBase';

export default class GitPublishController extends GitControllerBase {
  async execute(model: GitModel, context: CommandContext): Promise<void> {
    return GitControllerBase.guarded(context, async () => {
      const message = model.message?.trim();
      if (!message) {
        context.note({
          kind: 'controller-rejected',
          reason: 'missing-message',
          detail: 'git publish needs a message: git publish -m "<message>"',
        });
        return;
      }
      const r: GitPublishResult = await GitApi.publish(message, {
        dryRun: model.dryRun === true,
      });
      GitControllerBase.tell(context, GitPublishController.renderPublish(r));
    });
  }

  private static renderPublish(r: GitPublishResult): string {
    const lines: string[] = [];
    if (r.dryRun) {
      lines.push(
        r.committedPaths.length > 0
          ? `Dry run — would commit: ${r.committedPaths.join(', ')}`
          : `Dry run — nothing would be committed: ${r.detail}`
      );
    } else if (!r.committed) {
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
}
