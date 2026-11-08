/**
 * WikiWantedController — `wiki wanted`: redlinks ranked by demand — the best authoring to-do list a wiki has (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiWantedController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const registry = await this.registry();
    const wanted = await registry.wanted();
    if (wanted.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(`\nNothing is wanted — every link resolves.\n`),
      );
      return;
    }
    const lines = ['Wanted pages (most-linked first):'];
    for (const { ref, demand } of wanted) {
      const plural = demand === 1 ? 'page wants' : 'pages want';
      lines.push(`  ${ref}  — ${demand} ${plural} it`);
    }
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
