/**
 * ⭐⭐ Reading a body no longer changes it; bodies wake on the game clock
 * (organism-biology D17, W6b).
 *
 * The core temperature used to integrate on READ — so a body nobody looked
 * at never cooled, and every `look` moved it. Now the read is a pure
 * projection (the same slices run on a probe), the reconcile is the only
 * writer, and a resident body arms a game-clock wake at its next
 * threshold crossing, never more than an hour away. The far-past guard
 * drops a gap only for a body that had NO wake armed: absence is not
 * billed, but a wake that fires late still cools the frog through the
 * night. A player's body is never billed for a gap.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { HasInteractiveMixin } from "../../connection/HasInteractive";
import type Interactive from "../../../platform/idea/Interactive";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { EventApi } from "../../../api/event";
import EventRegistry from "../../../platform/idea/EventRegistry";
import "../../../platform/idea/EventSubscriptions";
import { Stuff } from "../../stuff/Stuff";
import { StuffApi } from "../../../api/stuff";
import { THERMAL_DEFAULTS } from "../Thermal";
import { standShippedConditions } from "../../vitals/__tests__/conditions";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;

type RegBody = Creature & {
  setEffectiveAmbientK(k: number): void;
  setCachedHumidity(v: number): void;
  thermalRegStamp: number;
  thermalWakeAtS: number;
};

class PlayerBody extends HasInteractiveMixin(Creature) {
  static _mixinName = "WakeTestPlayerBody";
}

const core = (c: Creature): number => c.getVitalSign("coreTemperature").rawValue();

/** Move the clock without firing anything — a restart, a day's jump. */
function jump(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
  WorldClockApi._setNowProviderForTesting(() => real);
}

/** Move the clock and fire every wake the interval holds. */
function run(gameSec: number): void {
  const ms = (gameSec / SCALE) * 1000;
  WorldClockApi._advanceForTesting(ms);
  real += ms;
  WorldClockApi._setNowProviderForTesting(() => real);
}

function body<T extends RegBody>(make: () => T, ambientK: number, kg = 70): T {
  return makeStuff(() => {
    const c = make();
    c.setMass(Quantity.of(kg, "kg"));
    c.setEffectiveAmbientK(ambientK);
    c.setCachedHumidity(30);
    return c;
  }) as T;
}

/**
 * A small body on a hot day with an empty waterskin — nothing to sweat, so
 * it drifts toward the ambient (the weather-onset test's body).
 */
function hotDry<T extends RegBody>(make: () => T = () => new Creature() as T): T {
  const c = body(make, 320, 1);
  c.adjustReserve("hydration", Quantity.of(-100, "%"));
  return c;
}

async function standEventRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/platform/idea/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

describe("W6b — a read is a projection, the reconcile the only writer", () => {
  beforeEach(async () => {
    await standShippedConditions();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it("⭐⭐ reading the core changes nothing — not the stamp, not the stored value", () => {
    const c = hotDry();
    c.reconcileThermalRegulation(); // seed
    const stamp = c.thermalRegStamp;
    const wake = c.thermalWakeAtS;
    const conditions = JSON.stringify(c.getConditions());
    const water = c.getReserve("hydration")!.current.rawValue();
    jump(4 * 3600); // far enough that the projection crosses the hyperthermia onset
    const a = core(c);
    expect(a).toBeGreaterThan(THERMAL_DEFAULTS.SETPOINT_K + THERMAL_DEFAULTS.HYPERTHERMIA_ONSET_K);
    const b = core(c);
    expect(b).toBe(a);
    expect(c.thermalRegStamp).toBe(stamp); // the read did not stamp
    expect(c.thermalWakeAtS).toBe(wake);
    expect(JSON.stringify(c.getConditions())).toBe(conditions); // nor spawn the condition it projects
    expect(c.getReserve("hydration")!.current.rawValue()).toBe(water);
  });

  it("⭐⭐ the projection IS what the reconcile stores — one formula", () => {
    const c = hotDry();
    c.reconcileThermalRegulation();
    jump(1800);
    const projected = core(c);
    expect(projected).not.toBe(THERMAL_DEFAULTS.SETPOINT_K); // it moved (a hot day, nothing to sweat)
    c.reconcileThermalRegulation();
    expect(core(c)).toBeCloseTo(projected, 9);
  });

  it("a read before the first reconcile is the stored value — nothing to project from", () => {
    const c = hotDry();
    expect(core(c)).toBe(THERMAL_DEFAULTS.SETPOINT_K);
    expect(c.thermalRegStamp).toBe(0);
  });

  it("a unit world with no event bus arms no wake", () => {
    const c = hotDry();
    c.reconcileThermalRegulation();
    jump(600);
    c.reconcileThermalRegulation();
    expect(c.thermalWakeAtS).toBe(0);
  });
});

describe("W6b — bodies wake on the game clock", () => {
  beforeAll(standEventRegistry);
  beforeEach(async () => {
    await standShippedConditions();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it("⭐ a reconcile arms a wake, never more than one game hour away", () => {
    const c = hotDry();
    c.reconcileThermalRegulation();
    jump(120);
    c.reconcileThermalRegulation();
    const nowS = WorldClockApi.getNow().rawValue();
    expect(c.thermalWakeAtS).toBeGreaterThan(nowS);
    expect(c.thermalWakeAtS - nowS).toBeLessThanOrEqual(3600);
  });

  it("⭐⭐ nobody reads it and it still cools — the wake is the writer", () => {
    const c = hotDry();
    c.reconcileThermalRegulation();
    jump(120);
    c.reconcileThermalRegulation(); // armed
    const stamp = c.thermalRegStamp;
    run(3 * 3600); // three hours, no read
    expect(c.thermalRegStamp).toBeGreaterThan(stamp); // a wake reconciled it
    expect(core(c)).toBeGreaterThan(THERMAL_DEFAULTS.SETPOINT_K); // and the day reached it
    expect(c.thermalWakeAtS).toBeGreaterThan(0); // and re-armed
  });

  it("⭐⭐ a whole-day gap with a wake armed is integrated — the late wake still bills the night", () => {
    const billed = hotDry();
    const absent = hotDry();
    for (const c of [billed, absent]) c.reconcileThermalRegulation();
    jump(120);
    for (const c of [billed, absent]) c.reconcileThermalRegulation();
    expect(billed.thermalWakeAtS).toBeGreaterThan(0);
    absent.setThermalWakeAtS(0); // a body stood up with no wake (a fresh load)
    const before = core(absent);

    jump(24 * 3600); // past MAX_REASONABLE_GAP_SEC, nothing fired
    expect(24 * 3600).toBeGreaterThan(THERMAL_DEFAULTS.MAX_REASONABLE_GAP_SEC);
    billed.reconcileThermalRegulation();
    absent.reconcileThermalRegulation();

    expect(core(billed)).toBeGreaterThan(before); // the day was billed
    expect(core(absent)).toBe(before); // absence is not billed
  });

  it("⭐ a player's body is never billed for a gap — its absence is a logout", () => {
    const p = hotDry(() => new PlayerBody() as unknown as RegBody & PlayerBody);
    p.addInteractive({} as unknown as Interactive); // connected
    p.reconcileThermalRegulation();
    jump(120);
    p.reconcileThermalRegulation();
    const before = core(p);
    jump(24 * 3600);
    p.reconcileThermalRegulation();
    expect(core(p)).toBe(before);
  });

  it("⭐ linkdead disarms and does not re-arm — frozen until the reconnect's re-stamp", () => {
    const p = hotDry(() => new PlayerBody() as unknown as RegBody & PlayerBody);
    const session = {} as unknown as Interactive;
    p.addInteractive(session);
    p.reconcileThermalRegulation();
    jump(120);
    p.reconcileThermalRegulation();
    expect(p.thermalWakeAtS).toBeGreaterThan(0);

    p.removeInteractive(session); // linkdead
    jump(120);
    p.reconcileThermalRegulation();
    expect(p.thermalWakeAtS).toBe(0);
    const frozen = core(p);
    run(3 * 3600);
    expect(p.thermalWakeAtS).toBe(0);
    expect(core(p)).toBe(frozen); // the read projects nothing for a frozen body
  });
});
