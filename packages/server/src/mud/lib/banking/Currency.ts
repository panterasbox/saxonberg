/**
 * Currency — the one place every currency-intrinsic fact lives.
 *
 * A currency is its **denomination table** (face value ⊕ per-coin mass, and
 * an optional issuer-chosen coin name), its **render vocabulary**, and its
 * **issuer** (who may mint it, and which office governs that). Nothing else.
 *
 * ⚠⚠ **This record carries no rate, and no reference to another currency —
 * permanently.** A `pegRate` field beside the denominations would be the
 * world-oracle shape: every reader of the currency would get an
 * authoritative cross-currency rate for free, which makes a price a
 * *property of a thing* rather than *an event between two parties*
 * (economy-slate Law 1). A peg is an **issuer's standing offer to redeem**
 * — reserves plus a published rate honoured at its own window, breakable
 * when the reserves drain — and it belongs to that issuer's offer, not to
 * the money. See docs/slates/builds/currency-slate.md § *A peg is a
 * promise, not a rate*.
 *
 * **Denomination identity is `(currency, faceValue)`** — structural, not an
 * authored name. `zorkmid` is the only authored money noun in the game;
 * coins present as *"a 25-zorkmid piece"*, derived. The optional `label` is
 * for an issuer who wants named coins (a corpo scrip will; the Compact does
 * not). Culture supplies "fiver".
 *
 * **A registry, not a catalogue.** Currency records are *code*, and code is
 * not a collection — which is what lets the test-only fixture currency exist
 * without any path by which it could reach `domain`. It is also sync, pure
 * and boot-order-free, which matters because {@link Currency.faceValueOf}
 * sits on the hot path of `Coin.getMass()` and the scope-walk keyword
 * getter, and now **throws** rather than guessing. Adding a currency is a
 * code edit at the wizard tier — the reserved-matter constraint in its
 * crudest honest form (a mint is Compact-level, never a locality's own
 * call).
 *
 * The home that holds what `Coinage` used to hardcode: `Coinage` is now the
 * pure make-change *algebra* and holds **no currency data at all**.
 */

import { Quantity } from "../quantity";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../config/AppSettings";
import { SecurityApi } from "../../api/security";

/**
 * One coin denomination. Its **identity is its face value** within the
 * currency — there is no name key, by design.
 */
export interface Denomination {
  /** Face value in minor units — the structural identity half. */
  readonly value: number;
  /** Per-coin mass in kilograms. */
  readonly massKg: number;
  /**
   * Optional issuer-chosen coin name. Absent → the coin presents as
   * `"a <value>-<unit> piece"`. The Compact declines to name its coins.
   */
  readonly label?: string;
}

/** One currency, whole. */
export interface CurrencyRecord {
  /** The durable join key carried on every ledger row, balance and coin. */
  readonly key: string;
  /** Render unit, singular — `"zorkmid"`. */
  readonly unit: string;
  /** Render unit, plural — `"zorkmids"`. */
  readonly plural: string;
  /** The institution that mints it. */
  readonly issuer: string;
  /** The office whose holder may mint it (governance.md). */
  readonly governorOffice: string;
  /** The coin spec, **largest-first** (the order make-change walks). */
  readonly denominations: readonly Denomination[];
}

/**
 * The Compact's currency. The only shipped record; the only authored money
 * noun. `credit` was retired with the currency build — the word belongs to
 * the deferred lending subsystem (terminus-banking § 7), and to the
 * credit/debit vocabulary every ledger leg already speaks.
 */
const ZORKMID: CurrencyRecord = {
  key: "zorkmid",
  unit: "zorkmid",
  plural: "zorkmids",
  issuer: "central-bank",
  governorOffice: "central-bank-governor",
  denominations: [
    { value: 25, massKg: 0.008 },
    { value: 5, massKg: 0.004 },
    { value: 1, massKg: 0.002 },
  ],
};

export class Currency {
  /** Registered records by key. Code, never a collection. */
  private static _records: Map<string, CurrencyRecord> = new Map([
    [ZORKMID.key, ZORKMID],
  ]);

  /** The record for `key`. Throws on an unknown currency. */
  public static of(key: string): CurrencyRecord {
    const record = Currency._records.get(key);
    if (!record) {
      throw new Error(
        `Currency.of: unknown currency '${key}' — a value with no currency ` +
          `record cannot be valued (registered: ${[...Currency._records.keys()].join(", ")})`
      );
    }
    return record;
  }

  /** Whether `key` names a registered currency. */
  public static has(key: string): boolean {
    return Currency._records.has(key);
  }

  /** Every registered record — what per-currency reports iterate. */
  public static all(): readonly CurrencyRecord[] {
    return [...Currency._records.values()];
  }

  /**
   * The currency the Compact transacts and denominates its obligations in
   * — **policy data, not a property of the money.** This is where the
   * zorkmid's "specialness" lives (reserve status is functional, never
   * decreed): the substrate never compares a currency to a literal, it asks
   * which one the Compact uses.
   *
   * Falls back to the sole registered currency when the setting is unwarmed
   * (every unit test that skips the settings seed) — which is
   * currency-agnostic, not a zorkmid branch. Throws when unwarmed *and*
   * ambiguous, because guessing between two currencies is exactly the bug
   * this build exists to make impossible.
   */
  public static compact(): string {
    let configured = "";
    try {
      configured = AppApi.setting(AppSettingKeys.bankingCompactCurrency) || "";
    } catch {
      configured = "";
    }
    if (configured) return configured;
    if (Currency._records.size === 1) {
      return Currency._records.keys().next().value as string;
    }
    throw new Error(
      "Currency.compact: banking.compactCurrency is unset and more than one " +
        "currency is registered — the compact currency cannot be guessed"
    );
  }

  private static denominationOf(
    currency: string,
    denomination: number
  ): Denomination {
    const found = Currency.of(currency).denominations.find(
      (d) => d.value === denomination
    );
    if (!found) {
      throw new Error(
        `Currency: '${currency}' has no denomination ${denomination} — a coin ` +
          `whose denomination does not resolve is a corrupt object, not a ` +
          `coin worth 1 (did a migration not run?)`
      );
    }
    return found;
  }

  /**
   * The face value (minor units) of one coin of `denomination`.
   *
   * ⚠⚠ **Throws on an unknown pair — deliberately.** The retired `?? 1`
   * fallback silently revalued every high denomination to 1 on an
   * unmigrated rename, *and the conservation audit still passed*, because
   * its bottom-up term recomputed from the same broken lookup. Valuation
   * must never guess.
   */
  public static faceValueOf(currency: string, denomination: number): number {
    return Currency.denominationOf(currency, denomination).value;
  }

  /** The per-coin mass of `denomination`. Throws on an unknown pair. */
  public static perCoinMass(
    currency: string,
    denomination: number
  ): Quantity<"kg"> {
    return Quantity.of(
      Currency.denominationOf(currency, denomination).massKg,
      "kg"
    );
  }

  /**
   * The currency's base (1-unit) coin. Every currency must have one, or
   * exact change is not generally makeable — asserted at registration.
   */
  public static baseDenomination(currency: string): number {
    const base = Currency.of(currency).denominations.find((d) => d.value === 1);
    if (!base) {
      throw new Error(
        `Currency.baseDenomination: '${currency}' has no 1-unit coin`
      );
    }
    return base.value;
  }

  /** A human amount string — `"1 zorkmid"` / `"12 zorkmids"`. */
  public static renderMinor(minor: number, currency: string): string {
    const record = Currency.of(currency);
    const unit = minor === 1 || minor === -1 ? record.unit : record.plural;
    return `${minor} ${unit}`;
  }

  /**
   * How a coin of this denomination presents — the issuer's `label` when it
   * chose one, else the derived `"a 25-zorkmid piece"`. No author writes a
   * coin name; a second issuer's coins render correctly the moment its
   * table exists.
   */
  public static describeDenomination(
    currency: string,
    denomination: number
  ): string {
    const record = Currency.of(currency);
    const denom = Currency.denominationOf(currency, denomination);
    return denom.label ?? `a ${denom.value}-${record.unit} piece`;
  }

  /**
   * Test seam — register an extra currency. The fixture currency exists
   * only through here, which is why it can never reach a live collection.
   */
  public static _registerForTesting(record: CurrencyRecord): void {
    SecurityApi.assertTestOnly("Currency._registerForTesting");
    if (!record.denominations.some((d) => d.value === 1)) {
      throw new Error(
        `Currency._registerForTesting: '${record.key}' has no 1-unit coin — ` +
          `exact change would not be generally makeable`
      );
    }
    Currency._records.set(record.key, record);
  }

  /** Test seam — drop every non-shipped record. */
  public static _resetForTesting(): void {
    SecurityApi.assertTestOnly("Currency._resetForTesting");
    Currency._records = new Map([[ZORKMID.key, ZORKMID]]);
  }
}
