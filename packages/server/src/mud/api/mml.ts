/**
 * Mml — Mud Markup Language composer.
 *
 * Layer 2 of the messaging composer stack. Tagged-template + vocabulary
 * helpers produce final markup strings with auto-escaping of interpolated
 * raw values. The wrapper class makes trust explicit: `Mml.compose` is
 * always safe (escapes raw strings); `Mml.fromMarkup` is the explicit
 * trust assertion (no escaping). The private constructor forces every
 * untrusted-shape wrap through the named factory so audits can grep
 * `Mml.fromMarkup`.
 *
 * The vocabulary helpers (`name`, `speech`, `location`, `direction`,
 * `object`, `item`, `chan`, `msg`, `player`, `npc`, `mention`, `link`,
 * `color`, emphasis tags, `list`) emit Mml fragments that interpolate verbatim
 * inside `Mml.compose`; raw string arguments to vocabulary helpers are
 * always re-escaped — devs who want nested markup must compose with Mml
 * fragments explicitly.
 *
 * For prose externalized from source (settings, CMS-authored
 * descriptions, prompts), reach for `ProseApi.format` in `prose.ts` —
 * Liquid-syntax templates with conditionals and filter chains, same
 * Mml-aware escape rules as `Mml.compose`.
 *
 * Two text-projection paths sit on the same parse machinery:
 *  - `stripTags(body)` — drop every tag, decode entities. Used by
 *    the v1 plain-mode collapse (acceptance criterion #23 wants the
 *    failsafe linear string with no markdown emphasis).
 *  - `flatten(body)` — emit each tag's per-tag failsafe form
 *    (markdown emphasis preserved, lists/quotes serialized
 *    linear-labeled). Round-trips with `markdownToMml` for logs and
 *    archive exports.
 *
 * `markdownToMml(text, resolver)` parses the Discord-dialect subset
 * (bold / italic / code / pre / blockquote / list / strike + the
 * `[label](URI)` in-world refs + `@<name>` mentions) into MML. Called
 * by `VocalMixin.say` and `DmController` on user-supplied speech;
 * the resolver is built from the call site's scope (perceivable
 * Stuff for say/tell/emote, channel participants for chat).
 *
 * Implementation internals live in sibling files under `api/mml/`
 * (same shape as `api/mql/`): tree parse, flatten serializer,
 * markdown parser, mention resolvers, entity helpers, URI schemes.
 * Tests stay against this public surface — internals are not part
 * of the contract.
 *
 * **HARD RULE: nothing outside `api/mml.ts` may import from
 * `api/mml/`.** The subdirectory is private to this module. If a
 * consumer needs something currently only exposed there (a type,
 * a helper), re-export it from this file — don't reach into the
 * subdir. Same enforcement convention as `api/mql/`. Code review
 * gates this; grep `from '.*api/mml/'` to audit.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type Exit from '../lib/boundary/Exit';
import type { SenseChannel } from '../lib/description/Perceiver';
import { MixinApi } from './mixin';
import { escapeText, decodeEntity } from './mml/entities';
import { flatten as flattenInternal } from './mml/flatten';
import { isKnownLinkScheme } from './mml/schemes';
import {
  ChannelMentionResolver,
  PerceiverMentionResolver,
  type MentionResolver,
} from './mml/mention';
import { parseMarkdown, type MarkdownOptions } from './mml/markdown';
import { parseToTree, type MmlNode } from './mml/tree';
import { isKnownTag, isComponentCandidate, VOID_TAGS } from './mml/tags';
import { RecognitionApi } from './recognition';
import { SecurityApi } from './security';

// Re-export the MentionResolver interface so consumers can keep
// `import { MentionResolver } from '../mml'`.
export type { MentionResolver };

/**
 * The MML parse tree — element, attributes, children, nesting. Exposed
 * so the wiki's render pipeline can resolve over the tree rather than
 * over a string (a resolver that regexes markup is a bug waiting for
 * an author to write `<` in prose).
 *
 * Re-exported from the sealed `api/mml/` subdirectory per this
 * module's hard rule: nothing outside `api/mml.ts` may import from
 * `api/mml/`, so a consumer that needs the node type gets it here.
 */
export type { MmlNode };

/** Per-call options for {@link Mml.markdownToMml}. */
export type { MarkdownOptions };

/**
 * Markup augmenter — a pure text-in → text-out transformation that
 * inline-decorates prose (raw long descriptions, scene narration,
 * etc.) with MML affordances before it ships to the client.
 *
 * Each mixin that knows how to enrich a piece of authored text
 * contributes one or more augmenters via a static slot:
 *
 *     class FooMixin {
 *       static markupAugmenters: MarkupAugmenter[] = [wrapFooKeywords];
 *     }
 *
 * The substrate's `Mml.augment(text, host, viewer, opts?)` static walks
 * the host's prototype chain, collects every declared augmenter,
 * and applies them in parent-first → child-last order. Each
 * augmenter sees the text as it stands after prior augmenters have
 * already run and returns either the unchanged text or a wrapped
 * version.
 *
 * The contract is intentionally narrow:
 *  - Pure: no side effects, no event emission, no I/O.
 *  - Sync: keeps the projection path off async hops. If a future
 *    augmenter genuinely needs async (e.g. cross-host lookups), it
 *    forces a substrate change — that's the right cost signal.
 *  - Viewer-aware: augmenters that depend on the recipient (language
 *    gating, spoiler hide, perception filtering) take `viewer` as a
 *    raw `Stuff`; augmenters that don't (the v1 detail-key wrap)
 *    just ignore it. Narrowing to `Sensor` / `Perceiver` / etc. is
 *    each augmenter's responsibility via `MixinApi.isX(viewer)`.
 *
 * Today's only customer is `DetailedMixin`'s `wrapDetailKeysAugmenter`
 * (auto-wraps canonical detail aliases in `<detail>` MML so the look
 * prose and the pane projection both see the inline drill targets).
 * Future contributors (exit-direction auto-link, name auto-link,
 * language gating, spoilers) plug in via the same static slot
 * without touching the host method.
 */
export type MarkupAugmenter = (
  text: string,
  host: Stuff,
  viewer: Stuff,
  opts?: AugmentOpts,
) => string;

/**
 * Per-call options threaded through `Mml.augment` to the
 * individual augmenters. The senses build introduces `filter`: the
 * sense-channel allowlist for the `senseStripAugmenter` (the verb
 * decides; `look` passes `['vision']`, `sense` passes the viewer's
 * full sensorium, the four single-sense verbs pass their own
 * channel). Default-absent `filter` means "no per-call constraint —
 * the augmenter uses the viewer's full sensorium" (the gestalt
 * fallback).
 *
 * Optional and forward-compatible: existing augmenters that don't
 * read `opts` keep working unchanged. New per-call concerns add
 * fields here without changing call sites that don't care.
 */
export interface AugmentOpts {
  filter?: readonly SenseChannel[];
}

/**
 * Implementation of `Mml.augment` — lifted out of the class body so
 * the class-static surface stays compact and so the walker can keep
 * close to its companions (`MarkupAugmenter` type, `AugmentOpts`
 * shape). See `Mml.augment` for the public-surface docstring.
 */
function augmentMarkupImpl(
  text: string,
  host: Stuff,
  viewer: Stuff,
  opts?: AugmentOpts,
): string {
  if (!text) return text;
  const ctor = (host as { constructor: unknown }).constructor;
  const augmenters = MixinApi.getAllMarkupAugmenters(
    ctor as Parameters<typeof MixinApi.getAllMarkupAugmenters>[0],
  ) as MarkupAugmenter[];
  let result = text;
  for (const aug of augmenters) {
    result = aug(result, host, viewer, opts);
  }
  return result;
}

/**
 * Render an interpolated value into its escaped, MML-safe string form.
 * Mml fragments emit verbatim; objects with `toMml(viewer?)` get
 * unwrapped (viewer threaded through for per-recipient late binding —
 * Quantity, future pedagogical-seam-aware values); everything else is
 * coerced and escaped.
 */
function renderValue(value: unknown, viewer?: Stuff & Sensor): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Mml) return value.toString(viewer);
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toMml?: unknown }).toMml === 'function'
  ) {
    const fragment = (value as { toMml: (v?: unknown) => unknown }).toMml(viewer);
    if (fragment instanceof Mml) return fragment.toString(viewer);
    return escapeText(String(fragment));
  }
  return escapeText(String(value));
}

/**
 * Internal payload — `Mml` carries one of these. `'eager'` is the
 * existing pre-rendered-string path (used by `fromMarkup` and the
 * vocabulary helpers, both of which already produced markup at
 * construction time). `'lazy'` is the `compose`-time deferred form:
 * holds the template parts and value list, materializes per-call in
 * `toString(viewer?)` so per-value `toMml(viewer)` runs at
 * serialization rather than composition.
 */
type MmlPayload =
  | { kind: 'eager'; raw: string }
  | { kind: 'lazy'; strings: readonly string[]; values: readonly unknown[] }
  | { kind: 'ref'; tag: string; stuff: Stuff };

/**
 * The placeholder tag `Mml.actor` carries until render time, when
 * `RecognitionApi.kindOf` replaces it with `player` or `npc`.
 *
 * ⚠ Deliberately **not** in `KNOWN_TAGS`, and that is the invariant
 * worth protecting: it never reaches a parser, a policy, a stylesheet
 * or a client, so nothing downstream grows a branch for it. A test
 * asserts its absence from the wire vocabulary.
 */
const ACTOR_TAG = 'actor';

/**
 * `Mml.list(items)` switches from inline (comma + "and") to block
 * (one item per line) when the item count crosses this threshold.
 * Picked at 4 so two/three/four items stay on one wrap-line and
 * five+ items split out — matching the vertical-space discipline
 * documented in `docs/subsystems/inspection-pane.md`.
 */
const INLINE_LIST_THRESHOLD = 4;

export class Mml {
  /**
   * Private constructor. Use `Mml.compose` for value-driven composition
   * (escapes raw strings) or `Mml.fromMarkup` for trusted MML input.
   */
  private constructor(private readonly payload: MmlPayload) {}

  /**
   * Compose from values via tagged template. Raw strings are escaped;
   * Mml fragments emit verbatim; objects with `toMml(viewer?)` get
   * unwrapped at `toString(viewer?)` time — composition is lazy so a
   * per-recipient render path threads the viewer through to value-side
   * `toMml`.
   */
  static compose(strings: TemplateStringsArray, ...values: unknown[]): Mml {
    return new Mml({
      kind: 'lazy',
      strings: Array.from(strings),
      values,
    });
  }

  /**
   * Wrap a string already known to be valid MML — does NOT escape. Use
   * for hydration, deserialization, or known-trusted programmatic
   * assembly. Misuse = injection. Grep `Mml.fromMarkup` to audit.
   */
  static fromMarkup(raw: string): Mml {
    return new Mml({ kind: 'eager', raw });
  }

  /**
   * Build a viewer-aware identity-reference fragment. The display text
   * is bound **late** — at `toString(viewer)` time — so a single
   * composed line renders the *right name per recipient*: a scene
   * broadcast to a room names the same target "Bob" to a friend, "a
   * hooded figure" to someone he's hiding from, "a tall stranger" to
   * someone who's never met him. With no viewer (logs, `refOf`, a
   * viewer-less `toString()`) it falls back to the viewer-blind
   * `getPresentation()` baseline.
   *
   * This is the single seam that makes the whole prose name path
   * viewer-aware: every `Mml.actor/thing/player/npc/location` caller
   * (and there are many) keeps composing exactly as before — the
   * per-recipient resolution rides `Scene.send`'s existing
   * `body.toString(recipient)` materialization. See
   * `RecognitionApi.describe`.
   *
   * The **tag** is resolved at the same seam for {@link ACTOR_TAG},
   * which is why that one is not a wire tag at all.
   */
  private static ref(tag: string, stuff: Stuff): Mml {
    return new Mml({ kind: 'ref', tag, stuff });
  }

  /**
   * Render a reference to **a person acting**, without claiming which
   * kind of person. Resolves to `<player>` or `<npc>` at render time
   * through `RecognitionApi.kindOf(viewer, stuff)`.
   *
   * ⭐ **This is the face nearly every emitter wants.** A controller
   * holds a `giver`; whether a human is on the other end of it is a
   * runtime fact, and one that changes per viewer once a disguise is
   * involved. Asking the author to answer it would get a wrong answer
   * written into ~120 call sites.
   *
   * Use `player` / `npc` / `thing` directly **only where the emitter
   * genuinely knows better than the world does** — the puppeteer behind
   * a possessed corpse, an illusion that should read as a person. Those
   * are the cases the framework must not guess at, and they stay
   * explicit.
   *
   * The `stuff-id` attribute carries the runtime identity through to
   * the wire — server-side disambiguation walks bodies for these tokens
   * to pick the minimal-distinguishing form per recipient, and
   * client-side features (right-click → tell, social-graph rendering,
   * identity overlays) read the id directly.
   */
  static actor(stuff: Stuff): Mml {
    return Mml.ref(ACTOR_TAG, stuff);
  }

  /**
   * Wrap text in `<speech>"..."</speech>`, escaping the inner text.
   *
   * Accepts a raw string (the common case — a literal said by the
   * speaker) OR an already-parsed Mml fragment (the markdown-pipeline
   * case where `markdownToMml` has already turned `**bold**`/etc. into
   * MML). The body inside the quotes is emitted verbatim for Mml
   * arguments and escaped for raw strings — same trust split as
   * `Mml.compose`.
   */
  static speech(text: string | Mml): Mml {
    const inner = text instanceof Mml ? text.toString() : escapeText(text);
    return Mml.fromMarkup(`<speech>"${inner}"</speech>`);
  }

  /**
   * Render a location's display name inside `<location stuff-id="...">`
   * tags. Same identity-tagging rationale as `name`.
   */
  static location(stuff: Stuff): Mml {
    return Mml.ref('location', stuff);
  }

  /** Render a direction (e.g., 'north') inside `<direction>` tags. */
  static direction(d: string): Mml {
    return Mml.fromMarkup(`<direction>${escapeText(d)}</direction>`);
  }

  /**
   * Render an actionable exit reference inside
   * `<exit dir="..." stuff-id="...">` tags. The client renderer
   * (`packages/client/src/components/MmlRenderer.tsx`) turns these
   * into clickable affordances that emit `go <dir>` on click.
   *
   * Distinct from `Mml.direction(d)` — that tag is a vocabulary
   * word (e.g., "the wind blows from the <direction>north</direction>"),
   * not an affordance. Use `Mml.exit` when the displayed direction
   * names an actual exit the actor can traverse.
   */
  static exit(exit: Exit): Mml {
    const dir = exit.getDirection();
    return Mml.fromMarkup(
      `<exit dir="${escapeText(dir)}" stuff-id="${escapeText(exit.stuffId)}">${escapeText(dir)}</exit>`
    );
  }

  /**
   * Render a thing's display name inside `<thing stuff-id="...">` tags.
   * Same identity-tagging rationale as {@link Mml.actor}.
   *
   * ⭐ One tag, where there were two. `item` and `object` split on
   * portability, which is **state** — a chair is furniture until
   * somebody picks it up — so the split was never stable and no
   * consumer ever acted on it.
   */
  static thing(stuff: Stuff): Mml {
    return Mml.ref('thing', stuff);
  }

  /**
   * Render a channel chip inside `<chan id="...">[Label]</chan>`. The
   * `id` is the channel key (e.g. `"gossip"`); the label is what
   * flattens out of the body when the rich render is unavailable
   * (e.g. `"[Gossip]"`). The client paints the chip with the channel's
   * stylesheet treatment; flatten emits the label verbatim.
   */
  static chan(id: string, label: string): Mml {
    return Mml.fromMarkup(
      `<chan id="${escapeText(id)}">${escapeText(label)}</chan>`
    );
  }

  /**
   * Wrap a message body region in `<msg>...</msg>`. The user-content
   * region of a chat / say / tell / emote line; carries whatever
   * inline markdown emphasis `markdownToMml` produced. Accepts either
   * an already-MML body (the common case after `markdownToMml`) or
   * a raw string (escaped). The chat template (client-side) reflows
   * this region into its content column with hanging indent.
   */
  static msg(body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<msg>${inner}</msg>`);
  }

  /**
   * Render a player's display name inside `<player stuff-id="...">`
   * tags. Same identity-tagging contract as {@link Mml.actor} — but
   * **asserted by the emitter**, so reach for it only where the caller
   * knows something the world does not; `Mml.actor` is the default.
   * The renderer
   * applies friend/foe coloring on player-tagged references through
   * the stylesheet's `attribute → bucket` selector.
   */
  static player(stuff: Stuff): Mml {
    return Mml.ref('player', stuff);
  }

  /**
   * Render an NPC's display name inside `<npc stuff-id="...">` tags.
   * Sibling to `player` — same shape, but the stylesheet can give
   * them distinct treatments (NPCs aren't friend/foe candidates the
   * same way other players are).
   */
  static npc(stuff: Stuff): Mml {
    return Mml.ref('npc', stuff);
  }

  /**
   * Render an explicit `@mention` of a player. The `stuff-id` enables
   * the renderer's viewer-relative highlight: if the mentioned
   * stuff-id matches the viewer's own stuff-id, the mention lights
   * up with the `mention.match` treatment; otherwise it gets the
   * quieter `mention.other` treatment. Flatten emits the label
   * verbatim (which is `"@Name"`).
   *
   * Produced by `markdownToMml`'s `@<word>` handling when the
   * resolver finds a target; mentions whose word doesn't resolve stay
   * as plain `@word` text (the parser emits no tag).
   */
  static mention(stuffId: string, label: string): Mml {
    return Mml.fromMarkup(
      `<mention stuff-id="${escapeText(stuffId)}">${escapeText(label)}</mention>`
    );
  }

  /**
   * Render an in-world ref clickable link. `href` MUST start with one
   * of the project-defined custom URI schemes (`mudcmd:` for command
   * links, `mudref:` for stuff-id references, `mudq:` for MQL query
   * references); anything else throws. This is the server-internal
   * compose surface — user-input link parsing (which is where unknown
   * schemes get stripped) happens in `markdownToMml`, not here.
   *
   * v1 wiring: command and stuff-ref schemes are clickable; `mudq:` is
   * namespace-reserved but inert (the client paints it but runs no
   * handler) — click semantics are deferred to a follow-up build.
   */
  static link(href: string, label: string | Mml): Mml {
    if (!isKnownLinkScheme(href)) {
      throw new Error(
        `Mml.link: unsupported scheme in href "${href}". ` +
          `Allowed: mudcmd:, mudref:, mudq:.`,
      );
    }
    const inner = label instanceof Mml ? label.toString() : escapeText(label);
    return Mml.fromMarkup(`<link href="${escapeText(href)}">${inner}</link>`);
  }

  /**
   * The escaped-text fragment: a raw string lifted into an `Mml` with
   * its special characters escaped exactly once, at construction. This
   * is the seam that lets *any* display value join the compose chain as
   * a fragment — once it's an `Mml`, it slots into bigger fragments
   * verbatim and is never re-escaped. The plain default for an object's
   * `getPresentationMml`.
   */
  static text(value: string): Mml {
    return Mml.fromMarkup(escapeText(value));
  }

  /**
   * Wrap body in `<color value="...">...</color>` — a literal color on
   * composed prose. The grammar is otherwise semantic (`<item>`,
   * `<speech>` describe *meaning*), but a thing's color is a real
   * property of what's perceived (visible light has color), so we name
   * it explicitly. The value is a theme-palette token / friendly color
   * name (`purple`, `blue`, `red`, `grey`, …) resolved client-side
   * through the palette, so it stays legible under any theme — never a
   * raw hex. Raw strings in the body are escaped; pass an `Mml`
   * fragment to nest markup (e.g. a clickable `<item>` whose label is
   * tinted).
   */
  static color(value: string, body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(
      `<color value="${escapeText(value)}">${inner}</color>`,
    );
  }

  /** Wrap body in `<strong>...</strong>` (markdown `**bold**`). */
  static strong(body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<strong>${inner}</strong>`);
  }

  /** Wrap body in `<em>...</em>` (markdown `*italic*` / `_italic_`). */
  static em(body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<em>${inner}</em>`);
  }

  /** Wrap body in `<code>...</code>` (markdown `` `code` ``). */
  static code(body: string): Mml {
    return Mml.fromMarkup(`<code>${escapeText(body)}</code>`);
  }

  /** Wrap body in `<pre>...</pre>` (markdown ` ```block``` `). */
  static pre(body: string): Mml {
    return Mml.fromMarkup(`<pre>${escapeText(body)}</pre>`);
  }

  /** Wrap body in `<blockquote>...</blockquote>` (markdown `> quote`). */
  static blockquote(body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<blockquote>${inner}</blockquote>`);
  }

  /** Wrap body in `<strike>...</strike>` (markdown `~~strike~~`). */
  static strike(body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<strike>${inner}</strike>`);
  }

  /**
   * Wrap a single list item in `<li>...</li>` (the markdown list-line
   * payload). Distinct from `<item>`, which is the identity tag for
   * game items — overloading `<item>` would break the renderer's
   * per-tag treatment lookup.
   */
  static li(body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<li>${inner}</li>`);
  }

  /**
   * Wrap a sequence of `<li>` items in an unordered `<list>` envelope
   * (markdown `- item` lines). The renderer's v1 default template
   * emits them inline through the flatten serializer — the rich
   * layout (proper bullets / indent) is Wave 2's layout-library
   * concern.
   */
  static unorderedList(items: Mml[]): Mml {
    const inner = items.map((i) => i.toString()).join('');
    return Mml.fromMarkup(`<list>${inner}</list>`);
  }

  /**
   * Wrap a sequence of `<li>` items in an ordered `<list ordered="true">`
   * envelope (markdown `1. item` / `2. item` lines). Flatten emits
   * `1. `, `2. `, … prefixes.
   */
  static orderedList(items: Mml[]): Mml {
    const inner = items.map((i) => i.toString()).join('');
    return Mml.fromMarkup(`<list ordered="true">${inner}</list>`);
  }

  /**
   * Wrap body in `<h1>` / `<h2>` / `<h3>` — the long-form article
   * headings (markdown `#` / `##` / `###`).
   *
   * `anchor` is the **sticky citation target**: minted once and then
   * held, so a later rewording of the heading text does not break
   * `pageId#anchor` citations. It is carried in the stored source (and
   * round-trips through `flatten` as the `{#anchor}` suffix) rather
   * than derived at render, which is the whole point — a derived
   * anchor changes when the words do. See docs/subsystems/wiki.md.
   */
  static heading(level: 1 | 2 | 3, body: string | Mml, anchor?: string): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    const attr = anchor ? ` anchor="${escapeText(anchor)}"` : '';
    return Mml.fromMarkup(`<h${level}${attr}>${inner}</h${level}>`);
  }

  /**
   * Assemble a `<table>` from rows of already-composed cells. `header`
   * emits the first row as `<th>` cells; without it every cell is
   * `<td>`. No spans and no alignment in v1 — a table that needs
   * either is a sign the content wants a different shape.
   */
  static table(rows: Array<Array<string | Mml>>, header = false): Mml {
    const body = rows
      .map((cells, rowIdx) => {
        const tag = header && rowIdx === 0 ? 'th' : 'td';
        const inner = cells
          .map((c) => {
            const text = c instanceof Mml ? c.toString() : escapeText(c);
            return `<${tag}>${text}</${tag}>`;
          })
          .join('');
        return `<tr>${inner}</tr>`;
      })
      .join('');
    return Mml.fromMarkup(`<table>${body}</table>`);
  }

  /**
   * Wrap body in `<spoiler level="n">` — the **appetite** half of the
   * reveal model. A spoiler tag means "this is above the reader's
   * declared appetite, so let them choose to see it"; the client
   * collapses it behind a click.
   *
   * ⚠ It is **not** the capability half. Content above a reader's
   * capability ceiling is *deleted server-side* and never reaches a
   * tag — if you are emitting this, you have already decided the
   * reader is allowed to see what is inside. See
   * docs/subsystems/wiki.md § the two axes.
   */
  static spoiler(level: 0 | 1 | 2 | 3, body: string | Mml): Mml {
    const inner = body instanceof Mml ? body.toString() : escapeText(body);
    return Mml.fromMarkup(`<spoiler level="${level}">${inner}</spoiler>`);
  }

  /**
   * Whether `tag` belongs to the MML grammar. The wiki's component
   * resolver uses this to tell markup (renders) from a component
   * candidate (resolves as a module) — see {@link componentCandidate}.
   */
  static isKnownTag(tag: string): boolean {
    return isKnownTag(tag);
  }

  /**
   * Whether `tag` is an unknown-but-well-formed name a component
   * resolver may attempt to load. False for grammar tags, and false
   * for anything outside `[a-z][a-z0-9-]*` — which is what keeps a
   * component name from being a path-traversal primitive, since the
   * name becomes a module basename.
   */
  static componentCandidate(tag: string): boolean {
    return isComponentCandidate(tag);
  }

  /**
   * Parse an MML body into its node tree. The wiki render pipeline's
   * entry point: every resolver stage operates on nodes, never on
   * markup text.
   *
   * Returns `readonly` nodes by contract — the pipeline builds new
   * nodes rather than mutating, so a cached or shared tree can never
   * be edited out from under another reader. {@link serialize} is the
   * inverse.
   */
  static parseTree(body: string): readonly MmlNode[] {
    return parseToTree(body);
  }

  /**
   * Serialize a node tree back to MML markup — the inverse of
   * {@link parseTree}, and what makes "parse, delete some nodes,
   * re-emit" a safe way to filter a body (the redaction path).
   *
   * The round-trip is **semantic, not byte-exact**: `parseTree` decodes
   * entities and drops the open/close-vs-self-closing distinction, so
   * the guaranteed properties are that
   * `parseTree(serialize(parseTree(x)))` equals `parseTree(x)`, and
   * that `serialize` is idempotent on its own output. Callers that
   * must not rewrite an untouched body should return the original
   * string when they removed nothing — which is exactly what
   * `WikiRenderer.redactSource` does.
   */
  static serialize(nodes: readonly MmlNode[]): string {
    return serializeTree(nodes);
  }

  /**
   * Join a list of Mml fragments. Default behavior is "auto" — inline
   * (English-style commas + "and") for short lists, multi-line
   * (one indented item per line, no trailing punctuation) once the
   * count crosses `INLINE_LIST_THRESHOLD`. Empty list emits `nothing`.
   * Single item emits as-is.
   *
   * Vertical-space discipline (see `inspection-pane.md`): a short
   * list reads better inline (one wrap-line), but past ~5 items the
   * comma-string degrades into a wall of text. The multi-line shape
   * trades one extra newline per item for far better scannability
   * and stops drowning the surrounding prose.
   *
   * Callers that want a specific shape can pass `{ style: 'inline' }`
   * or `{ style: 'block' }` to override. The new MML `<list>`
   * envelope is deferred until the renderer's planned state-machine
   * upgrade can handle nested tags; until then, `style: 'block'`
   * just inserts newlines between the existing flat per-item tags
   * — the renderer already handles plain text + flat tags side by
   * side.
   */
  static list(
    items: Mml[],
    options?: { style?: 'auto' | 'inline' | 'block' }
  ): Mml {
    if (items.length === 0) return Mml.fromMarkup('nothing');
    if (items.length === 1) return Mml.fromMarkup(items[0]!.toString());

    const style = options?.style ?? 'auto';
    const useBlock =
      style === 'block' ||
      (style === 'auto' && items.length > INLINE_LIST_THRESHOLD);

    if (useBlock) {
      const lines = items.map((i) => `  ${i.toString()}`).join('\n');
      return Mml.fromMarkup(`\n${lines}`);
    }

    if (items.length === 2) {
      return Mml.fromMarkup(`${items[0]!.toString()} and ${items[1]!.toString()}`);
    }
    const head = items.slice(0, -1).map((i) => i.toString()).join(', ');
    return Mml.fromMarkup(`${head}, and ${items[items.length - 1]!.toString()}`);
  }

  /**
   * Escape the five reserved characters (`<`, `>`, `&`, `"`, `'`) so
   * a raw string can be embedded inside MML markup without being
   * parsed as tag/attribute structure. Same rule `Mml.compose`
   * applies to interpolated raw values; exposed publicly so other
   * markup-producers can reuse it.
   */
  static escape(text: string): string {
    return escapeText(text);
  }

  /**
   * Flatten an MML body to a markdown-emphasis-preserving string.
   * Each tag is replaced by its defined failsafe form; the result
   * round-trips through `markdownToMml`. Used for log capture,
   * archive exports, and the markdown round-trip tests — distinct
   * from `stripTags`, which drops emphasis entirely for the
   * plain-mode collapse. Implementation in `api/mml/flatten.ts`.
   */
  static flatten(body: string): string {
    return flattenInternal(body);
  }

  /**
   * Walk the host's prototype chain via
   * `MixinApi.getAllMarkupAugmenters`, fold every contributed
   * augmenter through the text in parent-first → child-last order,
   * return the result. Empty input short-circuits to the empty
   * string (no point running augmenters over nothing).
   *
   * Used by `VisibleMixin.getMarkupLong(viewer, opts?)`; future
   * host-level markup methods (`getMarkupShort`, scene-prose
   * composition, etc.) use the same surface.
   *
   * `opts` is threaded verbatim to every augmenter. Default-absent
   * means each augmenter sees `undefined` and falls back to its own
   * default behavior — the `senseStripAugmenter` falls back to the
   * viewer's full sensorium.
   */
  static augment(
    text: string,
    host: Stuff,
    viewer: Stuff,
    opts?: AugmentOpts,
  ): string {
    return augmentMarkupImpl(text, host, viewer, opts);
  }

  /**
   * Parse a Discord-dialect markdown subset into MML. Handles:
   *
   *   - `**bold**`              → `<strong>`
   *   - `*italic*` / `_italic_` → `<em>`
   *   - `` `code` ``            → `<code>`
   *   - ` ```block``` `         → `<pre>` (verbatim; markdown inside is not parsed)
   *   - `> quote`               → `<blockquote>` (one per consecutive line run)
   *   - `- item` / `1. item`    → `<list>` of `<li>` (one level only)
   *   - `~~strike~~`            → `<strike>`
   *   - `[label](URI)`          → `<link href="URI">label</link>` for
   *                                whitelisted URI schemes; bare label
   *                                survives if scheme is unknown
   *   - `@<word>`               → `<mention stuff-id="X">@Word</mention>`
   *                                if the resolver finds a target; bare
   *                                `@word` text survives on miss
   *
   * Out of scope for v1: nested lists, GFM tables, headers, inline
   * HTML, multi-paragraph code-block context. Code spans and code
   * blocks are opaque — markdown emphasis inside them is preserved
   * verbatim.
   *
   * Pure on the resolver — if no resolver is passed, `@<word>` always
   * leaves the literal text. Implementation in `api/mml/markdown.ts`.
   *
   * `opts.longForm` selects the **article dialect**, which adds
   * `#`–`###` headings (with sticky `{#anchor}` suffixes),
   * indent-nested lists and pipe tables. Omitted, the chat dialect is
   * parsed and the output is byte-identical to what it has always
   * been — the hot path is unchanged by construction.
   */
  static markdownToMml(
    text: string,
    resolver?: MentionResolver,
    opts?: MarkdownOptions,
  ): Mml {
    return Mml.fromMarkup(parseMarkdown(text, resolver, opts));
  }

  /**
   * Factory: a `MentionResolver` over the speaker's perceivable
   * neighbors. Matches against display names (case-insensitive)
   * and returns the first hit. Ties fall through silently (per the
   * "silent on miss" contract). Used by `VocalMixin.say`,
   * `AetherMixin.tell`, and the (future) emote handler when they call
   * `Mml.markdownToMml(text, resolver)` on user-supplied prose.
   */
  static perceiverMentionResolver(speaker: Stuff): MentionResolver {
    return new PerceiverMentionResolver(speaker);
  }

  /**
   * Factory: a `MentionResolver` over an explicit participant set
   * (e.g., a chat channel's tuned-in roster). The (future) chat
   * substrate constructs the iterable at emit time; this build's
   * tests use the factory directly with a fixture set. Same
   * silent-on-miss contract as `perceiverMentionResolver`.
   */
  static channelMentionResolver(
    participants: Iterable<Stuff>,
  ): MentionResolver {
    return new ChannelMentionResolver(participants);
  }

  /**
   * Sense-aware tag strip — parse the body, walk the tree, drop
   * `<sense>` regions and `<detail sense=>` wrappings whose channel
   * isn't in the allowed set, re-serialize.
   *
   * The two strip rules differ:
   *   - `<sense channel="X">…</sense>` — channel ∉ allowed → drop
   *     the tag AND its children entirely (the region is the
   *     authored sense-attributed content; it vanishes for viewers
   *     who don't perceive on X).
   *   - `<detail key="K" sense="X">…</detail>` — sense ∉ allowed
   *     → drop the `<detail>` wrapping but KEEP the inner children
   *     flattened inline (the keyword is still readable prose;
   *     only the click-affordance disappears). `<detail>` with no
   *     `sense=` attribute defaults to `'vision'`.
   *   - All other tags — preserved with children re-serialized.
   *
   * Used by `senseStripAugmenter` in `lib/description/Visible.ts`;
   * lives here so the hard "nothing outside `api/mml.ts` imports
   * `api/mml/`" rule is satisfied — internal `parseToTree` access
   * stays scoped to this module.
   */
  static stripBySense(
    body: string,
    allowed: ReadonlySet<SenseChannel>,
  ): string {
    if (!body) return body;
    const tree = parseToTree(body);
    return serializeTree(stripSenseNodes(tree, allowed));
  }

  /**
   * Strip MML tags from a markup body, decoding the five built-in
   * entities. Used by clients/log capture that need a plain-text
   * projection. State-machine parser; tolerates unclosed tags by
   * dropping their characters.
   *
   * Distinct from `flatten` — strip removes emphasis markdown
   * entirely (used by v1 plain-mode collapse), flatten preserves it
   * (used by markdown round-trip / log capture).
   */
  static stripTags(body: string): string {
    let out = '';
    let i = 0;
    const len = body.length;

    while (i < len) {
      const ch = body[i]!;

      if (ch === '<') {
        // Skip until matching '>' (or end of string).
        i++;
        while (i < len && body[i] !== '>') i++;
        if (i < len) i++; // consume '>'
        continue;
      }

      if (ch === '&') {
        // Try to decode an entity. Only the five we emit are recognised.
        const semi = body.indexOf(';', i + 1);
        if (semi !== -1 && semi - i <= 6) {
          const entity = body.slice(i + 1, semi);
          const decoded = decodeEntity(entity);
          if (decoded !== null) {
            out += decoded;
            i = semi + 1;
            continue;
          }
        }
        out += '&';
        i++;
        continue;
      }

      out += ch;
      i++;
    }

    return out;
  }

  /**
   * Materialize this Mml fragment to a wire string. Eager fragments
   * return their pre-rendered markup; lazy fragments (built via
   * `Mml.compose`) walk the template parts and resolve each value
   * through `renderValue(value, viewer)` so per-recipient `toMml`
   * implementations see the recipient.
   *
   * Viewer is forward-compatible with the deferred pedagogical-seam
   * setting and with any future per-viewer prose differentiation. v1
   * propagates the parameter without consulting it inside the
   * shipped `toMml` implementations.
   */
  toString(viewer?: Stuff & Sensor): string {
    if (this.payload.kind === 'eager') return this.payload.raw;
    if (this.payload.kind === 'ref') {
      const { tag: wire, stuff } = this.payload;
      // Recognition (the viewer-aware naming step) stays here, in the
      // render layer: resolve the recipient's perceived label, or the
      // viewer-blind baseline when no recipient is in play (logs,
      // snapshots).
      // `actor` is an authoring face, never a wire tag: the emitter
      // said "a person acting" and the world answers which kind, per
      // viewer. Resolved here, beside the naming step, because both
      // questions are the same question — what does THIS recipient
      // perceive.
      const tag = wire === ACTOR_TAG
        ? RecognitionApi.kindOf(viewer, stuff)
        : wire;
      const label = viewer
        ? RecognitionApi.describe(viewer, stuff)
        : stuff.getPresentation();
      // The object turns its label into a composable `Mml` *fragment*
      // (`getPresentationMml`, Stuff): `null` = the plain default, which
      // we build here as an escaped-once text fragment; a non-null
      // override is a richer fragment (a terminal wraps its name in
      // `<color>` to tint by state). Either way it composes verbatim and
      // is never re-escaped — no plain-vs-markup decision at this seam.
      const inner = (stuff.getPresentationMml(label) ?? Mml.text(label))
        .toString();
      return `<${tag} stuff-id="${escapeText(stuff.stuffId)}">${inner}</${tag}>`;
    }
    let out = '';
    const { strings, values } = this.payload;
    for (let i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i < values.length) {
        out += renderValue(values[i], viewer);
      }
    }
    return out;
  }

  /**
   * `JSON.stringify` hook. Materializes with no viewer (the same
   * viewer-less default a no-arg `toString()` produces). Persistence
   * paths reach `toJSON()` only on already-eager strings; treat as
   * the viewer-agnostic snapshot.
   */
  toJSON(): string {
    return this.toString();
  }
}

/**
 * Walk a parsed MML tree applying the sense-strip rules. Used by
 * `Mml.stripBySense`. Returns a new flat node array — `<detail>`
 * wrappings that get stripped replace themselves with their
 * (recursively-stripped) child nodes inline, so the caller's
 * serializer sees the children at the original position.
 */
function stripSenseNodes(
  nodes: readonly MmlNode[],
  allowed: ReadonlySet<SenseChannel>,
): MmlNode[] {
  const out: MmlNode[] = [];
  for (const node of nodes) {
    if (node.kind === 'text') {
      out.push(node);
      continue;
    }
    if (node.tag === 'sense') {
      const channel = node.attrs.channel as SenseChannel | undefined;
      if (channel && allowed.has(channel)) {
        // Keep the tag; recurse into children. The wrap stays so
        // downstream tooling can still see the channel attribution.
        out.push({
          kind: 'tag',
          tag: node.tag,
          attrs: node.attrs,
          children: stripSenseNodes(node.children, allowed),
        });
      }
      // else: drop tag AND children entirely.
      continue;
    }
    if (node.tag === 'detail') {
      const senseAttr = (node.attrs.sense ?? 'vision') as SenseChannel;
      if (allowed.has(senseAttr)) {
        out.push({
          kind: 'tag',
          tag: node.tag,
          attrs: node.attrs,
          children: stripSenseNodes(node.children, allowed),
        });
      } else {
        // Drop the wrap, keep children inline (stripped recursively).
        out.push(...stripSenseNodes(node.children, allowed));
      }
      continue;
    }
    // Any other tag — preserve, recurse children.
    out.push({
      kind: 'tag',
      tag: node.tag,
      attrs: node.attrs,
      children: stripSenseNodes(node.children, allowed),
    });
  }
  return out;
}

/**
 * Re-serialize a parsed MML tree to a markup string. Used by
 * `Mml.stripBySense` and by `Mml.serialize` (the wiki redaction
 * path). Text nodes round-trip raw — the parser decoded entities on
 * the way in, so the way out re-escapes them to preserve the
 * round-trip contract; `<`/`>`/`&`/`"` inside text content stays
 * escaped on the wire.
 *
 * Void tags (`<image key="k"/>`) emit self-closing rather than as an
 * empty pair, so the common childless-component shape survives a
 * parse/serialize cycle looking like what the author typed. Attribute
 * order follows insertion order, which is parse order — so a
 * re-serialized body keeps the attribute order of the original.
 */
function serializeTree(nodes: readonly MmlNode[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.kind === 'text') {
      out += escapeText(node.text);
      continue;
    }
    const attrPart = Object.entries(node.attrs)
      .map(([k, v]) => ` ${k}="${escapeText(v)}"`)
      .join('');
    if (node.children.length === 0 && VOID_TAGS.has(node.tag)) {
      out += `<${node.tag}${attrPart}/>`;
      continue;
    }
    out += `<${node.tag}${attrPart}>`;
    out += serializeTree(node.children);
    out += `</${node.tag}>`;
  }
  return out;
}

SecurityApi.decorateApiClass(Mml);
