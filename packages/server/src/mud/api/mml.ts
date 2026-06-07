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
 * emphasis tags, `list`) emit Mml fragments that interpolate verbatim
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
 * by `VocalMixin.say` and `TellController` on user-supplied speech;
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
import type { Exit } from '../lib/boundary/Exit';
import { DescribeApi } from './describe';
import { SecurityApi } from './security';
import { MixinApi } from './mixin';
import { escapeText, decodeEntity } from './mml/entities';
import { flatten as flattenInternal } from './mml/flatten';
import { isKnownLinkScheme } from './mml/schemes';
import {
  ChannelMentionResolver,
  PerceiverMentionResolver,
  type MentionResolver,
} from './mml/mention';
import { parseMarkdown } from './mml/markdown';

// Re-export the MentionResolver interface so consumers can keep
// `import { MentionResolver } from '../mml'`.
export type { MentionResolver };

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
 * The substrate's `augmentMarkup(text, host, viewer)` helper walks
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
) => string;

/**
 * Walk the host's prototype chain via `MixinApi.getAllMarkupAugmenters`,
 * fold every contributed augmenter through the text in
 * parent-first → child-last order, return the result.
 *
 * Empty input short-circuits to the empty string (no point running
 * augmenters over nothing).
 *
 * Used by `VisibleMixin.getMarkupLong(viewer)`; future host-level
 * markup methods (`getMarkupShort`, scene-prose composition, etc.)
 * use the same helper.
 */
export function augmentMarkup(
  text: string,
  host: Stuff,
  viewer: Stuff,
): string {
  if (!text) return text;
  const ctor = (host as { constructor: unknown }).constructor;
  const augmenters = MixinApi.getAllMarkupAugmenters(
    ctor as Parameters<typeof MixinApi.getAllMarkupAugmenters>[0],
  ) as MarkupAugmenter[];
  let result = text;
  for (const aug of augmenters) {
    result = aug(result, host, viewer);
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
  | { kind: 'lazy'; strings: readonly string[]; values: readonly unknown[] };

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
   * Render an entity reference inside `<name stuff-id="...">` tags.
   * The `stuff-id` attribute carries the runtime identity through to
   * the wire — server-side disambiguation walks bodies for these
   * tokens to pick the minimal-distinguishing form per recipient,
   * and client-side features (right-click → tell, social-graph
   * rendering, identity overlays) read the id directly.
   */
  static name(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff);
    return Mml.fromMarkup(
      `<name stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</name>`
    );
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
    const display = DescribeApi.getDisplayName(stuff);
    return Mml.fromMarkup(
      `<location stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</location>`
    );
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
   * Render a generic object's display name inside
   * `<object stuff-id="...">` tags. Same identity-tagging rationale
   * as `name`.
   */
  static object(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff);
    return Mml.fromMarkup(
      `<object stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</object>`
    );
  }

  /**
   * Render an item's display name inside `<item stuff-id="...">`
   * tags. Same identity-tagging rationale as `name`.
   */
  static item(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff);
    return Mml.fromMarkup(
      `<item stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</item>`
    );
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
   * tags. Same identity-tagging contract as `name`; the renderer
   * applies friend/foe coloring on player-tagged references through
   * the stylesheet's `attribute → bucket` selector.
   */
  static player(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff);
    return Mml.fromMarkup(
      `<player stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</player>`
    );
  }

  /**
   * Render an NPC's display name inside `<npc stuff-id="...">` tags.
   * Sibling to `player` — same shape, but the stylesheet can give
   * them distinct treatments (NPCs aren't friend/foe candidates the
   * same way other players are).
   */
  static npc(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff);
    return Mml.fromMarkup(
      `<npc stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</npc>`
    );
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
   */
  static markdownToMml(text: string, resolver?: MentionResolver): Mml {
    return Mml.fromMarkup(parseMarkdown(text, resolver));
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

SecurityApi.decorateApiClass(Mml);
