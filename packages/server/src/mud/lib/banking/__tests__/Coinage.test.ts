/**
 * Coinage — the make-change algebra: largest-first dispense (mint/withdraw)
 * and bounded exact-selection (cash payment). The 1/5/25 set is canonical, so
 * greedy is always optimal-and-feasible where a solution exists.
 *
 * Denominations are identified by **face value**, not by name — Coinage holds
 * no currency data of its own and reads the table off the currency record.
 */

import { describe, it, expect } from "vitest";
import { Coinage } from "../Coinage";
import { Currency } from "../Currency";
import type { CoinLine, CoinSupply } from "../Coinage";

const ZM = "zorkmid";

/** Total value of a dispense/spend plan. */
function planValue(lines: readonly CoinLine[]): number {
  return lines.reduce(
    (s, l) => s + Currency.faceValueOf(l.currency, l.denomination) * l.count,
    0
  );
}

/** A supply line in the zorkmid. */
function held(denomination: number, quantity: number): CoinSupply {
  return { currency: ZM, denomination, quantity };
}

describe("Coinage.dispense — largest-first", () => {
  it("breaks 37 into 1×25 + 2×5 + 2×1", () => {
    const lines = Coinage.dispense(ZM, 37);
    expect(lines).toEqual([
      { currency: ZM, denomination: 25, count: 1 },
      { currency: ZM, denomination: 5, count: 2 },
      { currency: ZM, denomination: 1, count: 2 },
    ]);
    expect(planValue(lines)).toBe(37);
  });

  it("uses only the ceiling coin for an exact multiple", () => {
    expect(Coinage.dispense(ZM, 300)).toEqual([
      { currency: ZM, denomination: 25, count: 12 },
    ]);
  });

  it("yields nothing for zero or negative", () => {
    expect(Coinage.dispense(ZM, 0)).toEqual([]);
    expect(Coinage.dispense(ZM, -5)).toEqual([]);
  });
});

describe("Coinage.planSpend — bounded exact selection", () => {
  it("makes exact change from a mixed supply", () => {
    const supply = [held(25, 2), held(5, 3), held(1, 4)];
    const plan = Coinage.planSpend(ZM, supply, 32); // 25 + 5 + 2×1
    expect(plan).not.toBeNull();
    expect(planValue(plan!)).toBe(32);
  });

  it("returns null when the held coins can't make the value exactly", () => {
    // Only 25s: 30 is unreachable (no 5s or 1s).
    expect(Coinage.planSpend(ZM, [held(25, 2)], 30)).toBeNull();
  });

  it("respects availability (can't overspend a denomination)", () => {
    // Need 10 but hold only one 5 and no 1s → infeasible.
    expect(Coinage.planSpend(ZM, [held(5, 1)], 10)).toBeNull();
    // With a second 5 it works.
    expect(Coinage.planSpend(ZM, [held(5, 2)], 10)).not.toBeNull();
  });

  it("makes exact change for any value when enough 1s are held", () => {
    const plan = Coinage.planSpend(ZM, [held(1, 50)], 37);
    expect(planValue(plan!)).toBe(37);
  });

  it("ignores supply denominated in another currency", () => {
    // A pile of foreign coin cannot pay a zorkmid charge, however large.
    const foreign: CoinSupply[] = [
      { currency: "not-a-zorkmid", denomination: 1, quantity: 500 },
    ];
    expect(Coinage.planSpend(ZM, foreign, 3)).toBeNull();
  });
});
