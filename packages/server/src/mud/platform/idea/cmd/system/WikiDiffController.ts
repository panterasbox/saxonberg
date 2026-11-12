/**
 * WikiDiffController — `wiki diff <page> [<from>] [<to>]`: word-level diff over SOURCE, redacted before diffing (criteria 67, 68) (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SourceDiff } from '../../../../lib/wiki/SourceDiff';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiDiffController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const reader = context.commandGiver;

    const from = this.parseRev(model.from);
    const to = this.parseRev(model.to);
    if (from === 'invalid' || to === 'invalid') {
      return this.fail(context, 'revisions must be numbers', 'bad-rev');
    }
    // Bare `wiki diff <page>` compares the last two — the question
    // somebody scanning a page actually has ("what just changed?").
    const revs = await registry.historyFor(reader, page._id ?? '');
    const latest = revs[0]?.rev ?? page.getRev();
    const toRev = to ?? latest;
    const fromRev = from ?? Math.max(1, toRev - 1);
    if (fromRev === toRev) {
      this.send(context, Mml.fromMarkup(`\nNothing to compare.\n`));
      return;
    }

    // Redacted by the registry, THEN diffed (controller-liquidity D9).
    const [safeA, safeB] = await Promise.all([
      registry.revisionAtFor(reader, page, fromRev),
      registry.revisionAtFor(reader, page, toRev),
    ]);
    if (safeA === null || safeB === null) {
      return this.fail(
        context,
        `no revision ${safeA === null ? fromRev : toRev} of this page`,
        'no-such-revision',
      );
    }

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
}
