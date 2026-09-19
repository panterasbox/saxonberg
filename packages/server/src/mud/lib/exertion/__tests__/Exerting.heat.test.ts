/**
 * Exertion is heat (nutrition-and-fitness W6, on the injury build's heat
 * load): `1 − η` of every exertion lands on the body's internal heat
 * load and the thermal slice sheds it — costing hydration, damped by
 * what the body wears. A shift in a coat is a wetter, thirstier shift
 * than the same shift bare. And reach ANDs with function: an impaired
 * locomotion cannot hold a run however conditioned the body.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Creature } from "../../creature/Creature";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import { AppApi } from "../../../api/app";
import "../../../platform/idea/WorldClockRegistry";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import type { LocomotionMode } from "../../../platform/idea/LocomotionMode";

const SCALE = 12;
let real = 0;

type RegBody = Creature & {
  setEffectiveAmbientK(k: number): void;
  setCachedHumidity(v: number): void;
  heatLoadJ: number;
};

// ⚠ One class per insulation, at module scope. A class minted per call
// under a repeated `_mixinName` collides in the mixin registry on the
// second test, and the second body then reads as not-living and never
// sheds — the first cut of this file passed alone and failed in order.
class Bare extends Creature {
  static _mixinName: string = "BareExertingTestCreature";
}
class Coated extends Creature {
  static _mixinName: string = "CoatedExertingTestCreature";
  override bodyInsulation(): Quantity<"clo"> {
    return Quantity.of(1.0, "clo");
  }
}

function body(clo: number, ambientK = 295): RegBody {
  return makeStuff(() => {
    const c = new (clo > 0 ? Coated : Bare)() as unknown as RegBody;
    c.setMass(Quantity.of(70, "kg"));
    c.setEffectiveAmbientK(ambientK);
    c.setCachedHumidity(30);
    return c;
  }) as RegBody;
}

function advanceAll(bodies: Creature[], gameSec: number, chunkSec = 60): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    for (const c of bodies) c.getVitalSign("coreTemperature");
    remaining -= s;
  }
}

const RUN = { getName: () => "run", getCostMultiplier: () => 2, getSpeed: () => 2 } as unknown as LocomotionMode;

describe("exertion is heat", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, "setting").mockReturnValue("");
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  // ⚠ No `StuffApi.clearAll()` here: it would take the WorldClockRegistry
  // the import above stood up with it, and a body with no time source
  // integrates nothing — the second test's shift would shed no heat at
  // all (the heat-load test it mirrors resets only the clock).
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it("⭐ an exertion at 600 W for 60 s deposits 27 kJ on the heat load", () => {
    const c = body(0);
    c.getVitalSign("coreTemperature");
    c.exert({ durationS: 60, powerW: 600 });
    // 600 × 60 × (1 − 0.25)
    expect(c.heatLoadJ).toBeCloseTo(27_000, 0);
  });

  it("⭐⭐ the same shift in a coat sheds slower and costs more water", () => {
    const bare = body(0);
    const coat = body(1.0);
    for (const c of [bare, coat]) c.getVitalSign("coreTemperature");
    // A shift at the anvil: 600 W held for an hour, in one deposit.
    for (const c of [bare, coat]) c.exert({ durationS: 3600, powerW: 600 });
    const before = { bare: bare.getHydration().current.rawValue(), coat: coat.getHydration().current.rawValue() };
    advanceAll([bare, coat], 20 * 60);
    expect(coat.heatLoadJ, "the coat damps the shedding").toBeGreaterThan(bare.heatLoadJ);
    const spent = {
      bare: before.bare - bare.getHydration().current.rawValue(),
      coat: before.coat - coat.getHydration().current.rawValue(),
    };
    expect(spent.coat, "the coated body sweats more for less").toBeGreaterThanOrEqual(spent.bare);
    expect(spent.bare).toBeGreaterThan(0);
  });

  it("⭐ reach ANDs with function — an impaired leg cannot hold a run, however conditioned", () => {
    const c = body(0);
    c.adjustReserve("wind", Quantity.of(100, "%"));
    expect(c.canSustainPace(RUN)).toBe(true);
    vi.spyOn(c, "capacity").mockReturnValue("impaired");
    expect(c.canSustainPace(RUN)).toBe(false);
  });
});
