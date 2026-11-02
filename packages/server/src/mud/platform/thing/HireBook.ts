/**
 * HireBook — ⭐ **the shed's hire book** (harbors review 1): what a house
 * lets by the day, and who has which of its boats out until when. It is a
 * LET, not a sale — a thing in your custody and never your title — so it is
 * its own book and nothing a shop counter keeps (`Stock` sells goods).
 *
 * - **`rates`** — kind row → minor units a day (`{ …/canoe: 3 }`); a kind
 *   with no rate is not let here. Authored.
 * - **The book of hires** — `rent` writes a line when a boat goes out
 *   (`recordHire`), and the boat strikes it when she is put down again on
 *   the landing she was let from (`HirableMixin.endHire` → `hireEnded`).
 *   The boat keeps the other copy. The book keeps its own so its `look` can
 *   name the boats out past their day without searching for them.
 * - **It affords `rent`** to whoever stands at it, and it is the VENUE the
 *   day's money is paid to — its house lists it in `operatingLocations`, as
 *   a counter is listed. Only the house's own boats lying in the book's room
 *   are let (`RentController`).
 *
 * ⭐ Kin to a lease: a holding let by the month is the same act at another
 * scale (custody for a term, paid up front, ended by giving it back). The
 * charter book (`CharterBook`) is its sibling for ships. Overdue is a fact
 * on the page, never a penalty — what a polity does about an unreturned
 * boat is the retail slate's.
 *
 * A fixture: its rows author `fixedInPlace: true`. Persistable, so the book
 * of hires survives a restart (a path-string `props:` entry stands it up
 * through `StuffApi.singleton`, which restores its record).
 */

import Good from './Good';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { PersistableApi } from '../../api/persistable';
import { WorldClockApi } from '../../api/worldclock';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';

/** A world day, seconds — what a hire is let by. */
const DAY_S = 86_400;

/** One line in the book: a boat out, and until when. */
export interface HireEntry {
  /** The hire's id — the boat let carries the same one. */
  id: string;
  /** The kind row let (what the page names). */
  kind: string;
  /** The hirer's name, as it was when she went out. */
  byName: string;
  /** The world second she is due back. */
  untilS: number;
}

export default class HireBook extends PersistableMixin(Good) {
  /** ⭐ A boat is hired at the book. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/retail/rent.yaml'],
  };

  static fieldMeta: FieldMeta = {
    rates: { persistent: true, authorable: true },
    hires: { persistent: true, runtimeState: true },
  };

  /** Kind row → minor units a day. */
  protected rates: Record<string, number> = {};

  /** Every hire let from this book and not yet back. */
  protected hires: HireEntry[] = [];

  public getRates(): Record<string, number> {
    return { ...this.rates };
  }

  /** The applier's Phase-1 setter: a rate is a positive whole number of minor units a day. */
  public setRates(value: unknown): void {
    if (value === null || value === undefined) {
      this.rates = {};
      return;
    }
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error('HireBook.rates: expected { <kind row>: <minor a day> }');
    const out: Record<string, number> = {};
    for (const [kind, rate] of Object.entries(value as Record<string, unknown>)) {
      if (typeof rate !== 'number' || !Number.isInteger(rate) || rate <= 0) {
        throw new Error(`HireBook.rates '${kind}': a day's hire is a positive whole number of minor units (got ${String(rate)})`);
      }
      out[kind] = rate;
    }
    this.rates = out;
  }

  /** A day's hire of `kind` here, or `null` when the house does not let it. */
  public rateFor(kind: string): number | null {
    return this.rates[kind] ?? null;
  }

  /** The hires out now, a copy. */
  public getHires(): HireEntry[] {
    return this.hires.map((h) => ({ ...h }));
  }

  /** ⭐ A boat went out (`rent`): a line in the book. */
  @CallSecurity(SecurityPolicies.FromModule('/platform/idea/cmd/retail/RentController'))
  public recordHire(hire: HireEntry): void {
    this.hires = [...this.hires.filter((h) => h.id !== hire.id), { ...hire }];
    this.save();
  }

  /** ⭐ She is home: the line is struck. Ending a hire harms nobody, so it is ungated. */
  public hireEnded(id: string): void {
    const before = this.hires.length;
    this.hires = this.hires.filter((h) => h.id !== id);
    if (this.hires.length !== before) this.save();
  }

  /** The hires out past their day at `nowS`. */
  public overdueHires(nowS: number): HireEntry[] {
    return this.hires.filter((h) => h.untilS < nowS).map((h) => ({ ...h }));
  }

  override getLong(): string {
    const base = super.getLong();
    const page = this.pageWords();
    return page === '' ? base : base ? `${base} ${page}` : page;
  }

  /** What the book lets, and the boats out past their day — facts on the page; nothing enforces them. */
  private pageWords(): string {
    const parts: string[] = [];
    const lets = Object.entries(this.rates)
      .map(([kind, rate]) => `${kind.split('/').pop() ?? kind} (${rate} a day)`)
      .join(', ');
    if (lets !== '') parts.push(`For hire: ${lets}.`);
    const nowS = WorldClockApi.getNow().rawValue();
    for (const h of this.overdueHires(nowS)) {
      const days = Math.max(1, Math.floor((nowS - h.untilS) / DAY_S));
      const name = h.kind.split('/').pop() ?? h.kind;
      parts.push(`Written under it: a ${name} out with ${h.byName}, ${days === 1 ? 'a day' : `${days} days`} past its day.`);
    }
    return parts.join(' ');
  }

  private save(): void {
    try {
      void PersistableApi.capture(this as unknown as Stuff).catch((err) => console.warn('HireBook: capture failed:', err));
    } catch (err) {
      console.warn('HireBook: capture failed:', err);
    }
  }
}
