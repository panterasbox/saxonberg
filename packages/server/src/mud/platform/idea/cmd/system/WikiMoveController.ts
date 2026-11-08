/**
 * WikiMoveController — `wiki move <page> <slug>`: rename; the old name still resolves (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiMoveController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const slug = (model.slug ?? '').trim();
    if (!slug) return this.fail(context, 'rename it to what?', 'slug-required');
    const before = page.getSlug();
    const registry = await this.registry();
    await registry.movePage(page, slug);
    this.send(
      context,
      Mml.compose`\nRenamed '${before}' to '${page.getSlug()}'. The old name still resolves.\n`,
    );
  }
}
