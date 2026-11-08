/**
 * WikiReadController — `wiki read <page>` and the fallthrough bare `wiki <page>`: render a page for the acting reader and open its card (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { WikiPage } from '../../../../lib/wiki/WikiPage';
import { TOPIC, WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiReadController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const ref = (model.page ?? '').trim();
    if (!ref) return this.fail(context, 'which page?', 'page-required');
    const registry = await this.registry();
    const hit = await registry.resolve(ref);
    if (!hit) {
      // A miss is an invitation, not an error: a wiki grows because
      // the reader who noticed the gap is the author who fills it.
      this.send(
        context,
        Mml.compose`\nNo page '${ref}'. Write it with \`wiki create ${ref}\`.\n`,
      );
      context.note({ kind: 'empty-result', field: 'page', query: ref });
      return;
    }
    const { page, viaAlias } = hit;
    const rendered = await this.render(page, model);
    const header = viaAlias
      ? `${page.getTitle()}  (via '${WikiPage.normalizeName(ref)}' → ${page.getHandle()})`
      : `${page.getTitle()}  (${page.getHandle()}, rev ${page.getRev()})`;
    // Card first, so `carded` states a fact rather than a promise.
    const opened = await this.pushPage(context, page, rendered);
    this.sendCarded(
      context,
      Mml.fromMarkup(
        `\n${Mml.escape(header)}\n\n${rendered}\n`,
      ),
      opened,
    );
  }

  /**
   * The page read's prose — the twin of the card `pushPage` opens.
   *
   * ⚠ `carded` is the card's instance id and is passed only when the
   * card actually opened. Stamped unconditionally it is a promise, and
   * a suppressed frame whose card never appeared is a command that did
   * nothing at all.
   */
  private sendCarded(
    context: CommandContext,
    body: Mml,
    carded: string | null,
  ): void {
    const scene = MessageApi.scene(context.commandGiver).topic(TOPIC);
    if (carded) scene.meta({ carded });
    scene.toSelf(body).send();
  }
}
