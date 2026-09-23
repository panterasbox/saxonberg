/**
 * CreditTerms — the terms a loan, a note or an unclaimed-property claim
 * carries on its `contracts` row (economic bootstrap D1). Facts the
 * ledger cannot hold: the rate, the share of each inflow taken for the
 * creditor, what secures it, what discharges it, which rung of the
 * ladder issued it. Money legs stay ONLY in `bank_ledger`; the row
 * records the terms and the running balance.
 *
 * A vocabulary module: tuples, types and an `includes` at the setter —
 * no value-object statics (the lib-statics ratchet).
 */

/** What a `contracts` row is: the gig it always was, or one of the bootstrap's three instruments. */
export const CONTRACT_KINDS = ["gig", "loan", "note", "unclaimed"] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

/**
 * Which rung of the ladder issued a loan. `opening` is the treasury's
 * standing facility (a 0% loan on a business's first account); `note` is
 * the Arrival Note; `1` inventory finance; `2` working capital.
 */
export const CREDIT_RUNGS = ["note", "opening", 1, 2] as const;
export type CreditRung = (typeof CREDIT_RUNGS)[number];

/** What secures the instrument — inventory on a counter, an account's balance, or nothing. */
export type CreditSecurity =
  | { kind: "inventory"; counterPath: string }
  | { kind: "account"; accountId: string }
  | { kind: "none" };

export interface CreditTermsData {
  /** Which rung issued it. */
  rung: CreditRung;
  /** The rate per game-year (a fraction; 0 for the Note and the opening advance). */
  ratePerGameYear: number;
  /** The share of each inflow to the borrower's account taken for the creditor (a fraction). */
  share: number;
  /** What it is secured by. */
  security: CreditSecurity;
  /** The principal advanced, minor units. */
  principalMinor: number;
  /** The reserve's window advance behind this paper (rung 1), minor units; 0 otherwise. */
  windowAdvanceMinor: number;
  /** The Note: forgiven on the issuer's first wage. */
  dischargeOnFirstWage: boolean;
  /** The Note: forgiven after this many game-days; 0 = never. */
  dischargeAfterGameDays: number;
}
