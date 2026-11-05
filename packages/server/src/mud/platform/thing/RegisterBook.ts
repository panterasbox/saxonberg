/**
 * RegisterBook — ⭐ **the ship register, open on a desk**.
 *
 * `read register` at the harbor office: every ship entered in the register
 * of the polity this book names (`government:`), by name, kind, flag and
 * owner — the company that holds her title — and, beside it, who holds
 * that company in sixty-fourths (its cap table, read off the company
 * itself: the register keeps the title, the company keeps its owners —
 * review 1). The page is DERIVED each time it is read (`refreshMarks`) —
 * never authored, never stale, and never written by anybody holding the
 * book: the register holds the pen, and the table moves only by a sale or
 * a gift.
 *
 * ⭐ The register is public (lens 4): anybody who can read can find out a
 * ship flying colors she is not entered under — false colors are a claim
 * the book contradicts.
 *
 * ⭐ **Or a house's ledger** (paper D7): `registerPrefix:` names a document
 * prefix instead — a business's own branch — and the page lists one line per
 * paper filed under it (`read ledger` at the print shop). Same rule: the page
 * is a VIEW of the records, written by nobody holding the book; burn the book
 * and the documents stand. An extract is `print <book>` — the page frozen as
 * an edition whose source is the prefix. One class, two ways to name what it
 * reads; `refreshMarks` branches on which is set (`government` first).
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin } from '../../lib/description/Marked';
import ShipRegister, { type ShipEntry } from '../idea/ShipRegister';
import Ship from '../idea/Ship';
import { GovernmentApi } from '../../api/government';
import { ExpanseApi } from '../../api/expanse';
import type { CapTable } from '../../lib/employment/CapTable';
import { StuffApi } from '../../api/stuff';
import { DocumentApi } from '../../api/document';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

/** A ledger page lists this many papers; the rest are older pages. */
const LINES_PER_PAGE = 40;

export default class RegisterBook extends MarkedMixin(Good) {
  static fieldMeta: FieldMeta = {
    government: { persistent: true, authorable: true },
    registerPrefix: { persistent: true, authorable: true },
    registerTitle: { persistent: true, authorable: true },
  };

  /** ⭐ Whose register this book is — a government key. */
  protected government = '';
  /** ⭐ Or: what this book is the ledger OF — a document prefix. */
  protected registerPrefix = '';
  /** Whose ledger it is, in words (`the Terminus Gazette`); `''` = read off the prefix. */
  protected registerTitle = '';

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  public getGovernment(): string {
    return this.government;
  }
  public setGovernment(value: string): void {
    this.government = typeof value === 'string' ? value : '';
  }

  public getRegisterPrefix(): string {
    return this.registerPrefix;
  }
  public setRegisterPrefix(value: string): void {
    this.registerPrefix = typeof value === 'string' ? value.replace(/\/+$/, '') : '';
  }

  /** ⭐ The page, as the register (or the ledger) stands now. */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    this.setMarkText(await this.currentPage());
  }

  /** The page in words — the ship register's, or the house ledger's. */
  public async currentPage(): Promise<string> {
    if (this.government !== '') {
      const polity = GovernmentApi.getGovernment(this.government)?.name ?? this.government;
      const register = await this.shipRegister();
      const entries = register === null ? [] : await register.entries();
      const owners = new Map<string, (Stuff & CapTable) | null>();
      for (const e of entries) owners.set(e.key, await this.companyOf(e));
      return this.pageOf(polity, entries, owners);
    }
    return this.ledgerPage();
  }

  /** A house's ledger: one line per paper filed under the prefix, newest last. */
  private async ledgerPage(): Promise<string> {
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
    return (parts[parts.length - 1] ?? 'the house').replace(/-/g, ' ');
  }

  /**
   * The company that holds her title, standing — asked of HER (stood up by
   * her handle if she sleeps), never searched for. `null` (the page then
   * names the title alone) when she or it does not stand, or her company
   * is not the one entered.
   */
  private async companyOf(e: ShipEntry): Promise<(Stuff & CapTable) | null> {
    const craft = await ExpanseApi.standUpCraft(e.key);
    if (!(craft instanceof Ship)) return null;
    const company = await craft.company();
    return company !== null && company.getIdentityPath() === e.owner ? company : null;
  }

  /** The register this book is the page of — the one its government keeps (`Government.shipRegister`). */
  private async shipRegister(): Promise<ShipRegister | null> {
    const path = this.government ? GovernmentApi.getGovernment(this.government)?.shipRegister : '';
    if (!path) return null;
    const reg = await StuffApi.singleton<Stuff>(path).catch((err) => {
      console.warn(`RegisterBook: ${this.government}'s register '${path}' did not stand up:`, err);
      return null;
    });
    return reg instanceof ShipRegister ? reg : null;
  }

  /** The register's page in words: one line per ship, in the order entered. */
  private pageOf(polity: string, entries: ShipEntry[], owners: Map<string, (Stuff & CapTable) | null>): string {
    const head = `THE REGISTER OF SHIPS of ${polity}.`;
    if (entries.length === 0) return `${head} No ship is entered.`;
    const lines = [...entries]
      .sort((a, b) => a.registeredAtS - b.registeredAtS)
      .map((e) => {
        // A ship of a kind says her kind; an authored ship is her own row and says none.
        const kind = e.kind !== e.key ? ` (${e.kind.split('/').pop() ?? e.kind})` : '';
        const company = owners.get(e.key) ?? null;
        const title = company?.getPresentation() ?? (e.owner.split('/').pop() || 'nobody');
        const total = company?.totalUnits() ?? 0;
        const held = (company?.capTableRows() ?? [])
          .map((x) => `${x.holder.name ?? x.holder.path.split('/').pop() ?? x.holder.path} ${x.units}/${total}`)
          .join('; ');
        return `The ${e.name}${kind}, under the flag of ${polity}: owned by ${title}${held === '' ? '' : `, held ${held}`}.`;
      });
    return `${head} ${lines.join(' ')}`;
  }
}
