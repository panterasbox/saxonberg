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
    if (lines.length === 0) {
      return "No account fees — open, deposit, and withdraw your own money free.";
    }
    return lines.join("\n");
  }
}

function intOr(v: number | undefined, fallback: number): number {
  return Number.isInteger(v) && (v as number) >= 0 ? (v as number) : fallback;
}
