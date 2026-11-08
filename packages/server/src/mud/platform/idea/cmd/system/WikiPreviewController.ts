/**
 * WikiPreviewController — `wiki preview [<page>]`: render a body through the same pipeline a save does, without saving (A4, criterion 36) (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiPreviewController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const registry = await this.registry();
    const ref = (model.page ?? '').trim();
    // A preview may be of an existing page (so it inherits that page's
    // namespace + frontmatter) or of nothing at all — drafting a page
    // that does not exist yet is exactly when preview is most useful.
    const hit = ref ? await registry.resolve(ref) : null;
    const body = await this.resolveBody(model, context, 'Preview what?');
    if (body === null) return; // needs-input, noted
    if (!body) return this.fail(context, 'nothing to preview', 'body-required');
    const rendered = hit
      ? await this.renderBody(body, hit.page, model)
      : await this.renderLoose(body, model);
    this.send(
      context,
      Mml.fromMarkup(`\n${Mml.escape('(preview)')}\n\n${rendered}\n`),
    );
    if (hit) await this.pushPage(context, hit.page, rendered, body, true);
  }
}
