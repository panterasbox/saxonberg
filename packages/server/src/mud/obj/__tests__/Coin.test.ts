/**
 * Coin — the physical cash object. Covers the AC#1 guarantees:
 *   - it is a Globbable with mass (count / split / merge work);
 *   - a stack's total mass = per-coin mass × quantity (the `getMass`
 *     override the encumbrance gauge reads);
 *   - a large stack measurably reduces carry capacity through the shipped
 *     `LoadBearing` gauge (the cap on cash is the honest physics).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Coin from "../Coin";
import { GlobbableApi } from "../../api/glob";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { MixinApi } from "../../api/mixin";
import { Mixins } from "../../lib/mixin";
import { Quantity } from "../../lib/quantity";
import { ExecutionContextApi } from "../../api/execution-context";
import { Idea } from "../../lib/stuff/Idea";
import { ContainerMixin } from "../../lib/spatial/Container";
import { ContainableMixin } from "../../lib/spatial/Containable";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { bearerCreature } from "../../lib/encumbrance/__tests__/encumbrance-fixtures";

const COIN_PATH = "/obj/Coin";

class TestContainer extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestContainer";
}

/** A registered Coin stack of `qty` with `perCoinKg` mass each. */
function makeCoins(qty: number, perCoinKg = 0.01, denom = "credit"): Coin {
  const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.denomination = denom;
    return coin;
  }, COIN_PATH);
  c.setMass(Quantity.of(perCoinKg, "kg"));
  c.setQuantity(qty);
  return c;
}

async function asApiCaller<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.run(null, StuffApi, "test-harness", undefined, fn);
}

describe("Coin — composition", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("is Globbable, Tangible, and Containable", () => {
    const c = makeCoins(1);
    expect(MixinApi.isGlobbable(c)).toBe(true);
    expect(MixinApi.hasMixin(c, Mixins.Globbable)).toBe(true);
    expect(MixinApi.isTangible(c)).toBe(true);
    expect(MixinApi.isContainable(c)).toBe(true);
    // A glob is never a container.
    expect(MixinApi.isContainer(c)).toBe(false);
  });

  it("counts: getQuantity reflects the stack size", () => {
    const c = makeCoins(50);
    expect(c.getQuantity()).toBe(50);
    expect(c.getDenomination()).toBe("credit");
  });
});

describe("Coin — mass scales with the stack", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("getMass() = per-coin mass × quantity", () => {
    const one = makeCoins(1, 0.01);
    expect(one.getMass().rawValue()).toBeCloseTo(0.01);

    const many = makeCoins(1000, 0.01);
    expect(many.getMass().rawValue()).toBeCloseTo(10); // 1000 × 0.01 kg
  });
});

describe("Coin — split / merge", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("splits a stack, preserving per-coin mass on both halves", async () => {
    // split clones at the source's templatePath; stub clone so the unit
    // test doesn't need the domain collection (the glob.test precedent).
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      const c = makeStuffAtPath(() => new Coin(), path);
      c.setMass(Quantity.of(0.01, "kg"));
      return c;
    }) as unknown as typeof StuffApi.clone);

    const stack = makeCoins(100, 0.01);
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(stack, env);

    const splitoff = await asApiCaller(() => GlobbableApi.split(stack, 30));
    expect((splitoff as Coin).getQuantity()).toBe(30);
    expect(stack.getQuantity()).toBe(70);
    // per-coin mass intact → stack masses reflect the new counts
    expect((splitoff as Coin).getMass().rawValue()).toBeCloseTo(0.3);
    expect(stack.getMass().rawValue()).toBeCloseTo(0.7);
  });

  it("merges same-denomination stacks; refuses different denominations", () => {
    const a = makeCoins(10, 0.01, "credit");
    const b = makeCoins(5, 0.01, "credit");
    expect(a.canMergeWith(b)).toBe(true);

    const other = makeCoins(5, 0.01, "chit");
    expect(a.canMergeWith(other)).toBe(false);
  });
});

describe("Coin — mass → encumbrance coupling (AC#1)", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("a large stack measurably reduces carry capacity headroom", () => {
    const small = bearerCreature(70);
    ContainmentApi.move(makeCoins(10, 0.01), small);
    const smallRatio = small.getLoadRatio();

    const big = bearerCreature(70);
    ContainmentApi.move(makeCoins(100_000, 0.01), big); // 1000 kg of coin
    const bigRatio = big.getLoadRatio();

    // Same bearer physiology; only the coin count differs. The heavy stack
    // drives the load ratio far higher — the honest physics is the cap.
    expect(bigRatio).toBeGreaterThan(smallRatio);
    expect(bigRatio).toBeGreaterThan(1); // 1000 kg blows past carry capacity
  });
});
