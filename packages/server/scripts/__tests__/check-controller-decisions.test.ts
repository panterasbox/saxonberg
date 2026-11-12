/** `lint:controller-decisions` seen to FAIL: each decision token kind IS found. */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import {
  CONTROLLER_DECISIONS_CEILING,
  DURATION_DECLS_CEILING,
  census,
  decisionsIn,
} from "../check-controller-decisions";

const scan = (src: string) => decisionsIn(parseTs("/x.ts", src));

describe("the classifier", () => {
  it("FINDS Math, arithmetic and a threshold", () => {
    expect(scan(`const a = Math.exp(k * t);\nif (load > 0.8) {}`).map((d) => d.kind).sort()).toEqual([
      "arithmetic",
      "math",
      "threshold",
    ]);
  });

  it("⭐ FINDS a duration constant and an act-shape literal, both in the D5 sub-count", () => {
    const d = scan(`const SWEEP_MS = 30_000;\nengage({ durationMs: 4000, effortW: 200 });`);
    expect(d.filter((x) => x.duration).map((x) => x.kind)).toEqual(["constant", "act-literal", "act-literal"]);
  });

  it("a non-duration constant counts, but not in the sub-count", () => {
    const d = scan(`const MAX_STACK = 20;`);
    expect(d).toHaveLength(1);
    expect(d[0]!.duration).toBe(false);
  });

  it("⭐ an emptiness test is not a threshold (size-and-carrying W7)", () => {
    expect(
      scan(`if (xs.length > 0) {}\nif (0 < s.size) {}\nif (xs.length >= 1) {}\nif (xs.length < 1) {}\nif (xs.length <= 0) {}`),
    ).toEqual([]);
  });

  it("⚠ but a count against any other number IS one", () => {
    expect(scan(`if (xs.length > 2) {}\nif (xs.length >= 0) {}\nif (n > 0) {}`).map((d) => d.kind)).toEqual([
      "threshold",
      "threshold",
      "threshold",
    ]);
  });

  it("reading a plan's duration is not a decision", () => {
    expect(scan(`engage({ durationMs: plan.durationMs, effortW: plan.effortW });\nconst x = a + b;`)).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at or below both ceilings, above zero", () => {
    const { all, durations } = census();
    expect(all.length).toBeGreaterThan(0);
    expect(all.length).toBeLessThanOrEqual(CONTROLLER_DECISIONS_CEILING);
    expect(durations.length).toBeGreaterThan(0);
    expect(durations.length).toBeLessThanOrEqual(DURATION_DECLS_CEILING);
  });
});
