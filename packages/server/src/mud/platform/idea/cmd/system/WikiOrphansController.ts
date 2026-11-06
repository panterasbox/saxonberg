/**
 * WikiOrphansController — `wiki orphans`: pages nothing links to — unreachable by browsing, not broken (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiOrphansController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const registry = await this.registry();
    const orphans = await registry.orphans();
    if (orphans.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo orphans.\n`));
      return;
    }
    const lines = ['Pages nothing links to:'];
    for (const p of orphans) lines.push(`  ${p.getHandle()}  ${p.getTitle()}`);
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
