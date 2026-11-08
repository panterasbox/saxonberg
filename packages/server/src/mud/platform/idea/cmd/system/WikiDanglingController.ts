/**
 * WikiDanglingController — `wiki dangling`: articles whose subject template is gone (criterion 51) (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiDanglingController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const registry = await this.registry();
    const dangling = await registry.dangling();
    if (dangling.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(`\nEvery subject-bound article still has its subject.\n`),
      );
      return;
    }
    const lines = ['Articles whose subject no longer exists:'];
    for (const { page, ref } of dangling) {
      lines.push(`  ${page.getHandle()}  → ${ref}`);
    }
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }
}
