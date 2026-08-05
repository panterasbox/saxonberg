/**
 * Money — the amount value-object: an integer **minor-unit** scalar plus a
 * currency tag, with closed arithmetic.
 *
 * Money is a *transient settlement quantity* — a stance between parties at
 * the moment of a transaction and the unit the {@link LedgerEntry} records.
 * It is **never stamped on a good** as a "worth N" property (banking Law 1):
 * a coin carries a `(currency, denomination)` pair — its *identity* — and
 * how many minor units that denomination represents is intrinsic to the
 * **currency** ({@link Currency.faceValueOf}), not a value written onto the
 * object. A coin whose pair does not resolve **throws** rather than being
 * worth what it says: the good never prices itself; the currency validates
 * and prices it.
 *
 * All ledger math is integer minor units — never floats — so balances
 * reconcile exactly.
 *
 * ⚠ **The currency is required, never defaulted.** A default would let a
 * call site silently assume the wrong currency, caught (if at all) only at
 * runtime by the ledger's endpoint check. Required, the compiler enumerates
 * every site — the strongest available defence against an invisible mint,
 * which is the one bug class an economy cannot recover from.
 *
 * The home that kills a `types.ts` reflex for the banking subsystem.
 */

import { Currency } from "./Currency";

/** A currency tag — the `key` of a {@link CurrencyRecord}. */
export type CurrencyTag = string;

export class Money {
  /**
   * Private — construct via {@link Money.of} / {@link Money.zero} so the
   * integer invariant is enforced at every entry.
   */
  private constructor(
    /** The amount in integer minor units (can be negative for a delta). */
    public readonly minor: number,
    /** The currency tag. */
    public readonly currency: CurrencyTag
  ) {}

  /** A Money of `minor` integer units. Throws on a non-integer amount. */
  public static of(minor: number, currency: CurrencyTag): Money {
    if (!Number.isInteger(minor)) {
      throw new Error(
        `Money.of: amount must be an integer minor-unit value (got ${minor})`
      );
    }
    if (!currency) {
      throw new Error("Money.of: a currency is required");
    }
    return new Money(minor, currency);
  }

  /** The zero amount in `currency`. */
  public static zero(currency: CurrencyTag): Money {
    return Money.of(0, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(
        `Money: currency mismatch (${this.currency} vs ${other.currency})`
      );
    }
  }

  /** This + other (same currency). */
  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minor + other.minor, this.currency);
  }

  /** This − other (same currency). */
  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minor - other.minor, this.currency);
  }

  /** The signed negation (a debit ↔ credit flip). */
  public negate(): Money {
    return new Money(-this.minor, this.currency);
  }

  /** True iff the amount is exactly zero. */
  public isZero(): boolean {
    return this.minor === 0;
  }

  /** True iff the amount is strictly negative. */
  public isNegative(): boolean {
    return this.minor < 0;
  }

  /** True iff the amount is strictly positive. */
  public isPositive(): boolean {
    return this.minor > 0;
  }

  /** −1 / 0 / +1 ordering against `other` (same currency). */
  public compareTo(other: Money): number {
    this.assertSameCurrency(other);
    return Math.sign(this.minor - other.minor);
  }

  /** Equal currency and amount. */
  public equals(other: Money): boolean {
    return this.currency === other.currency && this.minor === other.minor;
  }

  /**
   * A human string — `"12 zorkmids"` / `"1 zorkmid"`. The unit vocabulary
   * is read off the currency record; no unit string is hardcoded here.
   */
  public render(): string {
    return Currency.renderMinor(this.minor, this.currency);
  }
}
