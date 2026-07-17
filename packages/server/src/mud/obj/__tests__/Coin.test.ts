/**
 * Coin — the physical cash object. Covers the AC#1 guarantees:
 *   - it is a Globbable with mass (count / split / merge work);
 *   - a stack's total mass = per-coin mass × quantity, where the per-coin mass
 *     is DERIVED from the denomination ({@link Coinage.perCoinMass}) so a
 *     25-credit sovereign is heavier per coin than a 1-credit piece;
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

// Per-coin masses, mirroring Coinage.DENOMINATIONS (kg).
const CREDIT_KG = 0.002;
const CROWN_KG = 0.004;
const SOVEREIGN_KG = 0.008;

class TestContainer extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestContainer";
}

/**
 * A registered Coin stack of `qty` of `denom`. Per-coin mass is derived from
 * the denomination (not set here) — that is the point of the coinage model.
 */
function makeCoins(qty: number, denom = "credit"): Coin {
  const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.denomination = denom;
    return coin;
  }, COIN_PATH);
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

describe("Coin — mass scales with the stack and the denomination", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("getMass() = per-coin (denomination) mass × quantity", () => {
    expect(makeCoins(1, "credit").getMass().rawValue()).toBeCloseTo(CREDIT_KG);
    expect(makeCoins(1000, "credit").getMass().rawValue()).toBeCloseTo(
      1000 * CREDIT_KG, // 2 kg
    );
  });

  it("a higher denomination is heavier per coin, lighter per credit", () => {
    // 25 credits: one sovereign (8 g) vs twenty-five 1-credit coins (50 g).
    const oneSovereign = makeCoins(1, "sovereign").getMass().rawValue();
    const twentyFiveCredits = makeCoins(25, "credit").getMass().rawValue();
    expect(oneSovereign).toBeCloseTo(SOVEREIGN_KG);
    expect(twentyFiveCredits).toBeCloseTo(25 * CREDIT_KG);
    expect(oneSovereign).toBeLessThan(twentyFiveCredits); // value-density
    // Crown sits between.
    expect(makeCoins(1, "crown").getMass().rawValue()).toBeCloseTo(CROWN_KG);
  });
});

describe("Coin — split / merge", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("splits a stack, preserving the per-coin (denomination) mass", async () => {
    // split clones at the source's templatePath; stub clone so the unit
    // test doesn't need the domain collection (the glob.test precedent).
    // No setMass needed — mass derives from the copied `denomination`.
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      return makeStuffAtPath(() => new Coin(), path);
    }) as unknown as typeof StuffApi.clone);

    const stack = makeCoins(100, "sovereign");
    const env = makeStuff(() => new TestContainer());
    ContainmentApi.move(stack, env);

    const splitoff = await asApiCaller(() => GlobbableApi.split(stack, 30));
    expect((splitoff as Coin).getQuantity()).toBe(30);
    expect(stack.getQuantity()).toBe(70);
    expect((splitoff as Coin).getDenomination()).toBe("sovereign");
    // per-coin mass intact → stack masses reflect the new counts
    expect((splitoff as Coin).getMass().rawValue()).toBeCloseTo(
      30 * SOVEREIGN_KG,
    );
    expect(stack.getMass().rawValue()).toBeCloseTo(70 * SOVEREIGN_KG);
  });

  it("merges same-denomination stacks; refuses different denominations", () => {
    const a = makeCoins(10, "credit");
    const b = makeCoins(5, "credit");
    expect(a.canMergeWith(b)).toBe(true);

    const other = makeCoins(5, "crown");
    expect(a.canMergeWith(other)).toBe(false);
  });
});

describe("Coin — mass → encumbrance coupling (AC#1)", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("a large stack measurably reduces carry capacity headroom", () => {
    const small = bearerCreature(70);
    ContainmentApi.move(makeCoins(10, "credit"), small);
    const smallRatio = small.getLoadRatio();

    const big = bearerCreature(70);
    ContainmentApi.move(makeCoins(100_000, "credit"), big); // 200 kg of coin
    const bigRatio = big.getLoadRatio();

    // Same bearer physiology; only the coin count differs. The heavy stack
    // drives the load ratio far higher — the honest physics is the cap.
    expect(bigRatio).toBeGreaterThan(smallRatio);
    expect(bigRatio).toBeGreaterThan(1); // 200 kg blows past carry capacity
  });
});
