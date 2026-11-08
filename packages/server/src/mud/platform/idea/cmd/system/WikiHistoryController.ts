/**
 * WikiHistoryController — `wiki history <page>`: the revisions this reader can see changed (criterion 68) (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { TemplatePaths } from '../../../../lib/paths';
import WikiRenderer from '../../WikiRenderer';
import { SourceDiff } from '../../../../lib/wiki/SourceDiff';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiHistoryController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const revisions = await registry.history(page._id ?? '');
    if (revisions.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo revisions.\n`));
      return;
    }
    // ⚠ History is a revision-facing surface, so it applies the same
    // gate a reading does. A revision whose ONLY change was above this
    // reader's ceiling redacts to the same text as its predecessor —
    // and is then omitted entirely, because listing it would tell the
    // reader THAT something they cannot see changed (criterion 68).
    // Absent, not "1 change hidden": a redaction marker is the leak in
    // miniature.
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );
    const oldestFirst = [...revisions].reverse();
    const visible: string[] = [];
    let previous: string | null = null;
    for (const rev of oldestFirst) {
      const seen = await renderer.redactSource(rev.getBody());
      const changed = previous === null || SourceDiff.changed(previous, seen);
      previous = seen;
      if (!changed) continue;
      const draft = rev.isPublished() ? '' : ' [draft]';
      const note = rev.getSummary() ? ` — ${rev.getSummary()}` : '';
      visible.push(
        `  ${rev.getRev()}. ${rev.getKind()}${draft} by ${rev.getAuthor()}` +
          ` at ${new Date(rev.getAt()).toISOString()}${note}`,
      );
    }
    if (visible.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo revisions.\n`));
      return;
    }
    const lines = [
      `History of ${page.getTitle()} (${page.getHandle()}):`,
      ...visible.reverse(),
    ];
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
