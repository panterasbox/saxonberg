/**
 * A word-level diff over MML **source**.
 *
 * ## Why source, and why not a tree
 *
 * The same reason the search index is over source: a **render is
 * per-reader**, so a diff of two renders is per-reader too —
 * uncacheable, and worse, misleading, because it would show the
 * reader's *view* changing when the page did not. Source is also what
 * was edited, what is stored on the revision, and what a reviewer needs
 * in order to judge an edit.
 *
 * **Not a structural tree diff.** Tree-diffing is a research-grade
 * problem — move-vs-edit detection, stable node identity — for marginal
 * benefit over prose that is already paragraph-shaped. If snippet
 * invocations later make source diffs noisy, the cheap fix is
 * normalising whitespace harder before tokenising, not a tree
 * algorithm.
 *
 * ## Why hand-rolled
 *
 * `pnpm lint:imports` enumerates the npm allowlist, and `lib/**` may
 * not import outside `src/mud/` at all. A `diff` package is therefore
 * unreachable from where the algorithm belongs. That is the import
 * boundary working as designed rather than an inconvenience: the
 * algorithm below is fifty lines of textbook LCS, and taking a
 * dependency to avoid writing it would have widened a security-relevant
 * allowlist for a convenience.
 *
 * ## ⚠ Diffing happens AFTER redaction, never before
 *
 * This module is deliberately ignorant of the reveal model — it diffs
 * two strings. The caller (`WikiController`) redacts both sides first,
 * so a fragment above the reader's ceiling is **absent from both
 * inputs** and therefore produces no operation at all. Two revisions
 * differing only above the ceiling diff to nothing, which is what makes
 * criterion 68 hold: a reader cannot learn *that* an over-ceiling
 * fragment changed.
 *
 * Diffing first and filtering after would leak by construction — the
 * ops would already name the changed text.
 */

/** One span of the diff. */
export interface DiffOp {
  kind: 'same' | 'added' | 'removed';
  /** The words this span covers, already joined with single spaces. */
  text: string;
}

export class SourceDiff {
  /**
   * Word-level diff of `before` → `after`.
   *
   * Whitespace is normalised before tokenising (D-7), so a reflowed
   * paragraph does not read as an entire rewrite — which is the single
   * most common way a naive diff becomes useless on prose.
   */
  static words(before: string, after: string): DiffOp[] {
    const a = SourceDiff.tokenize(before);
    const b = SourceDiff.tokenize(after);
    return SourceDiff.coalesce(SourceDiff.walk(a, b));
  }

  /** Whether two bodies differ at all, cheaply. */
  static changed(before: string, after: string): boolean {
    return (
      SourceDiff.tokenize(before).join(' ') !==
      SourceDiff.tokenize(after).join(' ')
    );
  }

  /**
   * Render a diff as unified-ish text: `+` added, `-` removed, and
   * unchanged spans elided past `context` words on either side.
   *
   * Eliding is not cosmetic — an un-elided diff of a long article is
   * mostly unchanged text, and a reviewer who has to hunt for the
   * change usually stops reviewing.
   */
  static format(ops: readonly DiffOp[], context = 8): string {
    const lines: string[] = [];
    ops.forEach((op, i) => {
      if (op.kind === 'same') {
        const words = op.text.split(' ').filter(Boolean);
        const atStart = i === 0;
        const atEnd = i === ops.length - 1;
        if (words.length <= context * 2) {
          if (words.length) lines.push(`  ${op.text}`);
          return;
        }
        // Keep the tail leading INTO a change and the head leading out
        // of one; drop the middle.
        if (!atStart) lines.push(`  …${words.slice(-context).join(' ')}`);
        if (!atEnd) lines.push(`  ${words.slice(0, context).join(' ')}…`);
        return;
      }
      lines.push(`${op.kind === 'added' ? '+' : '-'} ${op.text}`);
    });
    return lines.join('\n');
  }

  /**
   * Split into comparable words. Whitespace runs collapse, so a
   * reflow is invisible; everything else is preserved verbatim,
   * including markup, because markup IS part of what an editor
   * changed and hiding it would make a diff lie about the edit.
   */
  static tokenize(body: string): string[] {
    return body.trim().split(/\s+/).filter((w) => w.length > 0);
  }

  /**
   * Textbook LCS over the token arrays, emitting one op per token.
   *
   * `O(n·m)` in time and space, which is fine for an article: a very
   * long page is a few thousand words, so the table is a few million
   * small integers and is built once per `wiki diff`. A linear-space
   * Hirschberg variant would be the fix if that ever stopped being
   * true; it is not a fix worth pre-paying for.
   */
  private static walk(a: readonly string[], b: readonly string[]): DiffOp[] {
    const n = a.length;
    const m = b.length;
    // lcs[i][j] = length of the longest common subsequence of a[i…] and
    // b[j…]. Built backwards so the emit walk below runs forwards, which
    // keeps the ops in document order without a reverse.
    const lcs: number[][] = Array.from({ length: n + 1 }, () =>
      new Array<number>(m + 1).fill(0),
    );
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i]![j] =
          a[i] === b[j]
            ? lcs[i + 1]![j + 1]! + 1
            : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
      }
    }

    const ops: DiffOp[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        ops.push({ kind: 'same', text: a[i]! });
        i++;
        j++;
      } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
        ops.push({ kind: 'removed', text: a[i]! });
        i++;
      } else {
        ops.push({ kind: 'added', text: b[j]! });
        j++;
      }
    }
    while (i < n) ops.push({ kind: 'removed', text: a[i++]! });
    while (j < m) ops.push({ kind: 'added', text: b[j++]! });
    return ops;
  }

  /** Merge adjacent ops of the same kind into spans. */
  private static coalesce(ops: readonly DiffOp[]): DiffOp[] {
    const out: DiffOp[] = [];
    for (const op of ops) {
      const last = out[out.length - 1];
      if (last && last.kind === op.kind) last.text += ` ${op.text}`;
      else out.push({ ...op });
    }
    return out;
  }
}
