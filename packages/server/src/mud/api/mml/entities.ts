/**
 * MML entity escape + decode — the five reserved characters (`<`, `>`,
 * `&`, `"`, `'`) that would otherwise be parsed as tag/attribute
 * structure. Round-trips with the client renderer's
 * `decodeEntities` in `packages/client/src/lib/mml/parseMml.ts`.
 *
 * `escapeText` is the on-wire escape — converts a raw run to its
 * entity-escaped form. `decodeEntity` is the single-name lookup;
 * `decodeEntities` walks a text run replacing the five entities.
 *
 * Internal to the MML module; the public surface lives on the `Mml`
 * class as `Mml.escape` (the only exposed entry point — `decodeEntities`
 * stays internal so consumers go through the parse tree).
 */

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
export function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Decode a single entity name to its character. Returns `null` for
 * unknown entities so callers can leave them intact.
 */
export function decodeEntity(name: string): string | null {
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
 * Decode all five entities in a text run. Mirrors the client
 * renderer's `decodeEntities` contract — replacement order is
 * deliberate (`&amp;` substitutions are NOT re-decoded, so an
 * escaped sequence like `&amp;lt;` flattens to `&lt;` literally).
 */
export function decodeEntities(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos);/g, (_, name) => {
    const decoded = decodeEntity(name);
    return decoded ?? `&${name};`;
  });
}
