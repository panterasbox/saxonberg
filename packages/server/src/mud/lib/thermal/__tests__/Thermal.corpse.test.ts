/**
 * Step 1.8 — corpse algor mortis. A Creature composes ThermalMixin, so
 * a dead body cools toward ambient as a plain Thermal object — no
 * separate corpse type, no postmortem-progression machinery (the living
 * regulation layer, Phase 2, is what would otherwise pin coreTemperature
 * and is simply absent here). This pins the passive-drift half: a
 * Creature's bulk `getTemperature()` trends toward its cached ambient
 * over elapsed game-time.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../mixin";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    (c as unknown as { getTemperature(): Quantity<"K"> }).getTemperature();
    remaining -= s;
  }
}

function corpse(stampedK: number, ambientK: number): Creature {
  return makeStuff(() => {
    const c = new Creature();
    c.setMass(Quantity.of(70, "kg"));
    const t = c as unknown as {
      setStampedTemperatureK(v: number): void;
      setLastAmbientK(v: number): void;
    };
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(ambientK);
    // A corpse: living regulation is inert when dead.
    c.setLifecycleState("dead");
    return c;
  });
}

describe("ThermalMixin — corpse algor mortis", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("a Creature composes ThermalMixin", () => {
    const c = makeStuff(() => new Creature());
    expect(MixinApi.isThermal(c)).toBe(true);
    expect(MixinApi.hasMixin(c, Mixins.Thermal)).toBe(true);
  });

  it("a dead body cools toward ambient over elapsed game-time", () => {
    const body = corpse(310, 290); // 37 °C body, ~17 °C room
    const t = body as unknown as { getTemperature(): Quantity<"K"> };
    const start = t.getTemperature().rawValue();
    expect(start).toBeCloseTo(310, 0);

    advance(body, 7200); // a couple game-hours
    const cooled = t.getTemperature().rawValue();
    expect(cooled).toBeLessThan(start);
    expect(cooled).toBeGreaterThan(290);
  });
});
