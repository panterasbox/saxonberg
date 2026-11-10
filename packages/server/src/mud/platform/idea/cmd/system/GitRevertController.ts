/**
 * GitRevertController — `git revert <sha>` — add a commit undoing an
 * earlier one, scoped to what you may write (over {@link
 * GitControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { GitApi } from '../../../../api/git';
import type { GitRevertResult } from '@saxonberg/types';
import { GitControllerBase, type GitModel } from './GitControllerBase';

export default class GitRevertController extends GitControllerBase {
  async execute(model: GitModel, context: CommandContext): Promise<void> {
    return GitControllerBase.guarded(context, async () => {
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
      GitControllerBase.tell(context, GitRevertController.renderRevert(r));
    });
  }

  private static renderRevert(r: GitRevertResult): string {
    if (!r.reverted) return `Not reverted: ${r.detail}`;
    return `Reverted${r.sha ? ` as ${r.sha.slice(0, 8)}` : ''}: ${r.detail}`;
  }
}
