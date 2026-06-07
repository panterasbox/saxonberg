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
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { Exit } from '../lib/boundary/Exit';
import { DescribeApi } from './describe';
import { SecurityApi } from './security';
import { MixinApi } from './mixin';

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
 * Escape characters that would otherwise be parsed as MML
 * tag/attribute structure. Safe for both text content and attribute
 * values when the latter use `"..."` delimiters (our convention).
 *
 * Apostrophe (`'`) deliberately NOT escaped: it has no special
 * meaning in either XML text content or `"..."`-quoted attribute
 * values, and emitting `&apos;` instead of `'` shows up as literal
 * `&apos;` in the current raw-rendering client. When MML parsing
 * lands on the client this can become moot, but until then the
 * smaller escape set keeps prose readable.
 */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
   * handler). See `docs/plans/message-rendering-plan.md` D3.
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
   * Flatten an MML body to a markdown-emphasis-preserving string. Each
   * tag is replaced by its defined failsafe form (see the per-tag
   * table in `flattenNode` below). Used for log capture, archive
   * exports, and the markdown round-trip tests — distinct from
   * `stripTags`, which drops emphasis entirely for the plain-mode
   * collapse.
   *
   * Walks the body through `parseToTree` (recursive descent over
   * the MML tag grammar) and emits per-node flatten output. Unknown
   * tags fall back to their children's flatten (forward-compatible
   * with future tag additions; the renderer is the authoritative
   * styling layer).
   */
  static flatten(body: string): string {
    const tree = parseToTree(body);
    return flattenNodes(tree);
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
   * leaves the literal text.
   */
  static markdownToMml(text: string, resolver?: MentionResolver): Mml {
    return Mml.fromMarkup(parseMarkdown(text, resolver));
  }

  /**
   * Factory: a `MentionResolver` over the speakers' perceivable
   * neighbors. Matches against display names (case-insensitive)
   * and returns the first hit. Ties fall through silently (per the
   * "silent on miss" contract). Used by `VocalMixin.say`,
   * `TellController`, and the (future) emote handler when they call
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

function decodeEntity(name: string): string | null {
  switch (name) {
    case 'lt':
      return '<';
    case 'gt':
      return '>';
    case 'amp':
      return '&';
    case 'quot':
      return '"';
    case 'apos':
      return "'";
    default:
      return null;
  }
}

/**
 * Decode all entities in a text run. Mirrors the renderer's contract
 * (`packages/client/src/lib/mml/parseMml.ts` decodes the same five).
 */
function decodeEntities(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos);/g, (_, name) => {
    const decoded = decodeEntity(name);
    return decoded ?? `&${name};`;
  });
}

// ============================================================================
// MML parse tree — server-side for `flatten`
// ============================================================================

type MmlNode =
  | { kind: 'text'; text: string }
  | {
      kind: 'tag';
      tag: string;
      attrs: Record<string, string>;
      children: MmlNode[];
    };

/**
 * Parse an MML body into a tree. Recursive-descent over a small tag
 * grammar; tolerates unclosed tags by treating remaining input as
 * text once the close fails to match. Decodes entities in text and
 * attribute values per the established contract.
 *
 * Used internally by `Mml.flatten`. The client renderer has its own
 * (parallel) parser in `packages/client/src/lib/mml/parseMml.ts` so
 * the server tree and client tree don't share a dependency.
 */
function parseToTree(body: string): MmlNode[] {
  const state = { input: body, pos: 0 };
  return parseNodes(state, null);
}

function parseNodes(
  state: { input: string; pos: number },
  closingTag: string | null,
): MmlNode[] {
  const out: MmlNode[] = [];
  let textBuf = '';

  while (state.pos < state.input.length) {
    const ch = state.input[state.pos]!;

    if (ch === '<') {
      // Could be opening tag, closing tag, or stray `<` (unlikely from
      // escaped input but tolerated).
      const tagInfo = readTagOpen(state);
      if (!tagInfo) {
        textBuf += ch;
        state.pos++;
        continue;
      }
      if (tagInfo.kind === 'close') {
        if (tagInfo.tag === closingTag) {
          if (textBuf) out.push({ kind: 'text', text: decodeEntities(textBuf) });
          return out;
        }
        // Unexpected close — drop the tag, continue
        continue;
      }
      if (textBuf) {
        out.push({ kind: 'text', text: decodeEntities(textBuf) });
        textBuf = '';
      }
      if (tagInfo.selfClosing) {
        out.push({ kind: 'tag', tag: tagInfo.tag, attrs: tagInfo.attrs, children: [] });
      } else {
        const children = parseNodes(state, tagInfo.tag);
        out.push({ kind: 'tag', tag: tagInfo.tag, attrs: tagInfo.attrs, children });
      }
      continue;
    }

    textBuf += ch;
    state.pos++;
  }

  if (textBuf) out.push({ kind: 'text', text: decodeEntities(textBuf) });
  return out;
}

type TagOpen =
  | { kind: 'open'; tag: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; tag: string };

/**
 * Read a single tag at `state.pos` (which MUST be on `<`). Advances
 * `state.pos` past the matching `>` on success. Returns `null` if the
 * content at `<` doesn't look like a tag (stray `<` in text).
 */
function readTagOpen(state: {
  input: string;
  pos: number;
}): TagOpen | null {
  const { input } = state;
  const close = input.indexOf('>', state.pos + 1);
  if (close === -1) return null;
  const raw = input.slice(state.pos + 1, close);
  state.pos = close + 1;

  let isClose = false;
  let body = raw;
  if (body.startsWith('/')) {
    isClose = true;
    body = body.slice(1);
  }

  const selfClosing = body.endsWith('/');
  if (selfClosing) body = body.slice(0, -1);

  body = body.trim();
  const spaceIdx = body.indexOf(' ');
  const tag =
    spaceIdx === -1 ? body.toLowerCase() : body.slice(0, spaceIdx).toLowerCase();

  if (isClose) return { kind: 'close', tag };

  const attrs: Record<string, string> = {};
  if (spaceIdx !== -1) {
    const attrPart = body.slice(spaceIdx + 1);
    const ATTR = /([\w-]+)\s*=\s*"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = ATTR.exec(attrPart)) !== null) {
      attrs[m[1]!] = decodeEntities(m[2]!);
    }
  }

  return { kind: 'open', tag, attrs, selfClosing };
}

/**
 * Walk a parsed MML tree and emit the markdown-emphasis-preserving
 * flatten string. Per-tag table below; unknown tags fall back to
 * their children's flatten (forward-compatible).
 *
 * The flatten serializer is the inverse of `markdownToMml` for the
 * Discord-subset tags — round-trip tests gate this.
 */
function flattenNodes(nodes: MmlNode[]): string {
  return nodes.map(flattenNode).join('');
}

function flattenNode(n: MmlNode): string {
  if (n.kind === 'text') return n.text;
  const inner = flattenNodes(n.children);
  switch (n.tag) {
    case 'strong':
      return `**${inner}**`;
    case 'em':
      return `*${inner}*`;
    case 'code':
      return `\`${inner}\``;
    case 'pre':
      return `\`\`\`${inner}\`\`\``;
    case 'blockquote':
      return inner
        .split('\n')
        .map((line) => (line.length ? `> ${line}` : '>'))
        .join('\n');
    case 'strike':
      return `~~${inner}~~`;
    case 'list': {
      const ordered = n.attrs.ordered === 'true';
      const items = n.children.filter(
        (c): c is Extract<MmlNode, { kind: 'tag' }> =>
          c.kind === 'tag' && c.tag === 'li',
      );
      return items
        .map((li, idx) => {
          const t = flattenNodes(li.children);
          return ordered ? `${idx + 1}. ${t}` : `- ${t}`;
        })
        .join('\n');
    }
    case 'li':
      // Should only be reached if a stray `<li>` appears outside a
      // `<list>` — emit a dashed line as the safest failsafe.
      return `- ${inner}`;
    // Identity / role / inline tags: children verbatim. The
    // tagging layer is for rendering; flatten just emits the
    // already-escaped text.
    default:
      return inner;
  }
}

// ============================================================================
// Custom URI schemes for in-world refs
// ============================================================================

/**
 * Project-defined custom URI schemes the renderer dispatches by:
 *  - `mudcmd:` — opaque command line (clicker dispatch through command bus)
 *  - `mudref:` — stuff-id reference (resolves to `look <kw>` or `look #id`)
 *  - `mudq:`   — MQL query reference (v1 inert — no click handler runs;
 *                see `docs/plans/message-rendering-plan.md` D3)
 *
 * All three are opaque-form per RFC 3986 (`scheme:payload`, no `//`).
 * Any other scheme (http, https, javascript, data, …) is stripped at
 * markdown-parse time; bare labels survive as plain text.
 */
const KNOWN_LINK_SCHEMES = ['mudcmd:', 'mudref:', 'mudq:'] as const;

function isKnownLinkScheme(href: string): boolean {
  return KNOWN_LINK_SCHEMES.some((s) => href.startsWith(s));
}

// ============================================================================
// MentionResolver — server-side mention scope plumbing
// ============================================================================

/**
 * Resolves a literal `@<word>` from user-supplied prose to a stuff-id
 * or null (silent miss). The call site builds a resolver scoped to
 * the right audience set: chat channels enumerate tuned-in
 * participants; say/tell/emote enumerate the speaker's perceivable
 * neighbors.
 */
export interface MentionResolver {
  resolveMention(word: string): string | null;
}

/**
 * Match a single `Stuff`'s display name against a mention word.
 * Case-insensitive on the head-word — "@bobalu" matches "Bobalu",
 * "Bobalu Smallberries", and "Bobalu the Brave". Returns true on
 * any match; ties (multiple candidates matching the same word) are
 * left to the caller, which picks first-match-wins.
 */
function nameMatchesMention(displayName: string, word: string): boolean {
  const headWord = displayName.split(/\s+/)[0] ?? '';
  return headWord.toLowerCase() === word.toLowerCase();
}

/**
 * Resolver against the speaker's perceivable neighbors — for v1, the
 * Stuff sharing the speaker's immediate container (i.e., room
 * occupants when the speaker is an Avatar / NPC). When perception
 * grows beyond room-immediate (windows / scry / etc.) this is the
 * seam to widen; for the v1 acceptance criteria, room-immediate
 * matches "matches what the user could plausibly target."
 *
 * Returns `null` if the speaker has no container (loose Stuff) or
 * none of the container's contents matches the word.
 */
class PerceiverMentionResolver implements MentionResolver {
  constructor(private readonly speaker: Stuff) {}

  resolveMention(word: string): string | null {
    if (!MixinApi.isContainable(this.speaker)) return null;
    const container = this.speaker.getContainer();
    if (!container || !MixinApi.isContainer(container)) return null;
    // Speaker IS a candidate — self-mention is the canonical
    // own-name highlight path. The renderer compares the mention's
    // stuff-id against the viewer's; when they match, the self-match
    // treatment fires.
    const speakerDisplay = DescribeApi.getDisplayName(this.speaker);
    if (nameMatchesMention(speakerDisplay, word)) return this.speaker.stuffId;
    for (const candidate of container.getContents()) {
      if (candidate.stuffId === this.speaker.stuffId) continue;
      const display = DescribeApi.getDisplayName(candidate);
      if (nameMatchesMention(display, word)) return candidate.stuffId;
    }
    return null;
  }
}

/**
 * Resolver against an explicit participant set. Used by the (future)
 * chat substrate and by tests that need a fixture roster. Stable
 * iteration: the first matching participant wins, mirroring the
 * silent-on-tie behavior of `PerceiverMentionResolver`.
 */
class ChannelMentionResolver implements MentionResolver {
  constructor(private readonly participants: Iterable<Stuff>) {}

  resolveMention(word: string): string | null {
    for (const candidate of this.participants) {
      const display = DescribeApi.getDisplayName(candidate);
      if (nameMatchesMention(display, word)) return candidate.stuffId;
    }
    return null;
  }
}

// ============================================================================
// Markdown → MML — Discord-dialect subset
// ============================================================================

/**
 * Parse a Discord-dialect markdown subset into MML markup. The
 * subset is fixed (see `Mml.markdownToMml` docstring) — narrower
 * than full markdown, never grows toward CommonMark. Code spans /
 * code blocks are opaque; inline emphasis applies to plain runs;
 * line-start markers (`>`, `-`, `1.`) drive block-level wrapping.
 *
 * Order of operations:
 *   1. Sentinel-substitute code blocks (` ```...``` `) and code spans
 *      (`` `...` ``) so subsequent passes don't munge them.
 *   2. Split into blocks (paragraph / blockquote-run / list-run)
 *      by line-leading marker.
 *   3. For each text run inside a block, run inline transforms
 *      (links, mentions, emphasis, strike).
 *   4. Restore code sentinels back to their MML tags.
 *
 * Escape semantics: at every layer, raw user text is escaped via
 * `escapeText` before it lands in the output stream. Trusted
 * markup (the tags we emit) bypasses escape.
 */
function parseMarkdown(text: string, resolver?: MentionResolver): string {
  // Phase 1 — extract code blocks (multi-line) and code spans (single-line)
  // so subsequent passes don't munge their contents.
  const codeBlocks: string[] = [];
  let working = text.replace(/```([\s\S]*?)```/g, (_, content: string) => {
    const idx = codeBlocks.length;
    codeBlocks.push(content);
    return ` CB${idx} `;
  });
  const codeSpans: string[] = [];
  working = working.replace(/`([^`\n]+)`/g, (_, content: string) => {
    const idx = codeSpans.length;
    codeSpans.push(content);
    return ` CS${idx} `;
  });

  // Phase 2 — block-level segmentation.
  const lines = working.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Blockquote run
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ''));
        i++;
      }
      const inner = quoteLines.map((l) => processInline(l, resolver)).join('\n');
      out.push(`<blockquote>${inner}</blockquote>`);
      if (i < lines.length) out.push('\n');
      continue;
    }

    // List run (unordered or ordered, but not mixed; first-line marker wins)
    const ulMatch = /^-\s+(.*)$/.exec(line);
    const olMatch = /^\d+\.\s+(.*)$/.exec(line);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const itemRe = ordered ? /^\d+\.\s+(.*)$/ : /^-\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]!);
        if (!m) break;
        items.push(`<li>${processInline(m[1]!, resolver)}</li>`);
        i++;
      }
      const attr = ordered ? ' ordered="true"' : '';
      out.push(`<list${attr}>${items.join('')}</list>`);
      if (i < lines.length) out.push('\n');
      continue;
    }

    // Plain paragraph line
    out.push(processInline(line, resolver));
    i++;
    // Preserve line break between non-block lines
    if (i < lines.length) out.push('\n');
  }

  let result = out.join('');

  // Phase 4 — restore code sentinels to their MML tags.
  result = result.replace(/ CB(\d+) /g, (_, idxStr: string) => {
    const idx = Number(idxStr);
    return `<pre>${escapeText(codeBlocks[idx] ?? '')}</pre>`;
  });
  result = result.replace(/ CS(\d+) /g, (_, idxStr: string) => {
    const idx = Number(idxStr);
    return `<code>${escapeText(codeSpans[idx] ?? '')}</code>`;
  });

  return result;
}

/**
 * Apply inline transforms (links, mentions, emphasis, strike) to a
 * single line of text. Operates in a single left-to-right pass; each
 * match consumes its slice and the leading plain text is escaped.
 *
 * Match priority is fixed: links → mentions → strike → strong → em.
 * Code spans / blocks are already substituted to sentinels before
 * this runs, so emphasis can't bleed into code.
 */
function processInline(text: string, resolver?: MentionResolver): string {
  // Recursive-descent over a tiny grammar.
  let out = '';
  let i = 0;
  while (i < text.length) {
    // Try matchers in priority order. Each matcher reads from `text`
    // starting at `i`; on success it returns the markup to emit + the
    // position past the consumed slice.
    const linkM = matchLink(text, i, resolver);
    if (linkM) {
      out += linkM.markup;
      i = linkM.next;
      continue;
    }
    const mentionM = matchMention(text, i, resolver);
    if (mentionM) {
      out += mentionM.markup;
      i = mentionM.next;
      continue;
    }
    const strikeM = matchStrike(text, i, resolver);
    if (strikeM) {
      out += strikeM.markup;
      i = strikeM.next;
      continue;
    }
    const strongM = matchStrong(text, i, resolver);
    if (strongM) {
      out += strongM.markup;
      i = strongM.next;
      continue;
    }
    const emM = matchEm(text, i, resolver);
    if (emM) {
      out += emM.markup;
      i = emM.next;
      continue;
    }
    // Sentinel passthrough — leave code sentinels intact so Phase 4
    // can restore them.
    if (text[i] === ' ') {
      // Read up to the next  
      const end = text.indexOf(' ', i + 1);
      if (end !== -1) {
        out += text.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }
    out += escapeText(text[i]!);
    i++;
  }
  return out;
}

interface InlineMatch {
  markup: string;
  next: number;
}

function matchLink(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text[i] !== '[') return null;
  const closeBracket = text.indexOf(']', i + 1);
  if (closeBracket === -1) return null;
  if (text[closeBracket + 1] !== '(') return null;

  // Balanced paren scan — `[bogus](javascript:alert(1))` has nested
  // parens inside the URI, so a naive `indexOf(')')` would terminate
  // at the inner `)`. Walk forward keeping a depth counter; the URI
  // ends at the close-paren that returns depth to zero.
  let depth = 1;
  let closeParen = -1;
  for (let p = closeBracket + 2; p < text.length; p++) {
    const c = text[p];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) {
        closeParen = p;
        break;
      }
    }
  }
  if (closeParen === -1) return null;

  const label = text.slice(i + 1, closeBracket);
  const uri = text.slice(closeBracket + 2, closeParen);

  // Process the label inline (mentions / emphasis allowed in labels).
  const labelMarkup = processInline(label, resolver);

  if (isKnownLinkScheme(uri)) {
    return {
      markup: `<link href="${escapeText(uri)}">${labelMarkup}</link>`,
      next: closeParen + 1,
    };
  }

  // Unknown scheme: strip the URI, keep the label.
  return { markup: labelMarkup, next: closeParen + 1 };
}

function matchMention(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text[i] !== '@') return null;
  // Word boundary check — `email@addr.com` shouldn't trigger.
  if (i > 0 && /[A-Za-z0-9]/.test(text[i - 1]!)) return null;
  const match = /^@([A-Za-z][A-Za-z0-9'-]*)/.exec(text.slice(i));
  if (!match) return null;
  const word = match[1]!;
  const next = i + match[0].length;

  if (!resolver) {
    return { markup: escapeText(match[0]), next };
  }
  const stuffId = resolver.resolveMention(word);
  if (!stuffId) {
    return { markup: escapeText(match[0]), next };
  }
  return {
    markup: `<mention stuff-id="${escapeText(stuffId)}">${escapeText(match[0])}</mention>`,
    next,
  };
}

function matchStrong(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text.slice(i, i + 2) !== '**') return null;
  const end = text.indexOf('**', i + 2);
  if (end === -1 || end === i + 2) return null;
  const inner = text.slice(i + 2, end);
  return {
    markup: `<strong>${processInline(inner, resolver)}</strong>`,
    next: end + 2,
  };
}

function matchEm(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  const ch = text[i];
  if (ch !== '*' && ch !== '_') return null;
  // Reject `_` mid-word ("snake_case") — Discord doesn't either.
  if (ch === '_' && i > 0 && /[A-Za-z0-9]/.test(text[i - 1]!)) return null;
  const end = text.indexOf(ch, i + 1);
  if (end === -1 || end === i + 1) return null;
  if (ch === '_' && /[A-Za-z0-9]/.test(text[end + 1] ?? '')) return null;
  const inner = text.slice(i + 1, end);
  return {
    markup: `<em>${processInline(inner, resolver)}</em>`,
    next: end + 1,
  };
}

function matchStrike(
  text: string,
  i: number,
  resolver?: MentionResolver,
): InlineMatch | null {
  if (text.slice(i, i + 2) !== '~~') return null;
  const end = text.indexOf('~~', i + 2);
  if (end === -1) return null;
  const inner = text.slice(i + 2, end);
  return {
    markup: `<strike>${processInline(inner, resolver)}</strike>`,
    next: end + 2,
  };
}

SecurityApi.decorateApiClass(Mml);
