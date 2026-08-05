/**
 * Sections and **sticky anchors** — the two halves of "cite a piece of
 * a page and have the citation survive editing".
 *
 * A named value-object module, pure string work, no I/O. Two concerns
 * that look separate and are not:
 *
 *  - **Section editing** (A2) is Wikipedia's oldest usability feature
 *    and its most effective concurrency control at once. Two people
 *    working on different sections of a long article never collide,
 *    which *removes* most conflicts rather than resolving them. That
 *    makes it a data-model feature, not a UI convenience.
 *  - **Sticky anchors** are what make `pageId#anchor` a durable
 *    citation. The college slate's rule is that a course **cites and
 *    never restates**, so that a wiki improvement never staleness a
 *    lesson — which means a broken anchor is a broken lesson.
 *
 * ## ⭐ Why an anchor is minted, not derived
 *
 * Deriving an anchor from heading text is the obvious design and it is
 * fragile in the worst way: an editorial rewording silently breaks
 * every citation to that section, and nothing anywhere reports it. So
 * an anchor is **assigned once and then held** — set explicitly by the
 * author, or minted from the first heading text and kept through every
 * later rewording. It lives in the stored source (`<h2 anchor="uses">`,
 * `## Uses {#uses}` in markdown), which is also why it survives a
 * rollback: the anchor is part of the snapshot.
 *
 * ## ⚠ The known interaction with rollback
 *
 * Rolling back restores that revision's anchors, which may be **fewer**
 * than the current ones. A citation to a newer section then dangles.
 * That is correct behaviour — the section genuinely is not there any
 * more — but it reads as a bug, so it is documented rather than
 * papered over (the plan's R-4).
 */

/** One heading in a body: its level, anchor, text, and span. */
export interface SectionSpan {
  level: 1 | 2 | 3;
  /** The sticky anchor — from the tag, else minted from the text. */
  anchor: string;
  /** The heading's own text, plain. */
  title: string;
  /** Index of the `<h*>` open tag in the body. */
  start: number;
  /**
   * Index just past the section's content — the next heading of the
   * same or shallower level, or the end of the body. A section OWNS
   * its subsections, which is what makes editing one of them coherent.
   */
  end: number;
}

/** A `<h1>`/`<h2>`/`<h3>` open tag, with its attributes. */
const HEADING_RE = /<h([123])((?:\s+[\w-]+="[^"]*")*)\s*>/gi;

/** An `anchor="…"` attribute inside a heading's attribute run. */
const ANCHOR_ATTR = /\banchor="([^"]*)"/i;

/**
 * A markdown ATX heading line, `#` to `###`, with an optional sticky
 * `{#anchor}` suffix.
 *
 * ⚠ **Both forms have to be understood here.** Article bodies are
 * stored as the author typed them — markdown — and converted to MML at
 * render time, so a Sections that only knew `<h2>` would find no
 * headings at all in a body written today: no section editing, no
 * minted anchors, and the failure is silent (an empty list, not an
 * error). The MML form stays because a body may legitimately mix the
 * two, and because bodies written before the dialect landed are still
 * in the collection.
 */
const MD_HEADING_RE = /^(#{1,3})[ \t]+(.+?)[ \t]*$/gm;

/** A `{#anchor}` suffix on a markdown heading. */
const MD_ANCHOR_SUFFIX = /\s*\{#([A-Za-z0-9_-]+)\}\s*$/;

/** A fence line — ``` or ~~~, with optional info string. */
const FENCE_RE = /^[ \t]*(```|~~~)/;

/** Which syntax a heading was written in — reconcile rewrites differ. */
type HeadingForm = 'mml' | 'markdown';

/** A heading as found, before section extents are computed. */
interface HeadingHit {
  level: 1 | 2 | 3;
  anchor: string;
  title: string;
  /** Index of the heading construct's first character. */
  start: number;
  /** Index just past the heading construct itself (not its content). */
  headEnd: number;
  form: HeadingForm;
  /** True when the author wrote the anchor — an authored one wins. */
  declared: boolean;
}

export class Sections {
  /**
   * Every section in `body`, in document order.
   *
   * Operates on the **source**, not a parse tree, because sections are
   * a *source* concept: what a section edit replaces is a run of
   * authored text, and round-tripping through a tree would normalise
   * parts of the body the author never touched — and, since the body
   * is markdown, would replace it with MML.
   */
  static list(body: string): SectionSpan[] {
    const heads = Sections.headings(body);

    return heads.map((h, i) => {
      // A section runs until the next heading at the SAME or a
      // shallower level — so an `<h2>` owns the `<h3>`s beneath it, and
      // editing it edits the whole subtree. Editing a section that
      // stopped at the next heading of any level would silently orphan
      // its subsections.
      let end = body.length;
      for (let j = i + 1; j < heads.length; j++) {
        if (heads[j]!.level <= h.level) {
          end = heads[j]!.start;
          break;
        }
      }
      return {
        level: h.level,
        anchor: h.anchor,
        title: h.title,
        start: h.start,
        end,
      };
    });
  }

  /** The section with `anchor`, or null. */
  static find(body: string, anchor: string): SectionSpan | null {
    const want = anchor.trim().toLowerCase();
    return Sections.list(body).find((s) => s.anchor === want) ?? null;
  }

  /**
   * Replace one section's span with `replacement`, leaving every other
   * byte of the body untouched.
   *
   * ⭐ That last clause is the concurrency property: two edits to
   * different sections touch disjoint byte ranges, so applying both in
   * either order gives the same result. Section editing therefore
   * *removes* conflicts rather than resolving them — which is why it
   * is here and not in the client.
   */
  static replace(
    body: string,
    anchor: string,
    replacement: string,
  ): string | null {
    const span = Sections.find(body, anchor);
    if (!span) return null;
    return body.slice(0, span.start) + replacement + body.slice(span.end);
  }

  /** One section's source, heading included. */
  static extract(body: string, anchor: string): string | null {
    const span = Sections.find(body, anchor);
    return span ? body.slice(span.start, span.end) : null;
  }

  /**
   * ⭐ Carry sticky anchors from `prior` into `next`, and mint one for
   * every heading that still lacks one.
   *
   * The rule, and its deliberate limit: when the two bodies have the
   * **same number of headings**, the anchor at each index is adopted
   * from the prior body — so rewording a heading keeps its anchor, and
   * every citation to it survives (criterion 45). When the counts
   * differ, headings have been added or removed and positional
   * matching would attach the wrong anchors to the wrong sections; a
   * mis-aimed citation is worse than a broken one, because it is
   * silent. So a count change mints fresh anchors from the text.
   *
   * An explicitly authored `anchor=` always wins over both.
   */
  static reconcile(prior: string, next: string): string {
    const priorAnchors = Sections.headings(prior).map((h) => h.anchor);
    const nextHeads = Sections.headings(next);
    const sameShape = priorAnchors.length === nextHeads.length;

    // Rewrite right-to-left so earlier indices stay valid.
    let out = next;
    for (let i = nextHeads.length - 1; i >= 0; i--) {
      const head = nextHeads[i]!;
      // An author who wrote an anchor meant it.
      if (head.declared) continue;
      const adopted = sameShape ? priorAnchors[i] : undefined;
      const anchor = adopted || Sections.slugify(head.title);
      if (!anchor) continue;
      const written = out.slice(head.start, head.headEnd);
      // Each form is rewritten in its OWN syntax. Normalising markdown
      // headings to MML on the way past would rewrite the author's
      // source behind their back, which is the one thing every method
      // on this class is arranged not to do.
      const rewritten =
        head.form === 'mml'
          ? written.replace(
              /^<h([123])/i,
              (_all, lvl: string) => `<h${lvl} anchor="${anchor}"`,
            )
          : `${written.replace(/[ \t]+$/, '')} {#${anchor}}`;
      out = out.slice(0, head.start) + rewritten + out.slice(head.headEnd);
    }
    return out;
  }

  /**
   * Every heading in `body`, either syntax, in document order.
   *
   * Fenced code blocks are skipped: a ```` ``` ```` block containing a
   * shell comment would otherwise register `# clean up first` as an
   * `<h1>`, and `reconcile` would then write `{#clean-up-first}` into
   * the middle of the author's code sample.
   */
  private static headings(body: string): HeadingHit[] {
    const fences = Sections.fencedRanges(body);
    const inFence = (at: number): boolean =>
      fences.some(([from, to]) => at >= from && at < to);

    const hits: HeadingHit[] = [];

    HEADING_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = HEADING_RE.exec(body)) !== null) {
      if (inFence(m.index)) continue;
      const level = Number(m[1]) as 1 | 2 | 3;
      const declared = ANCHOR_ATTR.exec(m[2] ?? '')?.[1];
      const afterOpen = m.index + m[0].length;
      const closeIdx = body.indexOf(`</h${level}>`, afterOpen);
      const title =
        closeIdx === -1 ? '' : stripTags(body.slice(afterOpen, closeIdx));
      hits.push({
        level,
        anchor: declared || Sections.slugify(title),
        title,
        start: m.index,
        headEnd: afterOpen,
        form: 'mml',
        declared: declared !== undefined,
      });
    }

    MD_HEADING_RE.lastIndex = 0;
    while ((m = MD_HEADING_RE.exec(body)) !== null) {
      if (inFence(m.index)) continue;
      const level = m[1]!.length as 1 | 2 | 3;
      const raw = m[2]!;
      const suffix = MD_ANCHOR_SUFFIX.exec(raw);
      const title = (suffix ? raw.slice(0, suffix.index) : raw).trim();
      hits.push({
        level,
        anchor: suffix?.[1]?.toLowerCase() || Sections.slugify(title),
        title,
        start: m.index,
        headEnd: m.index + m[0].length,
        form: 'markdown',
        declared: suffix !== null,
      });
    }

    return hits.sort((a, b) => a.start - b.start);
  }

  /** Half-open `[start, end)` ranges of fenced code blocks. */
  private static fencedRanges(body: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    let at = 0;
    let open: number | null = null;
    for (const line of body.split('\n')) {
      const isFence = FENCE_RE.test(line);
      if (isFence) {
        if (open === null) open = at;
        else {
          ranges.push([open, at + line.length + 1]);
          open = null;
        }
      }
      at += line.length + 1;
    }
    // An unterminated fence runs to the end — the same reading the
    // markdown parser takes, so the two agree about what is code.
    if (open !== null) ranges.push([open, body.length]);
    return ranges;
  }

  /** Slugify heading text into an anchor. Empty for empty text. */
  static slugify(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

/** Drop tags from a heading's inner markup to get its plain text. */
function stripTags(markup: string): string {
  return markup.replace(/<[^>]*>/g, '').trim();
}
