/**
 * WikiLinksController — `wiki links <page>`: what links here; follows aliases, so a rename orphans nothing (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiLinksController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const linkers = await registry.backlinks(page.getHandle());
    if (linkers.length === 0) {
      this.send(
        context,
        Mml.compose`\nNothing links to '${page.getTitle()}' yet.\n`,
      );
      return;
    }
    const lines = [`Pages linking to ${page.getTitle()}:`];
    for (const p of linkers) lines.push(`  ${p.getHandle()}  ${p.getTitle()}`);
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
