/**
 * Book — leaves between boards, joined at a spine (paper D14, re-planned by
 * the owner as D44): a notebook somebody writes in, a printed book.
 *
 * ⭐⭐ **A book is its leaves.** It is an assembly (`Assembled`): the
 * assembly record carries the physical SET — the leaves' paper, its grade
 * and wear, the boards, the spine joint — and the book keeps **one record
 * per leaf** for what that leaf carries: its words and the hands that wrote
 * them, or the edition page it was printed with. There is no document behind
 * a notebook: handwriting has no existence apart from the paper, so it lives
 * on the leaf, exactly as it does on a loose sheet.
 *
 * - **Writing in a book is writing on a leaf** — the same ink, size and room
 *   rules as a sheet. ⭐ Anyone holding it can write (lend someone your
 *   notebook and they can scribble in it); the book is still a chattel with
 *   an owner, and **every passage records whose hand wrote it** — evidence
 *   a reader sees as they know the writer (*your hand*, *Hester's hand*,
 *   *a hand you do not know*), the device mark's rule.
 * - **A printed leaf** points at an edition page and reads it with no title
 *   check (whoever holds the book reads it — D6).
 * - **Tearing a page out** takes that leaf's state out with it: a loose
 *   `Sheet` with the same words (or the same edition page), and a stub at
 *   the spine.
 * - **Reading** shows the page the book lies open at; `read <book> page <n>`
 *   opens it there.
 *
 * (A LEDGER — a live book of a business's own papers — is `RegisterBook`,
 * fixed in place; it holds no leaves of its own.)
 *
 * ⚠ Binding sheets into a book (`fit`) is deferred: carrying each sheet's
 * words into its leaf needs a raise-arm hook master does not have. A book is
 * sold made, its leaves blank (or, for a printed book, bound to an edition).
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin } from '../../lib/description/Marked';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { DurableMixin } from '../../lib/material/Durable';
import { ReservedMixin } from '../../lib/reserve';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { TearableMixin, type TearOutcome } from '../../lib/material/Tearable';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { DocumentApi } from '../../api/document';
import Sheet from './Sheet';

/** Where a loose leaf comes from when a page is torn out. */
const LEAF_TEMPLATE = '/platform/thing/sheet';

/** What writing in a book did, in words. */
export type PageOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

/** One passage on a leaf, and whose hand wrote it. */
export interface Passage {
  text: string;
  /** The writer's identity path. */
  hand: string;
}

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
  };

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
    return leaf ? { ...leaf, passages: [...leaf.passages] } : null;
  }

  /** Bind a printed book: every leaf carries one page of the edition. */
  public bindEdition(editionPath: string, pages: number): void {
    const n = Math.max(1, Math.floor(pages));
    this.pageCount = n;
    this.leaves = Array.from({ length: n }, (_, i) => ({ passages: [], boundTo: editionPath, page: i, torn: false }));
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

  /** A hand as THIS viewer knows its writer — the device mark's rule. */
  private handFor(viewer: Stuff, hand: string): string {
    if (hand === '') return 'an unknown hand';
    if (viewer.getIdentityPath() === hand) return 'your hand';
    const name = MixinApi.isBeliefStore(viewer) ? viewer.knownNameOf(hand) : null;
    return name ? `${name}'s hand` : 'a hand you do not know';
  }

  /** @hook The open page, read off its leaf as this viewer knows the hands on it. */
  public override async refreshMarks(viewer: Stuff): Promise<void> {
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
    const body = leaf.passages
      .map((p, i) => (leaf.passages[i - 1]?.hand === p.hand ? p.text : `(in ${this.handFor(viewer, p.hand)}) ${p.text}`))
      .join(' / ');
    this.setMarkText(`Page ${n} of ${total}: ${body}`);
  }

  /**
   * @hook A PRINTED leaf tells the reader of what its edition names
   * (*known-of* — recognition, the recipes slate § 4). A handwritten page
   * teaches nothing by being read: what a notebook holds as a recipe is the
   * recipes build's (a cook's own recipe, consulted when they `make`), never
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
   * ⭐ Write on a page (D44): whoever holds the book writes on the leaf, in
   * their own hand. A printed or torn leaf takes no writing.
   */
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

  /** Tear page `n` out: a stub at the spine and a loose sheet carrying the leaf. */
  public override async tear(_by: Stuff, page?: number): Promise<TearOutcome> {
    const self = this as unknown as Stuff;
    if (page === undefined) {
      return { ok: false, reason: 'which-page', line: `Tear which page out of ${self.getPresentation()}? (\`tear <book> page <n>\`)` };
    }
    const opened = this.openTo(page);
    if (!opened.ok) return opened;
    const at = this.openPage;
    const leaf = this.ensureLeaves()[at - 1]!;
    if (leaf.torn) return { ok: false, reason: 'torn-out', line: `Page ${at} is already gone.` };
    const loose = await StuffApi.clone<Sheet>(LEAF_TEMPLATE);
    loose.torn = true;
    loose.sized = this.sizedLeaves;
    if (leaf.boundTo !== '') {
      loose.bindTo(leaf.boundTo, leaf.page);
    } else {
      const words = leaf.passages.map((p) => p.text).join(' / ');
      loose.setMarkText(words);
      loose.setWritingRoom(Math.max(0, this.roomPerPage - words.length));
    }
    const next = [...this.leaves];
    next[at - 1] = { passages: [], boundTo: '', page: 0, torn: true };
    this.leaves = next;
    const where = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (where !== null && MixinApi.isContainer(where)) ContainmentApi.move(loose, where);
    return { ok: true, line: `You tear page ${at} out of ${self.getPresentation()}.`, made: [loose as unknown as Stuff] };
  }
}
