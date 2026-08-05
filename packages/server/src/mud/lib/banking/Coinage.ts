/**
 * Coinage — the make-change **algebra**. Two routines, no data.
 *
 * ⚠ **This file holds no currency data.** Face values, per-coin masses and
 * coin names are currency-intrinsic and live on the currency record
 * ({@link Currency}) — the single place. Coinage reads that table and does
 * arithmetic over it, so a second issuer's coins make change correctly the
 * moment its record exists, with nothing here to edit.
 *
 * A denomination's *identity* is its **face value** within its currency —
 * there is no name key. See {@link Currency} for why.
 *
 * - {@link Coinage.dispense} — largest-first breakdown of an arbitrary value
 *   into fresh coins (mint / withdraw): a real cash machine hands out
 *   efficient coins, not a pile of ones.
 * - {@link Coinage.planSpend} — the bounded exact-selection for cash payment:
 *   take coins from a fixed supply summing *exactly* to a value, or null.
 *   Cash payment is exact-cash-or-card (the 1-unit coin makes exact usually
 *   possible; else the card), so a failed plan falls back to the card.
 *
 * The mass gradient is the point: higher denominations are more value-dense
 * (heavier absolute, far lighter per unit), so the ceiling coin caps how
 * light cash can ever get. Above the comfort gradient a fortune is
 * physically too heavy to carry and wealth must go on the weightless ledger
 * — the honest cap on cash (banking-requirements § the coinage).
 */

import { Currency } from "./Currency";

/** A planned quantity of one denomination (a dispense/spend line). */
export interface CoinLine {
  readonly currency: string;
  /** Face value in minor units — the denomination's identity. */
  readonly denomination: number;
  readonly count: number;
}

/** A held supply of one denomination (what a container has of it). */
export interface CoinSupply {
  readonly currency: string;
  /** Face value in minor units — the denomination's identity. */
  readonly denomination: number;
  readonly quantity: number;
}

export class Coinage {
  /**
   * Largest-first breakdown of `value` (minor units) into fresh coins — the
   * dispense side (mint / withdraw). Because every currency has a 1-unit
   * coin (asserted at registration), every non-negative integer value is
   * exactly representable. Returns [] for value ≤ 0.
   */
  static dispense(currency: string, value: number): CoinLine[] {
    const lines: CoinLine[] = [];
    let remaining = Math.max(0, Math.floor(value));
    for (const d of Currency.of(currency).denominations) {
      const count = Math.floor(remaining / d.value);
      if (count > 0) {
        lines.push({ currency, denomination: d.value, count });
        remaining -= count * d.value;
      }
    }
    return lines;
  }

  /**
   * Plan taking coins summing to *exactly* `value` from a bounded `supply`
   * (largest-first, cashier's algorithm). Returns the per-denomination take,
   * or **null** when the held coins cannot make the value exactly (the
   * exact-cash-or-card fallback signal). Correct for the canonical 1/5/25
   * set: greedy never fails there when a solution exists.
   *
   * Supply entries of a different currency are ignored — a payer holding two
   * currencies pays in the one the charge names.
   */
  static planSpend(
    currency: string,
    supply: readonly CoinSupply[],
    value: number
  ): CoinLine[] | null {
    if (value <= 0) return [];
    const have = new Map<number, number>();
    for (const s of supply) {
      if (s.currency !== currency) continue;
      have.set(s.denomination, (have.get(s.denomination) ?? 0) + s.quantity);
    }
    const plan: CoinLine[] = [];
    let remaining = Math.floor(value);
    for (const d of Currency.of(currency).denominations) {
      const avail = have.get(d.value) ?? 0;
      const want = Math.min(Math.floor(remaining / d.value), avail);
      if (want > 0) {
        plan.push({ currency, denomination: d.value, count: want });
        remaining -= want * d.value;
      }
    }
    return remaining === 0 ? plan : null;
  }
}
