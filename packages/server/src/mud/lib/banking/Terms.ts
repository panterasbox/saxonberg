/**
 * Terms — a bank's fee/minimum schedule, authored on the {@link BankMixin}
 * counter and read at the moment of each verb.
 *
 * The sibling of Relationship: **Terms prices in a currency; Relationship
 * grants trust on a basis.** Every fee is a *conserved* leg (customer account
 * → the branch's own account), so it lands on the branch P&L as income and on
 * the customer's statement as a line — never a value stamped on money
 * (banking Law 1: terms live on the *bank*, not the coin). The posted rate
 * board is a dynamic `Detail` rendering this same data live.
 *
 * **Fee philosophy (v1, tread lightly):** the core custodial loop is free
 * everywhere (open / deposit / withdraw your own money / check balance);
 * fees live only on *movement/convenience* — wires, cross-bank, cross-corpo —
 * which scales with how much you move, avoidable by banking smart, and a new
 * player basically never fights one. Goodkin's schedule is nearly fee-free:
 * only a light cross-corpo wire fee is live; the rest are authored at zero
 * (built-but-permissive, the mechanism conserved and ready).
 *
 * All amounts are integer minor units.
 */

import { GrammarApi } from "../../api/grammar";

/** The authored fee/minimum schedule shape (seed `data.terms`). */
export interface TermsData {
  /** Minimum balance to hold an account / floor a withdrawal below. */
  minBalance?: number;
  /** One-off charge to open an account. */
  openingFee?: number;
  /** Per deposit/withdraw convenience fee. */
  transactionFee?: number;
  /** Cross-*bank* (same corpo) wire fee. */
  wireFee?: number;
  /** Cross-*corpo* wire fee (rivalry has a cost) — Goodkin's one live fee. */
  crossCorpoFee?: number;
  /** Charge to reissue a lost/frozen card. */
  cardReissueFee?: number;
  /**
   * ⭐ The bank's **loan rate per game-year** (a fraction) — its own standing
   * offer, posted the way it posts its fees (economic bootstrap D13). There
   * is no benchmark object anywhere: a counter with no rate does not lend.
   */
  loanRatePerGameYear?: number;
  /**
   * The bank's **repayment share** (a fraction of each inflow to a
   * borrower's account taken for the creditor), clamped to the reserve's
   * bounds at the settle. Absent → the reserve's minimum.
   */
  repaymentShare?: number;
}

export class Terms {
  private constructor(private readonly data: Required<TermsData>) {}

  /** The fee-free default (every dimension zero) — the permissive baseline. */
  static free(): Terms {
    return Terms.fromData({});
  }

  /** Build from authored (possibly sparse) data; absent fees default to zero. */
  static fromData(raw: TermsData | undefined | null): Terms {
    const d = raw ?? {};
    return new Terms({
      minBalance: intOr(d.minBalance, 0),
      openingFee: intOr(d.openingFee, 0),
      transactionFee: intOr(d.transactionFee, 0),
      wireFee: intOr(d.wireFee, 0),
      crossCorpoFee: intOr(d.crossCorpoFee, 0),
      cardReissueFee: intOr(d.cardReissueFee, 0),
      loanRatePerGameYear: fractionOr(d.loanRatePerGameYear, 0),
      repaymentShare: fractionOr(d.repaymentShare, 0),
    });
  }

  /** Round-trip back to the authored shape (persistence). */
  serialize(): Required<TermsData> {
    return { ...this.data };
  }

  getMinBalance(): number {
    return this.data.minBalance;
  }
  getOpeningFee(): number {
    return this.data.openingFee;
  }
  getTransactionFee(): number {
    return this.data.transactionFee;
  }
  getWireFee(): number {
    return this.data.wireFee;
  }
  getCrossCorpoFee(): number {
    return this.data.crossCorpoFee;
  }
  getCardReissueFee(): number {
    return this.data.cardReissueFee;
  }

  /** The posted loan rate per game-year, or 0 — a counter with no rate does not lend. */
  getLoanRatePerGameYear(): number {
    return this.data.loanRatePerGameYear;
  }

  /** Does this counter lend at all? */
  lends(): boolean {
    return this.data.loanRatePerGameYear > 0;
  }

  /** The posted repayment share (a fraction of each inflow), or 0 for "the reserve's minimum". */
  getRepaymentShare(): number {
    return this.data.repaymentShare;
  }

  /**
   * The loan rate in WORDS with the real-time equivalent beside it — *"five
   * per cent a game-year (a real month)"* — or an empty string when the
   * counter does not lend. Quoted per game-year because a game-year is a
   * real month at the 12× clock, and five per cent compounds visibly inside
   * one; whole percentages through `GrammarApi.inWords` (the no-gauge
   * rule), a fractional one keeps its digits, honestly.
   */
  describeLoanRate(): string {
    const rate = this.data.loanRatePerGameYear;
    if (rate <= 0) return "";
    return `${Terms.percentInWords(rate)} per cent a game-year (a real month)`;
  }

  /** The repayment share in words, or an empty string when unposted. */
  describeRepaymentShare(): string {
    const share = this.data.repaymentShare;
    if (share <= 0) return "";
    return `${Terms.percentInWords(share)} per cent of each inflow`;
  }

  private static percentInWords(fraction: number): string {
    const pct = fraction * 100;
    const whole = Math.round(pct);
    return Math.abs(pct - whole) < 1e-9 ? GrammarApi.inWords(whole) : `${pct}`;
  }

  /** True iff the schedule levies no fee at all (Goodkin's near-state). */
  isFeeFree(): boolean {
    return (
      this.data.openingFee === 0 &&
      this.data.transactionFee === 0 &&
      this.data.wireFee === 0 &&
      this.data.crossCorpoFee === 0 &&
      this.data.cardReissueFee === 0
    );
  }

  /**
   * A friendly, board-ready rendering of the schedule (the rate-board Detail
   * reads this). Only non-zero lines are listed; a fee-free schedule reads as
   * the warm Goodkin note.
   */
  describe(): string {
    const lines: string[] = [];
    if (this.data.minBalance > 0)
      lines.push(`Minimum balance: ${this.data.minBalance}`);
    if (this.data.openingFee > 0)
      lines.push(`Opening: ${this.data.openingFee}`);
    if (this.data.transactionFee > 0)
      lines.push(`Per transaction: ${this.data.transactionFee}`);
    if (this.data.wireFee > 0) lines.push(`Wire: ${this.data.wireFee}`);
    if (this.data.crossCorpoFee > 0)
      lines.push(`Cross-corpo wire: ${this.data.crossCorpoFee}`);
    if (this.data.cardReissueFee > 0)
      lines.push(`Card reissue: ${this.data.cardReissueFee}`);
    if (this.lends()) {
      lines.push(`Loans: ${this.describeLoanRate()}`);
      const share = this.describeRepaymentShare();
      if (share) lines.push(`Repaid as ${share}`);
    }
    if (lines.length === 0) {
      return "No account fees — open, deposit, and withdraw your own money free.";
    }
    return lines.join("\n");
  }
}

function fractionOr(v: number | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback;
}

function intOr(v: number | undefined, fallback: number): number {
  return Number.isInteger(v) && (v as number) >= 0 ? (v as number) : fallback;
}
