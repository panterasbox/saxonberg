/**
 * WikiListController — `wiki list [<namespace>]`: every page, subject-bound ones marked (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiPage } from '../../../../lib/wiki/WikiPage';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiListController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const registry = await this.registry();
    const filter = WikiPage.normalizeName(model.namespace ?? '');
    const pages = await registry.pagesIn(filter);
    if (pages.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo pages.\n`));
      return;
    }
    const lines = [filter ? `Pages in ${filter}:` : 'Pages:'];
    for (const p of pages.sort((a, b) =>
      a.getHandle().localeCompare(b.getHandle()),
    )) {
      const subject = p.getSubject();
      const bound = subject ? `  [${subject.kind}: ${subject.ref}]` : '';
      lines.push(`  ${p.getHandle()}  ${p.getTitle()}${bound}`);
    }
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
