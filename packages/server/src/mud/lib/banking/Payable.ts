/**
 * PayableMixin — ⭐ **a thing that says what you owe** (harbors P13): a
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

export interface Payable {
  /** ⭐ What `payer` owes here now, in the order it is paid. `[]`: nothing. */
  billsFor(payer: Stuff): Promise<Bill[]>;
  /** `bill` has been paid by `payer`: the holder marks it settled. */
  onPaid(bill: Bill, payer: Stuff): Promise<void>;
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
  };
}
