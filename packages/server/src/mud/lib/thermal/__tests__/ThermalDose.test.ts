/**
 * ThermalDose (grain-chain W1, plan D2/D4) — the doneness gauge.
 *
 * The three things worth pinning, because each is a place the gauge could
 * be quietly wrong and still look right:
 *
 * 1. **The integral is an integral.** Against a closed form at constant
 *    temperature, and against a brute-force sum along a real Newton
 *    trajectory — a rectangle over the gap would pass the first and fail
 *    the second badly, which is the whole reason the sub-stepping exists.
 * 2. **The bands are ratios against the recipe**, so a sear and a braise
 *    are both `done` at 1.
 * 3. **No far-past guard.** A loaf left in an oven overnight burns. The
 *    thermal model's own guard keeps it stamped hot; this gauge bills it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { ThermalDose } from "../ThermalDose";
import { Decay } from "../../Decay";

describe("ThermalDose — the model", () => {
  it("the rate is zero below the floor and a decade per z above the reference", () => {
    expect(ThermalDose.rateAt(300)).toBe(0); // below floorK (323)
    expect(ThermalDose.rateAt(322)).toBe(0);
    // At the reference the rate is exactly 1 — one second of simmering is
    // one second of dose, which is what "denominated at 373 K" means.
    expect(ThermalDose.rateAt(373)).toBeCloseTo(1, 6);
    // One z (33 K) up is ten times faster.
    expect(ThermalDose.rateAt(373 + 33)).toBeCloseTo(10, 4);
    expect(ThermalDose.rateAt(373 + 66)).toBeCloseTo(100, 2);
    // And one z down is a tenth.
    expect(ThermalDose.rateAt(373 - 33)).toBeCloseTo(0.1, 6);
  });

  it("integrating at a CONSTANT temperature matches rate x time exactly", () => {
    // ambient === fromK, so the trajectory is flat and the closed form is
    // trivially rate * elapsed. If the quadrature were wrong this is the
    // first thing it would break.
    const { doseS } = ThermalDose.integrate(400, 400, 600, 120);
    expect(doseS).toBeCloseTo(ThermalDose.rateAt(400) * 600, 4);
  });

  it("integrating along a WARM-UP matches a brute-force sum, and a rectangle does not", () => {
    const fromK = 293;
    const ambientK = 500;
    const elapsed = 600;
    const tau = 300;

    // Brute force: 20000 rectangles along the true Newton trajectory.
    const n = 20000;
    const h = elapsed / n;
    let truth = 0;
    for (let i = 0; i < n; i += 1) {
      const t = (i + 0.5) * h;
      truth += ThermalDose.rateAt(Decay.toward(fromK, ambientK, t, tau)) * h;
    }

    const { doseS } = ThermalDose.integrate(fromK, ambientK, elapsed, tau);
    expect(doseS / truth).toBeCloseTo(1, 2);

    // ⭐ The naive alternatives, for the record. Sampling the START
    // temperature reads zero (293 K is below the floor); sampling the END
    // reads far too much (the food was not at 500 K the whole time).
    const rectangleFromStart = ThermalDose.rateAt(fromK) * elapsed;
    const rectangleFromEnd =
      ThermalDose.rateAt(Decay.toward(fromK, ambientK, elapsed, tau)) * elapsed;
    expect(rectangleFromStart).toBe(0);
    expect(rectangleFromEnd).toBeGreaterThan(truth * 1.5);
  });

  it("a massless marker lands on ambient immediately", () => {
    const { doseS, endK } = ThermalDose.integrate(293, 450, 100, 0);
    expect(endK).toBe(450);
    expect(doseS).toBeCloseTo(ThermalDose.rateAt(450) * 100, 4);
  });

  it("scorch time is found by BISECTION, so a short fierce blast is not missed", () => {
    // Cooling from well above the ceiling: crosses down early in the gap.
    const above = ThermalDose.scorchOver(600, 293, 1000, 100, 470);
    expect(above).toBeGreaterThan(0);
    expect(above).toBeLessThan(1000);
    // The crossing is where the trajectory hits 470.
    expect(Decay.toward(600, 293, above, 100)).toBeCloseTo(470, 1);

    // Never above: nothing.
    expect(ThermalDose.scorchOver(300, 350, 1000, 100, 470)).toBe(0);
    // Always above: the whole gap.
    expect(ThermalDose.scorchOver(600, 600, 1000, 100, 470)).toBe(1000);
  });

  it("scorch is symmetric — a warm-up THROUGH the ceiling counts the tail", () => {
    const s = ThermalDose.scorchOver(293, 600, 1000, 100, 470);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1000);
    // The part above the ceiling is the END of the gap, not the start.
    expect(Decay.toward(293, 600, 1000 - s, 100)).toBeCloseTo(470, 1);
  });
});

describe("ThermalDose — doneness as a ratio", () => {
  const recipeAt = (requiresHeatK: number, holdS: number) =>
    ({
      getRequiresHeatK: () => requiresHeatK,
      getHoldS: () => holdS,
      getMaxHeatK: () => 0,
    }) as never;

  it("a working's own asking is exactly 1 — a sear and a braise both read done", () => {
    const sear = recipeAt(500, 10);
    const braise = recipeAt(373, 1800);
    expect(
      ThermalDose.donenessOf(ThermalDose.wantedDoseS(500, 10), sear),
    ).toBeCloseTo(1, 6);
    expect(
      ThermalDose.donenessOf(ThermalDose.wantedDoseS(373, 1800), braise),
    ).toBeCloseTo(1, 6);
    expect(ThermalDose.bandFor(1)).toBe("done");
  });

  it("the bands ladder on the ratio", () => {
    expect(ThermalDose.bandFor(0)).toBe("raw");
    expect(ThermalDose.bandFor(0.49)).toBe("raw");
    expect(ThermalDose.bandFor(0.5)).toBe("underdone");
    expect(ThermalDose.bandFor(0.99)).toBe("underdone");
    expect(ThermalDose.bandFor(1)).toBe("done");
    expect(ThermalDose.bandFor(1.49)).toBe("done");
    expect(ThermalDose.bandFor(1.5)).toBe("overdone");
    expect(ThermalDose.bandFor(2.99)).toBe("overdone");
    expect(ThermalDose.bandFor(3)).toBe("burnt");
    expect(ThermalDose.bandFor(50)).toBe("burnt");
  });

  it("⭐ the hold is NEVER zero — an unauthored hold reads the dial", () => {
    // This is the D3 change in one assertion. A recipe that names no hold
    // used to send the microbial kill to a flat sterile; it now asks for a
    // real amount of dose, which is what "the author did not say" should
    // have meant all along.
    const wanted = ThermalDose.wantedDoseS(400, 0);
    expect(wanted).toBeCloseTo(
      ThermalDose.defaultHoldS() * ThermalDose.rateAt(400),
      4,
    );
    expect(wanted).toBeGreaterThan(0);
  });

  it("a working that asks for no heat wants no dose", () => {
    // A shaken cocktail is not underdone; it is a cocktail.
    expect(ThermalDose.wantedDoseS(0, 600)).toBe(0);
    expect(ThermalDose.wantedDoseS(300, 600)).toBe(0); // below the floor
  });

  it("with no recipe to be judged against, doneness reads off the reference", () => {
    expect(ThermalDose.donenessOf(0, null)).toBe(0);
    expect(ThermalDose.donenessOf(60, null)).toBeCloseTo(1, 6);
  });

  it("a recipe's ceiling governs; a recipe stating none gets the char point", () => {
    expect(ThermalDose.ceilingFor(null)).toBe(ThermalDose.defaultCeilingK());
    expect(ThermalDose.ceilingFor(recipeAt(400, 60))).toBe(
      ThermalDose.defaultCeilingK(),
    );
    const ceilinged = {
      getRequiresHeatK: () => 480,
      getHoldS: () => 1800,
      getMaxHeatK: () => 560,
    } as never;
    expect(ThermalDose.ceilingFor(ceilinged)).toBe(560);
  });
});

describe("ThermalDose — advance", () => {
  it("a first touch seeds the sample and integrates nothing from epoch", () => {
    const seeded = ThermalDose.advance(
      ThermalDose.empty(),
      5_000_000,
      450,
      450,
      100,
      470,
    );
    expect(seeded.doseS).toBe(0);
    expect(seeded.stamp).toBe(5_000_000);
    expect(seeded.tempK).toBe(450);
  });

  it("⭐ there is NO far-past guard — a loaf left in an oven overnight burns", () => {
    // Twelve game-hours at 500 K. `ThermalMixin`'s own far-past guard keeps
    // the loaf stamped HOT across the gap; this gauge bills every second of
    // it, which is the difference between a doneness gauge and a wetness
    // one.
    const start = ThermalDose.empty(1000, 500);
    const next = ThermalDose.advance(start, 1000 + 12 * 3600, 500, 500, 120, 470);
    expect(next.doseS).toBeGreaterThan(0);
    // 500 K is above the 470 K char point, so all of it scorched too.
    expect(next.scorchS).toBeCloseTo(12 * 3600, 0);
    expect(ThermalDose.isScorched(next.scorchS)).toBe(true);
    // And it is far past burnt against any sane working.
    const roast = {
      getRequiresHeatK: () => 450,
      getHoldS: () => 1800,
      getMaxHeatK: () => 0,
    } as never;
    expect(ThermalDose.bandFor(ThermalDose.donenessOf(next.doseS, roast))).toBe(
      "burnt",
    );
  });

  it("a cold thing accrues nothing however long it sits", () => {
    const start = ThermalDose.empty(1000, 293);
    const next = ThermalDose.advance(start, 1000 + 30 * 24 * 3600, 293, 293, 120, 470);
    expect(next.doseS).toBe(0);
    expect(next.scorchS).toBe(0);
  });

  it("the integral runs from the LAST SAMPLE, not the current temperature", () => {
    // A thing that was at 500 K when we last looked and is at 293 K now
    // cooked on the way down; billing it at 293 would read zero.
    const start = ThermalDose.empty(1000, 500);
    const next = ThermalDose.advance(start, 1000 + 600, 293, 293, 200, 470);
    expect(next.doseS).toBeGreaterThan(0);
    expect(next.tempK).toBe(293);
  });
});
