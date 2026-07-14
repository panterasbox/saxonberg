import { describe, it, expect } from "vitest";
import { Tempo, DEFAULT_TEMPO_CONFIG } from "../Tempo";

const neutral = {
  encumbrance: 0,
  endurance: 1,
  competence: 1,
  balanceFactor: 1,
};

describe("Tempo — derived rate + fractional carry", () => {
  it("rate is a bounded product of the four inputs", () => {
    const r = Tempo.rateFor(neutral);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(DEFAULT_TEMPO_CONFIG.maxRate);
  });

  it("higher competence yields a strictly higher rate", () => {
    const slow = Tempo.rateFor({ ...neutral, competence: 0.6 });
    const fast = Tempo.rateFor({ ...neutral, competence: 1.4 });
    expect(fast).toBeGreaterThan(slow);
  });

  it("encumbrance and low endurance both slow you down", () => {
    const base = Tempo.rateFor(neutral);
    expect(Tempo.rateFor({ ...neutral, encumbrance: 1 })).toBeLessThan(base);
    expect(Tempo.rateFor({ ...neutral, endurance: 0 })).toBeLessThan(base);
  });

  it("fractional tempo accumulates and carries across beats", () => {
    const t = new Tempo(0.4);
    expect(t.advance()).toBe(0); // 0.4
    expect(t.advance()).toBe(0); // 0.8
    expect(t.advance()).toBe(1); // 1.2 → 1 whole, 0.2 carry
    expect(t.getCarry()).toBeCloseTo(0.2, 5);
  });

  it("faster tempo yields strictly more exchanges over a fixed span", () => {
    const slow = new Tempo(0.3);
    const fast = new Tempo(0.9);
    let slowTotal = 0;
    let fastTotal = 0;
    for (let i = 0; i < 20; i++) {
      slowTotal += slow.advance();
      fastTotal += fast.advance();
    }
    expect(fastTotal).toBeGreaterThan(slowTotal);
  });
});
