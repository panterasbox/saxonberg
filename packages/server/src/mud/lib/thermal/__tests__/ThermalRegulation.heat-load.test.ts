/**
 * ⭐⭐ The internal heat load — heat a body carries that did not come from
 * the weather.
 *
 * ⚠⚠ **The regulation model was ambient-only, and that was a hole.** A
 * body inside its comfort band was pinned to the setpoint at zero cost on
 * every slice, which meant heat put INTO it was *erased on the next
 * read*. `Thermal.depositHeat` worked on objects and did nothing at all to
 * a person — so the η < 1 losses `arcane-science.md` places squarely in
 * the caster had nowhere to land, and the published claim that
 * *"Destroy·Fire is limited by thermoregulation, not by mana"* could not
 * be true of the engine.
 *
 * Its first consumer is magic, but the seam is not magic's: exertion wants
 * it next, which is why it is a plain joule load and not a spell effect.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { THERMAL_DEFAULTS } from "../Thermal";
import { TemplatePaths } from "../../paths";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;

function advance(c: Creature, gameSec: number, chunkSec = 60): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getVitalSign("coreTemperature");
    remaining -= s;
  }
}

/**
 * ⚠ Advance several bodies on ONE clock. `real` is module-level, so
 * `advance(a, t); advance(b, t)` hands `b` twice the elapsed time — the
 * first draft of the clo test "passed" with a 1.0 ratio for exactly that
 * reason.
 */
function advanceAll(bodies: Creature[], gameSec: number, chunkSec = 60): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    for (const c of bodies) c.getVitalSign("coreTemperature");
    remaining -= s;
  }
}

const core = (c: Creature): number =>
  c.getVitalSign("coreTemperature").rawValue();

type RegBody = Creature & {
  setEffectiveAmbientK(k: number): void;
  setCachedHumidity(v: number): void;
  absorbHeatLoad(j: number): void;
  heatLoadJ: number;
};

/**
 * A body wearing `clo` of insulation — the read `shedAndOffset` makes,
 * overridden on a test subclass rather than assembled from a body plan,
 * fabric registry and garment (that chain is `Slotted.covering.test.ts`'s
 * job; this file's claim is about what the number DOES).
 */
function dressed(clo: number, ambientK = 295): RegBody {
  class Dressed extends Creature {
    static _mixinName: string = 'DressedTestCreature';
    override bodyInsulation(): Quantity<'clo'> {
      return Quantity.of(clo, 'clo');
    }
  }
  return makeStuff(() => {
    const c = new Dressed() as unknown as RegBody;
    c.setMass(Quantity.of(70, 'kg'));
    c.setEffectiveAmbientK(ambientK);
    c.setCachedHumidity(30);
    return c;
  }) as RegBody;
}

/** A 70 kg body in a comfortable room — C ≈ 293 kJ/K. */
function person(ambientK = 295): RegBody {
  return makeStuff(() => {
    const c = new Creature() as RegBody;
    c.setMass(Quantity.of(70, "kg"));
    c.setEffectiveAmbientK(ambientK);
    c.setCachedHumidity(30);
    return c;
  }) as RegBody;
}

describe("the internal heat load", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it("⭐⭐ a load RAISES the core — before this it was erased on the next slice", () => {
    const c = person();
    core(c); // seed the stamp
    expect(core(c)).toBeCloseTo(THERMAL_DEFAULTS.SETPOINT_K, 1);

    // 1 MJ into a 70 kg body: ΔT = 1e6 / (70 × 4186) ≈ 3.4 K.
    c.absorbHeatLoad(1_000_000);
    advance(c, 1);
    expect(core(c)).toBeGreaterThan(THERMAL_DEFAULTS.SETPOINT_K + 3);
  });

  it("⭐ …and SHEDS it over time, at a sustainable rate", () => {
    const c = person();
    core(c);
    c.absorbHeatLoad(1_000_000);
    advance(c, 1);
    const hot = core(c);

    // 400 W for 600 s = 240 kJ shed.
    advance(c, 600);
    expect(core(c)).toBeLessThan(hot);
    expect(c.heatLoadJ).toBeLessThan(1_000_000);
  });

  it("⭐⭐ over-casting is a PACE problem — spacing the load sheds it", () => {
    // The lesson the whole seam exists for: a caster who spaces their
    // work never warms, and one who chains it accumulates faster than
    // 400 W can carry away.
    const paced = person();
    const chained = person();
    core(paced);
    core(chained);
    // Same five loads, same wall-clock — one spaces them, one does not.
    for (let i = 0; i < 5; i++) {
      paced.absorbHeatLoad(200_000);
      advanceAll([paced, chained], 900);
    }
    for (let i = 0; i < 5; i++) chained.absorbHeatLoad(200_000);
    advanceAll([paced, chained], 1);

    expect(core(chained)).toBeGreaterThan(core(paced));
  });

  it("⚠ shedding STOPS past the wet-bulb ceiling — you cannot cool in a sauna", () => {
    // Shedding is sweating, and sweat cannot evaporate into saturated
    // air. The honest failure, not a special case.
    // ⚠ Ambient 310 at 100 % humidity: the wet bulb is at the air
    // temperature, past the 308 K ceiling. Sweat has nowhere to go.
    const steamy = person(310);
    steamy.setCachedHumidity(100);
    core(steamy);
    steamy.absorbHeatLoad(500_000);
    advance(steamy, 1);
    const before = steamy.heatLoadJ;
    advance(steamy, 1200);
    expect(steamy.heatLoadJ).toBeGreaterThanOrEqual(before - 1);
  });

  it("⭐⭐ CLOTHING slows shedding — the parka that warms you is what cooks you", () => {
    // Insulation impedes heat loss in BOTH directions. Worn clo sits in
    // series with the body's own resistance and flux goes as 1/R, so a
    // caster in arctic kit carries a load three times longer than a
    // naked one. Before this they shed identically, which was the
    // garment system and the thermal system not talking to each other.
    const naked = dressed(0);
    const parka = dressed(3);
    core(naked);
    core(parka);
    naked.absorbHeatLoad(600_000);
    parka.absorbHeatLoad(600_000);
    advanceAll([naked, parka], 600);
    expect(parka.heatLoadJ).toBeGreaterThan(naked.heatLoadJ);
    // …and the parka's core reads hotter for it.
    expect(core(parka)).toBeGreaterThan(core(naked));
  });

  it("the damping is 1/(1 + clo) against the body's own resistance", () => {
    // 1 clo halves the rate — one slice, no cap reached, so the shed is
    // the rate exactly.
    const naked = dressed(0);
    const suit = dressed(1);
    core(naked);
    core(suit);
    naked.absorbHeatLoad(1_000_000);
    suit.absorbHeatLoad(1_000_000);
    advanceAll([naked, suit], 60);
    const shedNaked = 1_000_000 - naked.heatLoadJ;
    const shedSuit = 1_000_000 - suit.heatLoadJ;
    expect(shedSuit / shedNaked).toBeCloseTo(0.5, 2);
  });

  it("a body carrying nothing is byte-identical — pinned at setpoint, free", () => {
    const c = person();
    core(c);
    advance(c, 1800);
    expect(core(c)).toBeCloseTo(THERMAL_DEFAULTS.SETPOINT_K, 1);
    expect(c.heatLoadJ).toBe(0);
  });

  it("absorbHeatLoad ignores zero and negative — it is a LOAD, not a thermostat", () => {
    const c = person();
    c.absorbHeatLoad(-5000);
    c.absorbHeatLoad(0);
    expect(c.heatLoadJ).toBe(0);
  });
});

describe("⭐⭐ the hyperthermia onset moved to setpoint + 2.5 K", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  const hasHyperthermia = (c: Creature): boolean =>
    c
      .getConditions()
      .some(
        (x) =>
          x.kind === "affliction" &&
          x.templatePath === TemplatePaths.thermalHyperthermia,
      );

  it("⭐ spawns at +2.5 K, not at survivableMax — 315 K is heat STROKE", () => {
    // Clinical hyperthermia is a core above ~38.3 °C. The shipped row
    // spawned at 315 K (42 °C), which named the condition at the wrong
    // temperature — a player who knows physiology would have been
    // surprised WRONGLY, which is lens 1's exact failure mode.
    const c = person();
    core(c);
    // ~1 MJ → +3.4 K, past the +2.5 K onset and well under +5 K.
    c.absorbHeatLoad(1_000_000);
    advance(c, 60);
    expect(core(c)).toBeLessThan(THERMAL_DEFAULTS.SETPOINT_K + 5);
    expect(hasHyperthermia(c)).toBe(true);
  });

  it("⚠ …and does NOT spawn just under the onset", () => {
    const c = person();
    core(c);
    // 500 kJ → +1.7 K, under +2.5 K.
    c.absorbHeatLoad(500_000);
    advance(c, 1);
    expect(hasHyperthermia(c)).toBe(false);
  });

  it("⭐⭐ …and under WEATHER too — the ambient path was never pinned", () => {
    // No internal load at all: a hot day and an empty waterskin. The body
    // sweats to hold setpoint until hydration is gone, then drifts toward
    // the ambient. It used to have to reach 315 K — heat STROKE — before
    // the row appeared, so a 40 °C day with no water was misery forever
    // and never a condition. Nothing anywhere asserted when hyperthermia
    // spawned under weather, before or after the onset moved; this does.
    const c = makeStuff(() => {
      const b = new Creature() as RegBody;
      b.setMass(Quantity.of(1, "kg")); // small → fast drift τ
      b.setEffectiveAmbientK(320);
      b.setCachedHumidity(30);
      return b;
    }) as RegBody;
    c.adjustReserve("hydration", Quantity.of(-100, "%")); // nothing to sweat
    core(c);
    // Walk it up in small steps and catch the onset on the way through.
    let spawnedAt: number | null = null;
    for (let i = 0; i < 120 && spawnedAt === null; i++) {
      advance(c, 30);
      if (hasHyperthermia(c)) spawnedAt = core(c);
    }
    expect(spawnedAt, "hyperthermia spawned under weather alone").not.toBeNull();
    // Past the onset, and BEFORE the old threshold.
    expect(spawnedAt!).toBeGreaterThan(THERMAL_DEFAULTS.SETPOINT_K + 2);
    expect(spawnedAt!).toBeLessThan(315);
  });

  it("⭐ being ill is not the same as dying of it — the lethal dwell still reads survivableMax", () => {
    // A body that sits above the onset but below the survivable maximum
    // is miserable rather than doomed. The two thresholds are now two
    // independently authorable facts.
    const c = person();
    core(c);
    c.absorbHeatLoad(1_000_000);
    advance(c, 60);
    expect(hasHyperthermia(c)).toBe(true);
    expect(c.isDying()).toBe(false);
  });
});
