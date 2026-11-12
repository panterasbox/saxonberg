/**
 * Book — leaves between boards, joined at a spine: a notebook somebody writes in, a printed book —
 * a town directory on a counter.
 *
 * ⭐⭐ **A book is its leaves, and a leaf is a sheet still bound.** It is an
 * assembly (`Assembled`): the assembly record carries the physical SET — the
 * leaves' paper, its grade and wear, the boards, the spine joint — and the
 * book keeps **one record per leaf** for what that leaf carries: passages of
 * handwriting, each with the hand that wrote it, or the edition page it was
 * printed with. A loose `Sheet` carries exactly the same two things, so a
 * page torn out is that leaf, whole.
 *
 * - **Writing in a book is writing on a leaf** — the same ink, size and room
 *   rules as a sheet. ⭐ Anyone holding it can write (lend someone your
 *   notebook and they can scribble in it); the book is still a chattel with
 *   an owner, and **every passage records whose hand wrote it** — evidence
 *   a reader sees as they know the writer (*your hand*, *Hester's hand*,
 *   *a hand you do not know*), the device mark's rule.
 * - **A printed leaf** points at an edition page and reads it with no title
 *   check (whoever holds the book reads it). A row authors a printed
 *   book by naming its edition (`edition:`, seeded at mint).
 * - **Tearing a page out** takes that leaf out whole: a loose `Sheet` with
 *   the same passages and hands (or the same edition page), which says it
 *   was torn from this book — and which is still the book's OWNER's paper
 *   (made from the book), whoever tore it. A stub is left at the spine, and
 *   a look at the book says which pages are gone.
 * - **Reading** shows the page the book lies open at; `read <book> page <n>`
 *   opens it there.
 *
 * (A LEDGER — a live book of a business's own papers — is `RegisterBook`,
 * fixed in place; it holds no leaves of its own.)
 *
 * ⚠ Binding sheets into a book (`fit`) is deferred: carrying each sheet's
 * words into its leaf needs a raise-arm hook master does not have. A book is
 * sold made, its leaves blank, or authored bound to an edition.
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin, type Passage } from '../../lib/description/Marked';
import type { ReadDone, ReadRefusal } from '../../lib/description/Readable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { DurableMixin } from '../../lib/material/Durable';
import { ReservedMixin } from '../../lib/reserve/Reserved';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { TearableMixin, type TearOutcome } from '../../lib/material/Tearable';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { DocumentApi } from '../../api/document';
import Sheet from './Sheet';

/** Where a loose leaf comes from when a page is torn out. */
const LEAF_TEMPLATE = '/platform/thing/sheet';

/** What writing in a book did, in words. */
export type PageOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

export type { Passage } from '../../lib/description/Marked';

/** ⭐ One leaf of a book — what it carries. A plain record; persists with the book. */
export interface Leaf {
  passages: Passage[];
  /** The edition this leaf was printed with; `''` = blank or handwritten. */
  boundTo: string;
  /** The edition page (0-based) when printed. */
  page: number;
  /** Torn out — a stub at the spine. */
  torn: boolean;
}

/** A look at a book says which pages are gone. */
const bookAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter || !(host instanceof Book)) return text;
  const gone = host.getMissing();
  if (gone.length === 0) return text;
  const pages = gone.length === 1 ? `Page ${gone[0]} has` : `Pages ${listOf(gone)} have`;
  const line = `${pages} been torn out of it; ${gone.length === 1 ? 'a stub is' : 'stubs are'} left at the spine.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
};

/** `3`, `3 and 37`, `3, 9 and 37`. */
function listOf(ns: readonly number[]): string {
  if (ns.length <= 1) return ns.join('');
  return `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}

const BookBase = TearableMixin(
  CombustibleMixin(ThermalMixin(ReservedMixin(AssembledMixin(CraftedMixin(DurableMixin(MarkedMixin(Good))))))),
);

export default class Book extends BookBase {
  static fieldMeta: FieldMeta = {
    pageCount: { persistent: true, authorable: true },
    roomPerPage: { persistent: true, authorable: true },
    sizedLeaves: { persistent: true, authorable: true },
    leaves: { persistent: true },
    openPage: { persistent: true },
    // ⭐ A printed book on a row: the edition its leaves carry, laid down at mint.
    edition: { authorable: true, seed: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [bookAugmenter];

  /** How many leaves it was bound with. */
  public pageCount = 16;
  /** Characters a leaf takes. */
  public roomPerPage = 600;
  /** Whether its leaves were sized (an unsized leaf drinks the ink). */
  public sizedLeaves = true;
  /** ⭐ One record per leaf, in order. Grown to `pageCount` on first use. */
  public leaves: Leaf[] = [];
  /** The page it lies open at (1-based). */
  public openPage = 1;
  /** The edition a row names (the seed's value; the leaves are the record). */
  public edition = '';

  private ensureLeaves(): Leaf[] {
    const n = Math.max(1, Math.floor(this.pageCount || 1));
    if (this.leaves.length < n) {
      const more: Leaf[] = [];
      for (let i = this.leaves.length; i < n; i++) more.push({ passages: [], boundTo: '', page: 0, torn: false });
      this.leaves = [...this.leaves, ...more];
    }
    return this.leaves;
  }

  public getPageCount(): number {
    return this.ensureLeaves().length;
  }

  public getOpenPage(): number {
    return this.openPage;
  }

  /** Pages torn out (1-based). */
  public getMissing(): number[] {
    return this.ensureLeaves().flatMap((l, i) => (l.torn ? [i + 1] : []));
  }

  /** A copy of one leaf's record (1-based), or null past the last page. */
  public getLeaf(page: number): Leaf | null {
    const leaf = this.ensureLeaves()[page - 1];
    return leaf ? { ...leaf, passages: leaf.passages.map((p) => ({ ...p })) } : null;
  }

  /** Bind a printed book: every leaf carries one page of the edition. */
  public bindEdition(editionPath: string, pages: number): void {
    const n = Math.max(1, Math.floor(pages));
    this.pageCount = n;
    this.leaves = Array.from({ length: n }, (_, i) => ({ passages: [], boundTo: editionPath, page: i, torn: false }));
  }

  /**
   * ⭐ Seed (mint only): a row that names an edition is a printed book — its
   * leaves bound to the edition's pages. A row naming an edition that does
   * not exist is an authoring error, said loudly.
   */
  public async seedEdition(value: unknown): Promise<void> {
    if (typeof value !== 'string' || value === '') return;
    const pages = await DocumentApi.pagesOf(value);
    if (pages === null || pages.pages.length === 0) {
      throw new Error(`Book ${(this as unknown as Stuff).getTemplatePath()}: edition '${value}' has no pages to bind`);
    }
    this.edition = value;
    this.bindEdition(value, pages.pages.length);
  }

  /** Open it at a page, or say why not. */
  public openTo(page: number): PageOutcome {
    const self = this as unknown as Stuff;
    const n = Math.floor(page);
    if (!Number.isFinite(n) || n < 1 || n > this.getPageCount()) {
      return { ok: false, reason: 'no-such-page', line: `${self.getPresentation()} has ${this.getPageCount()} pages.` };
    }
    this.openPage = n;
    return { ok: true, line: '' };
  }

  /** @hook The open page's words, read off its leaf (the hands are `readFor`'s). */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    const n = this.openPage;
    const total = this.getPageCount();
    const leaf = this.ensureLeaves()[n - 1];
    if (leaf === undefined) return this.setMarkText('');
    if (leaf.torn) {
      return this.setMarkText(`Page ${n} of ${total} has been torn out; a stub of it is left at the spine.`);
    }
    if (leaf.boundTo !== '') {
      const pages = await DocumentApi.pagesOf(leaf.boundTo);
      const text = pages?.pages[leaf.page] ?? '';
      return this.setMarkText(text.trim() === '' ? '' : `Page ${n} of ${total}: ${text}`);
    }
    if (leaf.passages.length === 0) return this.setMarkText('');
    this.setMarkText(`Page ${n} of ${total}: ${leaf.passages.map((p) => p.text).join(' / ')}`);
  }

  /**
   * @hook ⭐ A book is read at the page it lies open at; naming a page opens
   * it there first (the open page is the book's state — it stays open).
   */
  public override async readFor(viewer: Stuff, page?: number): Promise<ReadDone | ReadRefusal> {
    if (page !== undefined) {
      const opened = this.openTo(page);
      if (!opened.ok) return { ok: false, reason: 'no-such-page', facts: { pages: this.getPageCount() } };
    }
    return super.readFor(viewer);
  }

  /** @hook The open page as this reader reads it: each hand named as they know its writer. */
  public override textFor(viewer: Stuff): string {
    const shown = this.getMarkText();
    const leaf = this.ensureLeaves()[this.openPage - 1];
    if (shown !== this.markText || leaf === undefined || leaf.torn || leaf.boundTo !== '' || leaf.passages.length === 0) {
      return shown;
    }
    return `Page ${this.openPage} of ${this.getPageCount()}: ${this.passagesFor(viewer, leaf.passages)}`;
  }

  /**
   * @hook A PRINTED leaf tells the reader of what its edition names
   * (*known-of* — recognition, the recipes slate § 4). A handwritten page
   * teaches nothing by being read: what a notebook holds as a recipe is the
   * recipes build's (a cook's own recipe, consulted when they craft it), never
   * a guess at the words on the page.
   */
  public override async teach(reader: Stuff): Promise<string | null> {
    const leaf = this.ensureLeaves()[this.openPage - 1];
    if (leaf === undefined || leaf.torn || leaf.boundTo === '') return null;
    const pages = await DocumentApi.pagesOf(leaf.boundTo);
    if (!pages?.teaches || pages.teaches.length === 0) return null;
    return this.teachRecipes(reader, pages.teaches);
  }

  /** Nothing is written on a book's cover — write on a page. */
  public override writeOn(
    _by: Stuff,
    _words: string,
    _medium?: Stuff,
  ): { ok: true; line: string } | { ok: false; reason: string; line: string } {
    return { ok: false, reason: 'which-page', line: 'Write on a page of it: `write <words> on <book> page <n>`.' };
  }

  /**
   * ⭐ Write on a page: whoever holds the book writes on the leaf, in
   * their own hand. A printed or torn leaf takes no writing.
   */
  /** @hook ⭐ A book is written on a page — the one named, else the open one. */
  public override async inscribe(
    by: Stuff,
    words: string,
    opts?: { page?: number; medium?: Stuff },
  ): Promise<PageOutcome> {
    return this.writePage(by, words, opts?.page ?? this.getOpenPage(), opts?.medium);
  }

  public async writePage(by: Stuff, words: string, page: number, medium?: Stuff): Promise<PageOutcome> {
    const self = this as unknown as Stuff;
    const text = words.trim();
    if (text === '') return { ok: false, reason: 'nothing-to-write', line: 'Write what?' };
    const opened = this.openTo(page);
    if (!opened.ok) return opened;
    const at = this.openPage;
    const leaf = this.ensureLeaves()[at - 1]!;
    if (leaf.torn) return { ok: false, reason: 'torn-out', line: `Page ${at} has been torn out of ${self.getPresentation()}.` };
    if (leaf.boundTo !== '') return { ok: false, reason: 'printed', line: `Page ${at} is printed; there is no room on it to write.` };
    if (!(MixinApi.isContainable(self) && self.getContainer() === by)) {
      return { ok: false, reason: 'not-holding', line: `You need ${self.getPresentation()} in your hand to write in it.` };
    }
    const ink = this.inkInHand(by, medium);
    if (ink === null) return { ok: false, reason: 'no-ink', line: 'You have nothing to write with — paper takes ink, and you hold none.' };
    if (!this.sizedLeaves) {
      return { ok: false, reason: 'bleeds', line: `The ink runs into the page in a feathered blot — the leaves of ${self.getPresentation()} are unsized.` };
    }
    const used = leaf.passages.reduce((n, p) => n + p.text.length + 3, 0);
    if (used + text.length > this.roomPerPage) {
      return { ok: false, reason: 'full', line: `There is no room left on page ${at} for that.` };
    }
    const next = [...this.leaves];
    next[at - 1] = { ...leaf, passages: [...leaf.passages, { text, hand: by.getIdentityPath() ?? '' }] };
    this.leaves = next;
    this.spendInk(ink, text.length);
    return { ok: true, line: `You write "${text}" on page ${at} of ${self.getPresentation()}.` };
  }

  /**
   * ⭐ Tear page `n` out: the leaf, whole, as a loose sheet — its passages
   * and hands, or its edition page — that says what it was torn from and is
   * still the book's owner's paper. A stub is left at the spine.
   */
  public override async tear(by: Stuff, page?: number): Promise<TearOutcome> {
    const self = this as unknown as Stuff;
    if (page === undefined) {
      return { ok: false, reason: 'which-page', line: `Tear which page out of ${self.getPresentation()}? (\`tear <book> page <n>\`)` };
    }
    const opened = this.openTo(page);
    if (!opened.ok) return opened;
    const at = this.openPage;
    const leaf = this.ensureLeaves()[at - 1]!;
    if (leaf.torn) return { ok: false, reason: 'torn-out', line: `Page ${at} is already gone.` };
    const from = self.getPresentation();
    // ⭐ Made FROM the book: the page is whoever's the book is, not the tearer's.
    const loose = await StuffApi.clone<Sheet>(LEAF_TEMPLATE, undefined, { madeFrom: self });
    loose.setTornFrom(from);
    loose.sized = this.sizedLeaves;
    if (leaf.boundTo !== '') {
      loose.bindTo(leaf.boundTo, leaf.page);
    } else {
      const used = leaf.passages.reduce((n, p) => n + p.text.length + 3, 0);
      loose.takePassages(leaf.passages, this.roomPerPage - used);
    }
    const next = [...this.leaves];
    next[at - 1] = { passages: [], boundTo: '', page: 0, torn: true };
    this.leaves = next;
    // ⭐ A page torn out is in the hand that tore it (a book chained to a
    // counter included); with no hand to take it, it falls where the book is.
    const where = MixinApi.isContainer(by) ? by : MixinApi.isContainable(self) ? self.getContainer() : null;
    if (where !== null && MixinApi.isContainer(where)) {
      if (MixinApi.isCarrying(where)) where.receiveOrSetDown(loose);
      else ContainmentApi.move(loose, where);
    }
    return { ok: true, line: `You tear page ${at} out of ${from}.`, made: [loose as unknown as Stuff] };
  }
}
