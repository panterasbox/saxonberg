/**
 * MetabolicMixin — buffer state, setters' per-field invariants, and the
 * decomposed-scalar persistence surface. Every Creature composes
 * Metabolic, so a bare Creature is the fixture. No world clock is
 * bootstrapped here, so reconcile-on-read is a clean no-op (reserves
 * read unchanged).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../mixin";
import { StuffApi } from "../../../api/stuff";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

describe("MetabolicMixin — composition + state", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("every Creature is Metabolic", () => {
    const c = makeStuff(() => new Creature());
    expect(MixinApi.isMetabolic(c)).toBe(true);
    expect(MixinApi.hasMixin(c, Mixins.Metabolic)).toBe(true);
  });

  it("buffer state defaults empty / zero", () => {
    const c = makeStuff(() => new Creature());
    expect(c.digestionPools).toEqual({});
    expect(c.solidVolume).toBe(0);
    expect(c.liquidVolume).toBe(0);
    expect(c.toxinBurdens).toEqual({});
    expect(c.metabolicClockStamp).toBe(0);
    expect(c.lastMealLabel).toBeNull();
  });

  it("reading a reserve without a world clock is a clean no-op", () => {
    const c = makeStuff(() => new Creature());
    // Triggers reconcileMetabolism via the override; no clock → idle.
    expect(c.getReserve("endurance")?.current.rawValue()).toBe(100);
    expect(c.metabolicClockStamp).toBe(0);
  });

  it("scalar setters reject non-finite / negative", () => {
    const c = makeStuff(() => new Creature());
    expect(() => c.setSolidVolume(-1)).toThrow(RangeError);
    expect(() => c.setLiquidVolume(Number.NaN)).toThrow(RangeError);
    expect(() => c.setMetabolicClockStamp(-5)).toThrow(RangeError);
  });

  it("Record setters validate every value", () => {
    const c = makeStuff(() => new Creature());
    expect(() => c.setDigestionPools({ carb: 5, fat: -2 })).toThrow(RangeError);
    expect(() => c.setToxinBurdens({ alcohol: Number.NaN })).toThrow(RangeError);
    c.setDigestionPools({ carb: 5, water: 10 });
    expect(c.digestionPools).toEqual({ carb: 5, water: 10 });
  });

  it("exposes the decomposed-scalar persistence surface", () => {
    const c = makeStuff(() => new Creature());
    const fields = MixinApi.getAllPersistentFields(
      c.constructor as new (...args: never[]) => unknown,
    );
    for (const f of [
      "digestionPools",
      "solidVolume",
      "liquidVolume",
      "toxinBurdens",
      "metabolicClockStamp",
      "lastMealLabel",
    ]) {
      expect(fields).toContain(f);
    }
  });

  it("buffer state round-trips by re-hydrating a fresh instance", () => {
    const c = makeStuff(() => new Creature());
    c.setDigestionPools({ carb: 12, water: 30 });
    c.setSolidVolume(0.4);
    c.setLiquidVolume(0.5);
    c.setToxinBurdens({ alcohol: 8 });
    c.setMetabolicClockStamp(123.5);
    c.setLastMealLabel("ration");

    // Simulate the Hydrator's bracket-assign of decomposed scalars onto
    // a fresh instance (the `reserves` precedent — flat Records and
    // scalars round-trip through the default Hydrator, no marshaller).
    const fresh = makeStuff(() => new Creature()) as unknown as Record<
      string,
      unknown
    >;
    for (const f of [
      "digestionPools",
      "solidVolume",
      "liquidVolume",
      "toxinBurdens",
      "metabolicClockStamp",
      "lastMealLabel",
    ]) {
      fresh[f] = (c as unknown as Record<string, unknown>)[f];
    }
    expect(fresh.digestionPools).toEqual({ carb: 12, water: 30 });
    expect(fresh.solidVolume).toBe(0.4);
    expect(fresh.toxinBurdens).toEqual({ alcohol: 8 });
    expect(fresh.metabolicClockStamp).toBe(123.5);
    expect(fresh.lastMealLabel).toBe("ration");
  });
});
