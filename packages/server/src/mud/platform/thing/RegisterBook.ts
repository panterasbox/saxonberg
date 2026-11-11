/**
 * RegisterBook — ⭐ **the book of a house's or a polity's records, open on a
 * desk** (harbors' ship register): `read ledger` at the print
 * shop, `read register` at the harbor office.
 *
 * ⭐⭐ **A view, never the record.** The book names a document branch
 * (`registerPrefix:` — a business's feed, a government's register of ships)
 * and its page is DERIVED each time it is read (`refreshMarks`): one line
 * per record filed there, never authored, never stale, and never written by
 * anybody holding the book. The records are documents; burn the book and
 * they stand, and a new book reads them again. An extract is `print <book>`
 * — the page frozen as an edition whose source is the prefix.
 *
 * ⭐ **What a line says is the record's kind.** A ship's entry reads as her
 * name, kind and flag, the company that holds her title and — beside it —
 * who holds that company in sixty-fourths (its cap table, read off the
 * company itself: the register keeps the title, the company keeps its
 * owners). Any other paper reads as its kind, its leaf and its title.
 *
 * ⭐ A register is public (lens 4): anybody who can read can find out a ship
 * flying colors she is not entered under — false colors are a claim the
 * book contradicts.
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin } from '../../lib/description/Marked';
import ShipRegister, { type ShipEntry } from '../idea/ShipRegister';
import Ship from '../idea/Ship';
import { GovernmentApi } from '../../api/government';
import { ExpanseApi } from '../../api/expanse';
import { DocumentApi } from '../../api/document';
import { StuffApi } from '../../api/stuff';
import type { CapTable } from '../../lib/employment/CapTable';
import type { StoredDocument } from '../../lib/document/StoredDocument';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

/** A page lists this many records; the rest are older pages. */
const LINES_PER_PAGE = 40;

/** The document kind a ship's register entry is filed as. */
const SHIP_ENTRY_KIND = 'ship';

export default class RegisterBook extends MarkedMixin(Good) {
  static fieldMeta: FieldMeta = {
    registerPrefix: { persistent: true, authorable: true },
    registerTitle: { persistent: true, authorable: true },
  };

  /** ⭐ What this book is the page OF — a document branch. */
  protected registerPrefix = '';
  /** What the book is, in words, for its head (`the register of ships of the City of Terminus`); `''` = read off the prefix. */
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

  public setRegisterTitle(value: string): void {
    this.registerTitle = typeof value === 'string' ? value : '';
  }

  /** ⭐ The page, as the records stand now. */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    this.setMarkText(await this.currentPage());
  }

  /** The page in words: one line per record, in the order filed. */
  public async currentPage(): Promise<string> {
    if (this.registerPrefix === '') return '';
    const docs = (await DocumentApi.list(`${this.registerPrefix}/`)).filter((d) => d.getKind() !== 'edition');
    const head = `${this.headWords()}.`;
    if (docs.length === 0) return `${head} Nothing is entered.`;
    // Stable: records with a filing time (a ship's entry) in that order; the rest as listed.
    const ordered = docs
      .map((d, i) => ({ d, at: Number((d.getData() as Record<string, unknown>).registeredAtS ?? 0) || 0, i }))
      .sort((a, b) => a.at - b.at || a.i - b.i)
      .slice(-LINES_PER_PAGE);
    const lines: string[] = [];
    for (const { d } of ordered) lines.push(await this.lineFor(d));
    return `${head} ${lines.join(' ')}`;
  }

  /** One record's line — in the words its kind is read in. */
  private async lineFor(doc: StoredDocument): Promise<string> {
    if (doc.getKind() === SHIP_ENTRY_KIND) {
      const entry = await this.shipEntryOf(doc);
      if (entry !== null) return this.shipLine(entry);
    }
    const pages = await DocumentApi.pagesOf(doc.getPath());
    const leaf = doc.getPath().split('/').filter(Boolean).pop() ?? doc.getPath();
    return `${doc.getKind()} ${leaf}: ${(pages?.title ?? '').trim() || 'a paper'}.`;
  }

  /**
   * A ship's entry, as her register reads it — the register named by her
   * flag (its government's `shipRegister`), followed forward, never searched.
   */
  private async shipEntryOf(doc: StoredDocument): Promise<ShipEntry | null> {
    const data = doc.getData() as Record<string, unknown>;
    const flag = typeof data.flag === 'string' ? data.flag : '';
    const name = typeof data.name === 'string' ? data.name : '';
    if (flag !== '') await StuffApi.ready(GovernmentApi);
    const path = flag === '' ? '' : (GovernmentApi.getGovernment(flag)?.shipRegister ?? '');
    if (path === '' || name === '') return null;
    const reg = await StuffApi.singleton<Stuff>(path).catch((err) => {
      console.warn(`RegisterBook: ${flag}'s register '${path}' did not stand up:`, err);
      return null;
    });
    return reg instanceof ShipRegister ? reg.entryNamed(name) : null;
  }

  /** A ship's entry: her name, kind and flag, her owning company, and who holds it. */
  private async shipLine(e: ShipEntry): Promise<string> {
    await StuffApi.ready(GovernmentApi);
    const polity = GovernmentApi.getGovernment(e.flag)?.name ?? e.flag;
    // A ship of a kind says her kind; an authored ship is her own row and says none.
    const kind = e.kind !== e.key ? ` (${e.kind.split('/').pop() ?? e.kind})` : '';
    const company = await this.companyOf(e);
    const title = company?.getPresentation() ?? (e.owner.split('/').pop() || 'nobody');
    const total = company?.totalUnits() ?? 0;
    const held = (company?.capTableRows() ?? [])
      .map((x) => `${x.holder.name ?? x.holder.path.split('/').pop() ?? x.holder.path} ${x.units}/${total}`)
      .join('; ');
    return `The ${e.name}${kind}, under the flag of ${polity}: owned by ${title}${held === '' ? '' : `, held ${held}`}.`;
  }

  /**
   * The company that holds her title, standing — asked of HER (stood up by
   * her handle if she sleeps), never searched for. `null` (the line then
   * names the title alone) when she or it does not stand, or her company
   * is not the one entered.
   */
  private async companyOf(e: ShipEntry): Promise<(Stuff & CapTable) | null> {
    const craft = await ExpanseApi.standUpCraft(e.key);
    if (!(craft instanceof Ship)) return null;
    const company = await craft.company();
    return company !== null && company.getIdentityPath() === e.owner ? company : null;
  }

  private headWords(): string {
    if (this.registerTitle !== '') return this.registerTitle.charAt(0).toUpperCase() + this.registerTitle.slice(1);
    const parts = this.registerPrefix.split('/').filter(Boolean);
    return `The book of ${(parts[parts.length - 1] ?? 'the house').replace(/-/g, ' ')}`;
  }
}
