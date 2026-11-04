/**
 * Sheet — a sheet of paper (the paper build): the medium a document is
 * frozen onto, and the commonest wrapping a city has.
 *
 * ⭐ **The Document is the source of truth; paper is one way of showing
 * it.** A PRINTED sheet is bound to an *edition* (`boundTo` + `page`) — the
 * pages a printing froze — and reads it by path with **no title check**:
 * whoever holds the paper reads it, which is both the point of paper and
 * the risk of printing a private record (D6). A HANDWRITTEN sheet carries
 * its own words (`markText`) and is bound to nothing, which is what makes a
 * hand copy decidable by the issuer of the original (D3, D8).
 *
 * What the class decides, model-side:
 *
 * - **folding** steps a sheet through its formats — folio, quarto, octavo —
 *   and a fourth fold will not go (D10);
 * - **ink and size**: writing needs ink in hand, and unsized paper drinks it
 *   and the line bleeds (D18, D19);
 * - **pulping**: soaked through, the felt lets go — a latch, then the sheet
 *   destructs to a lump of pulp on the next tick (D12); burnt, it reads as
 *   ash (the `Marked` ash read);
 * - **tearing** makes two halves, each with the half of the text it held,
 *   bound to nothing (D13).
 *
 * `Ticket` extends this; wallpaper, labels, filter paper and the blank ream
 * are ROWS of it.
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin } from '../../lib/description/Marked';
import { MoistureMixin } from '../../lib/material/Moisture';
import { ReservedMixin } from '../../lib/reserve';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { CombustibleMixin } from '../../lib/fire/Combustible';
import { StackableMixin } from '../../lib/stuff/Stackable';
import { FoldableMixin } from '../../lib/slot/Foldable';
import { TearableMixin, type TearOutcome } from '../../lib/material/Tearable';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { DocumentApi } from '../../api/document';
import { ScheduleApi } from '../../api/schedule';
import { Quantity } from '../../lib/quantity';
import type Material from '../../lib/material/Material';

/** The formats a sheet folds through (D10). */
export const SHEET_FORMATS = ['sheet', 'folio', 'quarto', 'octavo'] as const;
export type SheetFormat = (typeof SHEET_FORMATS)[number];

/** Wet past this (the `soaked` band) and the felt lets go (D12). */
const PULPS_AT = 0.8;

/** What `look` adds: the format, the state of the paper. */
const sheetAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!(host instanceof Sheet)) return text;
  const words = host.paperWords();
  if (words === '') return text;
  return text && text.length > 0 ? `${text}\n\n${words}` : words;
};

const SheetBase = TearableMixin(
  FoldableMixin(
    StackableMixin(
      CombustibleMixin(ThermalMixin(ReservedMixin(MoistureMixin(MarkedMixin(Good))))),
    ),
  ),
);

export default class Sheet extends SheetBase {
  static fieldMeta: FieldMeta = {
    boundTo: { persistent: true, authorable: true, stackIdentity: true },
    page: { persistent: true, authorable: true, stackIdentity: true },
    folds: { persistent: true, stackIdentity: true },
    torn: { persistent: true, stackIdentity: true },
    cockled: { persistent: true, authorable: true, stackIdentity: true },
    sized: { persistent: true, authorable: true, stackIdentity: true },
    pulped: { persistent: true },
    pulpTemplate: { persistent: true, authorable: true },
    color: { persistent: true, authorable: true, stackIdentity: true },
    evenness: { persistent: true, stackIdentity: true },
    formed: { persistent: true, stackIdentity: true },
    pressed: { persistent: true, stackIdentity: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [sheetAugmenter];

  /** The edition this sheet is a printed page of; `''` = handwritten or blank. */
  public boundTo = '';
  /** Which page of the edition (0-based). */
  public page = 0;
  /** How many times it is folded: 0 sheet · 1 folio · 2 quarto · 3 octavo. */
  public folds = 0;
  /** A torn half: smaller paper, bound to nothing. */
  public torn = false;
  /** Dried unpressed, it cockled — it will not lie flat in a glued ply. */
  public cockled = false;
  /** Sized (a set coat of size, or made so): it takes ink without bleeding. */
  public sized = false;
  /** Soaked through and gone to pulp; destructs on the next tick. */
  public pulped = false;
  /** The row a pulped sheet leaves behind (a lump of wet fibre); `''` = none. */
  public pulpTemplate = '';
  /** ⭐ Its color, read off the vat's water at the dip (paper D9): `white` · `brown`. */
  public color = 'white';
  /** How evenly the vatman laid the pulp — their band at the dip; `''` = shop paper. */
  public evenness = '';
  /** Formed on a mould at a vat (a mill's sheet), not cut from a ream. */
  public formed = false;
  /** Pressed in the post before it dried; a formed sheet dried unpressed cockles. */
  public pressed = false;

  // ---------- reading (D1, D2, D6) ----------

  public getBoundTo(): string {
    return this.boundTo;
  }

  public getPage(): number {
    return this.page;
  }

  /**
   * ⭐ Bind this sheet to a page of a frozen edition (the press, the
   * printer, the bearer receipt). Its words are read from the edition from
   * now on; it takes no handwriting.
   */
  public bindTo(editionPath: string, page = 0): void {
    this.boundTo = editionPath;
    this.page = Math.max(0, Math.floor(page));
    this.setWritingRoom(0);
    // A printed copy answers to what it is: `read copy`, `get printed`.
    const words = this.getKeywords();
    this.setKeywords([...words, ...['copy', 'printed', 'print'].filter((w) => !words.includes(w))]);
  }

  /** @hook A printed sheet reads its edition — no title check (D6). */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    if (this.boundTo === '') return;
    const pages = await DocumentApi.pagesOf(this.boundTo);
    if (pages === null) return;
    this.setMarkText(pages.pages[this.page] ?? '');
  }

  /** @hook A printed recipe teaches *known-of* — never `make` (the ladder). */
  public override async teach(reader: Stuff): Promise<string | null> {
    if (this.boundTo === '') return null;
    const pages = await DocumentApi.pagesOf(this.boundTo);
    return this.teachRecipes(reader, pages?.teaches ?? []);
  }

  // ---------- the making (paper W2) ----------

  /** ⭐ Formed at a vat: wet through, its color and evenness the vat's and the hand's. */
  public formAt(color: string, evenness: string): void {
    this.formed = true;
    this.pressed = false;
    this.color = color === 'brown' ? 'brown' : 'white';
    this.evenness = evenness;
    this.sized = false;
    this.setWaterState({ moisture: 1, solute: 0 });
  }

  /** ⭐ Squeezed in the post: the water pressed out, and it will dry flat. */
  public pressOut(): boolean {
    if (!this.formed || this.pressed) return false;
    this.pressed = true;
    // The stored water, not a read against the air: the press acts now.
    this.setWaterState({ moisture: Math.min(this._moisture, 0.5), solute: this._solute });
    return true;
  }

  /** Dried without pressing, a formed sheet ripples and will not lie flat (D20). */
  public isCockled(): boolean {
    if (this.cockled) return true;
    return this.formed && !this.pressed && this.getMoisture() < 0.5;
  }

  /** Too wet to take ink or to fold: it has just come off the mould. */
  public isWaterleaf(): boolean {
    return this.formed && this.getMoisture() >= 0.5;
  }

  // ---------- the format (D10) ----------

  public format(): SheetFormat {
    return SHEET_FORMATS[Math.min(3, Math.max(0, this.folds))] ?? 'sheet';
  }

  public override isFolded(): boolean {
    return this.folds > 0;
  }

  public override fold(): void {
    if (this.folds >= 3) return;
    this.folds += 1;
    super.fold();
  }

  public override unfold(): void {
    this.folds = 0;
    super.unfold();
  }

  public override setFolded(value: boolean): void {
    if (!value) this.folds = 0;
    else if (this.folds === 0) this.folds = 1;
    super.setFolded(value);
  }

  /** @hook A sheet folds three times. */
  public override foldRefusal(): { reason: string; line: string } | null {
    return this.folds >= 3 ? { reason: 'will-not-fold-again', line: 'It is folded to octavo already; it will not fold again.' } : null;
  }

  // ---------- writing (D18, D19) ----------

  /** Sized: made so, or a set coat of size on it. */
  public isSized(): boolean {
    if (this.sized) return true;
    return this.getCoats('outside').some((c) => {
      if (c.state !== 'set') return false;
      const m = StuffApi.findByTemplatePath<Material>(c.material);
      return m?.hasTag('size') === true;
    });
  }

  public override writeOn(
    by: Stuff,
    words: string,
    medium?: Stuff,
  ): { ok: true; line: string } | { ok: false; reason: string; line: string } {
    const self = this as unknown as Stuff;
    if (this.boundTo !== '') {
      return { ok: false, reason: 'printed', line: `${self.getPresentation()} is printed; there is no room to write on it.` };
    }
    // Paint on paper letters as paint does (a poster in paint).
    if (medium !== undefined && MixinApi.isBulkable(medium) && medium.hasInteriorBulk() && medium.getBulkMaterial('interior')?.getLaysCoat()) {
      return super.writeOn(by, words, medium);
    }
    const text = words.trim();
    if (text === '') return { ok: false, reason: 'nothing-to-write', line: 'Write what?' };
    const ink = this.inkInHand(by, medium);
    if (ink === null) {
      return {
        ok: false,
        reason: 'no-ink',
        line: medium !== undefined
          ? `There is no ink in ${medium.getPresentation()}.`
          : `You have nothing to write on ${self.getPresentation()} with — paper takes ink, and you hold none.`,
      };
    }
    if (this.isWaterleaf()) {
      return { ok: false, reason: 'wet', line: `${self.getPresentation()} is still wet from the mould; the ink would spread. Let it dry.` };
    }
    if (!this.isSized()) {
      return {
        ok: false,
        reason: 'bleeds',
        line: `The ink runs into ${self.getPresentation()} in a feathered blot — it is unsized, and drinks the ink. It wants sizing first.`,
      };
    }
    const out = super.writeOn(by, words);
    if (out.ok) this.spendInk(ink, text.length);
    return out;
  }

  // ---------- water (D12) ----------

  public isPulped(): boolean {
    return this.pulped;
  }

  /** Pushed water: soaked through, the felt lets go and the sheet pulps. */
  public override wet(delta: number): void {
    super.wet(delta);
    if (!this.pulped && this.getWetness() >= PULPS_AT) this.pulp();
  }

  /**
   * ⭐ The latch-then-tick shape (Combustible's burn-through): destructing
   * from inside a read is unsafe, so the sheet latches and goes on the next
   * tick, leaving a lump of pulp where it lay.
   */
  protected pulp(): void {
    this.pulped = true;
    const self = this as unknown as Stuff;
    ScheduleApi.schedule(0, () => {
      void (async () => {
        if (self.isDestroyed?.()) return;
        const where = MixinApi.isContainable(self) ? self.getContainer() : null;
        if (this.pulpTemplate !== '') {
          const lump = await StuffApi.clone(this.pulpTemplate);
          if (where !== null && MixinApi.isContainable(lump) && MixinApi.isContainer(where)) {
            ContainmentApi.move(lump, where);
          }
        }
        StuffApi.destruct(self);
      })();
    });
  }

  // ---------- tearing (D13) ----------

  public override async tear(by: Stuff, _page?: number): Promise<TearOutcome> {
    let piece: Sheet = this;
    if (this.getQuantity() > 1) piece = (await this.split(1)) as unknown as Sheet;
    await piece.refreshMarks(by);
    const text = piece.getMarkText();
    const cut = Math.ceil(text.length / 2);
    const left = text.slice(0, cut).trim();
    const right = text.slice(cut).trim();
    const self = piece as unknown as Stuff;
    // Named BEFORE the tear: two blank halves are alike and stack on arrival.
    const name = self.getPresentation();
    const path = self.getTemplatePath() ?? '/platform/thing/sheet';
    const other = await StuffApi.clone<Sheet>(path);
    for (const half of [piece, other]) {
      half.boundTo = '';
      half.page = 0;
      half.torn = true;
      half.folds = 0;
      half.setWritingRoom(Math.floor(piece.getWritingRoom() / 2));
    }
    piece.setMarkText(left);
    other.setMarkText(right);
    other.sized = piece.sized;
    if (MixinApi.isTangible(self) && MixinApi.isTangible(other)) {
      const half = self.getMass().rawValue() / 2;
      self.setMass(Quantity.of(half, 'kg'));
      other.setMass(Quantity.of(half, 'kg'));
    }
    const where = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (where !== null && MixinApi.isContainer(where)) ContainmentApi.move(other, where);
    return {
      ok: true,
      line: text.length > 0
        ? `You tear ${name} in two; the writing goes with the halves.`
        : `You tear ${name} in two.`,
      made: [self, other],
    };
  }

  // ---------- look ----------

  /** The state of the paper, in words — format, sizing, cockle, torn. */
  public paperWords(): string {
    const bits: string[] = [];
    if (this.folds > 0) bits.push(`It is folded to ${this.format()}.`);
    if (this.torn) bits.push('It is a torn half of a sheet.');
    if (this.formed) {
      const kg = this.getMass().rawValue() / Math.max(1, this.getQuantity());
      const weight = kg >= 0.008 ? 'heavy' : kg >= 0.004 ? 'middling' : 'thin';
      bits.push(`It is ${this.color} paper, ${weight} in the hand${this.evenness ? `, ${this.evenness}` : ''}.`);
      if (this.isWaterleaf()) bits.push('It is still wet from the mould.');
    }
    if (this.isCockled()) bits.push('It has dried cockled, rippled and unflat.');
    if (this.isSized()) bits.push('It is sized, smooth to the nib.');
    else if (this.boundTo === '') bits.push('It is unsized, soft as blotting paper.');
    return bits.join(' ');
  }
}
