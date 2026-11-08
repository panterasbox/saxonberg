/**
 * WikiControllerBase — what every `wiki` subcommand shares, and the
 * **one chokepoint** every wiki mutation passes through.
 *
 * One controller per subcommand over this base (controllers-are-io W7,
 * D9). Every mutator on `WikiRegistry` carries
 * `@CallSecurity(FromModule('/platform/idea/cmd/system/WikiControllerBase#WikiControllerBase', { includeSubclasses: true }))`,
 * so the `wiki` controllers are not merely the conventional callers —
 * they are the only ones the gate admits (criterion 20). Code that
 * resolves the registry by template path gets a reference and a
 * `SecurityError`.
 *
 * Subcommand-first with `fallthrough: true`, so bare `wiki <page>`
 * reads (the `chat` / `forum` shape) — `WikiReadController`.
 *
 * The base's {@link WikiControllerBase.execute} turns the substrate's two
 * expected refusals into named rejections; each subcommand implements
 * {@link WikiControllerBase.run}.
 *
 * Controllers return `void`; outcomes ride the dispatch-response
 * envelope. A refusal is a `controller-rejected` note plus a scene
 * line naming the reason — never a `{success: false}` return.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { TemplatePaths } from '../../../../lib/paths';
import WikiRegistry, { SNIPPET_NAMESPACE, WikiConflict, WikiDenied } from '../../WikiRegistry';
import WikiRenderer from '../../WikiRenderer';
import { WikiPage, type SubjectKind, type WikiSubject } from '../../../../lib/wiki/WikiPage';
import { SpoilerLevels, type SpoilerLevel } from '../../../../lib/wiki/render';
import { Sections } from '../../../../lib/wiki/Section';
import type { WikiPageFrame } from '@saxonberg/types';

export interface WikiModel extends CommandModel {
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
export const TOPIC = 'shell.result';

/**
 * The structured side-channel the wiki card reads. A `world.` topic
 * rather than `shell.result.` because it is world content, and because
 * a player who filters the shell family should still get the card.
 */
const PAGE_TOPIC = 'publication.wiki';

/** The subject kinds a `--subject` option may name. */
const SUBJECT_KINDS: readonly SubjectKind[] = ['template', 'mixin', 'command'];

export abstract class WikiControllerBase extends CommandController<WikiModel> {
  /**
   * Run the subcommand, surfacing `WikiDenied` / `WikiConflict` as named
   * rejections.
   */
  async execute(model: WikiModel, context: CommandContext): Promise<void> {
    try {
      return await this.run(model, context);
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

  /** The subcommand's own act. */
  protected abstract run(model: WikiModel, context: CommandContext): Promise<void>;

  protected async setDeleted(
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

  /**
   * Render a page for the acting reader. The renderer derives who that
   * is from the execution context — the controller never tells it, and
   * has no way to.
   */
  protected async render(page: WikiPage, model: WikiModel): Promise<string> {
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
  protected async renderBody(
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
  protected async renderLoose(body: string, model: WikiModel): Promise<string> {
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
  protected async requirePage(
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
  protected async resolveBody(
    model: WikiModel,
    context: CommandContext,
    label: string,
    current?: string,
  ): Promise<string | null> {
    if (typeof model.body === 'string') return model.body;
    // ⭐ Fail closed (D23): a script names its body with `--body`, or is
    // refused `needs-input` — `null` — never handed an empty article.
    const asker = context.requireInteractive('a body (`--body`)');
    if (!asker) return null;
    {
      try {
        const composed = await asker.promptCompose(label, {
          placeholder: 'Wiki markdown — ⌘/Ctrl+Enter to submit',
          // ⚠ The editor opens on what is THERE. Without this, `wiki
          // edit` is `wiki retype`: an empty box whose contents
          // replace the whole article on post.
          ...(current !== undefined && current !== ''
            ? { initial: current }
            : {}),
          allowEditorEscalation: true,
        });
        return composed;
      } catch {
        return current === undefined ? '' : null;
      }
    }
  }

  protected async registry(): Promise<WikiRegistry> {
    return StuffApi.singleton<WikiRegistry>(TemplatePaths.wikiRegistry);
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(detail)}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  /**
   * Push the structured twin of what just went to the scroll, so the
   * wiki card has something to show.
   *
   * ⭐ It carries **the body that was already rendered** — not the
   * source, and not a second render. That is the whole security
   * argument for the card: the payload inherits the gate rather than
   * re-deriving it, so there is no second path along which
   * over-capability content could reach a client (criterion 24). A
   * card that re-rendered from source would be exactly that second
   * path.
   *
   * `sectionsFrom` reads the **stored** source, which is markdown, and
   * yields only heading text and anchors — public structure, not
   * content. When a preview is being shown the outline comes from the
   * DRAFT, or the card's outline would describe the saved page while
   * its body shows the unsaved one.
   */
  protected async pushPage(
    context: CommandContext,
    page: WikiPage,
    rendered: string,
    draft?: string,
    preview = false,
  ): Promise<string | null> {
    const registry = await this.registry();
    let mayEdit = false;
    try {
      mayEdit = await registry.mayEdit(page);
    } catch {
      // A display hint is never worth failing a read over.
      mayEdit = false;
    }
    const subject = page.getSubject();
    const frame: WikiPageFrame = {
      kind: 'wiki-page',
      handle: page.getHandle(),
      title: page.getTitle(),
      rev: page.getRev(),
      body: rendered,
      tags: [...page.getTags()],
      related: [...page.getRelated()],
      sections: Sections.list(draft ?? page.getBody()).map((s) => ({
        level: s.level,
        anchor: s.anchor,
        title: s.title,
      })),
      subject: subject ? { kind: subject.kind, ref: subject.ref } : null,
      updatedBy: page.getUpdatedBy(),
      updatedAt: page.getUpdatedAt().getTime(),
      mayEdit,
      ...(preview ? { preview: true } : {}),
    };
    MessageApi.scene(context.commandGiver)
      .topic(PAGE_TOPIC)
      .toSelf(Mml.fromMarkup(''), frame)
      .send();

    /*
     * ⭐ The card carries **the very frame that just went out** — one
     * object, two deliveries. That inherits the render gate rather than
     * re-deriving it, which is the whole security argument for the
     * card: a second render from source would be a second path along
     * which over-capability content could reach a client.
     */
    return CardApi.open(context, 'wiki', {
      payload: { kind: 'wikiPage', page: frame },
      // ⭐ Named by the PAGE, not by "the wiki". A column of cards all
      // called "the wiki" is a column you cannot scan.
      title: page.getTitle(),
    });
  }

  /**
   * Parse `--subject kind:ref`. Returns `undefined` for an unpassed
   * option (leave the field alone), `null` for an explicit `none`
   * (unbind), a subject, or the sentinel `'invalid'` — three outcomes
   * plus an error, which a bare `null` return could not distinguish.
   */
  protected parseSubject(
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
  protected parseRev(raw: string | undefined): number | undefined | 'invalid' {
    if (raw === undefined) return undefined;
    const s = raw.trim();
    if (!s) return undefined;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 'invalid';
  }

  /** Split a comma-separated option into trimmed, non-empty entries. */
  protected splitList(raw: string): string[] {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
