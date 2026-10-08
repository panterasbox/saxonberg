/**
 * Step 2.3 — the campfire combustion layer. A fuel `Reserve` (content
 * theme 'combustion') depletes against game-time; while fuel remains the
 * fire's Thermal temperature is pinned hot (its surface scalds → contact
 * burns through the general Step-1.9 hook); on burnout the pin releases
 * and the fire falls to a passive cooling-embers object. A fed fire
 * stays hot.
 */

import "../../../test-bootstrap";
import type { Stuff } from "../../lib/stuff/Stuff";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Campfire from "../thing/Campfire";
import Material from "../../lib/material/Material";
import { Reserve } from "../../lib/reserve";
import { chargeWood } from "../../lib/fire/__tests__/burner-fuel";
import type { Burner } from "../../lib/fire/Burner";
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
    // ⭐ `fuelPct` is now kilograms in the bed rather than a percentage
    // of nothing: 20 kg is a full campfire, 0 is a cold ring of stones.
    chargeWood(f as unknown as Stuff & Burner, (fuelPct / 100) * 20);
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

  it("composes LightSource, Postured, Thermal — and NOT Reserved", () => {
    const f = campfire(100);
    expect(MixinApi.isLightSource(f)).toBe(true);
    expect(MixinApi.isThermal(f)).toBe(true);
    expect(MixinApi.hasMixin(f, Mixins.Postured)).toBe(true);
    // ⭐⭐ `ReservedMixin` left the `Firebox` chain in the fire build. The
    // `'fuel'` Reserve was a percentage of nothing: it could not say what
    // the fire was burning, so a fire could not be told what it held or
    // given any more, and no fire in the game could run twice. Fuel is a
    // BED now — kilograms, by material, on `BurnerMixin`.
    expect(MixinApi.hasMixin(f, Mixins.Reserved)).toBe(false);
    expect(MixinApi.isBurner(f)).toBe(true);
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

  it("fuel runs out, the pin releases, and the embers cool", () => {
    const f = campfire(100);
    f.getTemperature();
    // ⭐ 20 kg of 30 MJ/kg fuel is 600 MJ; a campfire's 8 kW spends that
    // in ~75,000 game-seconds. ⚠ In steps under the four-hour far-past
    // guard, which drops a longer gap as a logout rather than
    // integrating it — a campfire does not burn down while the server is
    // off, and a single long jump would measure nothing.
    let steps = 0;
    while (f.fuelRemaining() > 0 && steps < 40) {
      tick(10_000);
      f.getTemperature(); // the read is what reconciles the burn
      steps += 1;
    }
    expect(f.fuelRemaining()).toBe(0);
    expect(f.isLit()).toBe(false); // the burnout edge put it out

    // ⭐ The burnout edge stamps the contents at the held temperature and
    // releases the pin, so this instant reads hot and everything after it
    // is the passive Thermal cooling. ⚠ The loop above has to BREAK at
    // burnout for that to be observable: running it a fixed number of
    // steps past the edge reads the embers, not the release.
    const released = f.getTemperature().rawValue();
    expect(released).toBeCloseTo(800, 0);
    tick(3000);
    expect(f.getTemperature().rawValue()).toBeLessThan(800);
  });
});
