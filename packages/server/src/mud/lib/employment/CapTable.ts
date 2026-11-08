/**
 * CapTableMixin — ⭐ **a table of owners and their units** (the
 * institutions slate, Part 1, *The primitive: a cap table*).
 *
 * Every question the slate's entity forms answer — who owns, who controls,
 * can ownership move — derives from one thing a business did not have: a
 * table of who holds how much of it. This is that table and nothing else:
 *
 *   - **`units`** — what the whole is divided into, authored (a ship's
 *     company authors 64: the sixty-fourths of the shipping trade);
 *   - **rows** `{holder, units}` — a holder is a player or an
 *     organization, by identity path; the rows come to `units` (or to
 *     nothing: a table nobody holds yet is a shape, not a business);
 *   - **the transfer term** — `free` (units move between holders with
 *     nobody else's say) or `consent` (every other holder must agree);
 *   - **the majority read** — {@link CapTable.majorityHolder}: the holder
 *     of MORE than half, else nobody. Control derives from it: the `owners`
 *     appointing authority ({@link PrincipalRef}) is *whoever holds a
 *     majority of this table*, so a sole owner appoints themself and a
 *     table split evenly appoints nobody until somebody buys a majority.
 *
 * ## ⭐ One act moves units
 *
 * {@link CapTable.sellUnits} is the slate's *secondary*: units move owner
 * to owner and money moves owner to owner, the business untouched — and
 * the two move **together or not at all**. The units are claimed
 * synchronously before the money is awaited (a second sale racing the
 * first sees them gone), the price settles to the seller, and if it does
 * not clear the units go back. {@link CapTable.giveUnits} is the same move
 * with no money (a gift). Both are gated to `title transfer`, which
 * takes the consents (the seller's, and under `consent` every other
 * holder's) before it asks.
 *
 * ⚠ A table that changes hands must be KEPT: a write on a host that does
 * not compose `PersistableMixin` throws (a sale that a restart forgets
 * would be a silent write). The concrete host is `PersistentBusiness`.
 *
 * ## Not here (the institutions slate keeps them)
 *
 * Forms, a filing registry and general incorporation, primary issue
 * (dilution), the draw as a pro-rata distribution and dividends, the bank
 * wall, charters, endorsements that assemble a majority from a minority
 * coalition, escheated interests that do not vote. ⭐ A unit is a vote in
 * the BUSINESS — it never confers standing in the polity.
 *
 * See docs/subsystems/employment.md § The owners authority.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import { PersistableApi } from '../../api/persistable';
import { BankingApi, Money } from '../../api/banking';

/** How units may move between holders. */
export type TransferTerm = 'free' | 'consent';

/** The blessed transfer terms (validation array). */
export const TRANSFER_TERMS: readonly TransferTerm[] = ['free', 'consent'] as const;

/** Who holds units: a player (identity path) or an organization (its identity path). */
export interface UnitHolder {
  kind: 'player' | 'organization';
  path: string;
  /** The holder's name as entered — what a page reads (a person may be offline). */
  name?: string;
}

/** One row of the table. */
export interface CapTableRow {
  holder: UnitHolder;
  units: number;
}

/** The table as authored and as kept. */
export interface CapTableData {
  /** What the whole is divided into. */
  units: number;
  /** How units move — `free`, or with every other holder's `consent`. */
  transfer: TransferTerm;
  /** The holders, in the order they first held. */
  rows: CapTableRow[];
}

/** Why a move was refused — the controller's note reason. */
export type CapTableRefusal =
  | 'no-table'
  | 'bad-count'
  | 'self-transfer'
  | 'not-a-holder'
  | 'needs-consent'
  | 'seller-no-account'
  | 'unpaid';

/** What a move answers: the rows as they now stand, or a refusal in words. */
export type CapTableResult =
  | { ok: true; rows: CapTableRow[] }
  | { ok: false; code: CapTableRefusal; reason: string };

/** A sale of units, owner to owner. */
export interface UnitSale {
  seller: UnitHolder;
  buyer: UnitHolder;
  units: number;
  /** Whole minor units the buyer pays the seller (0 = a sale for nothing). */
  priceMinor: number;
  /** What the payment is for, in words (the ledger line). */
  reason: string;
  /** Who besides the seller has agreed — read under the `consent` term. */
  consentedBy?: readonly UnitHolder[];
}

/** A gift of units. */
export interface UnitGift {
  from: UnitHolder;
  to: UnitHolder;
  units: number;
  consentedBy?: readonly UnitHolder[];
}

/** Public shape provided by {@link CapTableMixin}. */
export interface CapTable {
  /** The table as it stands (a copy), or `null` when this host keeps none. */
  getCapTable(): CapTableData | null;
  /** What the whole is divided into (`0` with no table). */
  totalUnits(): number;
  /** How units move. */
  transferTerm(): TransferTerm;
  /** The rows, in the order their holders first held (copies). */
  capTableRows(): CapTableRow[];
  /** How many units `holder` holds. */
  unitsHeldBy(holder: UnitHolder): number;
  /** ⭐ The holder of MORE than half the units, else `null` — the read control derives from. */
  majorityHolder(): UnitHolder | null;
  /** Who else must agree before `from`'s units move (`[]` under `free`). */
  consentNeededFrom(from: UnitHolder): UnitHolder[];
  /** ⭐ The secondary sale: units and money together, or neither. */
  sellUnits(sale: UnitSale): Promise<CapTableResult>;
  /** A gift of units: title only. */
  giveUnits(gift: UnitGift): Promise<CapTableResult>;
}

/**
 * ⚠ Who may LAY a table down whole: the template applier only — an
 * authored row, a minted company's founding overlay, a restored record.
 * Anything else that could set the table could rewrite who owns a
 * business with no sale and no gift (the money gate's shape, `Coin`).
 */
const FromTheApplier = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/platform/idea/TemplateApplier', { includeSubclasses: true }),
  SecurityPolicies.FromTemplate('/platform/idea/TemplateApplier'),
);

/** `title transfer` — it takes the consents before it asks. */
const FromTheTransfer = SecurityPolicies.FromModule('/platform/idea/cmd/civics/TitleTransferController');

function sameHolder(a: UnitHolder, b: UnitHolder): boolean {
  return a.kind === b.kind && a.path === b.path;
}

export function CapTableMixin<TBase extends MixinConstructor>(Base: TBase) {
  class CapTableMixin extends Base implements CapTable {
    static _mixinName = 'CapTableMixin';

    static fieldMeta: FieldMeta = {
      capTable: { persistent: true, authorable: true },
    };

    /** ⭐ The table — authored `{units, transfer, rows}`; `null` = keeps none. */
    public capTable: CapTableData | null = null;

    /**
     * The applier's setter (authored rows and restored records alike):
     * a malformed table is refused LOUDLY — units a positive whole number,
     * a known transfer term (default `free`), each row a holder by path
     * with a positive whole number of units, no holder twice, and the rows
     * coming to the whole or to nothing.
     */
    @CallSecurity(FromTheApplier)
    public setCapTable(raw: unknown): void {
      if (raw === null || raw === undefined || raw === '') {
        this.capTable = null;
        return;
      }
      if (typeof raw !== 'object') throw new Error(`CapTable: a cap table is {units, transfer, rows} (got ${JSON.stringify(raw)})`);
      const r = raw as Record<string, unknown>;
      const units = Number(r.units);
      if (!Number.isInteger(units) || units <= 0) throw new Error(`CapTable: units must be a positive whole number (got ${String(r.units)})`);
      const transfer = (r.transfer ?? 'free') as TransferTerm;
      if (!TRANSFER_TERMS.includes(transfer)) {
        throw new Error(`CapTable: transfer must be one of ${TRANSFER_TERMS.join(', ')} (got ${String(r.transfer)})`);
      }
      const rows: CapTableRow[] = [];
      for (const raw of Array.isArray(r.rows) ? (r.rows as Array<Record<string, unknown>>) : []) {
        const h = raw?.holder as Record<string, unknown> | undefined;
        const n = Number(raw?.units);
        if (!h || (h.kind !== 'player' && h.kind !== 'organization') || typeof h.path !== 'string' || h.path === '') {
          throw new Error(`CapTable: a row names its holder {kind: player|organization, path} (got ${JSON.stringify(raw)})`);
        }
        if (!Number.isInteger(n) || n <= 0) throw new Error(`CapTable: ${h.path} holds a positive whole number of units (got ${String(raw?.units)})`);
        const holder: UnitHolder = {
          kind: h.kind,
          path: h.path,
          ...(typeof h.name === 'string' && h.name !== '' ? { name: h.name } : {}),
        };
        if (rows.some((x) => sameHolder(x.holder, holder))) throw new Error(`CapTable: ${h.path} is on the table twice`);
        rows.push({ holder, units: n });
      }
      const held = rows.reduce((n, x) => n + x.units, 0);
      if (held !== 0 && held !== units) {
        throw new Error(`CapTable: the rows come to ${held}, not ${units} (a table is held whole, or not yet at all)`);
      }
      this.capTable = { units, transfer, rows };
    }

    public getCapTable(): CapTableData | null {
      const t = this.capTable;
      return t === null ? null : { units: t.units, transfer: t.transfer, rows: this.capTableRows() };
    }

    public totalUnits(): number {
      return this.capTable?.units ?? 0;
    }

    public transferTerm(): TransferTerm {
      return this.capTable?.transfer ?? 'free';
    }

    public capTableRows(): CapTableRow[] {
      return (this.capTable?.rows ?? []).map((x) => ({ holder: { ...x.holder }, units: x.units }));
    }

    public unitsHeldBy(holder: UnitHolder): number {
      return this.capTable?.rows.find((x) => sameHolder(x.holder, holder))?.units ?? 0;
    }

    public majorityHolder(): UnitHolder | null {
      const t = this.capTable;
      if (t === null) return null;
      const row = t.rows.find((x) => x.units * 2 > t.units);
      return row ? { ...row.holder } : null;
    }

    public consentNeededFrom(from: UnitHolder): UnitHolder[] {
      if (this.transferTerm() !== 'consent') return [];
      return this.capTableRows()
        .filter((x) => !sameHolder(x.holder, from))
        .map((x) => x.holder);
    }

    @CallSecurity(FromTheTransfer)
    public async sellUnits(sale: UnitSale): Promise<CapTableResult> {
      const refused = this.refusalOf(sale.seller, sale.buyer, sale.units, sale.consentedBy);
      if (refused !== null) return refused;
      const price = sale.priceMinor;
      if (!Number.isInteger(price) || price < 0) throw new Error(`CapTable.sellUnits: a price is whole minor units (got ${price})`);
      const payee = price > 0 ? await BankingApi.primaryAccountIdOf(sale.seller.path) : null;
      if (price > 0 && !payee) {
        return { ok: false, code: 'seller-no-account', reason: `${sale.seller.name ?? 'The seller'} has no account to be paid into.` };
      }
      // ⭐ Claimed before the money is awaited: re-checked and moved with no
      // await between, so a second sale racing this one finds them gone.
      const again = this.refusalOf(sale.seller, sale.buyer, sale.units, sale.consentedBy);
      if (again !== null) return again;
      this.move(sale.seller, sale.buyer, sale.units);
      if (price > 0) {
        try {
          await BankingApi.settle(
            {
              amount: Money.of(price, BankingApi.compactCurrency()),
              reason: sale.reason,
              presented: false,
              payeeAccountId: payee!,
              category: 'transfer',
            },
            { kind: 'credential' },
          );
        } catch (err) {
          // ⭐ Units and money together, or neither: the units go back.
          if (this.unitsHeldBy(sale.buyer) >= sale.units) this.move(sale.buyer, sale.seller, sale.units);
          else console.error(`CapTable: ${sale.units} units moved to ${sale.buyer.path} unpaid and could not move back`);
          return {
            ok: false,
            code: 'unpaid',
            reason: `The payment did not clear (${err instanceof Error ? err.message : String(err)}); the units stay ${sale.seller.name ?? 'the seller'}'s.`,
          };
        }
      }
      await this.keep();
      return { ok: true, rows: this.capTableRows() };
    }

    @CallSecurity(FromTheTransfer)
    public async giveUnits(gift: UnitGift): Promise<CapTableResult> {
      const refused = this.refusalOf(gift.from, gift.to, gift.units, gift.consentedBy);
      if (refused !== null) return refused;
      this.move(gift.from, gift.to, gift.units);
      await this.keep();
      return { ok: true, rows: this.capTableRows() };
    }

    /** Why `n` units cannot move from `from` to `to` now — or `null`. Throws on a host that keeps no record. */
    private refusalOf(
      from: UnitHolder,
      to: UnitHolder,
      n: number,
      consentedBy: readonly UnitHolder[] = [],
    ): (CapTableResult & { ok: false }) | null {
      const t = this.capTable;
      if (t === null || t.rows.length === 0) return { ok: false, code: 'no-table', reason: 'Nobody holds any of it to move.' };
      if (!MixinApi.isPersistable(this as unknown as Stuff)) {
        throw new Error('CapTable: a table that changes hands must be kept — compose PersistableMixin on its host');
      }
      if (!Number.isInteger(n) || n <= 0 || n > t.units) {
        return { ok: false, code: 'bad-count', reason: `Name a whole number of units from 1 to ${t.units}.` };
      }
      if (sameHolder(from, to)) return { ok: false, code: 'self-transfer', reason: 'Units cannot change hands with their own holder.' };
      const held = this.unitsHeldBy(from);
      if (held < n) {
        return {
          ok: false,
          code: 'not-a-holder',
          reason: held === 0 ? `${from.name ?? 'That name'} holds none of it.` : `${from.name ?? 'That name'} holds only ${held}.`,
        };
      }
      const missing = this.consentNeededFrom(from).filter((h) => !consentedBy.some((c) => sameHolder(c, h)));
      if (missing.length > 0) {
        return {
          ok: false,
          code: 'needs-consent',
          reason: `Its units move only with the other holders' consent: ${missing.map((h) => h.name ?? h.path).join(', ')} must agree.`,
        };
      }
      return null;
    }

    /** Move `n` units — synchronous, whole; a row that falls to nothing comes off, a new holder goes on the end. */
    private move(from: UnitHolder, to: UnitHolder, n: number): void {
      const t = this.capTable!;
      const rows = t.rows.map((x) => ({ holder: { ...x.holder }, units: x.units }));
      const src = rows.find((x) => sameHolder(x.holder, from))!;
      src.units -= n;
      const dst = rows.find((x) => sameHolder(x.holder, to));
      if (dst) dst.units += n;
      else rows.push({ holder: { ...to }, units: n });
      this.capTable = { units: t.units, transfer: t.transfer, rows: rows.filter((x) => x.units > 0) };
    }

    /** Capture the host's record — the table is kept. */
    private async keep(): Promise<void> {
      await PersistableApi.capture(this as unknown as Stuff);
    }
  }
  return CapTableMixin;
}
