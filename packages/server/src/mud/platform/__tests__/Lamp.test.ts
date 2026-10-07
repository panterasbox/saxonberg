/**
 * Lamp — a light that burns fuel, and therefore a light that GOES OUT.
 *
 * ⭐ The whole class is a composition decision: `BurnerMixin` over
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
import { chargeHot } from '../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../lib/fire/Burner';
import type { Stuff } from '../../lib/stuff/Stuff';
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

/**
 * A lamp with `fuelKg` in its bed. ⭐ Kilograms of a named material now,
 * not a percentage of nothing — half a kilo is a full lantern, and at
 * 300 W that is about a game night, which is what the class's prose has
 * always promised and could not previously deliver.
 */
function lamp(opts: { fuelKg?: number; flux?: number } = {}): Lamp {
  const l = makeStuff(() => {
    const x = new Lamp();
    x.setEmittedFlux(opts.flux ?? 220);
    return x;
  }) as Lamp;
  const kg = opts.fuelKg ?? 0.5;
  if (kg > 0) chargeHot(l as unknown as Stuff & Burner, kg);
  return l;
}

describe("Lamp — a small furnace with a light on it", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    // ⚠ `burnerNowSeconds()` returns null unless the clock registry
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
    // `BurnerMixin.lit` defaults TRUE — right for a forge, wrong for a
    // lantern on a shop shelf, where it would burn its fuel away with
    // nobody there. The class overrides it; `lint:light-sources` clause
    // (g) makes every row say which it means anyway.
    const l = lamp();
    expect(MixinApi.isBurner(l)).toBe(true);
    expect(l.isLit()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it("⭐⭐ lights, sheds a FRACTION of its authored ceiling, goes dark when doused", () => {
    const l = lamp({ flux: 220 });
    l.ignite();
    expect(l.isLit()).toBe(true);
    // The authored number is a CEILING. Luminosity is incandescent soot:
    // a solid or liquid fuel's flame is luminous (`sootyFloor`, 0.6) and
    // a clean-burning gas flame is not (`cleanFloor`, 0.15) — ⭐ which is
    // the mantle problem arriving by itself rather than being authored,
    // and the reason a gas lamp is a disappointment until somebody
    // invents one.
    expect(l.getEmittedFlux().rawValue()).toBeCloseTo(132);
    expect(l.getEmittedFlux().rawValue()).toBeLessThan(220);
    l.douse();
    expect(l.isLit()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);
  });

  it("⭐ burns down over a game night, GUTTERS, and only then is dark", () => {
    const l = lamp();
    l.ignite();
    l.reconcileBurnerFuel(); // seed the clock stamp
    expect(l.getEmittedFlux().rawValue()).toBeGreaterThan(0);

    // ⚠⚠ In game-HOUR steps throughout, because `reconcileBurnerFuel`
    // drops any gap over `MAX_REASONABLE_GAP_SEC` (four hours) as a
    // logout rather than integrating it — a lamp does not burn down
    // while the server is off. The first draft of this test jumped six
    // hours to get to halfway and the reconcile threw the whole span
    // away; it read 100 % fuel after six hours of burning, which is the
    // guard working and the test measuring nothing.
    const burnAnHour = (): void => {
      advance(3600);
      l.reconcileBurnerFuel();
    };

    // Half a night: burning, and visibly down on fuel.
    for (let h = 0; h < 6; h++) burnAnHour();
    expect(l.isLit()).toBe(true);
    expect(l.fuelRemaining()).toBeLessThan(0.5);
    expect(l.fuelRemaining()).toBeGreaterThan(0);

    const halfNight = l.getEmittedFlux().rawValue();

    // ⭐⭐ A full night, and it is GUTTERING rather than out — which is
    // what the class's own prose has always said and could not deliver.
    // Once the bed's mass stops binding against `maxBurnPowerW` the power
    // is proportional to what is left, so the last of the oil burns ever
    // more slowly and ever more dimly. A lamp filled at dusk is a bad
    // lamp by dawn; it is not a dark one.
    for (let h = 0; h < 12; h++) burnAnHour();
    expect(l.isLit()).toBe(true);
    expect(l.fuelRemaining()).toBeLessThan(0.05);
    expect(l.getEmittedFlux().rawValue()).toBeLessThan(halfNight * 0.75);

    // ⚠ And it does eventually go out, which needs a FLOOR: the drain is
    // asymptotic, so without one the burnout edge would never fire and
    // a lamp would stay faintly lit forever on a milligram of oil. This
    // is what caught it.
    for (let h = 0; h < 30; h++) burnAnHour();
    expect(l.fuelRemaining()).toBe(0);
    expect(l.isLit()).toBe(false); // the burnout edge put it out
    expect(l.getEmittedFlux().rawValue()).toBe(0); // and the dark returns
  });

  it("⚠ an empty lamp refuses to light — there is nothing to burn", () => {
    const l = lamp({ fuelKg: 0 });
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
