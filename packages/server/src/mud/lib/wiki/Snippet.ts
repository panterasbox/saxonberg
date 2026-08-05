/**
 * The snippet language — invocation scanning and parameter
 * substitution, as pure string operations.
 *
 * A named value-object module: it defines one concept, *the snippet
 * syntax*, and holds no state and does no I/O. The renderer owns the
 * fixpoint loop, the budget and the cycle stack; this owns what
 * `{{Infobox|Oak|class=hardwood}}` and `{{{class|unknown}}}` mean.
 *
 * ## Why this is the half authors can extend
 *
 * A snippet is an ordinary page in the `Snippet:` namespace (S1), so it
 * inherits revisions, permissions, history, rollback and protection
 * without a line of new code. This is where most of a wiki's real
 * richness lives — infoboxes, citation formats, navboxes — and it is
 * the half authors can build **without a developer**.
 *
 * ## ⭐ The capability line
 *
 * Snippets **compose and parameterise; they do not reach live state.**
 * Only a registered component (a module a developer wrote) can touch
 * game state. An author can therefore build any presentation they like
 * and cannot reach anything they were not given — and that boundary is
 * structural, because there is nothing in this file that could reach
 * state even if a snippet asked it to.
 *
 * ## Named `Snippet`, not `Template`, deliberately
 *
 * A **Template** in this codebase is a Document describing Stuff, and a
 * page's `subject` points at one. A reusable markup fragment describes
 * nothing. Two senses of one word, and they would collide exactly where
 * they meet — on a page whose subject is a template and whose body
 * invokes a snippet.
 */

/** A parsed `{{Name|…}}` invocation and where it sat in the source. */
export interface SnippetInvocation {
  /** The snippet's page name, as written. */
  name: string;
  /** Positional arguments, in order. Addressed as `{{{1}}}`, `{{{2}}}`… */
  positional: string[];
  /** Named arguments (`key=value`). */
  named: Record<string, string>;
  /** Index of the opening `{{` in the scanned string. */
  start: number;
  /** Index just past the closing `}}`. */
  end: number;
}

export class Snippets {
  /**
   * The marker a missing parameter renders as.
   *
   * ⚠ Never the empty string. Silently-empty parameters are how wiki
   * snippets rot: the page looks fine, the data is gone, and nobody
   * notices for a year. A visible marker is a bug report an author
   * writes for you.
   */
  static missingMarker(param: string): string {
    return `{{{${param}}}}`;
  }

  /**
   * Find the next `{{Name|…}}` invocation at or after `from`, or null.
   *
   * Brace-depth aware, so `{{Outer|{{Inner}}}}` finds the outer
   * invocation with the inner one intact as an argument — the renderer
   * expands the result and the inner one is found on the next pass.
   *
   * A `{{{` run is **skipped**, not treated as `{{` + `{`: it is a
   * parameter reference, which is meaningful only inside a snippet
   * body and is substituted before this scanner ever sees that body.
   * Without the skip, `{{{x}}}` in an article would be read as an
   * invocation of a snippet named `{x`.
   */
  static findInvocation(text: string, from = 0): SnippetInvocation | null {
    for (let i = from; i < text.length - 1; i++) {
      if (text[i] !== '{' || text[i + 1] !== '{') continue;
      if (text[i + 2] === '{') {
        // A parameter reference. Step past the whole run so a
        // `{{{{x}}}}` cannot be re-entered mid-brace.
        i += 2;
        continue;
      }
      const close = Snippets.findClose(text, i + 2);
      if (close === -1) continue; // unclosed — leave it as literal text
      const inner = text.slice(i + 2, close);
      const parts = Snippets.splitArgs(inner);
      const name = (parts.shift() ?? '').trim();
      if (!name) continue;
      const positional: string[] = [];
      const named: Record<string, string> = {};
      for (const part of parts) {
        const eq = part.indexOf('=');
        // `=` inside a value is fine — only the FIRST one names a key,
        // and a leading `=` (no key) is positional, not a nameless
        // named argument.
        if (eq > 0) named[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
        else positional.push(part.trim());
      }
      return { name, positional, named, start: i, end: close + 2 };
    }
    return null;
  }

  /**
   * Substitute `{{{param}}}` and `{{{param|default}}}` in a snippet
   * body. Positional arguments are addressed by number (`{{{1}}}`).
   *
   * A parameter with neither an argument nor a default renders
   * {@link missingMarker} — visibly, never empty.
   */
  static substitute(body: string, invocation: SnippetInvocation): string {
    let out = '';
    let i = 0;
    while (i < body.length) {
      if (body[i] === '{' && body[i + 1] === '{' && body[i + 2] === '{') {
        const close = body.indexOf('}}}', i + 3);
        if (close !== -1) {
          const inner = body.slice(i + 3, close);
          const bar = inner.indexOf('|');
          const key = (bar === -1 ? inner : inner.slice(0, bar)).trim();
          const fallback = bar === -1 ? null : inner.slice(bar + 1);
          out += Snippets.argFor(invocation, key) ?? fallback ??
            Snippets.missingMarker(key);
          i = close + 3;
          continue;
        }
      }
      out += body[i];
      i++;
    }
    return out;
  }

  /** The argument bound to `key`, or null. Numeric keys are positional. */
  private static argFor(
    invocation: SnippetInvocation,
    key: string,
  ): string | null {
    if (/^\d+$/.test(key)) {
      // 1-indexed, matching wiki convention: `{{{1}}}` is the first
      // argument after the name.
      return invocation.positional[Number(key) - 1] ?? null;
    }
    return invocation.named[key] ?? null;
  }

  /**
   * Index of the `}}` closing the invocation that opened before
   * `start`, honouring nesting. Returns -1 when unclosed.
   */
  private static findClose(text: string, start: number): number {
    let depth = 1;
    for (let i = start; i < text.length - 1; i++) {
      if (text[i] === '{' && text[i + 1] === '{') {
        depth++;
        i++;
        continue;
      }
      if (text[i] === '}' && text[i + 1] === '}') {
        depth--;
        if (depth === 0) return i;
        i++;
      }
    }
    return -1;
  }

  /**
   * Split an invocation's interior at **top-level** `|` only, so a
   * nested invocation's own arguments stay with it.
   */
  private static splitArgs(inner: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < inner.length; i++) {
      const two = inner.slice(i, i + 2);
      if (two === '{{') {
        depth++;
        current += two;
        i++;
        continue;
      }
      if (two === '}}') {
        depth--;
        current += two;
        i++;
        continue;
      }
      if (inner[i] === '|' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
      current += inner[i];
    }
    parts.push(current);
    return parts;
  }
}
