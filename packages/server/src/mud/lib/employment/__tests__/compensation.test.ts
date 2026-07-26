/**
 * Compensation — the value-object invariants, and the Position round-trip
 * (the additive term: a legacy blob with no `compensation` reads basis
 * `time` and serializes byte-identically — never a materialized default).
 */

import { describe, it, expect } from "vitest";
import { Compensation } from "../Compensation";
import { Position } from "../Position";

describe("Compensation", () => {
  it("validates per-basis invariants", () => {
    expect(() => Compensation.of({ basis: "time" })).not.toThrow();
    expect(() =>
      Compensation.of({ basis: "per-settlement", rate: 4 }),
    ).not.toThrow();
    expect(() => Compensation.of({ basis: "per-settlement" })).toThrow(
      /rate > 0/,
    );
    expect(() =>
      Compensation.of({ basis: "share-of-flow", share: 0.2 }),
    ).not.toThrow();
    expect(() =>
      Compensation.of({ basis: "share-of-flow", share: 1 }),
    ).toThrow(/0 < share < 1/);
    expect(() =>
      Compensation.of({ basis: "purple" as never }),
    ).toThrow(/unknown basis/);
  });

  it("fromData defaults absent → time; serialize keeps only set terms", () => {
    expect(Compensation.fromData(undefined).basis).toBe("time");
    const c = Compensation.of({ basis: "per-settlement", rate: 4 });
    expect(c.serialize()).toEqual({ basis: "per-settlement", rate: 4 });
  });
});

describe("Position × Compensation", () => {
  const legacy = {
    key: "bartender",
    label: "tending bar",
    wageRate: 12,
    confers: ["MakerMixin"],
  };

  it("a legacy blob (no compensation) reads basis time and round-trips byte-identically", () => {
    const p = Position.fromData(legacy);
    expect(p.basis()).toBe("time");
    expect(p.compensation).toBeUndefined();
    expect(p.serialize()).toEqual(legacy);
  });

  it("round-trips a compensation term", () => {
    const p = Position.fromData({
      ...legacy,
      key: "hewer",
      compensation: { basis: "per-settlement", rate: 3 },
    });
    expect(p.basis()).toBe("per-settlement");
    expect(p.serialize().compensation).toEqual({
      basis: "per-settlement",
      rate: 3,
    });
    const q = Position.fromData(p.serialize());
    expect(q.serialize()).toEqual(p.serialize());
  });
});
