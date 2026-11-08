/**
 * WikiRollbackController — `wiki rollback <page> <rev>`: restore a revision as a new one (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiRollbackController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const rev = Number.parseInt((model.rev ?? '').trim(), 10);
    if (!Number.isFinite(rev)) {
      return this.fail(context, 'which revision?', 'rev-required');
    }
    const registry = await this.registry();
    await registry.rollback(page, rev);
    this.send(
      context,
      Mml.compose`\nRestored rev ${String(rev)} of '${page.getTitle()}' as rev ${String(page.getRev())}.\n`,
    );
  }
}
