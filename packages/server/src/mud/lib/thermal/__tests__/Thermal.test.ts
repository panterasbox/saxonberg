/**
 * ThermalMixin — the generic lazy Newton's-cooling capability. Driven
 * through the real `WorldClockApi` test seam (the metabolism reconcile
 * harness is the template): a hot object read after elapsed game-time
 * returns the exponential `T(now)`; warming is symmetric; τ scales with
 * thermal mass; no world clock → idle; a massless host reads ambient.
 *
 * Harness note: like the metabolism reconcile test, the afterEach does
 * NOT `StuffApi.clearAll()` — that would wipe the lazily-minted
 * WorldClockRegistry and leave the next test's `thermalNowSeconds()`
 * idle. Material singletons use globally-unique paths so they don't
 * collide across tests without a clear.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Thing from "../../stuff/Thing";
import Material from "../../material/Material";
import { ThermalMixin } from "../Thermal";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry"; // register the registry class
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = "ThermalThing";
}

const SCALE = 12; // default game-seconds per real-second
let real = 0;

/** Advance game-time by `gameSec`, forcing the lazy reconcile via a read. */
function advance(t: ThermalThing, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    t.getTemperature();
    remaining -= s;
  }
}

// Globally-unique so material singletons never collide across tests
// (the harness never clears StuffApi, to keep the world clock alive).
let matCounter = 0;
function material(specificHeat: number, conductivity = 0.6): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-mat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(specificHeat, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(conductivity, "W/(m·K)"));
    return m;
  }, `/obj/material/_test/mat-${matCounter}`) as unknown as Material;
}

function thing(opts: {
  massKg: number;
  stampedK: number;
  ambientK: number;
  specificHeat?: number;
}): ThermalThing {
  const mat = material(opts.specificHeat ?? 4186);
  return makeStuff(() => {
    const t = new ThermalThing();
    t.setMass(Quantity.of(opts.massKg, "kg"));
    t.setMaterial(mat);
    t.setStampedTemperatureK(opts.stampedK);
    t.setLastAmbientK(opts.ambientK);
    return t;
  });
}

// Idle describe runs FIRST so no WorldClockRegistry instance exists yet
// (importing the class only registers it for hydration; the instance is
// lazily minted by `_resetForTesting` / `getNow`, which the drift
// describe below triggers).
describe("ThermalMixin — idle without a world clock", () => {
  beforeEach(() => installV1QuantityMarshallers());

  it("returns the stamped value unchanged when no clock runs", () => {
    const t = thing({ massKg: 0.5, stampedK: 350, ambientK: 295 });
    expect(t.getTemperature().rawValue()).toBe(350);
    // No world-clock registry → thermalNowSeconds() is null → idle.
    expect(t.getTemperature().rawValue()).toBe(350);
  });
});

describe("ThermalMixin — drift on a running clock", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    // Reset the clock but keep the registry instance alive (a clearAll
    // here would idle the next test's reconcile).
    WorldClockApi._resetForTesting();
  });

  it("a hot object cools toward ambient (exponential, monotone)", () => {
    const t = thing({ massKg: 0.5, stampedK: 350, ambientK: 295 });
    const start = t.getTemperature().rawValue(); // seeds the stamp
    expect(start).toBeCloseTo(350, 5);

    advance(t, 600);
    const mid = t.getTemperature().rawValue();
    expect(mid).toBeLessThan(350);
    expect(mid).toBeGreaterThan(295); // hasn't reached ambient yet

    advance(t, 600);
    const later = t.getTemperature().rawValue();
    expect(later).toBeLessThan(mid); // monotone toward ambient
    expect(later).toBeGreaterThan(295);
  });

  it("settles to ambient after many time-constants", () => {
    const t = thing({ massKg: 0.2, stampedK: 360, ambientK: 290 });
    t.getTemperature();
    advance(t, 3600 * 4 - 1, 600); // most of a day, under the far-past guard
    expect(t.getTemperature().rawValue()).toBeCloseTo(290, 0);
  });

  it("warming is symmetric — a cold object in a warm room rises", () => {
    const t = thing({ massKg: 0.5, stampedK: 280, ambientK: 310 });
    t.getTemperature();
    advance(t, 600);
    const warmed = t.getTemperature().rawValue();
    expect(warmed).toBeGreaterThan(280);
    expect(warmed).toBeLessThan(310);
  });

  it("τ scales with thermal mass — more mass cools slower", () => {
    const light = thing({ massKg: 0.25, stampedK: 350, ambientK: 295 });
    const heavy = thing({ massKg: 1.0, stampedK: 350, ambientK: 295 });
    light.getTemperature();
    heavy.getTemperature();
    advance(light, 600);
    advance(heavy, 600);
    // Same elapsed time: the heavier object has cooled less.
    expect(heavy.getTemperature().rawValue()).toBeGreaterThan(
      light.getTemperature().rawValue(),
    );
  });

  it("τ scales with mass via getTau", () => {
    const light = thing({ massKg: 0.25, stampedK: 300, ambientK: 295 });
    const heavy = thing({ massKg: 1.0, stampedK: 300, ambientK: 295 });
    expect(heavy.getTau().rawValue()).toBeGreaterThan(
      light.getTau().rawValue() * 3,
    );
  });

  it("a massless host reads ambient immediately (τ → 0)", () => {
    const t = thing({ massKg: 0, stampedK: 350, ambientK: 295 });
    t.getTemperature(); // seed
    advance(t, 60);
    expect(t.getTemperature().rawValue()).toBeCloseTo(295, 1);
  });
});
