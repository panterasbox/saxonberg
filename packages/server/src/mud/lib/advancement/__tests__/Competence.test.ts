/**
 * Competence tests — the pure derive-on-read estimator. Covers: cold-start
 * floor; progression across a practice run; the desirable-difficulty
 * properties (trivial success barely moves vs at-level advances;
 * formidable failure gentler than standard failure); fold-order
 * independence; and purity (no state, no persistence reachable).
 */

import { describe, it, expect } from "vitest";
import { Competence, type Evidence } from "../Competence";
import { CompetenceBand } from "../CompetenceBand";
import type { Difficulty, Outcome } from "../ActSignature";

let clock = 0;
function ev(difficulty: Difficulty, outcome: Outcome): Evidence {
  return { difficulty, outcome, when: clock++ };
}

describe("Competence estimator", () => {
  it("cold-start: empty evidence sits at the prior, untrained band", () => {
    const est = Competence.derive([]);
    expect(est.band).toBe("untrained");
    expect(est.theta).toBeGreaterThan(0);
    expect(est.theta).toBeLessThan(0.2);
  });

  it("a run of hard successes advances the band", () => {
    clock = 0;
    const run = [
      ev("hard", "success"),
      ev("hard", "success"),
      ev("hard", "success"),
    ];
    const est = Competence.derive(run);
    expect(CompetenceBand.rank(est.band)).toBeGreaterThanOrEqual(
      CompetenceBand.rank("proficient")
    );
  });

  it("a trivial success barely moves; an at-level success advances more", () => {
    clock = 0;
    const trivial = Competence.derive([ev("trivial", "success")]);
    clock = 0;
    const standard = Competence.derive([ev("standard", "success")]);
    expect(standard.theta).toBeGreaterThan(trivial.theta);
    // The trivial success is near-inert relative to the at-level one.
    expect(trivial.theta - 0.1).toBeLessThan((standard.theta - 0.1) / 2);
  });

  it("grinding trivial successes does (almost) nothing", () => {
    clock = 0;
    const grind = Array.from({ length: 20 }, () => ev("trivial", "success"));
    const est = Competence.derive(grind);
    // No transit from rote-easy reps, and each success is weak evidence —
    // a leveling-mill of trivial checks never reaches competent.
    expect(CompetenceBand.rank(est.band)).toBeLessThan(
      CompetenceBand.rank("competent")
    );
  });

  it("a formidable failure is gentler than a standard failure", () => {
    // Build the same mid-level baseline, then apply each failure.
    const baseline = (): Evidence[] => {
      clock = 0;
      return [ev("hard", "success"), ev("standard", "success")];
    };
    const afterFormidable = Competence.derive([
      ...baseline(),
      ev("formidable", "failure"),
    ]);
    const afterStandard = Competence.derive([
      ...baseline(),
      ev("standard", "failure"),
    ]);
    expect(afterFormidable.theta).toBeGreaterThan(afterStandard.theta);
  });

  it("folds by `when` — shuffled order gives the same estimate", () => {
    const ordered: Evidence[] = [
      { difficulty: "standard", outcome: "failure", when: 1 },
      { difficulty: "hard", outcome: "success", when: 2 },
      { difficulty: "easy", outcome: "success", when: 3 },
    ];
    const shuffled: Evidence[] = [ordered[2]!, ordered[0]!, ordered[1]!];
    expect(Competence.derive(shuffled).theta).toBeCloseTo(
      Competence.derive(ordered).theta,
      10
    );
  });

  it("is pure — deriving twice yields an identical estimate", () => {
    clock = 0;
    const evidence = [ev("hard", "success"), ev("standard", "partial")];
    const a = Competence.derive(evidence);
    const b = Competence.derive(evidence);
    expect(a).toEqual(b);
    // The input is not mutated by the internal sort.
    expect(evidence.map((e) => e.when)).toEqual([0, 1]);
  });

  it("bandOf is the band-only surface", () => {
    clock = 0;
    expect(Competence.bandOf([])).toBe("untrained");
    expect(typeof Competence.bandOf([ev("hard", "success")])).toBe("string");
  });
});
