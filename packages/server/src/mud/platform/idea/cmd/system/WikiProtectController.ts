/**
 * WikiProtectController — `wiki protect <page> <level>`: who may edit (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiPage, type Protection } from '../../../../lib/wiki/WikiPage';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiProtectController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const raw = (model.level ?? '').trim().toLowerCase();
    if (raw !== 'none' && !WikiPage.isProtection(raw)) {
      return this.fail(
        context,
        'level must be anyone, editors, moderators, or none',
        'bad-protection',
      );
    }
    const level: Protection | null = raw === 'none' ? null : raw;
    const registry = await this.registry();
    await registry.protectPage(page, level);
    const effective = await registry.protectionFor(page);
    this.send(
      context,
      Mml.compose`\n'${page.getTitle()}' is now editable by ${effective}.\n`,
    );
  }
}
