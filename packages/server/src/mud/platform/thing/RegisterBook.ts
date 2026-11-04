/**
 * RegisterBook — ⭐ **a ledger open on a desk** (paper D7): the live book of
 * a house's own papers.
 *
 * `read ledger` at the print shop: one line per paper the house has filed
 * under the prefix this book names (`registerPrefix:` — a business's own
 * branch, a register's prefix). The page is DERIVED each time it is read
 * (`refreshMarks`) — never authored, never stale, and never written by
 * anybody holding the book: the records are the house's documents, and the
 * book is a VIEW of them. Burn the book and the documents stand; a new book
 * reads them again. An extract is `print <book>` — the page frozen as an
 * edition whose source is the prefix.
 *
 * ⚠ The same class harbors ships as the ship register (`government:`); its
 * other way to name what it reads. § Reconciliation in the paper plan: keep
 * both fields; `refreshMarks` branches on which is set.
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin } from '../../lib/description/Marked';
import { DocumentApi } from '../../api/document';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

/** A page lists this many papers; the rest are older pages. */
const LINES_PER_PAGE = 40;

export default class RegisterBook extends MarkedMixin(Good) {
  static fieldMeta: FieldMeta = {
    registerPrefix: { persistent: true, authorable: true },
    registerTitle: { persistent: true, authorable: true },
  };

  /** ⭐ What this book is the ledger OF — a document prefix. */
  protected registerPrefix = '';
  /** Whose book it is, in words (`the Terminus Gazette`); `''` = read off the prefix. */
  protected registerTitle = '';

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  public getRegisterPrefix(): string {
    return this.registerPrefix;
  }

  public setRegisterPrefix(value: string): void {
    this.registerPrefix = typeof value === 'string' ? value.replace(/\/+$/, '') : '';
  }

  /** ⭐ The page, as the house's papers stand now. */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    this.setMarkText(await this.currentPage());
  }

  /** The ledger's page in words: one line per paper, newest last. */
  public async currentPage(): Promise<string> {
    if (this.registerPrefix === '') return '';
    const docs = await DocumentApi.list(`${this.registerPrefix}/`);
    const papers = docs.filter((d) => d.getKind() !== 'edition');
    const head = `THE BOOK of ${this.houseName()}.`;
    if (papers.length === 0) return `${head} Nothing is entered.`;
    const lines: string[] = [];
    for (const d of papers.slice(-LINES_PER_PAGE)) {
      const pages = await DocumentApi.pagesOf(d.getPath());
      const leaf = d.getPath().split('/').filter(Boolean).pop() ?? d.getPath();
      lines.push(`${d.getKind()} ${leaf}: ${(pages?.title ?? '').trim() || 'a paper'}.`);
    }
    return `${head} ${lines.join(' ')}`;
  }

  private houseName(): string {
    if (this.registerTitle !== '') return this.registerTitle;
    const parts = this.registerPrefix.split('/').filter(Boolean);
    const leaf = parts[parts.length - 1] ?? 'the house';
    return leaf.replace(/-/g, ' ');
  }
}
