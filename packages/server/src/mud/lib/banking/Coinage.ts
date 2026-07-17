/**
 * Coinage — the currency's physical coin spec and the make-change algebra.
 *
 * The civic **credit** is minted in three denominations — a legible, tunable
 * set (1 / 5 / 25) whose whole point is *mass*: higher denominations are more
 * value-dense (heavier absolute, far lighter per-credit), so the ceiling coin
 * caps how light cash can ever get. Above the comfort gradient a fortune is
 * physically too heavy to carry, and wealth must go on the weightless ledger
 * (banking-requirements § the coinage; the anti-mass thesis as honest physics).
 *
 * This is currency-intrinsic data — a denomination's face value and per-coin
 * mass are properties of *what the money is*, not a worth stamped on any good
 * (banking Law 1). It sits beside {@link Money.faceValueOf} (the face-value
 * half); this file adds the **mass** half and the two make-change routines:
 *
 * - {@link Coinage.dispense} — largest-first breakdown of an arbitrary value
 *   into fresh coins (mint / withdraw): a real cash machine hands out efficient
 *   coins, not a pile of ones.
 * - {@link Coinage.planSpend} — the bounded exact-selection for cash payment:
 *   take coins from a fixed supply summing *exactly* to a value, or null. v1
 *   cash-payment change is exact-cash-or-card (the 1-credit coin makes exact
 *   usually possible; else the card), so a failed plan falls back to the card.
 *
 * The denomination *names* + mint designs are light content; the CB civic
 * credit is orthogonal to the corpos (corpos affiliate accounts, they don't
 * issue currency).
 */

import { Quantity } from "../quantity";

/** One coin denomination: its identity key, face value, and per-coin mass. */
export interface Denomination {
  /** The `Coin.denomination` identity key (also a {@link Money} currency-map key). */
  readonly key: string;
  /** Face value in minor units. */
  readonly value: number;
  /** Per-coin mass in kilograms. */
  readonly massKg: number;
}

/** A planned quantity of one denomination (a dispense/spend line). */
export interface CoinLine {
  readonly denomination: string;
  readonly count: number;
}

/** A held supply of one denomination (what a container has of it). */
export interface CoinSupply {
  readonly denomination: string;
  readonly quantity: number;
}

export class Coinage {
  /**
   * The denomination set, **largest-first** (the order both make-change
   * routines walk). Masses: 25cr ≈ 8 g, 5cr ≈ 4 g, 1cr ≈ 2 g → the ceiling
   * coin ≈ 3 credits/gram, the best density cash can reach (banking-req).
   */
  static readonly DENOMINATIONS: readonly Denomination[] = [
    { key: "sovereign", value: 25, massKg: 0.008 },
    { key: "crown", value: 5, massKg: 0.004 },
    { key: "credit", value: 1, massKg: 0.002 },
  ];

  /** The 1-unit denomination key — the currency's base coin. */
  static readonly BASE_DENOMINATION = "credit";

  private static byKey(): Map<string, Denomination> {
    const m = new Map<string, Denomination>();
    for (const d of Coinage.DENOMINATIONS) m.set(d.key, d);
    return m;
  }

  /** The face value (minor units) of one coin of `denomination` (unknown → 1). */
  static faceValueOf(denomination: string): number {
    return Coinage.byKey().get(denomination)?.value ?? 1;
  }

  /** The per-coin mass of `denomination` as a Quantity (unknown → the base). */
  static perCoinMass(denomination: string): Quantity<"kg"> {
    const massKg =
      Coinage.byKey().get(denomination)?.massKg ??
      Coinage.byKey().get(Coinage.BASE_DENOMINATION)!.massKg;
    return Quantity.of(massKg, "kg");
  }

  /**
   * Largest-first breakdown of `value` (minor units) into fresh coins — the
   * dispense side (mint / withdraw). Because the base denomination is 1, every
   * non-negative integer value is exactly representable. Returns [] for value
   * ≤ 0.
   */
  static dispense(value: number): CoinLine[] {
    const lines: CoinLine[] = [];
    let remaining = Math.max(0, Math.floor(value));
    for (const d of Coinage.DENOMINATIONS) {
      const count = Math.floor(remaining / d.value);
      if (count > 0) {
        lines.push({ denomination: d.key, count });
        remaining -= count * d.value;
      }
    }
    return lines;
  }

  /**
   * Plan taking coins summing to *exactly* `value` from a bounded `supply`
   * (largest-first, cashier's algorithm). Returns the per-denomination take,
   * or **null** when the held coins cannot make the value exactly (the
   * exact-cash-or-card fallback signal). Correct for the canonical 1/5/25 set:
   * greedy never fails here when a solution exists.
   */
  static planSpend(supply: readonly CoinSupply[], value: number): CoinLine[] | null {
    if (value <= 0) return [];
    const have = new Map<string, number>();
    for (const s of supply) {
      have.set(s.denomination, (have.get(s.denomination) ?? 0) + s.quantity);
    }
    const plan: CoinLine[] = [];
    let remaining = Math.floor(value);
    for (const d of Coinage.DENOMINATIONS) {
      const avail = have.get(d.key) ?? 0;
      const want = Math.min(Math.floor(remaining / d.value), avail);
      if (want > 0) {
        plan.push({ denomination: d.key, count: want });
        remaining -= want * d.value;
      }
    }
    return remaining === 0 ? plan : null;
  }
}
