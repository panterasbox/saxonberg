/**
 * PathPatternApi - generic glob matcher for path-shaped strings.
 *
 * Supports the subset of glob syntax needed for security policy matching
 * and template-path lookups:
 *   - literals match exactly
 *   - `*` matches any run of characters EXCEPT `/`
 *   - `**` matches any run of characters INCLUDING `/`
 *
 * Not a full glob library — no `?`, no `[abc]` classes, no `{a,b}`
 * alternatives. The minimum required by FromTemplate / FromModule
 * security policies; expanded later if a real consumer needs more.
 *
 * Two-pass test:
 *   PathPatternApi.matches('mud/api/stuff#StuffApi', 'mud/api/**') === true
 *   PathPatternApi.matches('mud/lib/stuff/Thing#Thing', 'mud/api/**') === false
 */

import { decorateApiClass } from '../lib/security/decorators';

export class PathPatternApi {
  private constructor() {}

  /**
   * Return true if `path` matches `pattern`. Both are strings; pattern
   * may contain `*` and `**` wildcards.
   */
  public static matches(path: string, pattern: string): boolean {
    const re = PathPatternApi.compile(pattern);
    return re.test(path);
  }

  /**
   * Compile a glob pattern to a RegExp. Cached per-pattern in a small
   * Map; patterns are typically a closed set declared at policy
   * construction time.
   */
  public static compile(pattern: string): RegExp {
    const cached = PathPatternApi.#cache.get(pattern);
    if (cached) return cached;

    // Build the regex piece-by-piece. Escape regex-meta chars in
    // literal segments; replace ** then * with their regex
    // equivalents.
    let body = '';
    let i = 0;
    while (i < pattern.length) {
      if (pattern.startsWith('**', i)) {
        body += '.*';
        i += 2;
      } else if (pattern[i] === '*') {
        body += '[^/]*';
        i += 1;
      } else {
        body += PathPatternApi.#escapeRegex(pattern[i]!);
        i += 1;
      }
    }
    const re = new RegExp('^' + body + '$');
    PathPatternApi.#cache.set(pattern, re);
    return re;
  }

  static #cache: Map<string, RegExp> = new Map();

  static #escapeRegex(ch: string): string {
    // Restricted to single chars; full string escape would also
    // protect `*` but we already special-case those above.
    return /[.+?^${}()|[\]\\]/.test(ch) ? '\\' + ch : ch;
  }
}

decorateApiClass(PathPatternApi);
