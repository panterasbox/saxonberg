/**
 * ⭐⭐⭐ The bottleneck bench — **spinning is the observable bottleneck,
 * and buying the wheel measurably moves the constraint to the loom.**
 *
 * The lesson lives entirely in the `spin`:`weave` labour ratio.
 * Arbitrary durations would lose it silently and nothing would fail,
 * which is exactly why this exists: it reads the shipped DIALS through
 * the real controllers' own pacing, fixes the unit of account at one
 * bolt of linen, and asserts the ratio.
 *
 * ⚠ It counts durations; it does not fight. Fast on purpose.
 *
 * ## ⚠⚠ Assertion (b) is a FINDING, not the plan's sentence
 *
 * The plan expected the wheel to make the loom the maximum attended
 * step. **It cannot, at any honest ratio** — spinning is five to ten
 * times weaving's labour per unit of cloth and a wheel is a factor of
 * three. That is the history: the wheel did not solve the spinning
 * shortage, and the machine that did was the JENNY, at eight spindles.
 * Fitting the durations until a wheel flipped it would have deleted the
 * most famous fact about this trade to satisfy a sentence. So the bench
 * asserts what is measurable — the wheel closes the gap by exactly its
 * rate — and PRINTS the rate that would flip it.
 *
 * ## ⚠⚠ Assertion (a) is scoped to the SHIPPED TECH LEVEL, deliberately
 *
 * *"Spinning is the maximum attended step"* is true before 1764 and
 * false after — and **that is the lesson**. A later mill wave must be
 * able to change it without anyone "fixing" a test that was never meant
 * to be eternal, so the scoping is in this file's own name and in the
 * assertion's message rather than left implicit.
 *
 * ## ⚠ Retting is reported SEPARATELY, because a wait is not labour
 *
 * The pit takes a fortnight and costs nobody an hour of attention. It
 * is elapsed time, not work, and folding it into the labour figure
 * would make the preparation stage look like the bottleneck when it is
 * the one step you can walk away from.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const PACK = join(here, "..", "..", "..", "..", "..");

/** The shipped dials, read rather than restated. */
function dials(): Record<string, number> {
  const doc = YAML.parse(
    readFileSync(
      join(PACK, "content", "settings", "textiles-trade.yaml"),
      "utf-8",
    ),
  ) as { settings: Array<{ key: string; value: string }> };
  const out: Record<string, number> = {};
  for (const { key, value } of doc.settings) out[key] = Number(value);
  return out;
}

/** A tool row's rate for a capability kind, off the shipped row. */
function rateOf(row: string, kind: string): number {
  const doc = YAML.parse(
    readFileSync(
      join(PACK, "content", "trade", "textiles", "thing", `${row}.yaml`),
      "utf-8",
    ),
  ) as { data?: { capabilities?: Array<{ kind: string; rate?: number }> } };
  const cap = (doc.data?.capabilities ?? []).find((c) => c.kind === kind);
  return cap?.rate ?? 1;
}

/**
 * Attended game-milliseconds per step for ONE BOLT of plain linen, at a
 * given tool loadout.
 *
 * ⭐ Every number is the shipped dial divided by the shipped rate —
 * `ManualBuildController.paceMs`'s arithmetic, exactly. Nothing here
 * restates a duration.
 */
function attendedPerBolt(tools: {
  scutching: number;
  spinning: number;
  weaving: number;
}): Record<string, number> {
  const d = dials();
  // A bolt is one `weave` act at the plain setting.
  const weaveActs = 1;
  // …which consumes `weave.chargeUnits` of yarn.
  const yarnNeeded = d["textiles.weave.chargeUnits"]!;
  // Each `spin` act yields `spin.chargeUnits` of yarn from as much line.
  const spinActs = Math.ceil(yarnNeeded / d["textiles.spin.chargeUnits"]!);
  const lineNeeded = spinActs * d["textiles.spin.chargeUnits"]!;
  // Each `scutch` act yields ~half its charge in litres as line units.
  const scutchActs = Math.ceil(lineNeeded / (d["textiles.scutch.chargeLitres"]! * 0.5));

  return {
    scutch: (scutchActs * d["textiles.scutch.baseMs"]!) / tools.scutching,
    spin: (spinActs * d["textiles.spin.baseMs"]!) / tools.spinning,
    weave: (weaveActs * d["textiles.weave.baseMs"]!) / tools.weaving,
  };
}

function maxStep(steps: Record<string, number>): string {
  return Object.entries(steps).sort((a, b) => b[1] - a[1])[0]![0];
}

const HOURS = (ms: number): number => Math.round((ms / 3_600_000) * 100) / 100;

describe("the mill, at the SHIPPED tech level (spindle and hand loom)", () => {
  it("⭐⭐ (a) `spin` is the maximum ATTENDED step, by a margin", () => {
    const byHand = attendedPerBolt({
      scutching: rateOf("scutching-board", "scutching"),
      spinning: rateOf("drop-spindle", "spinning"),
      weaving: rateOf("hand-loom", "weaving"),
    });
    console.info(
      `\n  one bolt, spindle + hand loom (attended hours):\n` +
        Object.entries(byHand)
          .map(([k, v]) => `    ${k.padEnd(8)} ${HOURS(v)}`)
          .join("\n") +
        `\n`,
    );
    expect(
      maxStep(byHand),
      "spinning must be the observable bottleneck AT THE SHIPPED TECH LEVEL " +
        "(true before the spinning jenny, false after — that is the lesson, " +
        "and a later mill wave should change this rather than 'fix' it)",
    ).toBe("spin");
    // …and by a real margin, not a rounding accident.
    expect(byHand.spin! / byHand.weave!).toBeGreaterThan(3);
  });

  it("⭐⭐ (b) the wheel CLOSES the gap by its rate — and does not flip it", () => {
    /*
     * ⚠⚠ **A finding, and it is the plan's assertion (b) corrected by
     * measurement rather than fitted around.**
     *
     * The plan expected the wheel to make the LOOM the maximum attended
     * step. At a historically honest ratio it cannot, and no reasonable
     * tuning makes it: spinning is five to ten times weaving's labour
     * per unit of cloth (the shipped dials sit at six, dead centre),
     * and a wheel is a factor of three. Three does not clear six.
     *
     * ⭐ **That IS the history.** The wheel did not solve the spinning
     * shortage. What solved it was the JENNY, at eight spindles — and
     * eight is the first thing that clears a gap of six. Fitting the
     * durations until a wheel flipped it would have deleted the single
     * most famous fact about this trade in order to satisfy a sentence.
     *
     * So the bench asserts the two things that are true and measurable:
     * the wheel closes the gap by exactly its rate, and it changes
     * nothing else — which is the whole of the claim that a tool "moves
     * the rate and the scale, never the decision".
     */
    const rate = rateOf("spinning-wheel", "spinning");
    const withWheel = attendedPerBolt({
      scutching: rateOf("scutching-board", "scutching"),
      spinning: rate,
      weaving: rateOf("hand-loom", "weaving"),
    });
    const byHand = attendedPerBolt({
      scutching: rateOf("scutching-board", "scutching"),
      spinning: rateOf("drop-spindle", "spinning"),
      weaving: rateOf("hand-loom", "weaving"),
    });
    const gapBefore = byHand.spin! / byHand.weave!;
    const gapAfter = withWheel.spin! / withWheel.weave!;

    console.info(
      `\n  one bolt, WHEEL + hand loom (attended hours):\n` +
        Object.entries(withWheel)
          .map(([k, v]) => `    ${k.padEnd(8)} ${HOURS(v)}`)
          .join("\n") +
        `\n    spin:weave gap ${Math.round(gapBefore * 10) / 10}× → ` +
        `${Math.round(gapAfter * 10) / 10}× (the wheel is rate ${rate})\n` +
        `    ⚠ still spinning. The machine that flips it wants rate > ` +
        `${Math.round(gapBefore)} — which is the JENNY, at eight.\n`,
    );

    // The wheel closes the gap by exactly its rate, and touches nothing
    // else: that is "the ladder moves the rate, never the decision".
    expect(withWheel.spin!).toBeCloseTo(byHand.spin! / rate, 0);
    expect(withWheel.weave!).toBe(byHand.weave!);
    expect(gapAfter).toBeCloseTo(gapBefore / rate, 1);

    // ⚠ The ratio sits inside the historical band — five to ten
    // spinners to one hand-loom weaver. If a later change walks it out
    // of that band, this is where it shows.
    expect(gapBefore).toBeGreaterThanOrEqual(5);
    expect(gapBefore).toBeLessThanOrEqual(10);

    // ⭐ And the honest half: what rate WOULD flip it is computed and
    // printed, not asserted — the same shape as leg (c). A later mill
    // wave ships a jenny and this number is what it has to beat.
    const flipRate = gapBefore;
    expect(Number.isFinite(flipRate)).toBe(true);
    expect(flipRate).toBeGreaterThan(rate);
  });

  it("⚠ retting is reported separately — a wait is not labour", () => {
    // The pit takes a fortnight of ELAPSED time and costs nobody an hour
    // of attention. Folding it into the labour figure would make
    // preparation look like the bottleneck when it is the one step you
    // can walk away from.
    const profile = YAML.parse(
      readFileSync(
        join(PACK, "content", "trade", "textiles", "idea", "ferment", "retting.yaml"),
        "utf-8",
      ),
    ) as { data: { ratePerDay: number; turnDays: number } };
    const elapsedDays = 1 / profile.data.ratePerDay;
    console.info(
      `\n  retting: ~${Math.round(elapsedDays)} game-days ELAPSED, ` +
        `0 attended; ${profile.data.turnDays} days of grace before it is ruined\n`,
    );
    expect(elapsedDays).toBeGreaterThan(7);
    // ⚠ And the grace is short enough that judging it is a real act.
    expect(profile.data.turnDays).toBeLessThan(elapsedDays / 2);
  });

  it("⚠⚠ (c) the HONEST-FINDING leg — bed-scale supply, computed and printed", () => {
    /*
     * AC 13's escape clause, discharged by MEASUREMENT rather than
     * assertion. The ratio above is arithmetically true; whether it is
     * FELT depends on whether a smallholder can ever run the loop
     * enough times to notice, and that is a supply question.
     *
     * ⚠⚠ If one bed's annual yield is under one bolt, the deliverable is
     * a documented finding naming field-scale flax as the fix — NOT a
     * fudged duration. This test therefore asserts only that the number
     * is computed, and prints it.
     */
    const flax = YAML.parse(
      readFileSync(
        join(PACK, "..", "trade-farming", "content", "trade", "farming",
             "thing", "plant", "flax.yaml"),
        "utf-8",
      ),
    ) as { data: { profile: { daysToStage: { mature: number } }; harvestTemplatePath: string } };
    const sheaf = YAML.parse(
      readFileSync(
        join(PACK, "..", "trade-farming", "content", "trade", "farming",
             "thing", "crop", "flax-sheaf.yaml"),
        "utf-8",
      ),
    ) as { data: { interiorAmount: number } };

    const d = dials();
    // One Hinkley bed holds four plants (the carrot row's arithmetic).
    const plantsPerBed = 4;
    const cropsPerYear = 365 / flax.data.profile.daysToStage.mature;
    const litresPerYear =
      plantsPerBed * cropsPerYear * sheaf.data.interiorAmount;
    // Litres of straw → line units → yarn units → bolts.
    const lineUnits = litresPerYear * 0.5;
    const yarnUnits = lineUnits; // one act: charge in, charge out
    const boltsPerYear = yarnUnits / d["textiles.weave.chargeUnits"]!;

    console.info(
      `\n  ⚠ BED-SCALE SUPPLY (the honest-finding leg):\n` +
        `    one Hinkley bed, ${plantsPerBed} plants, ` +
        `${Math.round(cropsPerYear * 100) / 100} crops/game-year\n` +
        `    → ${Math.round(litresPerYear)} L straw ` +
        `→ ~${Math.round(lineUnits)} line ` +
        `→ ~${Math.round(boltsPerYear * 10) / 10} BOLTS per game-year\n` +
        `    (a stock shirt is ~1 bolt-unit; a coat ~3)\n`,
    );

    // ⚠ ASSERTS ONLY THAT IT IS COMPUTED. The number is the finding, and
    // `textiles.md` § Throughput at bed scale carries it.
    expect(Number.isFinite(boltsPerYear)).toBe(true);
    expect(boltsPerYear).toBeGreaterThan(0);
  });
});
