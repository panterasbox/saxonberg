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
