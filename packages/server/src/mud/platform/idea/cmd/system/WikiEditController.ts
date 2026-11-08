/**
 * WikiEditController — `wiki edit <page>`: frontmatter by option, prose (or one `--section`) by body, behind the `--rev` lost-update guard (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { TemplatePaths } from '../../../../lib/paths';
import WikiRegistry, { WikiConflict } from '../../WikiRegistry';
import WikiRenderer from '../../WikiRenderer';
import { WikiPage } from '../../../../lib/wiki/WikiPage';
import { SpoilerLevels } from '../../../../lib/wiki/render';
import { Sections } from '../../../../lib/wiki/Section';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiEditController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    // ⚠ Ask before doing anything else. The mutators refuse on their
    // own, but by then the composer has been opened and an article
    // typed into it — the same refusal, arriving at the worst moment.
    const refusal = await registry.refusalToEdit(page);
    if (refusal !== null) return this.fail(context, refusal, 'wiki-denied');
    const subject = this.parseSubject(model.subject);
    if (subject === 'invalid') {
      return this.fail(
        context,
        `--subject must be template:<path>, mixin:<Name> or command:<file>`,
        'bad-subject',
      );
    }

    // Frontmatter rides options and changes only what was passed —
    // an unpassed flag stays undefined on the patch rather than
    // clearing the field (the `bulletin` edit shape).
    const patch: Parameters<WikiRegistry['setFrontmatter']>[1] = {};
    if (model.title !== undefined) patch.title = model.title;
    if (model.tag !== undefined) patch.tags = this.splitList(model.tag);
    if (model.related !== undefined) patch.related = this.splitList(model.related);
    if (model.subject !== undefined) patch.subject = subject;
    if (model.reveal !== undefined) {
      patch.spoilerLevel = SpoilerLevels.parse(model.reveal);
    }
    const frontmatterOnly = Object.keys(patch).length > 0;
    if (frontmatterOnly) {
      await registry.setFrontmatter(page, patch);
    }

    // ⭐ `wiki edit oak --reveal 2` changes the level and stops. Asking
    // for the body too would mean an author who wanted to retitle a
    // page had to retype the whole article — and, worse, that there is
    // no way to change frontmatter WITHOUT rewriting the body.
    //
    // The rule: options and no body = a frontmatter edit; no options =
    // the author came to write, so open the editor. An explicit
    // `--section` always means prose, whatever else was passed.
    if (frontmatterOnly && model.body === undefined && !model.section) {
      this.send(context, Mml.compose`\nUpdated '${page.getTitle()}'.\n`);
      return;
    }

    const section = (model.section ?? '').trim().toLowerCase();
    if (section && !Sections.find(page.getBody(), section)) {
      return this.fail(
        context,
        `No section '${section}' in '${page.getHandle()}'. ` +
          `Sections here: ${this.describeSections(page.getBody())}`,
        'no-such-section',
      );
    }

    // Editing a section pre-fills with that section, not the article.
    const current = section
      ? (Sections.extract(page.getBody(), section) ?? '')
      : page.getBody();
    const body = await this.resolveBody(
      model,
      context,
      section ? `Edit the '${section}' section:` : 'Edit the article:',
      current,
    );
    if (body === null) {
      // A script with no `--body`: needs-input, already noted.
      if (!context.interactive) return;
      // The author opened the editor and cancelled out of it.
      return this.fail(context, 'Edit cancelled.', 'edit-cancelled');
    }

    const baseRev = this.parseRev(model.rev);
    if (baseRev === 'invalid') {
      return this.fail(context, '--rev must be a number', 'bad-rev');
    }
    try {
      await registry.editPage(page, body, {
        ...(baseRev !== undefined ? { baseRev } : {}),
        ...(model.summary ? { summary: model.summary } : {}),
        ...(section ? { section } : {}),
        ...(model.draft === true ? { draft: true } : {}),
      });
    } catch (err) {
      if (err instanceof WikiConflict) {
        return this.sendConflict(context, page, err, body);
      }
      throw err;
    }
    const what = model.draft === true ? 'Drafted' : 'Edited';
    const tail =
      model.draft === true
        ? ` The page still serves rev ${page.getRev() - 1}.`
        : '';
    this.send(
      context,
      Mml.compose`\n${what} '${page.getTitle()}' — now rev ${String(page.getRev())}.${tail}\n`,
    );
  }

  /**
   * Emit the three-way conflict. **All three bodies go through
   * `redactSource`** — a conflict response is a revision-facing
   * surface, so without that a reader could read past their ceiling by
   * provoking one (criteria 67, 68).
   */
  private async sendConflict(
    context: CommandContext,
    page: WikiPage,
    err: WikiConflict,
    submitted: string,
  ): Promise<void> {
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );
    const registry = await this.registry();
    const baseRow = await registry.revisionAt(page._id ?? '', err.baseRev);
    const [base, current, submittedSafe] = await Promise.all([
      renderer.redactSource(baseRow?.getBody() ?? ''),
      renderer.redactSource(page.getBody()),
      renderer.redactSource(submitted),
    ]);
    context.note({
      kind: 'wiki-edit-conflict',
      page: page.getHandle(),
      ...(err.section ? { section: err.section } : {}),
      baseRev: err.baseRev,
      currentRev: err.currentRev,
      base,
      current,
      submitted: submittedSafe,
    });
    this.send(
      context,
      Mml.compose`\n'${page.getTitle()}' changed while you were editing — it is at rev ${String(err.currentRev)}, you started from ${String(err.baseRev)}. Nothing was overwritten. Re-read it and reapply your edit.\n`,
    );
  }

  /** A human list of a body's section anchors, for a refusal. */
  private describeSections(body: string): string {
    const anchors = Sections.list(body).map((s) => s.anchor);
    return anchors.length ? anchors.join(', ') : '(none)';
  }
}
