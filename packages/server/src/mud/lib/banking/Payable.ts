/**
 * PayableMixin — ⭐ **a thing that says what you owe**: a
 * harbor office's book, and later any bill. `pay <it>` with no amount pays
 * every bill it holds for the payer, in the order it lists them, each to
 * the venue the bill names (`EmploymentApi.settleSale` — the payer is the
 * acting principal, credential then cash), and stops at the first that
 * cannot be paid; the payer is told what was paid and what was not.
 *
 * A bill is DERIVED by its holder at the moment of paying (the harbor
 * reads its book; a ship keeps what she was billed) — the amount is never
 * typed by the payer, and nothing here stores one.
 *
 * ⛔ Not on `Business`: a house is paid through its counters. A class
 * composes this when it is the place a debt is settled.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import { EmploymentApi } from '../../api/employment';

/** One bill a payer owes, as its holder reads it now. */
export interface Bill {
  /**
   * The venue the money goes to — a place or fixture a Business lists in
   * its `operatingLocations`, as a sale's venue is (`settleSale`).
   */
  to: string;
  /** Whole minor units. */
  amountMinor: number;
  /** What it is for, in words — `dues for the Kittiwake`. */
  reason: string;
  /** The holder's own handle on the bill, read back by `onPaid`; opaque to everyone else. */
  key: string;
}

/** A bill paid, and the settlement's own tail (how it cleared). */
export interface PaidBill {
  bill: Bill;
  tail: string;
}

/**
 * ⭐ Why paying here stopped (controller-liquidity W7c) — the `pay` verb
 * words each.
 *  - `amount-at-payable` — a sum was named; what is owed is the holder's to say.
 *  - `nothing-owed` — no bill for the payer.
 *  - `bill-unpaid` — `stuck` could not be covered; `paid` went before it,
 *    `owed` is everything still owed (`stuck` first).
 */
export type PayBillsRefusal =
  | ActRefusal<'amount-at-payable'>
  | ActRefusal<'nothing-owed'>
  | ActRefusal<'bill-unpaid', { paid: readonly PaidBill[]; stuck: Bill; owed: readonly Bill[] }>;

/** What paying a holder's bills came to: every bill paid, or where it stopped. */
export type PayBillsAnswer = ActOutcome<{ paid: readonly PaidBill[] }> | PayBillsRefusal;

export interface Payable {
  /** ⭐ What `payer` owes here now, in the order it is paid. `[]`: nothing. */
  billsFor(payer: Stuff): Promise<Bill[]>;
  /** `bill` has been paid by `payer`: the holder marks it settled. */
  onPaid(bill: Bill, payer: Stuff): Promise<void>;
  /**
   * ⭐ `pay <it>` (controller-liquidity W7c): pay every bill held for
   * `payer`, in order, each to the venue it names (the payer is the acting
   * principal — credential, then cash), stopping at the first that cannot
   * be paid. `statedMinor` is a sum the payer named: refused, never used.
   */
  payBillsBy(payer: Stuff, statedMinor: number | null): Promise<PayBillsAnswer>;
}

export function PayableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PayableMixin extends Base implements Payable {
    static _mixinName: string = 'PayableMixin';

    /** @hook Override: the bills held for `payer`. Default: none. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async billsFor(_payer: Stuff): Promise<Bill[]> {
      return [];
    }

    /** @hook Override: mark `bill` settled. Default: nothing kept. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async onPaid(_bill: Bill, _payer: Stuff): Promise<void> {
      return;
    }

    public async payBillsBy(payer: Stuff, statedMinor: number | null): Promise<PayBillsAnswer> {
      if (statedMinor !== null) return { ok: false, reason: 'amount-at-payable' };
      const bills = (await this.billsFor(payer)).filter((b) => b.amountMinor > 0);
      if (bills.length === 0) return { ok: false, reason: 'nothing-owed' };
      const paid: PaidBill[] = [];
      for (let i = 0; i < bills.length; i++) {
        const bill = bills[i]!;
        const settled = await EmploymentApi.settleSale(bill.to, bill.amountMinor, 0, bill.reason);
        if (settled === null) {
          return { ok: false, reason: 'bill-unpaid', facts: { paid, stuck: bill, owed: bills.slice(i) } };
        }
        await this.onPaid(bill, payer);
        paid.push({ bill, tail: settled.tail });
      }
      return { ok: true, facts: { paid } };
    }
  };
}
