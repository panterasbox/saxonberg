/**
 * Coinage — the make-change algebra: largest-first dispense (mint/withdraw)
 * and bounded exact-selection (cash payment). The 1/5/25 set is canonical, so
 * greedy is always optimal-and-feasible where a solution exists.
 */

import { describe, it, expect } from "vitest";
import { Coinage } from "../Coinage";

/** Total value of a dispense/spend plan. */
function planValue(lines: readonly { denomination: string; count: number }[]): number {
  return lines.reduce(
    (s, l) => s + Coinage.faceValueOf(l.denomination) * l.count,
    0,
  );
}

describe("Coinage.dispense — largest-first", () => {
  it("breaks 37 into 1×25 + 2×5 + 2×1", () => {
    const lines = Coinage.dispense(37);
    expect(lines).toEqual([
      { denomination: "sovereign", count: 1 },
      { denomination: "crown", count: 2 },
      { denomination: "credit", count: 2 },
    ]);
    expect(planValue(lines)).toBe(37);
  });

  it("uses only the ceiling coin for an exact multiple", () => {
    expect(Coinage.dispense(300)).toEqual([
      { denomination: "sovereign", count: 12 },
    ]);
  });

  it("yields nothing for zero or negative", () => {
    expect(Coinage.dispense(0)).toEqual([]);
    expect(Coinage.dispense(-5)).toEqual([]);
  });
});

describe("Coinage.planSpend — bounded exact selection", () => {
  it("makes exact change from a mixed supply", () => {
    const supply = [
      { denomination: "sovereign", quantity: 2 },
      { denomination: "crown", quantity: 3 },
      { denomination: "credit", quantity: 4 },
    ];
    const plan = Coinage.planSpend(supply, 32); // 25 + 5 + 2×1
    expect(plan).not.toBeNull();
    expect(planValue(plan!)).toBe(32);
  });

  it("returns null when the held coins can't make the value exactly", () => {
    // Only 25s: 30 is unreachable (no 5s or 1s).
    expect(
      Coinage.planSpend([{ denomination: "sovereign", quantity: 2 }], 30),
    ).toBeNull();
  });

  it("respects availability (can't overspend a denomination)", () => {
    // Need 10 but hold only one 5 and no 1s → infeasible.
    expect(
      Coinage.planSpend([{ denomination: "crown", quantity: 1 }], 10),
    ).toBeNull();
    // With a second crown it works.
    expect(
      Coinage.planSpend([{ denomination: "crown", quantity: 2 }], 10),
    ).not.toBeNull();
  });

  it("makes exact change for any value when enough 1s are held", () => {
    const supply = [{ denomination: "credit", quantity: 50 }];
    const plan = Coinage.planSpend(supply, 37);
    expect(planValue(plan!)).toBe(37);
  });
});
