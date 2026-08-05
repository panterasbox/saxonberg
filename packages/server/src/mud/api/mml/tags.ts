/**
 * MML tag vocabulary — the closed set of tags the markup grammar
 * defines, and the classification rule that tells **markup** from a
 * **component candidate**.
 *
 * The wiki's render pipeline resolves unknown tags as path-resolved
 * component modules (`lib/wiki/components/<name>.ts`). That only works
 * if "unknown" is decidable, which is what this file makes it: a tag in
 * {@link KNOWN_TAGS} is markup and renders; a tag outside it whose name
 * is a safe identifier is a component candidate; anything else is
 * literal text an author typed by accident (`<3`, `<-- note`).
 *
 * The safe-charset rule matters for more than tidiness. A component
 * name becomes a **module path** (`/lib/wiki/components/<name>`), so an
 * unconstrained name is a path-traversal primitive. Restricting it to
 * `[a-z][a-z0-9-]*` means `../`, absolute paths and dotted segments are
 * unrepresentable before any resolver sees the string.
 *
 * Internal to the MML module; the public surface is `Mml.isKnownTag`
 * and `Mml.componentCandidate`.
 */

/**
 * Every tag the MML grammar itself defines. Three families:
 *
 *  - **inline emphasis** — the Discord-dialect chat subset
 *    (`strong`/`em`/`code`/`pre`/`blockquote`/`strike`).
 *  - **identity / affordance** — the viewer-aware reference tags the
 *    composer emits (`name`, `item`, `exit`, `link`, `mention`, …).
 *  - **long-form** — the article tags this build adds (`h1`–`h3`,
 *    `table`/`tr`/`th`/`td`, `spoiler`).
 *
 * A tag added here must also define a `flatten` entry — that pairing is
 * asserted by a test, so the two cannot drift.
 */
export const KNOWN_TAGS: ReadonlySet<string> = new Set([
  // Inline emphasis (chat subset).
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'strike',
  'list',
  'li',
  // Identity / affordance / vocabulary.
  'name',
  'player',
  'npc',
  'item',
  'object',
  'location',
  'exit',
  'direction',
  'speech',
  'msg',
  'chan',
  'mention',
  'link',
  'color',
  'detail',
  'sense',
  // Long-form (the wiki build).
  'h1',
  'h2',
  'h3',
  'table',
  'tr',
  'th',
  'td',
  'spoiler',
]);

/**
 * ⭐ **Inert tags** — presentation only. They style text and nothing
 * else: no click, no command, no identity claim, no module resolution.
 *
 * This is the line that decides what a *player* may write literally on
 * a surface that has no render pipeline behind it. The wiki can admit
 * every tag because its pipeline resolves components against a
 * charset-restricted namespace, gates spoilers and budgets the output.
 * A forum post and a chat line have none of that, so what they admit
 * has to be safe **on its own**.
 *
 * ⚠ Everything outside this set is excluded for a reason worth stating
 * once: `link` and `mention` are **affordances that act** (the client
 * renders a clickable that issues a command), and `name` / `player` /
 * `npc` / `item` / `speech` / `msg` / `chan` are **identity claims**
 * the composer emits on the server's authority — a player who could
 * write `<speech>` could attribute words to somebody else. `color` is
 * merely presentation and still excluded: staff and system styling are
 * recognisable by it, and forging that is impersonation by another
 * route.
 */
export const INERT_TAGS: ReadonlySet<string> = new Set([
  // Inline emphasis (chat subset).
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'strike',
  'list',
  'li',
  // Long-form.
  'h1',
  'h2',
  'h3',
  'table',
  'tr',
  'th',
  'td',
  'spoiler',
]);

/**
 * How much literal markup a parse admits — see {@link passthroughAllows}.
 *
 *  - `none` — everything is escaped. The chat default, and what every
 *    surface did before the wiki build.
 *  - `spoiler` — `<spoiler>` and nothing else. For conversation: chat
 *    is where a spoiler gets blurted, and a collapsible is the one
 *    piece of markup a spoken or messaged line has any use for.
 *  - `inert` — the presentation set above. For long-form authored
 *    prose with no render pipeline (forum posts).
 *  - `all` — known markup plus component candidates. **Only for a
 *    surface that resolves and gates them**, which today means the
 *    wiki.
 */
export type TagPolicy = 'none' | 'spoiler' | 'inert' | 'all';

/** Whether `policy` admits a literal `<tag>` written by an author. */
export function passthroughAllows(policy: TagPolicy, tag: string): boolean {
  const lower = tag.toLowerCase();
  switch (policy) {
    case 'none':
      return false;
    case 'spoiler':
      return lower === 'spoiler';
    case 'inert':
      return INERT_TAGS.has(lower);
    case 'all':
      return isKnownTag(lower) || isComponentCandidate(lower);
  }
}

/**
 * Tags that carry no children by nature — serialised in self-closing
 * form so `serialize(parseTree(x))` reproduces the shape an author
 * wrote rather than expanding `<image key="k"/>` into an empty pair.
 */
export const VOID_TAGS: ReadonlySet<string> = new Set(['image']);

/**
 * The legal shape of a component tag name — and therefore of the module
 * basename it resolves to. Lowercase, starts with a letter, hyphens
 * allowed inside. No dots, no slashes, no underscores: the three
 * characters that would let a name escape its directory.
 */
const COMPONENT_NAME = /^[a-z][a-z0-9-]*$/;

/** Whether `tag` is part of the MML grammar (markup, not a component). */
export function isKnownTag(tag: string): boolean {
  return KNOWN_TAGS.has(tag.toLowerCase());
}

/**
 * Whether `tag` is an unknown-but-well-formed name the component
 * resolver may try to load. False for known markup (it renders) and
 * false for anything failing the charset rule (it stays literal text).
 */
export function isComponentCandidate(tag: string): boolean {
  const lower = tag.toLowerCase();
  if (KNOWN_TAGS.has(lower)) return false;
  return COMPONENT_NAME.test(lower);
}
