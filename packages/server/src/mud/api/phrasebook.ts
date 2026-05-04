/**
 * PhrasebookApi — substitution engine for prose templates.
 *
 * A "template" is a string with `{name}` placeholders. `format()`
 * interpolates `vars[name]` into each placeholder using the same
 * rules `Mml.compose` applies to its tagged-template interpolations:
 *
 *   - `Mml` fragments emit verbatim (already-escaped).
 *   - Strings, numbers, booleans are escaped (the five reserved chars).
 *   - `null`/`undefined` → empty.
 *   - Objects with `toMml()` get unwrapped, then escape the result if
 *     it isn't already an Mml.
 *
 * Returned value is a single `Mml` fragment so callers can compose it
 * further or pass it to a Scene body.
 *
 * Only the engine lives here. The actual phrasebook of templates +
 * typed entry points lives in `mud/lib/Phrasebook.ts`. When
 * externalisation lands (DB-backed templates, locale dispatch,
 * registry lookup) the additional plumbing slots in here without the
 * call sites changing.
 */

import { Mml } from './mml';
import { SecurityApi } from './security';

export class PhrasebookApi {
  private constructor() {}

  /**
   * Render `template` by substituting `{name}` placeholders from
   * `vars`. Unrecognised names render as empty (consistent with
   * `Mml.compose` treating null/undefined values as empty). Unclosed
   * `{` is treated as literal text — markup the author intended.
   */
  static format(template: string, vars: Record<string, unknown>): Mml {
    const parts: string[] = [];
    const values: unknown[] = [];
    let cursor = 0;

    while (cursor < template.length) {
      const open = template.indexOf('{', cursor);
      if (open === -1) {
        parts.push(template.slice(cursor));
        cursor = template.length;
        break;
      }
      const close = template.indexOf('}', open);
      if (close === -1) {
        // Unclosed placeholder — emit the rest verbatim.
        parts.push(template.slice(cursor));
        cursor = template.length;
        break;
      }
      parts.push(template.slice(cursor, open));
      const name = template.slice(open + 1, close);
      values.push(vars[name]);
      cursor = close + 1;
    }
    // `Mml.compose`'s tagged-template signature expects parts.length
    // to be values.length + 1 (one segment between/around each
    // interpolation). Pad the trailing segment when the template
    // ended on a placeholder.
    if (parts.length === values.length) parts.push('');

    return Mml.compose(
      parts as unknown as TemplateStringsArray,
      ...values
    );
  }
}

SecurityApi.decorateApiClass(PhrasebookApi);
