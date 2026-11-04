/**
 * Book — leaves and boards joined at a glued spine (paper D14): a blank
 * notebook somebody writes in, a printed book, a manual.
 *
 * ⭐ **One class, filled by what it is bound to.**
 *
 * - **a notebook** — blank leaves until first written. The first `write …
 *   on <book> page <n>` mints a `book` document at
 *   `/home/<writer>/books/<key>` and binds it; the writer owns it under the
 *   ordinary self-home gate, so a borrower holding the book reads it and
 *   cannot write in it (refused in words — the title is asked first).
 * - **a printed book** — bound to a frozen edition (`edition`), read like a
 *   printed sheet: no title check, whoever holds it reads it.
 *
 * (A LEDGER — a live book of a business's own papers — is `RegisterBook`,
 * fixed in place; it holds no pages of its own.)
 *
 * Reading shows the OPEN page (`read <book> page <n>` opens it). Tearing a
 * page out (`tear <book> page <n>`) leaves a gap and a loose `Sheet` with the
 * page's words (D13). A book burns: the pages go, the document stands —
 * and whoever holds no book cannot read it.
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
import type { DocumentPages } from '../../lib/document/Edition';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { DocumentApi } from '../../api/document';
import { AccessApi } from '../../api/access';
import { SecurityApi } from '../../api/security';
import { CraftingApi } from '../../api/crafting';
import Sheet from './Sheet';

/** Where a loose leaf comes from when a page is torn out. */
const LEAF_TEMPLATE = '/platform/thing/sheet';

/** What writing in a book did, in words. */
export type PageOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

const BookBase = TearableMixin(
  CombustibleMixin(ThermalMixin(ReservedMixin(AssembledMixin(CraftedMixin(DurableMixin(MarkedMixin(Good))))))),
);

export default class Book extends BookBase {
  static fieldMeta: FieldMeta = {
    pageCount: { persistent: true, authorable: true },
    roomPerPage: { persistent: true, authorable: true },
    missing: { persistent: true },
    document: { persistent: true },
    edition: { persistent: true, authorable: true },
    openPage: { persistent: true },
    bookKey: { persistent: true },
  };

  /** How many leaves it was bound with. */
  public pageCount = 16;
  /** Characters a page takes. */
  public roomPerPage = 600;
  /** Pages torn out (1-based). */
  public missing: number[] = [];
  /** The `book` document a notebook's pages live in; `''` until first written. */
  public document = '';
  /** The edition a printed book reads; `''` for a notebook. */
  public edition = '';
  /** The page it lies open at (1-based). */
  public openPage = 1;
  /** A durable key for its document, minted at first write. */
  public bookKey = '';

  public getPageCount(): number {
    return Math.max(1, Math.floor(this.pageCount || 1));
  }

  public getOpenPage(): number {
    return this.openPage;
  }

  public getMissing(): readonly number[] {
    return this.missing;
  }

  /** Bind a printed book to the edition its leaves carry. */
  public bindEdition(editionPath: string, pages: number): void {
    this.edition = editionPath;
    this.pageCount = Math.max(1, pages);
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

  private async pages(): Promise<DocumentPages | null> {
    const path = this.edition !== '' ? this.edition : this.document;
    if (path === '') return null;
    return DocumentApi.pagesOf(path);
  }

  /** @hook The open page, read from what the book is bound to. */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    const n = this.openPage;
    const total = this.getPageCount();
    if (this.missing.includes(n)) {
      this.setMarkText(`Page ${n} of ${total} has been torn out; a stub of it is left at the spine.`);
      return;
    }
    const pages = await this.pages();
    const text = pages?.pages[n - 1] ?? '';
    this.setMarkText(text.trim() === '' ? '' : `Page ${n} of ${total}: ${text}`);
  }

  /**
   * @hook A page that names a recipe teaches *known-of* — a printed one by
   * its edition, a handwritten one by the recipe it names.
   */
  public override async teach(reader: Stuff): Promise<string | null> {
    if (this.missing.includes(this.openPage)) return null;
    const pages = await this.pages();
    if (pages === null) return null;
    if (pages.teaches && pages.teaches.length > 0) return this.teachRecipes(reader, pages.teaches);
    const text = (pages.pages[this.openPage - 1] ?? '').toLowerCase();
    if (text === '') return null;
    // A handwritten page teaches the recipe it names — by a recipe's own
    // keyword, as a menu is read.
    const words = text.split(/[^a-z-]+/).filter((w) => w.length >= 4);
    for (const w of words) {
      const recipe = await CraftingApi.lookupRecipe(w);
      if (recipe !== null) return this.teachRecipes(reader, [{ recipeId: recipe.recipeId, name: recipe.name }]);
    }
    return null;
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
   * ⭐ Write on a page (D14). A printed book takes no writing; a notebook's
   * first write mints its document under the WRITER's home, and after that
   * only whoever holds the title to that document writes in it — a
   * borrower reads and is refused in words.
   */
  public async writePage(by: Stuff, words: string, page: number, medium?: Stuff): Promise<PageOutcome> {
    const self = this as unknown as Stuff;
    if (this.edition !== '') return { ok: false, reason: 'printed', line: `${self.getPresentation()} is printed; there is no room in it to write.` };
    const text = words.trim();
    if (text === '') return { ok: false, reason: 'nothing-to-write', line: 'Write what?' };
    const opened = this.openTo(page);
    if (!opened.ok) return opened;
    if (this.missing.includes(this.openPage)) {
      return { ok: false, reason: 'torn-out', line: `Page ${this.openPage} has been torn out of ${self.getPresentation()}.` };
    }
    if (!(MixinApi.isContainable(self) && self.getContainer() === by)) {
      return { ok: false, reason: 'not-holding', line: `You need ${self.getPresentation()} in your hand to write in it.` };
    }
    const ink = this.inkInHand(by, medium);
    if (ink === null) return { ok: false, reason: 'no-ink', line: 'You have nothing to write with — paper takes ink, and you hold none.' };

    let path = this.document;
    if (path === '') {
      const key = (by.getIdentityPath() ?? '').split('/').filter(Boolean).pop() ?? '';
      if (key === '') return { ok: false, reason: 'no-home', line: 'You have nowhere to keep what you write.' };
      if (this.bookKey === '') this.bookKey = SecurityApi.uuid(12);
      path = `/home/${key}/books/${this.bookKey}`;
    }
    if (!(await AccessApi.canAtPath(by, 'write-document', path))) {
      return { ok: false, reason: 'not-yours-to-write-in', line: `${self.getPresentation()} is somebody else's; you can read it, not write in it.` };
    }
    const existing = this.document === '' ? null : await DocumentApi.read(path);
    const data = existing?.getData() ?? {};
    const pages: string[] = Array.isArray(data.pages) ? (data.pages as string[]).map(String) : [];
    while (pages.length < this.getPageCount()) pages.push('');
    const before = (pages[this.openPage - 1] ?? '').trim();
    const next = before === '' ? text : `${before} / ${text}`;
    if (next.length > this.roomPerPage) {
      return { ok: false, reason: 'full', line: `There is no room left on page ${this.openPage} for that.` };
    }
    pages[this.openPage - 1] = next;
    const title = self.getPresentation();
    await DocumentApi.save(path, 'book', { title, pageCount: this.getPageCount(), pages });
    this.document = path;
    this.spendInk(ink, text.length);
    return { ok: true, line: `You write "${text}" on page ${this.openPage} of ${title}.` };
  }

  /** Tear page `n` out: a gap in the book and a loose sheet with its words. */
  public override async tear(by: Stuff, page?: number): Promise<TearOutcome> {
    const self = this as unknown as Stuff;
    if (page === undefined) {
      return { ok: false, reason: 'which-page', line: `Tear which page out of ${self.getPresentation()}? (\`tear <book> page <n>\`)` };
    }
    const opened = this.openTo(page);
    if (!opened.ok) return opened;
    if (this.missing.includes(this.openPage)) {
      return { ok: false, reason: 'torn-out', line: `Page ${this.openPage} is already gone.` };
    }
    await this.refreshMarks(by);
    const pages = await this.pages();
    const words = pages?.pages[this.openPage - 1] ?? '';
    const leaf = await StuffApi.clone<Sheet>(LEAF_TEMPLATE);
    leaf.setMarkText(words);
    leaf.setWritingRoom(0);
    leaf.torn = true;
    this.missing = [...this.missing, this.openPage].sort((a, b) => a - b);
    const where = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (where !== null && MixinApi.isContainer(where)) ContainmentApi.move(leaf, where);
    return {
      ok: true,
      line: `You tear page ${this.openPage} out of ${self.getPresentation()}.`,
      made: [leaf as unknown as Stuff],
    };
  }
}
