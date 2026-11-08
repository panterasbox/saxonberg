/**
 * WikiDiffController — `wiki diff <page> [<from>] [<to>]`: word-level diff over SOURCE, redacted before diffing (criteria 67, 68) (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { TemplatePaths } from '../../../../lib/paths';
import WikiRenderer from '../../WikiRenderer';
import { WikiPage } from '../../../../lib/wiki/WikiPage';
import { SourceDiff } from '../../../../lib/wiki/SourceDiff';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiDiffController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );

    const from = this.parseRev(model.from);
    const to = this.parseRev(model.to);
    if (from === 'invalid' || to === 'invalid') {
      return this.fail(context, 'revisions must be numbers', 'bad-rev');
    }
    // Bare `wiki diff <page>` compares the last two — the question
    // somebody scanning a page actually has ("what just changed?").
    const revs = await registry.history(page._id ?? '');
    const latest = revs[0]?.getRev() ?? page.getRev();
    const toRev = to ?? latest;
    const fromRev = from ?? Math.max(1, toRev - 1);
    if (fromRev === toRev) {
      this.send(context, Mml.fromMarkup(`\nNothing to compare.\n`));
      return;
    }

    const [a, b] = await Promise.all([
      this.bodyAt(page, fromRev),
      this.bodyAt(page, toRev),
    ]);
    if (a === null || b === null) {
      return this.fail(
        context,
        `no revision ${a === null ? fromRev : toRev} of this page`,
        'no-such-revision',
      );
    }

    // Redact, THEN diff.
    const [safeA, safeB] = await Promise.all([
      renderer.redactSource(a),
      renderer.redactSource(b),
    ]);
    const ops = SourceDiff.words(safeA, safeB);
    const changed = ops.some((o) => o.kind !== 'same');
    if (!changed) {
      this.send(
        context,
        Mml.fromMarkup(
          `\nNo visible difference between rev ${fromRev} and rev ${toRev}.\n`,
        ),
      );
      return;
    }
    this.send(
      context,
      Mml.fromMarkup(
        `\n${Mml.escape(`${page.getTitle()}: rev ${fromRev} → rev ${toRev}`)}\n\n` +
          `${Mml.escape(SourceDiff.format(ops))}\n`,
      ),
    );
  }

  /**
   * The page's body at `rev` — the revision row's, or the page's own
   * when `rev` is the current one and no row carries it.
   */
  private async bodyAt(page: WikiPage, rev: number): Promise<string | null> {
    const registry = await this.registry();
    const row = await registry.revisionAt(page._id ?? '', rev);
    if (row) return row.getBody();
    return rev === page.getRev() ? page.getBody() : null;
  }
}
