/**
 * WikiCreateController — `wiki create <page>`: write a new article (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { DEFAULT_NAMESPACE } from '../../WikiRegistry';
import { WikiPage } from '../../../../lib/wiki/WikiPage';
import { SpoilerLevels } from '../../../../lib/wiki/render';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiCreateController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const ref = (model.page ?? '').trim();
    if (!ref) return this.fail(context, 'name the page', 'page-required');
    const { namespace, name } = WikiPage.parseRef(ref, DEFAULT_NAMESPACE);
    if (!name) return this.fail(context, 'name the page', 'page-required');
    const subject = this.parseSubject(model.subject);
    if (subject === 'invalid') {
      return this.fail(
        context,
        `--subject must be template:<path>, mixin:<Name> or command:<file>`,
        'bad-subject',
      );
    }
    // ⚠ Ask BEFORE opening the composer. `createPage` refuses on its
    // own — but refusing somebody who has just written an article is
    // technically identical and humanly very different.
    const registry = await this.registry();
    const refusal = await registry.refusalToCreate(namespace);
    if (refusal !== null) return this.fail(context, refusal, 'wiki-denied');
    const body = await this.resolveBody(model, context, 'Write the article:');
    if (body === null) return; // needs-input, noted
    const page = await registry.createPage({
      namespace,
      slug: name,
      ...(model.title ? { title: model.title } : {}),
      body,
      subject,
      ...(model.tag ? { tags: this.splitList(model.tag) } : {}),
      ...(model.related ? { related: this.splitList(model.related) } : {}),
      ...(model.reveal !== undefined
        ? { spoilerLevel: SpoilerLevels.parse(model.reveal) }
        : {}),
    });
    this.send(
      context,
      Mml.compose`\nCreated '${page.getTitle()}' (${page.getHandle()}).\n`,
    );
  }
}
