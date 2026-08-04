/**
 * The wiki render contract — the vocabulary and shapes the pipeline,
 * its components, and its callers all speak.
 *
 * A named value-object module (the `lib/behavior/brain.ts` precedent):
 * it defines one concept — *what a render is* — as its types plus the
 * two small pure functions that give the reveal model its meaning. No
 * mechanism lives here; the pipeline is `obj/WikiRenderer.ts`.
 *
 * ## The two axes, which are not the same axis
 *
 * Every fragment of an article carries an **effective spoiler level**,
 * and it is checked against two different numbers:
 *
 *   - **capability** — the reader's *ceiling*, derived from who they
 *     are. Content above it is **deleted server-side**. It never
 *     serialises, never crosses the wire, and no client bug can reveal
 *     it (criterion 24).
 *   - **appetite** — the reader's declared *preference*. Content above
 *     it but within the ceiling is **kept and tagged**
 *     `<spoiler level="n">` so the client can collapse it
 *     (criterion 25).
 *
 * Conflating them is the easy mistake and it leaks: `level > ceiling`
 * DELETES, `ceiling >= level > appetite` KEEPS AND WRAPS. Assert on the
 * emitted string, never on a level-annotated tree — a tree can carry
 * the right levels and still serialise the wrong bytes.
 *
 * ## The MAXIMUM rule
 *
 * Four things can assign a level to a fragment: the page's frontmatter
 * default, an inline tag, a component's declared floor, and a derived
 * field's `spoiler`. **The effective level is the MAXIMUM of every
 * level that applies** — never the nearest, never the innermost.
 *
 * A level-0 fact inside a level-2 section is level 2, because knowing
 * that a fact appears *under that heading* is itself the reveal. Max is
 * also the only rule that composes safely: under any nearest-wins
 * scheme, wrapping content in a lower-level container reveals it, so
 * one careless inline tag unmasks a subtree.
 */

import { MixinApi, type AnyConstructor } from '../../api/mixin';
import type { MmlNode } from '../../api/mml';
import type { RenderBudget } from './RenderBudget';

/**
 * A reveal level. 0 is open (the default for anything untagged — see
 * the fail-open decision in docs/subsystems/wiki.md); 3 is the
 * wizard-only tier.
 */
export type SpoilerLevel = 0 | 1 | 2 | 3;

/**
 * The level vocabulary and the two operations that give it meaning —
 * a class of statics, the `LandUses` shape.
 *
 * Both operations look trivial enough to inline at each call site, and
 * that is exactly why they are here: `parse` encodes the fail-open
 * decision and `max` encodes the MAXIMUM rule, and a reveal model
 * whose two governing rules are re-typed at every call site is a
 * reveal model with N chances to invert a comparison.
 */
export class SpoilerLevels {
  /** The lowest level — open. The default for anything untagged. */
  static readonly OPEN: SpoilerLevel = 0;

  /** The highest level the vocabulary defines. */
  static readonly MAX: SpoilerLevel = 3;

  /**
   * Coerce an arbitrary value to a level, **failing open**. An
   * unparseable or negative value becomes 0; an over-range value
   * clamps to 3.
   *
   * Failing open is deliberate, and is the same decision as the
   * untagged default: a reveal system that fails *closed* on malformed
   * input empties every panel until several hundred mundane fields are
   * tagged, and trains authors to tag reflexively rather than
   * thoughtfully. The cost — a typo'd `level="high"` reveals — is
   * bounded by authored levels being reviewable text, and is stated
   * plainly rather than papered over.
   *
   * Named `parse` for `LandUses.parse` / `Quantity.parse`, though
   * unlike those it never throws: this parses **community-authored
   * markup**, where a throw would take down a page for a typo.
   */
  static parse(value: unknown): SpoilerLevel {
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : Number.NaN;
    if (!Number.isFinite(n)) return SpoilerLevels.OPEN;
    if (n < 0) return SpoilerLevels.OPEN;
    if (n > SpoilerLevels.MAX) return SpoilerLevels.MAX;
    return Math.trunc(n) as SpoilerLevel;
  }

  /**
   * The MAXIMUM rule. Every level composition in the engine goes
   * through here — page default against inline tag, enclosing section
   * against enclosed fragment, component floor against field level.
   */
  static max(a: SpoilerLevel, b: SpoilerLevel): SpoilerLevel {
    return (a > b ? a : b) as SpoilerLevel;
  }

  /**
   * ⭐ **The one seam** between a class's field declarations and the
   * reveal model: the level of `field`'s VALUE on `ctor`.
   *
   * `MixinApi.getAllFieldMeta` merges **property-level** up the
   * composition chain, so a subclass declaring `{ spoiler: 2 }` for a
   * field its base declares `{ persistent: true }` for gets both —
   * which is exactly what makes `spoiler` one more property beside its
   * siblings rather than a new mechanism.
   *
   * ⚠ **This is the single place the fail-open default lives.** An
   * untagged field is level 0 (see `FieldMetaEntry.spoiler` for why),
   * and every surface that renders a field value must ask HERE rather
   * than re-deriving it — a second copy of a fail-open default is a
   * second chance to make it fail-closed by accident, or vice versa.
   *
   * A static on `SpoilerLevels` rather than its own module: the level
   * vocabulary already owns `parse` (the fail-open coercion) and `max`
   * (the MAXIMUM rule), and "what level is this field?" is the third
   * question of the same kind. A free-floating `spoilerLevelOf` would
   * also have tripped the export-discipline lint.
   */
  static ofField(ctor: unknown, field: string): SpoilerLevel {
    if (typeof ctor !== 'function') return SpoilerLevels.OPEN;
    const meta = MixinApi.getAllFieldMeta(ctor as AnyConstructor);
    return SpoilerLevels.parse(meta[field]?.spoiler ?? 0);
  }

  /**
   * The level of a field's **name** — when a reader learns it exists.
   *
   * Defaults to {@link ofField}, so name and value hide together
   * unless a declaration says otherwise. A field splits the two only
   * where the existence is schema and the measurement is content:
   * "this material has a density" is what `help` publishes, `750
   * kg/m³` is not.
   *
   * ⚠ Never returns a level ABOVE the value's. A name more secret than
   * the thing it names is incoherent, and it would render as a value
   * floating in a row with no label — so a declaration that inverts
   * them is clamped here rather than trusted.
   */
  static ofFieldName(ctor: unknown, field: string): SpoilerLevel {
    if (typeof ctor !== 'function') return SpoilerLevels.OPEN;
    const meta = MixinApi.getAllFieldMeta(ctor as AnyConstructor);
    const value = SpoilerLevels.parse(meta[field]?.spoiler ?? 0);
    const declared = meta[field]?.spoilerName;
    if (declared === undefined) return value;
    const name = SpoilerLevels.parse(declared);
    return name > value ? value : name;
  }
}

/**
 * The reader's two numbers, resolved once per render and never passed
 * to a component (C1).
 */
export interface ReaderProfile {
  /** Above this, content is DELETED. Derived from identity, never stored. */
  ceiling: SpoilerLevel;
  /** Above this (but within the ceiling), content is TAGGED. A preference. */
  appetite: SpoilerLevel;
}

/**
 * Per-render options. Note what is **not** here: the reader. The
 * renderer derives the acting principal from the execution context
 * internally, so no caller can render "as" somebody else by passing a
 * privileged Stuff — which is what makes criterion 24 assertable on
 * the wire rather than merely conventional.
 */
export interface RenderOptions {
  /**
   * The page being rendered, **for self-reference only** — a component
   * that needs to know what page it is on. The pipeline keys on a
   * BODY, never on an id (A4): that is what makes preview the same
   * code path as a saved render instead of a second one that drifts.
   */
  pageId?: string;
  /** The page's frontmatter spoiler default. MAXed with inline tags. */
  spoilerDefault?: SpoilerLevel;
  /**
   * Per-invocation appetite override (`wiki <page> --spoiler 2`).
   * Absent, the reader's `wiki.spoilerAppetite` setting is used.
   */
  appetite?: SpoilerLevel;
  /**
   * The page's namespace zone — the resource the capability ladder is
   * resolved against. Absent, the ladder can only answer the
   * identity-only rungs, which fails closed at 0 for a non-wizard.
   */
  namespaceZone?: unknown;
  /**
   * Resolve a snippet's body by its `Snippet:`-namespace name. Wave 4
   * supplies the registry-backed implementation; absent, snippet
   * invocations are left as literal text.
   */
  resolveSnippet?: (name: string) => Promise<string | null>;
  /**
   * Resolve a `[[Page]]` reference to a link target, or `null` for a
   * page that does not exist yet (which renders as a **redlink** —
   * criterion 22).
   *
   * Injected rather than imported so the renderer never depends on the
   * registry: the two singletons would otherwise import each other, and
   * the seam also lets a test drive link resolution without a database.
   */
  resolveLink?: (ref: string) => Promise<LinkTarget | null>;
}

/** Where a resolved `[[Page]]` points. */
export interface LinkTarget {
  /** The `namespace:slug` handle the `wiki` verb takes. */
  handle: string;
  /** What the link reads as when the author gave no explicit label. */
  title: string;
}

/** What a render produced, plus what it cost and what went wrong. */
export interface RenderResult {
  /** The display MML — over-ceiling deleted, over-appetite tagged. */
  body: string;
  /**
   * Non-fatal problems, each already rendered inline in `body` as an
   * error node. Surfaced separately so the caller can log or count
   * them without re-parsing.
   */
  diagnostics: string[];
  /** What the render consumed against its bounds. */
  budget: RenderBudget;
}

/**
 * What a component receives. **No reader identity and no capability
 * ceiling** — that is criterion 54, and it is the most important rule
 * in the runtime.
 *
 * If components gated, the reveal model would be enforced in N places
 * written by N people and one buggy component would leak. With
 * annotation-only there is exactly one gate, in the pipeline, and a
 * component *cannot* leak because it never learns what the reader may
 * see. The absence of a reader field here is load-bearing; adding one
 * would silently convert the whole design.
 */
export interface ComponentContext {
  /**
   * The page the component is embedded in, if the render named one.
   * Self-reference only — it is an id, not a reader.
   */
  pageId?: string;
  /**
   * The render's bounds, **read-only**. The pipeline charges the
   * budget; a component only consults it (D-5). Self-charging would
   * make the bound advisory, and a component is untrusted input's
   * executor.
   */
  budget: Readonly<RenderBudget>;
}

/**
 * The static shape of a component module's sole export — the brain
 * pattern, applied to markup.
 *
 * ```ts
 * export const component = class WikiComposition {
 *   static label = 'composition';
 *   static async render(props, children, ctx): Promise<MmlNode[]> { … }
 * };
 * ```
 *
 * A named class-expression, because the hot-reload registry retains
 * only class-like exports. Re-resolved per invocation via
 * `StuffApi.resolveExport`, so adding a component is dropping in a
 * file — no registry edit (criterion 15).
 */
export interface ComponentStatics {
  /** The tag name this module answers to. Must match its basename. */
  label: string;
  /**
   * A floor for the component's entire output — for a component whose
   * very *presence* is a reveal. MAXed with each node's own level (C3).
   */
  spoilerFloor?: SpoilerLevel;
  /**
   * Produce nodes. **Nodes, never a raw string** — a string would
   * bypass sanitisation, so the pipeline refuses one (criterion 56).
   *
   * `children` are the raw, unresolved nodes between the tags; the
   * component decides whether to use, transform or drop them.
   */
  render(
    props: Readonly<Record<string, string>>,
    children: readonly MmlNode[],
    ctx: ComponentContext,
  ): Promise<readonly MmlNode[]> | readonly MmlNode[];
}

/**
 * The pipeline's stage order, **frozen**. Later waves fill stage
 * bodies; no wave adds a stage.
 *
 * Four things each want to be outermost and the wrong order is a
 * silent correctness bug rather than a crash, so the order is data
 * here and asserted by observation in the tests (a snippet emitting a
 * component emitting a `[[link]]` — the link must NOT resolve, which
 * proves 3 ran before 4).
 *
 * `expandSnippets` before `resolveComponents` is D6: a snippet can
 * emit a component, so the text has to exist before the resolver looks
 * for tags.
 */
export const RENDER_STAGES = [
  'parse',
  'expandSnippets',
  'resolveLinks',
  'resolveComponents',
  'gate',
  'emit',
] as const;

export type RenderStage = (typeof RENDER_STAGES)[number];
