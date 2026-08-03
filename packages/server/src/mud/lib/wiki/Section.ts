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

export class Sections {
  /**
   * Every section in `body`, in document order.
   *
   * Operates on the MML **source**, not a parse tree, because sections
   * are a *source* concept: what a section edit replaces is a run of
   * authored text, and round-tripping through a tree would normalise
   * parts of the body the author never touched.
   */
  static list(body: string): SectionSpan[] {
    const heads: Array<{
      level: 1 | 2 | 3;
      anchor: string;
      title: string;
      start: number;
      afterOpen: number;
    }> = [];
    HEADING_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = HEADING_RE.exec(body)) !== null) {
      const level = Number(m[1]) as 1 | 2 | 3;
      const declared = ANCHOR_ATTR.exec(m[2] ?? '')?.[1];
      const afterOpen = m.index + m[0].length;
      const closeIdx = body.indexOf(`</h${level}>`, afterOpen);
      const title =
        closeIdx === -1 ? '' : stripTags(body.slice(afterOpen, closeIdx));
      heads.push({
        level,
        anchor: declared || Sections.slugify(title),
        title,
        start: m.index,
        afterOpen,
      });
    }

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
    const priorAnchors = Sections.list(prior).map((s) => s.anchor);
    const nextHeads = Sections.list(next);
    const sameShape = priorAnchors.length === nextHeads.length;

    // Rewrite right-to-left so earlier indices stay valid.
    let out = next;
    for (let i = nextHeads.length - 1; i >= 0; i--) {
      const head = nextHeads[i]!;
      const openEnd = out.indexOf('>', head.start);
      if (openEnd === -1) continue;
      const open = out.slice(head.start, openEnd + 1);
      // An author who wrote an anchor meant it.
      if (ANCHOR_ATTR.test(open)) continue;
      const adopted = sameShape ? priorAnchors[i] : undefined;
      const anchor = adopted || Sections.slugify(head.title);
      if (!anchor) continue;
      const rewritten = open.replace(
        /^<h([123])/i,
        (_all, lvl: string) => `<h${lvl} anchor="${anchor}"`,
      );
      out = out.slice(0, head.start) + rewritten + out.slice(openEnd + 1);
    }
    return out;
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
