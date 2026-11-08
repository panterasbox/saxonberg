/**
 * ForumReadController — `forum read <board> [thread]` and the bare `forum <board>` fallthrough — a board's thread list or a thread's tree (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { EntrySort } from '../../../../api/forums';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

const VALID_SORTS = new Set<EntrySort>(['new', 'top', 'hot', 'controversial']);

export default class ForumReadController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const handle = (model.board ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    const sort = this.parseSort(model.sort);

    const threadId = (model.thread ?? '').trim();
    if (threadId) {
      const root = await ForumsApi.getEntry(threadId);
      if (!root) return this.fail(context, `No thread '${threadId}'.`, 'no-such-thread');
      const { posts } = await ForumsApi.readThread(root, sort);
      const lines = [
        `${root.getTitle()} (#${root._id})  ${await this.scoreLabel(root)}`,
        '',
      ];
      lines.push(`  ${this.stripMml(root.getBody())}`);
      for (const p of posts) {
        lines.push(`    ↳ #${p._id} ${await this.scoreLabel(p)} ${this.stripMml(p.getBody())}`);
      }
      this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
      return;
    }

    const threads = await ForumsApi.readBoard(view.board, sort);
    if (threads.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo threads in ${handle}.\n`));
      return;
    }
    const lines = [`Threads in ${handle} (by ${sort}):`];
    for (const t of threads) {
      lines.push(`  #${t._id} ${await this.scoreLabel(t)} ${t.getTitle()}`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private parseSort(raw: string | undefined): EntrySort {
    const s = (raw ?? '').trim().toLowerCase() as EntrySort;
    return VALID_SORTS.has(s) ? s : 'new';
  }

  /** Score label honoring the anti-snowball display gate (`···` = hidden). */
  private async scoreLabel(entry: import('../../../../lib/forum/Entry').default): Promise<string> {
    const display = await ForumsApi.displayScoreFor(entry);
    return display === null ? '[···]' : `[${display}]`;
  }

  /** Crude MML→text for CLI readouts (the GUI renders MML properly). */
  private stripMml(mml: string): string {
    return mml.replace(/<[^>]+>/g, '').trim();
  }
}
