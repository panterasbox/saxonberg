/**
 * ⭐⭐ The trajectory contract (cold-storage W1).
 *
 * A body no longer samples its scope's air once and spreads it over the
 * gap — it drifts toward the MOVING air the scope publishes. These tests
 * pin:
 *   - a body with no scope is one constant stretch (drifts to its cached
 *     ambient, as before);
 *   - a body in a scope whose air STEPS mid-gap lands within 1% of a
 *     fine-step numeric reference (the moving-target closed form);
 *   - a living/regulated body still DROPS a long gap (the narrowed
 *     far-past guard), while plain matter integrates it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Good from "../../stuff/Good";
import Material from "../../material/Material";
import Biome from "../../biome/Biome";
import CartesianLocation from "../../location/CartesianLocation";
import CartesianZone from "../../../platform/idea/location/CartesianZone";
import { Creature } from "../../creature/Creature";
import { ThermalMixin } from "../Thermal";
import { Decay } from "../../Decay";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import WorldClockRegistry from "../../../platform/idea/WorldClockRegistry";
import { TemplatePaths } from "../../paths";
import { BiomeApi } from "../../../api/biome";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const BIOME_K = 283;
const INDOOR = "/stuff/idea/biome/_traj/indoor";
let counter = 0;
let nowS = 1000;

class Loaf extends ThermalMixin(Good) {
  static _mixinName = "TrajLoaf";
}
/** A regulated body — a Creature carries ThermalRegulation. */
class Body extends Creature {}

function breadMaterial(): Material {
  counter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`traj-bread-${counter}`);
    m.setSpecificHeat(Quantity.of(2500, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.3, "W/(m·K)"));
    m.setDensity(Quantity.of(400, "kg/m³"));
    return m;
  }, `/stuff/idea/material/_traj/bread-${counter}`) as unknown as Material;
}

function loaf(k: number): Loaf {
  const mat = breadMaterial();
  return makeStuff(() => {
    const l = new Loaf();
    l.setMass(Quantity.of(0.8, "kg"));
    l.setMaterial(mat);
    l.setStampedTemperatureK(k);
    l.lastAmbientK = k;
    return l;
  });
}

function room(): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const r = makeStuff(() => new CartesianLocation());
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
  (r as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
    material: "/stuff/idea/material/_traj/oak",
    thicknessM: 0.02,
  });
  (r as unknown as { envelopeOutsideK: number }).envelopeOutsideK = 290;
  (r as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = 290;
  return r;
}

describe("the temperature trajectory contract", () => {
  afterEach(() => {
    StuffApi.clearAll();
  });
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    nowS = 1000;
    WorldClockApi._setNowProviderForTesting(() => nowS);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
    BiomeApi.invalidateRootBiomeCache();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName("traj-oak");
      m.setThermalConductivity(Quantity.of(0.16, "W/(m·K)"));
      m.setDensity(Quantity.of(700, "kg/m³"));
      m.setSpecificHeat(Quantity.of(1600, "J/(kg·K)"));
      return m;
    }, "/stuff/idea/material/_traj/oak");
    makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultTemperature(Quantity.of(BIOME_K, "K"));
      b.setDefaultPressure(Quantity.of(101325, "Pa"));
      b.setDefaultHumidity(Quantity.of(50, "%"));
      b.setDefaultGravity(Quantity.of(9.81, "m/s²"));
      b.setDefaultWind(Quantity.of(0, "m/s"));
      b.setDefaultAtmosphere("air");
      return b;
    }, INDOOR);
  });

  // The clock scales real-ms → game-seconds by an anchor + scale, so time
  // is advanced through the API, never by poking a stamp to an absolute.
  const gnow = (): number => WorldClockApi.getNow().rawValue();
  const advanceGameSeconds = (g: number): void => {
    nowS += (g / WorldClockApi.getScale()) * 1000;
  };

  it("a body with no scope drifts toward its cached ambient (one stretch)", () => {
    const bread = loaf(350);
    bread.reconcileThermal(); // seed the stamp
    const s0 = bread.thermalClockStamp;
    bread.setStampedTemperatureK(350);
    bread.lastAmbientK = 290;
    advanceGameSeconds(600);
    bread.reconcileThermal();
    const elapsed = gnow() - s0;
    const tau = bread.getTau().rawValue();
    expect(bread.getTemperature().rawValue()).toBeCloseTo(
      Decay.toward(350, 290, elapsed, tau),
      2,
    );
    const pw = bread.temperatureTrajectory(gnow(), gnow() + 10);
    expect(pw.stretches.length).toBeGreaterThanOrEqual(1);
  });

  it("a body in a scope whose air steps mid-gap matches a fine reference", () => {
    const bakery = room();
    const bread = loaf(350);
    ContainmentApi.move(bread, bakery);

    bread.reconcileThermal(); // seed the body's stamp
    const s0 = bread.thermalClockStamp;
    bread.setStampedTemperatureK(350);
    bread.lastAmbientK = 290;

    advanceGameSeconds(1200);
    const nowGame = gnow();
    const elapsed = nowGame - s0;
    const H = elapsed / 2;
    const tauScope = H; // a noticeable decay in the second segment

    // A 2-segment scope air trajectory seeded straight into the scope's
    // ring: 290 held, then 290 → 260 (a freezer kicking in mid-gap).
    (bakery as unknown as { envelopeLog: unknown[] }).envelopeLog = [
      { atS: s0, value: 290, target: 290, tau: 0 },
      { atS: s0 + H, value: 290, target: 260, tau: tauScope },
    ];
    (bakery as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = 260;

    bread.reconcileThermal();
    const got = bread.getTemperature().rawValue();

    // Fine reference: relax the body in tiny steps toward the SAME air.
    const ambientAt = (s: number): number =>
      s <= s0 + H ? 290 : Decay.toward(290, 260, s - (s0 + H), tauScope);
    const tauBody = bread.getTau().rawValue();
    const N = 20000;
    const h = elapsed / N;
    let ref = 350;
    for (let i = 0; i < N; i++) {
      ref = Decay.toward(ref, ambientAt(s0 + (i + 0.5) * h), h, tauBody);
    }
    expect(Math.abs(got - ref) / Math.abs(ref)).toBeLessThan(0.01);
    // It ended BELOW where constant 290-air would have left it — the body
    // saw the downward step, which is the whole point of integrating the
    // trajectory rather than sampling the first segment.
    const constantAir = Decay.toward(350, 290, elapsed, tauBody);
    expect(got).toBeLessThan(constantAir);
  });

  it("a regulated body DROPS a gap longer than the far-past guard", () => {
    const body = makeStuff(() => {
      const b = new Body();
      b.setStampedTemperatureK(310);
      b.lastAmbientK = 280;
      return b;
    });
    body.reconcileThermal(); // seed
    body.setStampedTemperatureK(310);
    advanceGameSeconds(5 * 3600); // > the 4h guard
    body.reconcileThermal();
    // A living body does not "cool" across an absence — temp unchanged.
    expect(body.getTemperature().rawValue()).toBeCloseTo(310, 1);
  });

  it("plain matter INTEGRATES a gap longer than the guard", () => {
    const bread = loaf(350);
    bread.reconcileThermal(); // seed
    bread.setStampedTemperatureK(350);
    bread.lastAmbientK = 280;
    advanceGameSeconds(5 * 3600); // same long gap
    bread.reconcileThermal();
    // Matter has no logout excuse — it cooled toward ambient.
    expect(bread.getTemperature().rawValue()).toBeLessThan(330);
  });
});
