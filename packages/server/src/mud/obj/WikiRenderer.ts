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
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { Mml, type MmlNode } from '../api/mml';
import { AccessApi } from '../api/access';
import { AppApi } from '../api/app';
import { ShellApi } from '../api/shell';
import { ExecutionContextApi } from '../api/execution-context';
import { StuffApi } from '../api/stuff';
import type { Stuff } from '../lib/stuff/Stuff';
import { RenderBudget, RenderBudgetExceeded } from '../lib/wiki/RenderBudget';
import { Snippets, type SnippetInvocation } from '../lib/wiki/Snippet';
import {
  SpoilerLevels,
  type ComponentStatics,
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

/**
 * ⭐ Who may run a render — and therefore **why criterion 49 is
 * structural rather than a depth counter**.
 *
 * "No component may trigger a page render" could have been enforced
 * with a re-entrancy flag or a recursion limit. Both make recursion
 * *bounded*; neither makes it impossible, and a bound is a number
 * somebody eventually raises.
 *
 * Instead: a component lives at `/lib/wiki/components/*`, which is in
 * neither entry below, so a component calling back into the renderer
 * takes a `SecurityError` at the proxy. There is no depth at which it
 * becomes allowed.
 *
 * String form for both, because `pnpm lint:gates` validates concrete
 * `FromModule` strings against a real module + export — the class form
 * is invisible to that lint, which would make this an unchecked gate.
 * (The `FromTemplate` entry names the registry's clone identity, which
 * is how the registry reaches the renderer for its own reads.)
 */
const RenderCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/obj/command/system/WikiController'),
  SecurityPolicies.FromTemplate('/obj/WikiRegistry'),
);

export default class WikiRenderer extends Idea {
  /**
   * Render an article body to display MML for the **current** reader.
   *
   * Never throws for author error: a budget breach or a broken
   * component yields an inline error node and the rest of the page
   * renders (C2). It throws only for a programming error.
   */
  @CallSecurity(RenderCallers)
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
  @CallSecurity(RenderCallers)
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
    opts: RenderOptions,
    budget: RenderBudget,
    diagnostics: string[],
  ): Promise<readonly MmlNode[]> {
    if (!opts.resolveSnippet) return nodes;
    return this.expandIn(nodes, opts, budget, diagnostics, []);
  }

  /**
   * Walk `nodes` expanding every `{{Snippet}}` in their text, to
   * fixpoint — an expansion's own body is re-parsed and re-walked, so a
   * snippet may compose other snippets.
   *
   * `stack` is the chain of snippets currently being expanded, and it
   * is the **cycle detector**: a name already on the stack renders an
   * inline error instead of recursing. The budget's depth cap and total
   * count are the belt to that brace — the depth cap catches a snippet
   * including itself in a way the name check somehow missed, and the
   * total count catches a fan-out that is shallow but enormous.
   */
  private async expandIn(
    nodes: readonly MmlNode[],
    opts: RenderOptions,
    budget: RenderBudget,
    diagnostics: string[],
    stack: readonly string[],
  ): Promise<MmlNode[]> {
    const out: MmlNode[] = [];
    for (const node of nodes) {
      if (node.kind === 'text') {
        out.push(...(await this.expandText(node.text, opts, budget, diagnostics, stack)));
        continue;
      }
      // `<code>`/`<pre>` are opaque — an author documenting the snippet
      // syntax has to be able to show it, which is the same rule the
      // link stage follows.
      if (node.tag === 'code' || node.tag === 'pre') {
        out.push(node);
        continue;
      }
      out.push({
        kind: 'tag',
        tag: node.tag,
        attrs: node.attrs,
        children: await this.expandIn(node.children, opts, budget, diagnostics, stack),
      });
    }
    return out;
  }

  /** Expand every invocation in one text run. */
  private async expandText(
    text: string,
    opts: RenderOptions,
    budget: RenderBudget,
    diagnostics: string[],
    stack: readonly string[],
  ): Promise<MmlNode[]> {
    const resolve = opts.resolveSnippet;
    if (!resolve || !text.includes('{{')) return [{ kind: 'text', text }];
    const out: MmlNode[] = [];
    let cursor = 0;
    let hit = Snippets.findInvocation(text, 0);
    while (hit) {
      if (hit.start > cursor) {
        out.push({ kind: 'text', text: text.slice(cursor, hit.start) });
      }
      out.push(
        ...(await this.expandOne(hit, opts, budget, diagnostics, stack)),
      );
      cursor = hit.end;
      hit = Snippets.findInvocation(text, cursor);
    }
    if (cursor < text.length) {
      out.push({ kind: 'text', text: text.slice(cursor) });
    }
    return out;
  }

  /** Resolve, substitute, re-parse and recurse into one invocation. */
  private async expandOne(
    hit: SnippetInvocation,
    opts: RenderOptions,
    budget: RenderBudget,
    diagnostics: string[],
    stack: readonly string[],
  ): Promise<MmlNode[]> {
    const key = hit.name.trim().toLowerCase();
    if (stack.includes(key)) {
      // A cycle: `{{A}}` including `{{B}}` including `{{A}}`. A hard,
      // NAMED failure — the chain is printed, because "there is a
      // loop" without saying where is not actionable.
      const detail = `snippet cycle: ${[...stack, key].join(' → ')}`;
      diagnostics.push(detail);
      return [errorNode(detail)];
    }
    const resolve = opts.resolveSnippet!;
    let body: string | null;
    try {
      budget.chargeSnippet(hit.name);
      budget.enterDepth(hit.name);
      body = await resolve(hit.name);
    } catch (err) {
      // A budget breach at this depth is the page's problem, not the
      // request's — it renders inline like everything else.
      budget.exitDepth();
      const detail = describe(err);
      diagnostics.push(detail);
      return [errorNode(detail)];
    }
    try {
      if (body === null) {
        const detail = `no snippet '${hit.name}'`;
        diagnostics.push(detail);
        return [errorNode(detail)];
      }
      const substituted = Snippets.substitute(body, hit);
      budget.checkOutput(substituted);
      // Re-parse: a snippet body is MML, and may itself invoke
      // snippets or emit components. Expansion runs to fixpoint HERE,
      // which is what makes stage 2 complete before stage 4 begins
      // (D6) rather than interleaving with it.
      const parsed = Mml.parseTree(substituted);
      // ⚠ `await` before returning, deliberately. A bare
      // `return this.expandIn(…)` inside a `try` runs the `finally` at
      // the RETURN, not when the promise settles — so the depth
      // counter would be released before the recursion it is meant to
      // bound even began, and a chain of any length would render. The
      // depth-cap test caught exactly that.
      return await this.expandIn(parsed, opts, budget, diagnostics, [
        ...stack,
        key,
      ]);
    } catch (err) {
      const detail = describe(err);
      diagnostics.push(detail);
      return [errorNode(detail)];
    } finally {
      budget.exitDepth();
    }
  }

  /**
   * Stage 3 — `[[Page]]` and `[[Page|label]]` resolution.
   *
   * A missing page renders a **redlink**: a coloured, clickable
   * affordance that runs `wiki create <name>`. Wikis run on redlinks —
   * they are how a reader who noticed a gap becomes the author who
   * filled it, and they are the input to `wiki wanted`, which is the
   * best authoring to-do list a wiki has.
   *
   * Resolution walks **text nodes only**, so a `[[` inside an attribute
   * or a `<code>` span's already-escaped content is never rewritten.
   */
  protected async resolveLinks(
    nodes: readonly MmlNode[],
    opts: RenderOptions,
    budget: RenderBudget,
    _diagnostics: string[],
  ): Promise<readonly MmlNode[]> {
    const resolve = opts.resolveLink;
    if (!resolve) return nodes;
    const out: MmlNode[] = [];
    for (const node of nodes) {
      if (node.kind === 'text') {
        out.push(...(await this.linkifyText(node.text, resolve)));
        continue;
      }
      // `<code>` / `<pre>` are opaque by the same rule markdown uses:
      // an author writing about wiki syntax must be able to show it.
      if (node.tag === 'code' || node.tag === 'pre') {
        out.push(node);
        continue;
      }
      out.push({
        kind: 'tag',
        tag: node.tag,
        attrs: node.attrs,
        children: [
          ...(await this.resolveLinks(node.children, opts, budget, _diagnostics)),
        ],
      });
    }
    return out;
  }

  /** Split one text run on `[[…]]`, resolving each reference. */
  private async linkifyText(
    text: string,
    resolve: NonNullable<RenderOptions['resolveLink']>,
  ): Promise<MmlNode[]> {
    if (!text.includes('[[')) return [{ kind: 'text', text }];
    const out: MmlNode[] = [];
    let cursor = 0;
    // Non-greedy, and `[^\]]` so an unclosed `[[` cannot run to the end
    // of the document swallowing the article.
    const RE = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = RE.exec(text)) !== null) {
      if (m.index > cursor) {
        out.push({ kind: 'text', text: text.slice(cursor, m.index) });
      }
      const ref = m[1]!.trim();
      const label = (m[2] ?? '').trim();
      const target = await resolve(ref);
      out.push(
        target
          ? link(`mudcmd:wiki ${target.handle}`, label || target.title)
          : redlink(ref, label || ref),
      );
      cursor = m.index + m[0].length;
    }
    if (cursor < text.length) {
      out.push({ kind: 'text', text: text.slice(cursor) });
    }
    return out;
  }

  /**
   * Stage 4 — component resolution.
   *
   * An unknown tag whose name is a safe identifier is resolved as a
   * module at `/lib/wiki/components/<name>`, via the shipped
   * `StuffApi.resolveExport` — the **brain pattern**, applied to
   * markup. Adding a component is dropping in a file; there is no
   * registry to edit (criterion 15).
   *
   * ⭐ **Components annotate; they never gate** (C1). The component
   * receives props, its raw children, and a read-only budget — and
   * **no reader identity and no capability ceiling**. If components
   * gated, the reveal model would be enforced in N places written by N
   * people, and one buggy component would leak. With annotation-only
   * there is exactly one gate, in stage 5, and a component *cannot*
   * leak because it never learns what the reader may see.
   *
   * ⭐ **Recursion is impossible, not merely bounded** (criterion 49).
   * `render`/`redactSource` are gated to the controller and the
   * registry; a component lives at `/lib/wiki/components/*`, which is
   * in neither, so a component re-entering the renderer takes a
   * `SecurityError`. That is a gate, not a depth counter.
   */
  protected async resolveComponents(
    nodes: readonly MmlNode[],
    opts: RenderOptions,
    budget: RenderBudget,
    diagnostics: string[],
  ): Promise<readonly MmlNode[]> {
    const out: MmlNode[] = [];
    for (const node of nodes) {
      if (node.kind === 'text') {
        out.push(node);
        continue;
      }
      if (!Mml.componentCandidate(node.tag)) {
        // Grammar markup (or a name that could never be a module
        // basename — those stay literal, having survived the parser).
        out.push({
          kind: 'tag',
          tag: node.tag,
          attrs: node.attrs,
          children: [
            ...(await this.resolveComponents(
              node.children,
              opts,
              budget,
              diagnostics,
            )),
          ],
        });
        continue;
      }
      out.push(...(await this.resolveOne(node, opts, budget, diagnostics)));
    }
    return out;
  }

  /** Resolve and invoke one component tag. */
  private async resolveOne(
    node: Extract<MmlNode, { kind: 'tag' }>,
    opts: RenderOptions,
    budget: RenderBudget,
    diagnostics: string[],
  ): Promise<MmlNode[]> {
    const tag = node.tag.toLowerCase();
    // Deliberately NOT wrapped: a budget breach is fatal to the RENDER,
    // not to this node. Letting it propagate means the pipeline's
    // handler reports it once, rather than stamping an identical error
    // on every remaining component in the page.
    budget.chargeComponent(tag);

    const mod = await StuffApi.resolveExport(
      `/lib/wiki/components/${tag}`,
      'component',
    );
    if (!isComponent(mod)) {
      const detail = `unknown component <${tag}>`;
      diagnostics.push(detail);
      return [errorNode(detail)];
    }

    let produced: unknown;
    try {
      produced = await budget.withTimeout(
        tag,
        Promise.resolve(
          mod.render(node.attrs, node.children, {
            ...(opts.pageId !== undefined ? { pageId: opts.pageId } : {}),
            budget,
          }),
        ),
      );
    } catch (err) {
      // A component that throws yields an inline error NAMING it, and
      // the rest of the page renders (C2). One broken widget must
      // never take down an article.
      const detail = `<${tag}> failed: ${describe(err)}`;
      diagnostics.push(detail);
      return [errorNode(detail)];
    }

    if (!isNodeArray(produced)) {
      // ⚠ Nodes, never a raw string (criterion 56). A string would
      // bypass sanitisation entirely — a component returning
      // `'<script>'` would have it parsed as markup rather than
      // escaped as text. Refusing is the whole reason the contract
      // says "returns MML nodes".
      const detail = `<${tag}> returned a ${typeof produced}, not MML nodes`;
      diagnostics.push(detail);
      return [errorNode(detail)];
    }

    // A component may declare a FLOOR for its whole output — for one
    // whose very PRESENCE is a reveal (C3). MAXed with each node's own
    // level, like everything else.
    const floor = SpoilerLevels.parse(mod.spoilerFloor ?? 0);
    const nodes = [...produced];
    return floor > SpoilerLevels.OPEN
      ? [
          {
            kind: 'tag',
            tag: 'spoiler',
            attrs: { level: String(floor) },
            children: nodes,
          },
        ]
      : nodes;
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

/** A resolved internal link — clickable, runs `wiki <handle>`. */
function link(href: string, label: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'link',
    attrs: { href },
    children: [{ kind: 'text', text: label }],
  };
}

/**
 * A **redlink** — a link to a page that does not exist yet, which runs
 * `wiki create` instead of `wiki`.
 *
 * Coloured through the shipped `<color>` vocabulary rather than a new
 * tag: the colour IS the convention every wiki reader already knows,
 * and inventing a `<redlink>` tag would mean a new flatten entry, a new
 * renderer arm and a new client treatment to say the same thing.
 *
 * ⚠ **The `<color>` goes INSIDE the `<link>`, and the order is not
 * cosmetic.** The client's clickable-affordance span sets its own
 * colour, and a `<color>` *wrapping* it loses — the renderer documents
 * this as "the inner color wins". Nested the other way round the
 * redlink renders in the ordinary link colour and is indistinguishable
 * from a page that exists, which defeats the entire point: a redlink
 * only works if a reader can SEE that nobody has written it. Found by
 * driving it in a browser; the unit test now pins the nesting.
 */
function redlink(ref: string, label: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'link',
    attrs: { href: `mudcmd:wiki create ${ref}` },
    children: [
      {
        kind: 'tag',
        tag: 'color',
        attrs: { value: 'red' },
        children: [{ kind: 'text', text: label }],
      },
    ],
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

/**
 * Whether a resolved module export is usable as a component. Duck-typed
 * on `render` rather than `instanceof`, because a component is a
 * **named class-expression** re-resolved per invocation for hot-reload
 * — after a reload the constructor identity differs from any reference
 * held here, so `instanceof` would fail on exactly the modules that
 * were working a moment ago.
 */
function isComponent(mod: unknown): mod is ComponentStatics {
  return (
    typeof mod === 'function' &&
    typeof (mod as { render?: unknown }).render === 'function'
  );
}

/** Whether a component's return value is an MML node array. */
function isNodeArray(value: unknown): value is readonly MmlNode[] {
  return (
    Array.isArray(value) &&
    value.every(
      (n) =>
        typeof n === 'object' &&
        n !== null &&
        ((n as MmlNode).kind === 'text' || (n as MmlNode).kind === 'tag'),
    )
  );
}

/** Human-readable text for a pipeline failure. */
function describe(err: unknown): string {
  if (err instanceof RenderBudgetExceeded) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
