/**
 * Step 2.3 — the campfire combustion layer. A fuel `Reserve` (content
 * theme 'combustion') depletes against game-time; while fuel remains the
 * fire's Thermal temperature is pinned hot (its surface scalds → contact
 * burns through the general Step-1.9 hook); on burnout the pin releases
 * and the fire falls to a passive cooling-embers object. A fed fire
 * stays hot.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Campfire from "../thing/Campfire";
import Material from "../../lib/material/Material";
import { Reserve } from "../../lib/reserve";
import { Touch } from "../../lib/perception/Touch";
import { Quantity } from "../../lib/quantity";
import { MixinApi } from "../../api/mixin";
import { Mixins } from "../../lib/mixin";
import { WorldClockApi } from "../../api/worldclock";
import "../idea/WorldClockRegistry";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;
function tick(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

let matCounter = 0;
function wood(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName("ash");
    m.setSpecificHeat(Quantity.of(2000, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.2, "W/(m·K)"));
    return m;
  }, `/stuff/idea/material/_fire/ash-${matCounter}`) as unknown as Material;
}

function campfire(fuelPct: number): Campfire {
  return makeStuff(() => {
    const f = new Campfire();
    f.setMass(Quantity.of(5, "kg"));
    f.setMaterial(wood());
    f.setLastAmbientK(290);
    f.setReserve(
      new Reserve(
        "fuel",
        Quantity.of(100, "%"),
        Quantity.of(fuelPct, "%"),
        "combustion",
        null,
      ),
    );
    return f;
  });
}

describe("Campfire — combustion + embers", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("composes LightSource, Postured, Reserved, Thermal", () => {
    const f = campfire(100);
    expect(MixinApi.isLightSource(f)).toBe(true);
    expect(MixinApi.isThermal(f)).toBe(true);
    expect(MixinApi.hasMixin(f, Mixins.Postured)).toBe(true);
    expect(MixinApi.hasMixin(f, Mixins.Reserved)).toBe(true);
  });

  it("a fed fire stays hot (pinned while fuel remains)", () => {
    const f = campfire(100);
    f.getTemperature(); // seed the fuel clock
    tick(600); // 10 game-min — fuel still abundant
    expect(f.getTemperature().rawValue()).toBe(800); // pinned
    expect(f.fuelRemaining()).toBeGreaterThan(0);
  });

  it("its surface scalds while lit → contact affords a burn", () => {
    const f = campfire(100);
    f.getTemperature();
    expect(Touch.bandFor(f.getSurfaceTemperature().rawValue())).toBe(
      "scalding",
    );
  });

  it("fuel depletes and floors → temperature falls toward ambient", () => {
    const f = campfire(100);
    f.getTemperature();
    tick(13000); // > 200 game-min at 0.5%/min → fuel exhausted
    // Reading temperature reconciles the fuel burn and releases the pin
    // at the burn temperature (no elapsed yet, so still ~hot this instant).
    const released = f.getTemperature().rawValue();
    expect(f.fuelRemaining()).toBe(0);
    expect(released).toBeCloseTo(800, 0);
    // The embers now cool as a passive Thermal object toward ambient.
    tick(3000);
    expect(f.getTemperature().rawValue()).toBeLessThan(800);
  });
});
