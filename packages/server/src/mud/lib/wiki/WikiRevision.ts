/**
 * WikiRevision — one row of the **append-only edit log**.
 *
 * The shipped house pattern: `parcel_events`→`parcels`,
 * `chattel_events`→`chattel`, `bank_ledger`→`bank_accounts`. The log is
 * a separate collection rather than a `revisions[]` array on the page,
 * for two reasons that are both about scale: a heavily-edited page
 * would eventually hit **Mongo's 16MB document cap**, and every page
 * *read* would otherwise drag the whole history along with it
 * (criterion 11).
 *
 * ## Snapshots, not diffs
 *
 * Each row carries the **whole body**. Rollback is then a copy, not a
 * computation over a chain that has to be replayed correctly — and a
 * chain replay is exactly the thing that fails when you need it.
 *
 * ## ⚠ Which body: the RESULTING one
 *
 * The requirements phrase criterion 8 as "the full **prior** body". This
 * stores the **resulting** body — the article as it stood *after* the
 * edit — and the difference is deliberate.
 *
 * A draft is "a revision with `published: false`" (A5), and a draft's
 * whole point is to hold the *proposed new text* while the page keeps
 * serving its last published body. Under a prior-body model a draft row
 * has nowhere to put what the author actually wrote, and drafts would
 * need a second store — which A5 explicitly rules out.
 *
 * What the requirement is *for* is undiminished: every edit is
 * recoverable, because the creating revision is row 1 and every state
 * the page has ever had is a row. The prior body of revision N is
 * simply revision N−1's body, and `diff` reads it that way. The
 * recoverability property, not the phrasing, is what the tests assert.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { FieldMeta } from '../mixin';

/**
 * Why a revision exists. `rollback` is distinguished from `edit` so the
 * history reads honestly — a rollback IS an edit and appends like one
 * (criterion 10: the log stays append-only, nothing is ever removed),
 * but a reader scanning history should be able to see that a revision
 * restored an older state rather than composing a new one.
 */
export type RevisionKind = 'create' | 'edit' | 'rollback';

export class WikiRevision extends Document {
  static collectionName = Collections.WikiRevisions;
  static fieldMeta: FieldMeta = {
    pageId: { persistent: true },
    rev: { persistent: true },
    body: { persistent: true },
    author: { persistent: true },
    at: { persistent: true },
    summary: { persistent: true },
    kind: { persistent: true },
    published: { persistent: true },
    restoredFrom: { persistent: true },
  };

  /** The `_id` of the page this revision belongs to. */
  pageId = '';

  /** The page's `rev` counter as of this revision. Unique per page. */
  rev = 0;

  /** The complete article source as it stood after this edit. */
  body = '';

  /**
   * The durable identity of whoever made the edit, **derived from the
   * execution context** and never passed in. Authorship that a caller
   * can supply is authorship a caller can forge.
   */
  author = '';

  /** Epoch-ms. */
  at = 0;

  /**
   * The author's one-line note. It is what makes a history readable —
   * a log of timestamps tells you nothing about why — and it costs one
   * field.
   */
  summary = '';

  kind: RevisionKind = 'edit';

  /**
   * `false` for a draft: the revision exists, the log records it, and
   * the page keeps serving its last published body. Same log, one flag,
   * no second store (A5).
   */
  published = true;

  /** For a `rollback`, the rev whose body was restored. */
  restoredFrom: number | null = null;

  getPageId(): string {
    return this.pageId;
  }

  getRev(): number {
    return this.rev;
  }

  getBody(): string {
    return this.body;
  }

  getAuthor(): string {
    return this.author;
  }

  getAt(): number {
    return this.at;
  }

  getSummary(): string {
    return this.summary;
  }

  getKind(): RevisionKind {
    return this.kind;
  }

  isPublished(): boolean {
    return this.published;
  }

  getRestoredFrom(): number | null {
    return this.restoredFrom;
  }

  /** Every revision of a page, **newest first** (criterion 9). */
  static async findForPage(pageId: string): Promise<WikiRevision[]> {
    const rows = await WikiRevision.find<WikiRevision>({ pageId });
    return rows.sort((a, b) => b.rev - a.rev);
  }

  /** One revision by page + rev number, or null. */
  static async findRev(
    pageId: string,
    rev: number,
  ): Promise<WikiRevision | null> {
    const rows = await WikiRevision.find<WikiRevision>({ pageId, rev });
    return rows[0] ?? null;
  }

  /**
   * The newest **published** revision of a page, or null. What the page
   * serves; a trailing draft is skipped.
   */
  static async latestPublished(pageId: string): Promise<WikiRevision | null> {
    const rows = await WikiRevision.findForPage(pageId);
    return rows.find((r) => r.published) ?? null;
  }

  /** Drop every revision of a page — the `purge` path, and ONLY that. */
  static async deleteForPage(pageId: string): Promise<number> {
    const rows = await WikiRevision.find<WikiRevision>({ pageId });
    for (const row of rows) await row.delete();
    return rows.length;
  }
}
