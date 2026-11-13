/**
 * GitDiffController — `git diff [<path>]` — the working-tree patch (over
 * {@link GitControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { GitApi } from '../../../../api/git';
import { GitControllerBase, type GitModel } from './GitControllerBase';

export default class GitDiffController extends GitControllerBase {
  async execute(model: GitModel, context: CommandContext): Promise<void> {
    return GitControllerBase.guarded(context, async () => {
      const d = await GitApi.diff(model.path?.trim() || undefined);
      GitControllerBase.tell(context, d.patch.length > 0 ? d.patch : 'No changes.');
    });
  }
}
