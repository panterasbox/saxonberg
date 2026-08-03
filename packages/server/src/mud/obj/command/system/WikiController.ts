/**
 * WikiController — the `wiki` verb, and the **one chokepoint** every
 * wiki mutation passes through.
 *
 * Every mutator on `WikiRegistry` carries
 * `@CallSecurity(FromModule('/obj/command/system/WikiController'))`, so
 * this module is not merely the conventional caller — it is the only
 * one the gate admits (criterion 20). Code that resolves the registry
 * by template path gets a reference and a `SecurityError`.
 *
 * Subcommand-first with `fallthrough: true`, so bare `wiki <page>`
 * reads (the `chat` / `forum` shape).
 *
 * Controllers return `void`; outcomes ride the dispatch-response
 * envelope. A refusal is a `controller-rejected` note plus a scene
 * line naming the reason — never a `{success: false}` return.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { PromptApi } from '../../../api/prompt';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import WikiRegistry, {
  DEFAULT_NAMESPACE,
  SNIPPET_NAMESPACE,
  WikiConflict,
  WikiDenied,
} from '../../WikiRegistry';
import WikiRenderer from '../../WikiRenderer';
import {
  WikiPage,
  type Protection,
  type SubjectKind,
  type WikiSubject,
} from '../../../lib/wiki/WikiPage';
import { SpoilerLevels, type SpoilerLevel } from '../../../lib/wiki/render';
import { Sections } from '../../../lib/wiki/Section';
import { SourceDiff } from '../../../lib/wiki/SourceDiff';

interface WikiModel extends CommandModel {
  page?: string;
  slug?: string;
  rev?: string;
  /** The two revisions `wiki diff` compares. */
  from?: string;
  to?: string;
  level?: string;
  namespace?: string;
  body?: string;
  title?: string;
  subject?: string;
  /** Reader appetite for THIS reading (verb-scoped `--spoiler`). */
  spoiler?: string;
  /** The PAGE's default reveal level (`--reveal` on create/edit). */
  reveal?: string;
  /** Edit one heading's span rather than the whole article (A2). */
  section?: string;
  /** The one-line note that makes a history readable (A5). */
  summary?: string;
  /** Save unpublished — the page keeps serving its last body (A5). */
  draft?: boolean;
  tag?: string;
  related?: string;
}

/** The scene topic every `wiki` readout rides. */
const TOPIC = 'system.shell.wiki';

export default class WikiController extends CommandController<WikiModel> {
  async execute(model: WikiModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand;
    try {
      switch (sub) {
        case undefined:
        case 'read':
          return await this.executeRead(model, context);
        case 'create':
          return await this.executeCreate(model, context);
        case 'edit':
          return await this.executeEdit(model, context);
        case 'history':
          return await this.executeHistory(model, context);
        case 'diff':
          return await this.executeDiff(model, context);
        case 'rollback':
          return await this.executeRollback(model, context);
        case 'move':
          return await this.executeMove(model, context);
        case 'delete':
          return await this.executeDelete(model, context, true);
        case 'undelete':
          return await this.executeDelete(model, context, false);
        case 'purge':
          return await this.executePurge(model, context);
        case 'protect':
          return await this.executeProtect(model, context);
        case 'preview':
          return await this.executePreview(model, context);
        case 'links':
          return await this.executeLinks(model, context);
        case 'wanted':
          return await this.executeWanted(context);
        case 'orphans':
          return await this.executeOrphans(context);
        case 'dangling':
          return await this.executeDangling(context);
        case 'list':
          return await this.executeList(model, context);
        default:
          return this.fail(
            context,
            `Unknown wiki subcommand: ${sub}`,
            'unknown-subcommand',
          );
      }
    } catch (err) {
      // `WikiDenied` and `WikiConflict` are the substrate's two
      // expected refusals — an authorization failure and a lost-update
      // guard. Both are the player's business, so they surface as
      // named rejections rather than as an error status.
      if (err instanceof WikiDenied) {
        return this.fail(context, err.message, 'wiki-denied');
      }
      if (err instanceof WikiConflict) {
        return this.fail(
          context,
          `${err.message}. Re-read the page and reapply your edit.`,
          'wiki-edit-conflict',
        );
      }
      throw err;
    }
  }

  // ── Read ──

  private async executeRead(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
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
    this.send(
      context,
      Mml.fromMarkup(
        `\n${Mml.escape(header)}\n\n${rendered}\n`,
      ),
    );
  }

  // ── Write ──

  private async executeCreate(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const ref = (model.page ?? '').trim();
    if (!ref) return this.fail(context, 'name the page', 'page-required');
    const { namespace, name } = WikiPage.parseRef(ref, DEFAULT_NAMESPACE);
    if (!name) return this.fail(context, 'name the page', 'page-required');
    const subject = parseSubject(model.subject);
    if (subject === 'invalid') {
      return this.fail(
        context,
        `--subject must be template:<path>, mixin:<Name> or command:<file>`,
        'bad-subject',
      );
    }
    const body = await this.resolveBody(model, context, 'Write the article:');
    const registry = await this.registry();
    const page = await registry.createPage({
      namespace,
      slug: name,
      ...(model.title ? { title: model.title } : {}),
      body,
      subject,
      ...(model.tag ? { tags: splitList(model.tag) } : {}),
      ...(model.related ? { related: splitList(model.related) } : {}),
      ...(model.reveal !== undefined
        ? { spoilerLevel: SpoilerLevels.parse(model.reveal) }
        : {}),
    });
    this.send(
      context,
      Mml.compose`\nCreated '${page.getTitle()}' (${page.getHandle()}).\n`,
    );
  }

  private async executeEdit(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const subject = parseSubject(model.subject);
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
    if (model.tag !== undefined) patch.tags = splitList(model.tag);
    if (model.related !== undefined) patch.related = splitList(model.related);
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
          `Sections here: ${describeSections(page.getBody())}`,
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
      // The author opened the editor and cancelled out of it.
      return this.fail(context, 'Edit cancelled.', 'edit-cancelled');
    }

    const baseRev = parseRev(model.rev);
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
   * Render a body through the **same pipeline** a saved page goes
   * through, without saving (A4, criterion 36).
   *
   * Preview costs nothing precisely because the pipeline keys on a
   * body: there is no second rendering path to drift, so preview
   * cannot come to lie about what saving will do.
   */
  private async executePreview(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const registry = await this.registry();
    const ref = (model.page ?? '').trim();
    // A preview may be of an existing page (so it inherits that page's
    // namespace + frontmatter) or of nothing at all — drafting a page
    // that does not exist yet is exactly when preview is most useful.
    const hit = ref ? await registry.resolve(ref) : null;
    const body = await this.resolveBody(model, context, 'Preview what?');
    if (!body) return this.fail(context, 'nothing to preview', 'body-required');
    const rendered = hit
      ? await this.renderBody(body, hit.page, model)
      : await this.renderLoose(body, model);
    this.send(
      context,
      Mml.fromMarkup(`\n${Mml.escape('(preview)')}\n\n${rendered}\n`),
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

  private async executeHistory(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const revisions = await registry.history(page._id ?? '');
    if (revisions.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo revisions.\n`));
      return;
    }
    // ⚠ History is a revision-facing surface, so it applies the same
    // gate a reading does. A revision whose ONLY change was above this
    // reader's ceiling redacts to the same text as its predecessor —
    // and is then omitted entirely, because listing it would tell the
    // reader THAT something they cannot see changed (criterion 68).
    // Absent, not "1 change hidden": a redaction marker is the leak in
    // miniature.
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );
    const oldestFirst = [...revisions].reverse();
    const visible: string[] = [];
    let previous: string | null = null;
    for (const rev of oldestFirst) {
      const seen = await renderer.redactSource(rev.getBody());
      const changed = previous === null || SourceDiff.changed(previous, seen);
      previous = seen;
      if (!changed) continue;
      const draft = rev.isPublished() ? '' : ' [draft]';
      const note = rev.getSummary() ? ` — ${rev.getSummary()}` : '';
      visible.push(
        `  ${rev.getRev()}. ${rev.getKind()}${draft} by ${rev.getAuthor()}` +
          ` at ${new Date(rev.getAt()).toISOString()}${note}`,
      );
    }
    if (visible.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo revisions.\n`));
      return;
    }
    const lines = [
      `History of ${page.getTitle()} (${page.getHandle()}):`,
      ...visible.reverse(),
    ];
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }

  /**
   * ⭐ Word-level diff over SOURCE, **redacted before diffing**.
   *
   * The order is the security property. Redacting first means an
   * over-ceiling fragment is absent from BOTH inputs and therefore
   * produces no operation at all — so two revisions differing only
   * above the ceiling diff to nothing, and a reader cannot learn
   * *that* something changed (criteria 67, 68). Diffing first and
   * filtering after would leak by construction: the ops would already
   * name the changed text.
   */
  private async executeDiff(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );

    const from = parseRev(model.from);
    const to = parseRev(model.to);
    if (from === 'invalid' || to === 'invalid') {
      return this.fail(context, 'revisions must be numbers', 'bad-rev');
    }
    // Bare `wiki diff <page>` compares the last two — the question
    // somebody scanning a page actually has ("what just changed?").
    const revs = await registry.history(page._id ?? '');
    const latest = revs[0]?.getRev() ?? page.getRev();
    const toRev = to ?? latest;
    const fromRev = from ?? Math.max(1, toRev - 1);
    if (fromRev === toRev) {
      this.send(context, Mml.fromMarkup(`\nNothing to compare.\n`));
      return;
    }

    const [a, b] = await Promise.all([
      this.bodyAt(page, fromRev),
      this.bodyAt(page, toRev),
    ]);
    if (a === null || b === null) {
      return this.fail(
        context,
        `no revision ${a === null ? fromRev : toRev} of this page`,
        'no-such-revision',
      );
    }

    // Redact, THEN diff.
    const [safeA, safeB] = await Promise.all([
      renderer.redactSource(a),
      renderer.redactSource(b),
    ]);
    const ops = SourceDiff.words(safeA, safeB);
    const changed = ops.some((o) => o.kind !== 'same');
    if (!changed) {
      this.send(
        context,
        Mml.fromMarkup(
          `\nNo visible difference between rev ${fromRev} and rev ${toRev}.\n`,
        ),
      );
      return;
    }
    this.send(
      context,
      Mml.fromMarkup(
        `\n${Mml.escape(`${page.getTitle()}: rev ${fromRev} → rev ${toRev}`)}\n\n` +
          `${Mml.escape(SourceDiff.format(ops))}\n`,
      ),
    );
  }

  /**
   * The page's body at `rev` — the revision row's, or the page's own
   * when `rev` is the current one and no row carries it.
   */
  private async bodyAt(page: WikiPage, rev: number): Promise<string | null> {
    const registry = await this.registry();
    const row = await registry.revisionAt(page._id ?? '', rev);
    if (row) return row.getBody();
    return rev === page.getRev() ? page.getBody() : null;
  }

  private async executeRollback(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
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

  private async executeMove(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
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

  private async executeDelete(
    model: WikiModel,
    context: CommandContext,
    remove: boolean,
  ): Promise<void> {
    const registry = await this.registry();
    const ref = (model.page ?? '').trim();
    if (!ref) return this.fail(context, 'which page?', 'page-required');
    // Undelete has to SEE a deleted page to restore it.
    const hit = await registry.resolve(ref, { includeDeleted: true });
    if (!hit) return this.fail(context, `No page '${ref}'.`, 'no-such-page');
    if (remove) {
      await registry.deletePage(hit.page);
      this.send(
        context,
        Mml.compose`\nDeleted '${hit.page.getTitle()}'. Its revisions are untouched; \`wiki undelete\` restores it.\n`,
      );
    } else {
      await registry.undeletePage(hit.page);
      this.send(context, Mml.compose`\nRestored '${hit.page.getTitle()}'.\n`);
    }
  }

  private async executePurge(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const registry = await this.registry();
    const ref = (model.page ?? '').trim();
    if (!ref) return this.fail(context, 'which page?', 'page-required');
    const hit = await registry.resolve(ref, { includeDeleted: true });
    if (!hit) return this.fail(context, `No page '${ref}'.`, 'no-such-page');
    // Irreversible and destructive: confirm when there is somebody to
    // ask. A scripted caller (no Interactive) proceeds — it has already
    // cleared the moderator gate, and a prompt it cannot answer would
    // hang rather than protect.
    if (context.interactive) {
      const ok = await PromptApi.confirm(
        context.interactive,
        `Purge '${hit.page.getTitle()}' and every revision of it? This cannot be undone.`,
        'no',
      ).catch(() => false);
      if (!ok) {
        return this.fail(context, 'Purge cancelled.', 'purge-cancelled');
      }
    }
    const removed = await registry.purgePage(hit.page);
    this.send(
      context,
      Mml.compose`\nPurged '${hit.page.getTitle()}' and ${String(removed)} revisions. The act is recorded; the content is gone.\n`,
    );
  }

  private async executeProtect(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
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

  // ── Maintenance: the four reports that keep a wiki from rotting ──

  /** What links here. Follows aliases, so a rename orphans nothing. */
  private async executeLinks(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const page = await this.requirePage(model, context);
    if (!page) return;
    const registry = await this.registry();
    const linkers = await registry.backlinks(page.getHandle());
    if (linkers.length === 0) {
      this.send(
        context,
        Mml.compose`\nNothing links to '${page.getTitle()}' yet.\n`,
      );
      return;
    }
    const lines = [`Pages linking to ${page.getTitle()}:`];
    for (const p of linkers) lines.push(`  ${p.getHandle()}  ${p.getTitle()}`);
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }

  /**
   * ⭐ Wanted pages — redlinks ranked by demand. The best authoring
   * to-do list a wiki has: every entry is a reader who noticed a gap,
   * counted.
   */
  private async executeWanted(context: CommandContext): Promise<void> {
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

  /** Pages nothing links to — unreachable by browsing, not broken. */
  private async executeOrphans(context: CommandContext): Promise<void> {
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

  /**
   * ⚠ Articles whose subject template is gone. The CMS renames and
   * deletes templates and the wiki points at paths, so this WILL
   * happen — and without the report a stale article quietly documents
   * nothing (criterion 51).
   */
  private async executeDangling(context: CommandContext): Promise<void> {
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

  private async executeList(
    model: WikiModel,
    context: CommandContext,
  ): Promise<void> {
    const registry = await this.registry();
    const filter = WikiPage.normalizeName(model.namespace ?? '');
    const pages = (await registry.allPages()).filter(
      (p) => !filter || p.getNamespace() === filter,
    );
    if (pages.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo pages.\n`));
      return;
    }
    const lines = [filter ? `Pages in ${filter}:` : 'Pages:'];
    for (const p of pages.sort((a, b) =>
      a.getHandle().localeCompare(b.getHandle()),
    )) {
      const subject = p.getSubject();
      const bound = subject ? `  [${subject.kind}: ${subject.ref}]` : '';
      lines.push(`  ${p.getHandle()}  ${p.getTitle()}${bound}`);
    }
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(lines.join('\n'))}\n`));
  }

  // ── Shared ──

  /**
   * Render a page for the acting reader. The renderer derives who that
   * is from the execution context — the controller never tells it, and
   * has no way to.
   */
  private async render(page: WikiPage, model: WikiModel): Promise<string> {
    return this.renderBody(page.getBody(), page, model);
  }

  /**
   * Render `body` in `page`'s context — its namespace zone, its
   * frontmatter default, its id for self-reference.
   *
   * ⭐ Preview and a saved read call THIS, with different bodies. That
   * is the whole of criterion 36, and it is free only because the
   * pipeline keys on a body rather than a page id (A4).
   */
  private async renderBody(
    body: string,
    page: WikiPage,
    model: WikiModel,
  ): Promise<string> {
    const registry = await this.registry();
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );
    const zone = await registry.zoneFor(page.getNamespace());
    const appetite =
      model.spoiler !== undefined
        ? (SpoilerLevels.parse(model.spoiler) as SpoilerLevel)
        : undefined;
    const result = await renderer.render(body, {
      pageId: page._id ?? '',
      spoilerDefault: page.getSpoilerLevel(),
      ...(zone ? { namespaceZone: zone } : {}),
      ...(appetite !== undefined ? { appetite } : {}),
      resolveLink: async (ref) => {
        const target = await registry.resolve(ref);
        return target
          ? { handle: target.page.getHandle(), title: target.page.getTitle() }
          : null;
      },
      // A snippet IS a page (S1) — it resolves through the same
      // lookup as everything else, just pinned to its namespace, so
      // it inherits revisions, history, rollback and protection with
      // no second store and no second editing path.
      resolveSnippet: async (name) => {
        const { name: leaf } = WikiPage.parseRef(name, SNIPPET_NAMESPACE);
        const hit = await registry.resolve(`${SNIPPET_NAMESPACE}:${leaf}`);
        return hit ? hit.page.getBody() : null;
      },
    });
    return result.body;
  }

  /**
   * Render a body belonging to no page yet — previewing an article
   * before it exists, which is when preview is most useful.
   *
   * No namespace zone, so the capability ladder answers 0 for a
   * non-wizard: the fail-closed direction, and correct, since there is
   * no namespace whose membership could say otherwise.
   */
  private async renderLoose(body: string, model: WikiModel): Promise<string> {
    const registry = await this.registry();
    const renderer = await StuffApi.singleton<WikiRenderer>(
      TemplatePaths.wikiRenderer,
    );
    const appetite =
      model.spoiler !== undefined
        ? (SpoilerLevels.parse(model.spoiler) as SpoilerLevel)
        : undefined;
    const result = await renderer.render(body, {
      ...(model.reveal !== undefined
        ? { spoilerDefault: SpoilerLevels.parse(model.reveal) }
        : {}),
      ...(appetite !== undefined ? { appetite } : {}),
      resolveLink: async (ref) => {
        const target = await registry.resolve(ref);
        return target
          ? { handle: target.page.getHandle(), title: target.page.getTitle() }
          : null;
      },
      resolveSnippet: async (name) => {
        const { name: leaf } = WikiPage.parseRef(name, SNIPPET_NAMESPACE);
        const hit = await registry.resolve(`${SNIPPET_NAMESPACE}:${leaf}`);
        return hit ? hit.page.getBody() : null;
      },
    });
    return result.body;
  }

  /** Resolve `model.page`, sending the refusal when it misses. */
  private async requirePage(
    model: WikiModel,
    context: CommandContext,
  ): Promise<WikiPage | null> {
    const ref = (model.page ?? '').trim();
    if (!ref) {
      this.fail(context, 'which page?', 'page-required');
      return null;
    }
    const registry = await this.registry();
    const hit = await registry.resolve(ref);
    if (!hit) {
      this.fail(context, `No page '${ref}'.`, 'no-such-page');
      return null;
    }
    return hit.page;
  }

  /**
   * The body, from the three routes to one field: the structured
   * side-channel (GUI), else an interactive compose prompt, else
   * `null` for "the author did not supply one".
   *
   * `null` rather than `''` matters: an empty string is a legitimate
   * edit (blanking a page), so the two cannot be conflated. `current`
   * pre-fills the prompt so editing is editing rather than retyping.
   */
  private async resolveBody(
    model: WikiModel,
    context: CommandContext,
    label: string,
    current?: string,
  ): Promise<string>;
  private async resolveBody(
    model: WikiModel,
    context: CommandContext,
    label: string,
    current: string,
  ): Promise<string | null>;
  private async resolveBody(
    model: WikiModel,
    context: CommandContext,
    label: string,
    current?: string,
  ): Promise<string | null> {
    if (typeof model.body === 'string') return model.body;
    if (context.interactive) {
      try {
        const composed = await PromptApi.compose(context.interactive, label, {
          placeholder: 'Wiki markdown — ⌘/Ctrl+Enter to submit',
          allowEditorEscalation: true,
        });
        return composed;
      } catch {
        return current === undefined ? '' : null;
      }
    }
    return current === undefined ? '' : null;
  }

  private async registry(): Promise<WikiRegistry> {
    return StuffApi.singleton<WikiRegistry>(TemplatePaths.wikiRegistry);
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(detail)}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }
}

/** The subject kinds a `--subject` option may name. */
const SUBJECT_KINDS: readonly SubjectKind[] = ['template', 'mixin', 'command'];

/**
 * Parse `--subject kind:ref`. Returns `undefined` for an unpassed
 * option (leave the field alone), `null` for an explicit `none`
 * (unbind), a subject, or the sentinel `'invalid'` — three outcomes
 * plus an error, which a bare `null` return could not distinguish.
 */
function parseSubject(
  raw: string | undefined,
): WikiSubject | null | undefined | 'invalid' {
  if (raw === undefined) return undefined;
  const s = raw.trim();
  if (!s || s.toLowerCase() === 'none') return null;
  const colon = s.indexOf(':');
  if (colon <= 0) return 'invalid';
  const kind = s.slice(0, colon).trim().toLowerCase();
  const ref = s.slice(colon + 1).trim();
  if (!ref) return 'invalid';
  if (!(SUBJECT_KINDS as readonly string[]).includes(kind)) return 'invalid';
  return { kind: kind as SubjectKind, ref };
}

/**
 * Parse `--rev`. `undefined` when unpassed (skip the compare-and-swap
 * — the scripted path), a number when given, `'invalid'` for garbage.
 * A bare `null` return could not tell "not asked for" from "asked for
 * nonsense", and silently skipping the check on a typo would turn a
 * lost-update guard off exactly when somebody was trying to use it.
 */
function parseRev(raw: string | undefined): number | undefined | 'invalid' {
  if (raw === undefined) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : 'invalid';
}

/** A human list of a body's section anchors, for a refusal. */
function describeSections(body: string): string {
  const anchors = Sections.list(body).map((s) => s.anchor);
  return anchors.length ? anchors.join(', ') : '(none)';
}

/** Split a comma-separated option into trimmed, non-empty entries. */
function splitList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
