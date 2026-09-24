/**
 * Lamp — a light that burns fuel, and therefore a light that GOES OUT.
 *
 * ⭐ The whole class is a composition decision: `FurnaceMixin` over
 * `LightSourceMixin` gives a lantern a real reserve, a drain against
 * game time, reconcile-on-read so it burns down unattended, the burnout
 * edge, and `ignite`/`douse` — none of it written in `Lamp.ts`. What is
 * tested here is that the composition actually delivers those, and the
 * two things a row can get wrong.
 *
 * ⚠ What shipped before: the lantern and the torch were `PortableLight`
 * — a `Switchable` — so they burned forever. The only reason that never
 * mattered is that nowhere in the realm was dark.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Lamp from "../thing/Lamp";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { WorldClockApi } from "../../api/worldclock";
import WorldClockRegistry from "../idea/WorldClockRegistry";
import { TemplatePaths } from "../../lib/paths";
import { Reserve } from "../../lib/reserve";
import { Quantity } from "../../lib/quantity";
import { THERMAL_DEFAULTS } from "../../lib/thermal/Thermal";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;

/** Advance the world clock by `gameSec`. */
function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

function lamp(opts: { fuel?: number; flux?: number } = {}): Lamp {
  return makeStuff(() => {
    const l = new Lamp();
    l.setEmittedFlux(opts.flux ?? 220);
    l.setReserve(
      new Reserve(
        "fuel",
        Quantity.of(100, "%"),
        Quantity.of(opts.fuel ?? 100, "%"),
        "combustion",
        null,
      ),
    );
    return l;
  }) as Lamp;
}

describe("Lamp — a small furnace with a light on it", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    // ⚠ `furnaceNowSeconds()` returns null unless the clock registry
    // singleton is REGISTERED at its template path — importing the
    // module is not enough. Without it the fuel reconcile is a silent
    // no-op and a burn test passes by measuring nothing.
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it("⚠ ships OUT, against the mixin default", () => {
    // `FurnaceMixin.lit` defaults TRUE — right for a forge, wrong for a
    // lantern on a shop shelf, where it would burn its fuel away with
    // nobody there. The class overrides it; `lint:light-sources` clause
    // (g) makes every row say which it means anyway.
    const l = lamp();
    expect(MixinApi.isFurnace(l)).toBe(true);
    expect(l.isLit()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it("lights, casts its authored flux, and goes dark when doused", () => {
    const l = lamp({ flux: 220 });
    l.ignite();
    expect(l.isLit()).toBe(true);
    expect(l.getEmittedFlux().rawValue()).toBe(220);
    l.douse();
    expect(l.isLit()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it("⭐ burns down over a game night, unattended, and then is dark", () => {
    const l = lamp();
    l.ignite();
    l.reconcileFurnaceFuel(); // seed the clock stamp
    expect(l.getEmittedFlux().rawValue()).toBeGreaterThan(0);

    // ⚠⚠ In game-HOUR steps throughout, because `reconcileFurnaceFuel`
    // drops any gap over `MAX_REASONABLE_GAP_SEC` (four hours) as a
    // logout rather than integrating it — a lamp does not burn down
    // while the server is off. The first draft of this test jumped six
    // hours to get to halfway and the reconcile threw the whole span
    // away; it read 100 % fuel after six hours of burning, which is the
    // guard working and the test measuring nothing.
    const burnAnHour = (): void => {
      advance(3600);
      l.reconcileFurnaceFuel();
    };

    // Half a night: burning, and visibly down on fuel.
    for (let h = 0; h < 6; h++) burnAnHour();
    expect(l.isLit()).toBe(true);
    expect(l.fuelRemaining()).toBeLessThan(100);
    expect(l.fuelRemaining()).toBeGreaterThan(0);

    for (let h = 0; h < 12; h++) burnAnHour();
    expect(l.fuelRemaining()).toBe(0);
    expect(l.isLit()).toBe(false); // the burnout edge put it out
    expect(l.getEmittedFlux().rawValue()).toBe(0); // and the dark returns
  });

  it("⚠ an empty lamp refuses to light — there is nothing to burn", () => {
    const l = lamp({ fuel: 0 });
    l.ignite();
    expect(l.isLit()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it("⭐ a lit lamp is warm, not SCALDING — you can carry it", () => {
    // The case, not the flame. Above the scalding hook a lit lantern
    // would burn the hand that picked it up, which is not what a
    // lantern is for; a forge's 1300 K is the other case entirely.
    const l = lamp();
    l.ignite();
    expect(l.getHeldTemperatureK()).toBe(330);
    expect(l.getHeldTemperatureK()).toBeLessThan(345);
    expect(l.getTemperature().rawValue()).toBe(330);
    // Out, it is just a thing in the room.
    l.douse();
    expect(l.getTemperature().rawValue()).toBeLessThan(330);
  });

  it("does not pretend to be a forge — no bellows boost authored", () => {
    const l = lamp();
    expect(l.getBellowsMultiplier()).toBe(1);
    expect(l.burnTemperatureK).toBeLessThan(
      THERMAL_DEFAULTS.SETPOINT_K + 100,
    );
  });
});
