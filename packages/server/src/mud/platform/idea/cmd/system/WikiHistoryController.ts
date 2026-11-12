/**
 * WikiHistoryController — `wiki history <page>`: the revisions this reader can see changed (criterion 68) (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiHistoryController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    // ⚠ History is a revision-facing surface: the registry filters every
    // body to this reader's ceiling and marks a revision whose ONLY change
    // was above it, which is then omitted entirely — listing it would tell
    // the reader THAT something they cannot see changed (criterion 68).
    // Absent, not "1 change hidden": a redaction marker is the leak in
    // miniature. The gate is the registry's (controller-liquidity D9).
    const revisions = await registry.historyFor(
      context.commandGiver,
      page._id ?? '',
    );
    const visible = revisions
      .filter((rev) => rev.visibleChange)
      .map((rev) => {
        const draft = rev.published ? '' : ' [draft]';
        const note = rev.summary ? ` — ${rev.summary}` : '';
        return (
          `  ${rev.rev}. ${rev.kind}${draft} by ${rev.author}` +
          ` at ${new Date(rev.at).toISOString()}${note}`
        );
      });
    if (visible.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo revisions.\n`));
      return;
    }
    const lines = [
      `History of ${page.getTitle()} (${page.getHandle()}):`,
      ...visible,
    ];
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
