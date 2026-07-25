/**
 * Charge — the uniform settlement primitive's data: the thing owed.
 *
 * A Charge is `amount + payee + reason`, either **presented** (a seller/the
 * bar prices it from its stance — the payer never types the number: ordering
 * a drink, settling a tab) or **stated** (a payer-initiated transfer/gift).
 * Settlement is one flow (`BankingApi.settle`) whatever the kind and
 * whatever the {@link SettlementMethod} — the method is a *parameter*, never
 * a verb-per-method, and the payee is indifferent to how it cleared (the
 * `ContainmentApi.move` uniform-surface / polymorphic-internals pattern).
 *
 * On-ledger settlement credits `payeeAccountId` (plus any `splits` — the
 * remittance-split seam: a cut routed to a third-party account alongside the
 * main movement, reusable for service fees / tips / a later sales tax). Cash
 * settlement hands coin to `payeeContainer` instead (off the governed
 * ledger). A presented purchase carries `category` for the P&L line.
 */

import type { Money } from "./Money";
import type { PnlCategory } from "./LedgerEntry";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";

/** A cut routed to a third-party account alongside the main movement. */
export interface RemittanceSplit {
  /** The third-party account credited. */
  accountId: string;
  /** The cut, in the charge's currency. */
  amount: Money;
  /** The P&L line this cut rolls up into (e.g. `tax`, `tip`). */
  category?: PnlCategory;
}

export interface Charge {
  /** The total owed (the payer's debit). */
  amount: Money;
  /** Why — the memo carried into the ledger / scene. */
  reason: string;
  /** Presented (seller-priced) vs stated (payer-initiated). */
  presented: boolean;
  /** On-ledger destination — the payee's account. */
  payeeAccountId: string;
  /** Off-ledger destination — the receiver of cash (for the cash method). */
  payeeContainer?: Stuff & Container;
  /** Cuts routed to third-party accounts alongside the main leg. */
  splits?: RemittanceSplit[];
  /** The P&L line the main leg rolls up into (default `sales`). */
  category?: PnlCategory;
}

/**
 * How a charge clears — the method is the parameter. `credential` may carry
 * a `fromBank` to route this one payment from a specific linked account
 * (the `pay --from <bank>` override) without disturbing the active setting.
 */
export type SettlementMethod =
  | { kind: "cash" }
  | { kind: "credential"; fromBank?: string };

/** A receipt the settlement scene reads to name what cleared (and how). */
export interface SettlementReceipt {
  method: "cash" | "credential";
  /** The routed account (credential method) — for the scene + corpo lookup. */
  accountId?: string;
  /** The routing account's corpo affiliation (credential method). */
  corpoKey?: string;
}
