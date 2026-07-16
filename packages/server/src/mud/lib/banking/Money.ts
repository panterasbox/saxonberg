/**
 * Money — the amount value-object: an integer **minor-unit** scalar plus a
 * currency tag, with closed arithmetic.
 *
 * Money is a *transient settlement quantity* — a stance between parties at
 * the moment of a transaction and the unit the {@link LedgerEntry} records.
 * It is **never stamped on a good** as a "worth N" property (banking Law 1):
 * a coin carries a `denomination` (its identity / kind), and how many minor
 * units that denomination represents is intrinsic to the *currency*
 * ({@link Money.faceValueOf}), not a value written onto the object.
 *
 * All ledger math is integer minor units — never floats — so balances
 * reconcile exactly. The currency is the civic **credit**, minted in the
 * denomination set held by {@link Coinage} (1 / 5 / 25); the substrate keys
 * on the currency tag and a denomination→value map so a richer set (or a
 * second currency) is an additive change, not a refactor.
 *
 * The home that kills a `types.ts` reflex for the banking subsystem.
 */

import { Coinage } from "./Coinage";

/** A currency tag. v1 ships exactly one: {@link DEFAULT_CURRENCY}. */
export type Currency = string;

/** The single v1 currency. */
export const DEFAULT_CURRENCY: Currency = "credit";

/**
 * Coin face values in minor units, keyed by denomination — the *currency's*
 * coin spec (intrinsic to what the money is), NOT a worth stamped on any
 * good. Derived from {@link Coinage.DENOMINATIONS} (the single source of the
 * face-value ⊕ per-coin-mass spec). Unknown denominations resolve to 1, so a
 * coin always has a well-defined value for reconciliation.
 */
export const COIN_FACE_VALUES: Readonly<Record<string, number>> =
  Object.fromEntries(Coinage.DENOMINATIONS.map((d) => [d.key, d.value]));

export class Money {
  /**
   * Private — construct via {@link Money.of} / {@link Money.zero} so the
   * integer invariant is enforced at every entry.
   */
  private constructor(
    /** The amount in integer minor units (can be negative for a delta). */
    public readonly minor: number,
    /** The currency tag. */
    public readonly currency: Currency
  ) {}

  /** A Money of `minor` integer units. Throws on a non-integer amount. */
  public static of(minor: number, currency: Currency = DEFAULT_CURRENCY): Money {
    if (!Number.isInteger(minor)) {
      throw new Error(
        `Money.of: amount must be an integer minor-unit value (got ${minor})`
      );
    }
    return new Money(minor, currency);
  }

  /** The zero amount in `currency`. */
  public static zero(currency: Currency = DEFAULT_CURRENCY): Money {
    return new Money(0, currency);
  }

  /** The face value (minor units) of one coin of `denomination`. */
  public static faceValueOf(denomination: string): number {
    return COIN_FACE_VALUES[denomination] ?? 1;
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

  /** A human string — `"12 credits"` / `"1 credit"`. */
  public render(): string {
    const unit = this.minor === 1 || this.minor === -1 ? "credit" : "credits";
    return `${this.minor} ${unit}`;
  }
}
