/**
 * WikiRenderer — the article render pipeline, and **the one gate** the
 * whole reveal model rests on.
 *
 * A singleton `Idea` at `/obj/WikiRenderer`, sibling to the other
 * state-owning singletons under `obj/`. Not an `*Api` (the wiki adds
 * none, by constraint) and not a method on `WikiPage`: a `Document` is
 * constructed with `new` and never passed through `ProxyApi.wrap`, so
 * `@CallSecurity` on a Document method is **inert**. Putting the render
 * path on a Stuff is what makes it gateable at all.
 *
 * ## The pipeline, and why the stage list is frozen
 *
 * ```
 * render(body):
 *   1. parse              Mml.parseTree(body)
 *   2. expandSnippets     fixpoint, depth cap, cycle detect   [Wave 4]
 *   3. resolveLinks       [[Page]] → <link> / redlink         [Wave 3]
 *   4. resolveComponents  path-resolved, budgeted             [Wave 5]
 *   5. gate               MAXIMUM levels → omit / tag
 *   6. emit               serialise back to MML
 * ```
 *
 * Later waves fill stage bodies; **no wave adds a stage**. Four things
 * each want to be outermost and the wrong order is a silent
 * correctness bug rather than a crash, so the order is fixed here once
 * and asserted by observation in the tests.
 *
 * ## Body, never a page id
 *
 * `render` takes a **body**. `pageId` rides `opts` for self-reference
 * only. That is A4, and it is the cheapest architectural decision in
 * the design: preview is then the same path over unsaved text, for
 * free. Keyed on a page id instead, preview becomes a second rendering
 * path, and second paths drift until preview lies about what saving
 * will do.
 *
 * ## The reader is derived, never passed
 *
 * Both faces resolve the acting principal from
 * `ExecutionContextApi.getActingAuthor()` **internally**. There is no
 * `reader` parameter and there must never be one: with a parameter,
 * "over-capability content never crosses the wire" is a convention any
 * caller can break by passing a privileged Avatar. Derived, it is a
 * property of the code path — which is what makes criterion 24
 * assertable on the payload.
 *
 * ## Two faces over one walk
 *
 *   - {@link render} — display MML. Over-ceiling nodes **deleted**,
 *     over-appetite nodes **tagged**.
 *   - {@link redactSource} — source string with over-ceiling fragments
 *     deleted and nothing tagged. Feeds `history`, `diff`, and the
 *     edit-conflict payload, so a reader cannot read past their
 *     ceiling by asking for a diff instead of a page (criteria 67/68).
 */

import { Idea } from '../lib/stuff/Idea';
import { Mml, type MmlNode } from '../api/mml';
import { AccessApi } from '../api/access';
import { AppApi } from '../api/app';
import { ShellApi } from '../api/shell';
import { ExecutionContextApi } from '../api/execution-context';
import type { Stuff } from '../lib/stuff/Stuff';
import { RenderBudget, RenderBudgetExceeded } from '../lib/wiki/RenderBudget';
import {
  SpoilerLevels,
  type ReaderProfile,
  type RenderOptions,
  type RenderResult,
  type SpoilerLevel,
} from '../lib/wiki/render';

/**
 * The `app_settings` keys the budget reads. Operator-tunable without a
 * deploy; absent rows fall through to `RenderBudget.DEFAULTS`.
 */
const LIMIT_KEYS = {
  snippetDepth: 'wiki.render.snippetDepth',
  maxSnippets: 'wiki.render.maxSnippets',
  maxComponents: 'wiki.render.maxComponents',
  componentTimeoutMs: 'wiki.render.componentTimeoutMs',
  maxOutputChars: 'wiki.render.maxOutputChars',
} as const;

/** The reader-preference setting declared on `Avatar` (D-9). */
const APPETITE_SETTING = 'wiki.spoilerAppetite';

export default class WikiRenderer extends Idea {
  /**
   * Render an article body to display MML for the **current** reader.
   *
   * Never throws for author error: a budget breach or a broken
   * component yields an inline error node and the rest of the page
   * renders (C2). It throws only for a programming error.
   */
  public async render(
    body: string,
    opts: RenderOptions = {},
  ): Promise<RenderResult> {
    const budget = this.newBudget();
    const diagnostics: string[] = [];
    const reader = await this.resolveReader(opts);

    let nodes: readonly MmlNode[];
    try {
      // 1. parse
      budget.checkOutput(body);
      nodes = Mml.parseTree(body);
      // 2. expandSnippets — Wave 4 fills this.
      nodes = await this.expandSnippets(nodes, opts, budget, diagnostics);
      // 3. resolveLinks — Wave 3 fills this.
      nodes = await this.resolveLinks(nodes, opts, budget, diagnostics);
      // 4. resolveComponents — Wave 5 fills this.
      nodes = await this.resolveComponents(nodes, opts, budget, diagnostics);
    } catch (err) {
      // A bound was hit mid-pipeline. Emit what the failure was rather
      // than a blank page — an author who cannot tell which limit they
      // crossed cannot fix the page.
      const detail = describe(err);
      diagnostics.push(detail);
      return { body: Mml.serialize([errorNode(detail)]), diagnostics, budget };
    }

    // 5. gate — the single place capability and appetite are applied.
    const pageDefault = opts.spoilerDefault ?? SpoilerLevels.OPEN;
    let gated: MmlNode[];
    if (pageDefault > reader.ceiling) {
      // The whole page is above this reader. Nothing survives, and the
      // caller decides what to say about a page they cannot see.
      gated = [];
    } else if (pageDefault > reader.appetite) {
      // One wrapper for the whole body rather than one per node — the
      // page's own default is a single decision, so it reads as one.
      gated = [
        {
          kind: 'tag',
          tag: 'spoiler',
          attrs: { level: String(pageDefault) },
          children: this.gateNodes(nodes, pageDefault, reader, true),
        },
      ];
    } else {
      gated = this.gateNodes(nodes, pageDefault, reader, false);
    }

    // 6. emit
    const out = Mml.serialize(gated);
    try {
      budget.checkOutput(out);
    } catch (err) {
      const detail = describe(err);
      diagnostics.push(detail);
      return { body: Mml.serialize([errorNode(detail)]), diagnostics, budget };
    }
    return { body: out, diagnostics, budget };
  }

  /**
   * Filter an article **source** to what the current reader's ceiling
   * admits: over-ceiling fragments deleted, nothing tagged, no
   * snippets expanded and no components resolved.
   *
   * This is the surface `history`, `diff` and the edit-conflict
   * response go through. Without it, history is a hole in the wall the
   * renderer carefully built: a reader who cannot see a level-3
   * section can still read it in a diff — or, only slightly better,
   * can see *that* it changed, which is itself the leak ("something
   * about the boss fight was rewritten").
   *
   * ⭐ Above the ceiling a fragment is **absent** — not redacted, not
   * counted, not placeholdered as "1 change hidden". A redaction
   * marker is the leak in miniature (criterion 68).
   *
   * Returns the input **unchanged** when nothing was removed. That is
   * not an optimisation: `parseTree`/`serialize` normalise entities and
   * tag forms, so re-emitting an untouched body would rewrite bodies
   * this was only ever meant to filter (the plan's R-8).
   */
  public async redactSource(body: string): Promise<string> {
    const reader = await this.resolveReader({});
    // A ceiling of 3 admits everything the vocabulary can express, so
    // there is nothing to walk.
    if (reader.ceiling >= 3) return body;
    const nodes = Mml.parseTree(body);
    const kept = this.redactNodes(nodes, SpoilerLevels.OPEN, reader.ceiling);
    if (kept.removed === 0) return body;
    return Mml.serialize(kept.nodes);
  }

  /**
   * The reader's ceiling — **derived from identity, never stored**.
   *
   * The ladder, most-privileged first:
   *   - **3** — a wizard. Code trust implies seeing everything the
   *     content declares.
   *   - **2** — may mutate the namespace zone (its owner role). If you
   *     can roll the page back, hiding its content from you is theatre.
   *   - **1** — may edit in the namespace.
   *   - **0** — everyone else, including an unresolved principal.
   *
   * ⚠ `AccessApi.can` **ignores its `action` argument** (verified —
   * the parameter is discarded). The ladder differentiates by *which
   * predicate it calls*, not by the action string, so
   * `can(a,'read',z)` and `can(a,'edit',z)` cannot be made to differ.
   * The strings below are documentation of intent.
   */
  public async ceilingFor(
    actor: Stuff | null,
    namespaceZone?: unknown,
  ): Promise<SpoilerLevel> {
    if (actor === null) return SpoilerLevels.OPEN;
    if (await AccessApi.isWizard(actor)) return 3;
    const zone = isStuff(namespaceZone) ? namespaceZone : null;
    if (zone === null) return SpoilerLevels.OPEN;
    if (await AccessApi.canMutateZone(actor, zone)) return 2;
    if (await AccessApi.can(actor, 'read', zone)) return 1;
    return SpoilerLevels.OPEN;
  }

  // ── Stage bodies ──

  /**
   * Stage 2 — snippet expansion. **Wave 4 fills this**; until then a
   * `{{Snippet}}` invocation is literal text, which is the honest
   * behaviour for a feature that has not shipped.
   *
   * It exists as a no-op now so the stage ORDER is settled before
   * anything is written against its absence — expansion must run
   * before component resolution (D6), because a snippet can emit a
   * component.
   */
  protected async expandSnippets(
    nodes: readonly MmlNode[],
    _opts: RenderOptions,
    _budget: RenderBudget,
    _diagnostics: string[],
  ): Promise<readonly MmlNode[]> {
    return nodes;
  }

  /** Stage 3 — `[[Page]]` resolution. **Wave 3 fills this.** */
  protected async resolveLinks(
    nodes: readonly MmlNode[],
    _opts: RenderOptions,
    _budget: RenderBudget,
    _diagnostics: string[],
  ): Promise<readonly MmlNode[]> {
    return nodes;
  }

  /** Stage 4 — component resolution. **Wave 5 fills this.** */
  protected async resolveComponents(
    nodes: readonly MmlNode[],
    _opts: RenderOptions,
    _budget: RenderBudget,
    _diagnostics: string[],
  ): Promise<readonly MmlNode[]> {
    return nodes;
  }

  // ── The gate ──

  /**
   * Stage 5, the whole reveal model in one walk.
   *
   * `inherited` is the MAXIMUM of every level enclosing these nodes.
   * `tagged` says an ancestor already emitted a `<spoiler>` wrapper, so
   * a nested one would only add noise — the client collapses the
   * outermost.
   *
   * Authored `<spoiler>` tags are **consumed**: they are level
   * declarations, and what is emitted is a per-reader display
   * instruction. A reader whose appetite covers a level-2 section gets
   * the content with no wrapper at all.
   */
  private gateNodes(
    nodes: readonly MmlNode[],
    inherited: SpoilerLevel,
    reader: ReaderProfile,
    tagged: boolean,
  ): MmlNode[] {
    const out: MmlNode[] = [];
    for (const node of nodes) {
      if (node.kind === 'text') {
        // ⚠ `>` not `>=`. `level > ceiling` DELETES; equality is
        // admitted. An inverted comparison here is the leak.
        if (inherited > reader.ceiling) continue;
        if (inherited > reader.appetite && !tagged) {
          out.push(spoilerWrap(inherited, [node]));
        } else {
          out.push(node);
        }
        continue;
      }

      const own =
        node.tag === 'spoiler'
          ? SpoilerLevels.parse(node.attrs.level)
          : SpoilerLevels.OPEN;
      const effective = SpoilerLevels.max(inherited, own);

      // Deletion applies at EVERY depth, whether or not an ancestor
      // survived — a level-3 aside inside a level-1 section is gone for
      // a level-1 reader even though the section stays.
      if (effective > reader.ceiling) continue;

      const needsTag = effective > reader.appetite && !tagged;
      const children = this.gateNodes(
        node.children,
        effective,
        reader,
        tagged || needsTag,
      );
      // The authored `<spoiler>` is a declaration, not output: unwrap
      // it and let `needsTag` decide whether a display wrapper is
      // emitted for THIS reader.
      const kept: MmlNode[] =
        node.tag === 'spoiler'
          ? children
          : [{ kind: 'tag', tag: node.tag, attrs: node.attrs, children }];
      if (needsTag) {
        out.push(spoilerWrap(effective, kept));
      } else {
        out.push(...kept);
      }
    }
    return out;
  }

  /**
   * The `redactSource` walk: same MAXIMUM composition, ceiling only,
   * and **authored `<spoiler>` tags are preserved** — this produces
   * *source*, and the tags are part of what the author wrote.
   *
   * Reports how many nodes were dropped so the caller can return the
   * original string untouched when the answer is none.
   */
  private redactNodes(
    nodes: readonly MmlNode[],
    inherited: SpoilerLevel,
    ceiling: SpoilerLevel,
  ): { nodes: MmlNode[]; removed: number } {
    const out: MmlNode[] = [];
    let removed = 0;
    for (const node of nodes) {
      if (node.kind === 'text') {
        if (inherited > ceiling) removed += 1;
        else out.push(node);
        continue;
      }
      const own =
        node.tag === 'spoiler'
          ? SpoilerLevels.parse(node.attrs.level)
          : SpoilerLevels.OPEN;
      const effective = SpoilerLevels.max(inherited, own);
      if (effective > ceiling) {
        removed += 1;
        continue;
      }
      const inner = this.redactNodes(node.children, effective, ceiling);
      removed += inner.removed;
      out.push({
        kind: 'tag',
        tag: node.tag,
        attrs: node.attrs,
        children: inner.nodes,
      });
    }
    return { nodes: out, removed };
  }

  // ── Reader + budget resolution ──

  /**
   * Resolve the current reader's two numbers. The acting principal
   * comes from the execution context; the appetite from the
   * per-invocation override, else their `wiki.spoilerAppetite` setting,
   * else 0.
   *
   * Appetite is **clamped to the ceiling**. Not for safety — the gate
   * checks the ceiling independently and would delete regardless — but
   * so the emitted markup is honest: tagging content at a level the
   * reader could never have received would advertise a hole that is
   * not there.
   */
  private async resolveReader(opts: RenderOptions): Promise<ReaderProfile> {
    const actor = asStuff(ExecutionContextApi.getActingAuthor());
    const ceiling = await this.ceilingFor(actor, opts.namespaceZone);
    const declared =
      opts.appetite !== undefined
        ? SpoilerLevels.parse(opts.appetite)
        : actor !== null
          ? SpoilerLevels.parse(ShellApi.resolveSetting<number>(actor, APPETITE_SETTING))
          : SpoilerLevels.OPEN;
    return { ceiling, appetite: declared > ceiling ? ceiling : declared };
  }

  /** Build a budget from `wiki.render.*`, falling back to the defaults. */
  private newBudget(): RenderBudget {
    const num = (key: string): number | undefined => {
      const raw = AppApi.setting(key);
      if (!raw) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const limits: Partial<Record<keyof typeof LIMIT_KEYS, number>> = {};
    for (const [field, key] of Object.entries(LIMIT_KEYS)) {
      const v = num(key);
      if (v !== undefined) limits[field as keyof typeof LIMIT_KEYS] = v;
    }
    return new RenderBudget(limits);
  }
}

/**
 * The inline error node a failure renders as. One broken widget must
 * never take down an article (C2), and a silent drop is worse than a
 * visible marker — a page that renders fine while missing a panel
 * reads as correct, so the reader never learns to report it.
 *
 * Module-private: emitting a render error is the PIPELINE's job. A
 * component cannot construct one, which is the same containment as it
 * not learning the reader's identity.
 */
function errorNode(detail: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'code',
    attrs: {},
    children: [{ kind: 'text', text: `[wiki: ${detail}]` }],
  };
}

/** Build the per-reader display wrapper. */
function spoilerWrap(level: SpoilerLevel, children: MmlNode[]): MmlNode {
  return {
    kind: 'tag',
    tag: 'spoiler',
    attrs: { level: String(level) },
    children,
  };
}

/** Narrow the execution context's opaque principal to a Stuff. */
function asStuff(value: unknown): Stuff | null {
  return isStuff(value) ? value : null;
}

/**
 * Structural Stuff check. `MixinApi.isVisible`-style predicates each
 * assert one mixin; what is wanted here is only "is this a registered
 * object at all", which `getIdentityPath` answers for every Stuff and
 * nothing else has.
 */
function isStuff(value: unknown): value is Stuff {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { getIdentityPath?: unknown }).getIdentityPath ===
      'function'
  );
}

/** Human-readable text for a pipeline failure. */
function describe(err: unknown): string {
  if (err instanceof RenderBudgetExceeded) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
