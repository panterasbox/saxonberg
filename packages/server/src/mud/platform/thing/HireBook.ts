/**
 * HireBook — ⭐ **the shed's hire book**: what a house
 * lets by the day, and which of its boats are out past their day. It is a
 * LET, not a sale — a thing in your custody and never your title — so it is
 * its own book and nothing a shop counter keeps (`Stock` sells goods).
 *
 * - **`rates`** — kind row → minor units a day (`{ …/canoe: 3 }`); a kind
 *   with no rate is not let here. Authored.
 * - ⭐ **One record of a hire: the boat's**. `rent` puts
 *   her on hire (`HirableMixin.hireTo`) and her hire names this book as the
 *   one that let her; the book writes nothing. Its page reads who has which
 *   boat, and until when, OFF THE BOATS: the live boats of the kinds its own
 *   `rates` name whose hire names this book (`hiresOut`). That follows the
 *   book's authored refs (the kinds) through the registry's by-row index —
 *   no world walk, and no second copy to drift (*Two records of one fact*,
 *   antipatterns.md). A boat that is not standing — her hirer away, her
 *   hire riding his snapshot — is not on the page until she is loaded
 *   again: the book cannot read what is not there, and it never guesses.
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
 * A fixture: its rows author `fixedInPlace: true`. Not persistable — it
 * keeps nothing but what its row authors.
 */

import Good from './Good';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Hirable } from '../../lib/retail/Hirable';

/** A world day, seconds — what a hire is let by. */
const DAY_S = 86_400;

/** A boat this book let, as her own hire says it. */
export interface HireOut {
  /** The boat, live. */
  boat: Stuff & Hirable;
  /** The kind row she was cloned from (what the page names). */
  kind: string;
  /** The hirer's name, as she was let. */
  byName: string;
  /** The world second she is due back. */
  untilS: number;
}

export default class HireBook extends Good {
  /** ⭐ A boat is hired at the book. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/retail/rent.yaml'],
  };

  static fieldMeta: FieldMeta = {
    rates: { persistent: true, authorable: true },
  };

  /** Kind row → minor units a day. */
  protected rates: Record<string, number> = {};

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

  /**
   * ⭐ The boats out on hire from this book, read off their own hires: the
   * standing boats of every kind this book lets whose hire names it.
   */
  public hiresOut(): HireOut[] {
    const me = this.getIdentityPath() ?? '';
    if (me === '') return [];
    const out: HireOut[] = [];
    for (const kind of Object.keys(this.rates)) {
      for (const boat of StuffApi.findAllByTemplatePath<Stuff>(kind)) {
        if (boat.isDestroyed() || !MixinApi.isHirable(boat) || boat.hiredFrom() !== me) continue;
        out.push({ boat, kind, byName: boat.hiredByName() ?? 'somebody', untilS: boat.hiredUntilS() ?? 0 });
      }
    }
    return out;
  }

  /** The boats out past their day at `nowS`. */
  public overdueHires(nowS: number): HireOut[] {
    return this.hiresOut().filter((h) => h.untilS < nowS);
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
}
