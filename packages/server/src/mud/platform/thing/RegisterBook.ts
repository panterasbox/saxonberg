/**
 * RegisterBook — ⭐ **the ship register, open on a desk** (harbors P14).
 *
 * `read register` at the harbor office: every ship entered in the register
 * of the polity this book names (`government:`), by name, kind, flag and
 * owners in sixty-fourths. The page is DERIVED from the register's entries
 * each time it is read (`refreshMarks`) — never authored, never stale, and
 * never written by anybody holding the book: the register holds the pen.
 *
 * ⭐ The register is public (lens 4): anybody who can read can find out a
 * ship flying colors she is not entered under — false colors are a claim
 * the book contradicts.
 */

import Good from '../../lib/stuff/Good';
import { MarkedMixin } from '../../lib/description/Marked';
import ShipRegister, { type ShipEntry } from '../idea/ShipRegister';
import { GovernmentApi } from '../../api/government';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

export default class RegisterBook extends MarkedMixin(Good) {
  static fieldMeta: FieldMeta = {
    government: { persistent: true, authorable: true },
  };

  /** ⭐ Whose register this book is — a government key. */
  protected government = '';

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

  /** ⭐ The page, as the register stands now. */
  public override async refreshMarks(_viewer: Stuff): Promise<void> {
    const polity = GovernmentApi.getGovernment(this.government)?.name ?? this.government;
    const register = await this.shipRegister();
    this.setMarkText(this.pageOf(polity, register === null ? [] : await register.entries()));
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
  private pageOf(polity: string, entries: ShipEntry[]): string {
    const head = `THE REGISTER OF SHIPS of ${polity}.`;
    if (entries.length === 0) return `${head} No ship is entered.`;
    const lines = [...entries]
      .sort((a, b) => a.registeredAtS - b.registeredAtS)
      .map((e) => {
        // A ship of a kind says her kind; an authored ship is her own row and says none.
        const kind = e.kind !== e.key ? ` (${e.kind.split('/').pop() ?? e.kind})` : '';
        const owners = e.shares
          .map((h) => `${h.holder.name ?? h.holder.path.split('/').pop() ?? h.holder.path} ${h.shares}/64`)
          .join('; ');
        return `The ${e.name}${kind}, under the flag of ${polity}: ${owners}.`;
      });
    return `${head} ${lines.join(' ')}`;
  }
}
