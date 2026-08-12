/**
 * Step 5.2–5.7 — Option-C thermoregulation. The body drives
 * `coreTemperature`: within the thermoneutral band it pins at setpoint
 * for free; below it spends satiation (and shivers); above it spends
 * hydration (and sweats); out of fuel it drifts and the cascade spawns
 * hypothermia / hyperthermia → death. An ectotherm never defends a
 * setpoint — its core floats to the effective ambient (cold → torpor).
 *
 * The effective ambient is set directly (`setEffectiveAmbientK`) to
 * bypass the async biome resolve — the per-slice reconcile reads that
 * cache synchronously, which is exactly the production contract.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Species from "../../../obj/species/Species";
import BodyPlan from "../../../obj/species/BodyPlan";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import { TemplatePaths } from "../../paths";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getVitalSign("coreTemperature"); // force the lazy reconcile
    remaining -= s;
  }
}

const core = (c: Creature): number =>
  c.getVitalSign("coreTemperature").rawValue();
const sat = (c: Creature): number =>
  c.getReserve("satiation")?.current.rawValue() ?? 0;
const hyd = (c: Creature): number =>
  c.getReserve("hydration")?.current.rawValue() ?? 0;

type RegBody = Creature & {
  setEffectiveAmbientK(k: number): void;
  thermalRegStamp: number;
};

let speciesCounter = 0;
function ectothermSpecies(): Species {
  speciesCounter += 1;
  const bp = makeStuffAtPath(() => {
    const b = new BodyPlan();
    b.setThermalStrategy("ectotherm");
    return b;
  }, `/obj/species/BodyPlan/_reg/ecto-${speciesCounter}`) as unknown as BodyPlan;
  const sp = makeStuffAtPath(() => {
    const s = new Species();
    s.setBodyPlan(bp);
    return s;
  }, `/obj/species/_reg/ecto-${speciesCounter}`) as unknown as Species;
  return sp;
}

function body(opts: { ambientK: number; ecto?: boolean }): RegBody {
  return makeStuff(() => {
    const c = new Creature() as RegBody;
    c.setMass(Quantity.of(1, "kg")); // small → fast drift τ for the test
    if (opts.ecto) c.setSpecies(ectothermSpecies());
    c.setEffectiveAmbientK(opts.ambientK);
    return c;
  }) as RegBody;
}

describe("ThermalRegulationMixin — Option-C dead-band", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("within the band: core pins at setpoint at zero reserve cost", () => {
    const c = body({ ambientK: 310 });
    core(c); // seed
    const satBefore = sat(c);
    advance(c, 1800);
    expect(core(c)).toBeCloseTo(310, 1);
    expect(sat(c)).toBeCloseTo(satBefore, 1); // no fuel spent
  });

  it("below the band: satiation falls and the core holds at setpoint", () => {
    const c = body({ ambientK: 270 });
    core(c);
    const satBefore = sat(c);
    advance(c, 600);
    expect(core(c)).toBeCloseTo(310, 0); // held while affordable
    expect(sat(c)).toBeLessThan(satBefore); // burned fuel to hold
  });

  it("above the band: hydration falls (sweating to hold)", () => {
    const c = body({ ambientK: 330 });
    core(c);
    const hydBefore = hyd(c);
    advance(c, 600);
    expect(hyd(c)).toBeLessThan(hydBefore);
  });

  it("out of fuel in the cold: core drifts down → hypothermia spawns", () => {
    const c = body({ ambientK: 250 });
    c.adjustReserve("satiation", Quantity.of(-100, "%")); // empty the tank
    core(c);
    advance(c, 3600, 1200); // a game-hour, in sub-far-past chunks
    expect(core(c)).toBeLessThan(301); // drifted below survivableMin
    expect(
      c.hasCondition(
        (x) =>
          x.kind === "affliction" &&
          x.templatePath === TemplatePaths.thermalHypothermia,
      ),
    ).toBe(true);
  });

  it("an ectotherm's core floats to the effective ambient (no setpoint)", () => {
    const c = body({ ambientK: 300, ecto: true });
    core(c);
    advance(c, 3600, 1200);
    // Not pinned at 310 — it has drifted toward the cooler ambient.
    expect(core(c)).toBeLessThan(309);
  });

  it("a cold ectotherm falls into torpor (alive, immobile)", () => {
    const c = body({ ambientK: 270, ecto: true });
    core(c);
    advance(c, 3600, 1200);
    expect(core(c)).toBeLessThan(301);
    expect(
      c.hasCondition(
        (x) =>
          x.kind === "affliction" &&
          x.templatePath === TemplatePaths.thermalTorpor,
      ),
    ).toBe(true);
    // Alive, not dead — torpor immobilizes, it does not kill.
    expect(c.getLifecycleState()).not.toBe("dead");
  });
});
