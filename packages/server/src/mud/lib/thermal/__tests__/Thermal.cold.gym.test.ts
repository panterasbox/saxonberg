/**
 * ⭐⭐ **The cold bench** (envelope D8) — what standing in the cold
 * actually COSTS a body, measured before the envelope build lets rooms
 * get cold at all.
 *
 * ## Why this exists
 *
 * The 2026-09-21 finding: *a naked body at **294 K** (21 °C, the shipped
 * indoor decree) spends satiation at 0.4 %/min — 24 %/h — and starves in
 * four and a half hours.* Nobody noticed, because every interior in the
 * realm was 21 °C by decree and no cast member was ever in a room colder
 * than that for long. The envelope build removes the decree. Before it
 * does, the cold branch has to be a **cost** rather than a death
 * sentence, or the first winter night kills the cast.
 *
 * ## What it measures
 *
 * A 70 kg endotherm biped, held at a fixed effective ambient for twelve
 * game hours, at four insulation levels and four temperatures. It
 * reports satiation spent, the core reached, and whether the body is
 * still alive — and **prints the whole table**, because the table is the
 * artifact. The assertions are the floor the requirements set
 * (acceptance 15: *a world left to itself for a full game day kills
 * nobody of cold*); the numbers beside them are what a later tuning pass
 * argues with.
 *
 * ## ⚠ What it does NOT measure
 *
 * Real garments. `clo` is supplied directly here, because the dials are
 * what is under test and dressing a body through the slot machinery
 * would make this a textiles test with a thermal assertion at the end.
 * What the shipped char-gen outfit is actually worth in clo is the
 * drive's business (W7), and `ThermalRegulation.test.ts` covers the
 * garment→clo read.
 *
 * Not in `pnpm test`: a bench, and it runs in the gym job.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { Quantity } from "../../quantity";
import { THERMAL_DEFAULTS } from "../Thermal";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
const HOUR = 3600;
const K = 273.15;
/** The shipped `coreTemperature` band's floor — 27.9 °C. */
const SURVIVABLE_MIN_K = 301;

let real = 0;

/**
 * A 70 kg endotherm with a fixed worn insulation. `bodyInsulation()` is
 * overridden rather than dressed: see the header.
 */
function bodyAt(ambientK: number, clo: number): Creature {
  class BenchBody extends Creature {
    static _mixinName = "ColdBenchBody";
    bodyInsulation(): Quantity<"clo"> {
      return Quantity.of(clo, "clo");
    }
  }
  return makeStuff(() => {
    const c = new BenchBody();
    c.setMass(Quantity.of(70, "kg"));
    (c as unknown as { setEffectiveAmbientK(k: number): void })
      .setEffectiveAmbientK(ambientK);
    return c;
  }) as unknown as Creature;
}

function advance(c: Creature, gameSec: number): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(600, remaining);
    real += (s / SCALE) * 1000;
    c.getVitalSign("coreTemperature"); // force the lazy reconcile
    remaining -= s;
  }
}

const core = (c: Creature): number =>
  c.getVitalSign("coreTemperature").rawValue();
const sat = (c: Creature): number =>
  c.getReserve("satiation")?.current.rawValue() ?? 0;

interface Row {
  label: string;
  clo: number;
  ambientK: number;
  /**
   * ⚠⚠ The spend rate measured over the FIRST game hour, not averaged
   * over twelve.
   *
   * The first version of this bench averaged over the whole run and
   * every one of sixteen rows read 8.3 %/h — a naked body at 21 °C and
   * a coated one at −5 °C alike. That is not a finding about
   * temperature; it is `100 % ÷ 12 h`. Every row emptied the tank, so
   * the average measured the TANK and not the cold, and the
   * clothing-matters assertion would have passed vacuously against a
   * completely broken model. Measure the rate while there is still fuel
   * to spend.
   */
  firstHourPct: number;
  satAfter12h: number;
  coreAfter12h: number;
  /**
   * ⚠⚠ `!isDead()`, NOT `isAlive()`.
   *
   * `isAlive()` is `lifecycleState === 'alive'` and `lifecycleState`
   * defaults to the EMPTY STRING on a body nothing has explicitly
   * birthed — so it reads false for every fixture in this file, forever,
   * whatever the cold does. The second version of this bench used it and
   * reported a body sitting at 99 % satiation and a 36.9 °C core as
   * DEAD. `Organism.ts` documents the trap in as many words; the bench
   * fell into it anyway.
   */
  alive: boolean;
  /** Core below the species `survivableMin` — the hypothermia line. */
  hypothermic: boolean;
}

/** The named insulation levels, coldest kit first. */
const KIT: ReadonlyArray<{ label: string; clo: number }> = [
  { label: "naked", clo: 0 },
  { label: "shirt + trousers", clo: 0.6 },
  { label: "outfit (dressed as the cast ships)", clo: 1.0 },
  { label: "outfit + wool coat", clo: 2.0 },
];

/** The temperatures the realm will actually produce once W3 lands. */
const AIR: ReadonlyArray<{ label: string; k: number }> = [
  { label: "21 °C — the old indoor decree", k: 294 },
  { label: "8 °C — a winter night outdoors", k: 281 },
  { label: "0 °C — a hard frost", k: 273 },
  { label: "−5 °C — a bad one", k: 268 },
];

function run(clo: number, ambientK: number): Row {
  const c = bodyAt(ambientK, clo);
  const before = sat(c);
  advance(c, HOUR);
  const afterOne = sat(c);
  advance(c, 11 * HOUR);
  return {
    label: "",
    clo,
    ambientK,
    firstHourPct: before - afterOne,
    satAfter12h: sat(c),
    coreAfter12h: core(c),
    alive: !(c as unknown as { isDead(): boolean }).isDead(),
    hypothermic: core(c) < SURVIVABLE_MIN_K,
  };
}

describe("⭐⭐ the cold bench — what standing in the cold costs", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it("prints the table, and the realm survives its own nights", () => {
    const rows: Row[] = [];
    const lines: string[] = [];
    lines.push("");
    lines.push(
      `  cold bench — 70 kg endotherm, 12 game hours, ` +
        `CLO_TO_KELVIN=${THERMAL_DEFAULTS.CLO_TO_KELVIN} ` +
        `COLD_SPEND_PER_DEGREE=${THERMAL_DEFAULTS.COLD_SPEND_PER_DEGREE}`,
    );
    lines.push("");
    lines.push(
      "  air                              kit                       %/h(1st)  sat@12h  core   alive  hypo",
    );
    for (const air of AIR) {
      for (const kit of KIT) {
        const r = run(kit.clo, air.k);
        r.label = `${air.label} / ${kit.label}`;
        rows.push(r);
        lines.push(
          `  ${air.label.padEnd(32)} ${kit.label.padEnd(24)} ` +
            `${r.firstHourPct.toFixed(2).padStart(9)} ` +
            `${r.satAfter12h.toFixed(0).padStart(8)} ` +
            `${(r.coreAfter12h - K).toFixed(1).padStart(6)} ` +
            `${r.alive ? "  yes" : "   NO"}` +
            `${r.hypothermic ? "   HYPO" : "      -"}`,
        );
      }
      lines.push("");
    }
    // eslint-disable-next-line no-console -- the table IS the artifact
    console.log(lines.join("\n"));

    const find = (ambientK: number, clo: number): Row =>
      rows.find((r) => r.ambientK === ambientK && r.clo === clo)!;

    // ⚠ THE FLOOR, and it is acceptance 15. A dressed body must survive
    // a winter night in an unheated room with fuel to spare: it should
    // want breakfast, not a funeral.
    const winterNight = find(281, 1.0);
    expect(winterNight.alive).toBe(true);
    expect(winterNight.satAfter12h).toBeGreaterThan(40);
    expect(winterNight.coreAfter12h).toBeGreaterThan(SURVIVABLE_MIN_K);

    // A NAKED body at the old indoor decree must not starve either —
    // that was the original finding, and 21 °C is not a hostile room.
    const indoors = find(294, 0);
    expect(indoors.alive).toBe(true);
    expect(indoors.firstHourPct).toBeLessThan(6);

    // ⭐ Clothing must MATTER, monotonically, at every temperature:
    // more clo is never a worse OUTCOME. The shape is the claim, not
    // the magnitudes — a tuning pass may move every number in the table
    // and must not break this.
    //
    // ⚠ Asserted on the outcome (core reached, fuel left) rather than
    // on the spend RATE, because once two bodies are both shivering
    // flat out at the cap their rates are equal to within metabolism's
    // own thermal coupling of basal drain — a warmer body has a
    // marginally higher basal burn, which made a 0.02 %/h inversion at
    // 0 °C. That inversion is not clothing failing to work; it is two
    // bodies equally maxed out, and the CORE column shows the clothed
    // one two degrees warmer for it.
    for (const air of AIR) {
      for (let i = 1; i < KIT.length; i++) {
        const less = find(air.k, KIT[i - 1]!.clo);
        const more = find(air.k, KIT[i]!.clo);
        expect(more.coreAfter12h).toBeGreaterThanOrEqual(
          less.coreAfter12h - 1e-6,
        );
        // ⚠ Fuel is monotone only to within metabolism's thermal
        // coupling, and that is HONEST rather than slack: two bodies
        // both shivering at the cap spend the same on shivering, and
        // the one two degrees warmer burns marginally more BASAL for
        // being warmer. Staying warm costs a little. The core column is
        // where clothing's win is unambiguous, so that is the strict
        // assertion and this one carries a tolerance.
        expect(more.satAfter12h).toBeGreaterThanOrEqual(
          less.satAfter12h - 0.5,
        );
        expect(more.firstHourPct).toBeLessThanOrEqual(less.firstHourPct + 0.1);
      }
    }

    // ⭐ Cold must COST something. A bench that passed because the cold
    // branch did nothing would be worse than no bench: −5 °C naked has
    // to be visibly worse than 21 °C naked.
    //
    // ⚠ And the cost shows up in TWO places, which is the whole point
    // of the cap. The rate cannot run away — past 20 K of gap the body
    // is already shivering flat out, so the spend at −5 °C is under
    // twice the spend at 21 °C and always will be. What keeps falling
    // is the CORE. Asserting the rate alone would have demanded the
    // runaway the cap exists to prevent.
    const bitter = find(268, 0);
    const comfortable = find(294, 0);
    expect(bitter.firstHourPct).toBeGreaterThan(comfortable.firstHourPct * 1.5);
    expect(bitter.coreAfter12h).toBeLessThan(comfortable.coreAfter12h - 5);

    // ⚠⚠ And the hard cases must fail HONESTLY — by COOLING, not by
    // starving. A body that cannot cover the gap drifts toward the
    // warmest temperature its shivering can defend; that is
    // hypothermia, which somebody can carry you in from and which the
    // `warm` verb exists for. Starvation in a snowdrift is not what
    // cold does, and it is not rescuable on that timescale.
    const hard = find(268, 0);
    expect(hard.satAfter12h).toBeGreaterThan(5); // it did not STARVE
    // It is COOLING, which is the honest failure. ⚠ Asserted as "well
    // below the setpoint" rather than "past `survivableMin`": at twelve
    // hours this body sits at 301.4 K, a third of a degree above the
    // line and still falling. Pinning the assertion to the moment it
    // crosses would make the bench a stopwatch on one dial rather than
    // a check on the mechanism.
    expect(hard.coreAfter12h).toBeLessThan(THERMAL_DEFAULTS.SETPOINT_K - 5);

    // ⭐ And the ordinary cases must not be hypothermic at all: a
    // dressed body indoors, and a dressed body on a winter night, hold
    // their core.
    expect(find(294, 1.0).hypothermic).toBe(false);
    expect(winterNight.hypothermic).toBe(false);

    // ⭐⭐ One clo is comfortable at 21 °C. That is what the unit MEANS,
    // and `CLO_TO_KELVIN` is set to make it true rather than to taste —
    // so an outfitted body in a heated room pays nothing for warmth and
    // its satiation drain is basal metabolism alone.
    expect(find(294, 1.0).firstHourPct).toBeLessThan(1.5);
  });
});
