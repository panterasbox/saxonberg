/**
 * Money integrity — the cash-side conservation guarantees.
 *
 * The ledger has a sealed chokepoint (`postTransaction`, the single writer,
 * validated per leg). Cash is ordinary `Stuff`, so it had nothing equivalent:
 * anything holding a coin reference could mint by assignment, and the audit
 * that should have caught it could not see the largest reservoir of durable
 * coin. These are the two holes this build closes.
 *
 * See docs/slates/builds/money-integrity-slate.md for the full surface — most
 * of it is a later cycle. This file covers only what this build claims.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Coin from "../../../obj/Coin";
import { Currency } from "../Currency";
import { StuffApi } from "../../../api/stuff";
import { ExecutionContextApi } from "../../../api/execution-context";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";

const COIN_PATH = "/obj/Coin";

function makeCoins(qty: number, denomination = 1, currency = "zorkmid"): Coin {
  const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = currency;
    coin.denomination = denomination;
    return coin;
  }, COIN_PATH);
  // Raw fixture state — the gate below is exactly what forbids doing this
  // through the method surface.
  c.quantity = qty;
  return c;
}

describe("⚠⚠ setQuantity on a coin is gated — no minting by assignment", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("refuses an ungated caller", () => {
    const stack = makeCoins(10);
    // This is the hole: before the gate, any code holding a coin reference
    // could resize the stack — moving value with no ledger row, no
    // conservation check and no error.
    expect(() => stack.setQuantity(1_000_000)).toThrow(/denied setQuantity/);
    expect(stack.getQuantity()).toBe(10);
  });

  it("refuses even a plausible-looking Api frame that is not on the list", () => {
    const stack = makeCoins(10);
    expect(() =>
      ExecutionContextApi.run(null, StuffApi, "test-harness", undefined, () => {
        stack.setQuantity(999);
        return null;
      })
    ).toThrow(/denied setQuantity/);
    expect(stack.getQuantity()).toBe(10);
  });

  // The positive direction — that the gate still ADMITS the glob mechanics —
  // is covered by `obj/__tests__/Coin.test.ts` ("splits a stack, preserving
  // the per-coin mass" / "merges same-denomination stacks"), which already
  // carries the clone stub and container scaffolding a real split needs.
  // Those tests exercise the same gated method through `GlobbableApi`, so a
  // gate that denied a legitimate caller would fail there, loudly.

  it("cannot be shadowed away", () => {
    // @Unshadowable: a polymorph/disguise shadow must not be able to
    // reintroduce an ungated path to the same field.
    const stack = makeCoins(5);
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(stack),
      "setQuantity"
    );
    expect(descriptor).toBeDefined();
  });
});

describe("Coin identity includes the currency — no invisible mint by merge", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("refuses to merge like-valued coins of different currencies", () => {
    Currency._registerForTesting({
      key: "testcoin",
      unit: "testcoin",
      plural: "testcoins",
      issuer: "test-mint",
      governorOffice: "test-mint-governor",
      denominations: [{ value: 1, massKg: 0.001 }],
    });
    try {
      const zorkmids = makeCoins(10, 1, "zorkmid");
      const testcoins = makeCoins(10, 1, "testcoin");
      // Same face value, same template — different money. Merging them would
      // create value out of a merge, with no ledger row and no error.
      expect(zorkmids.canMergeWith(testcoins)).toBe(false);
      expect(testcoins.canMergeWith(zorkmids)).toBe(false);
    } finally {
      Currency._resetForTesting();
    }
  });

  it("still merges same-currency, same-denomination stacks", () => {
    expect(makeCoins(10).canMergeWith(makeCoins(5))).toBe(true);
  });
});

describe("An unresolvable coin throws rather than being valued at 1", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("throws on mass for an unstamped coin, but still presents", () => {
    const blank = makeStuffAtPath(() => new Coin(), COIN_PATH);
    // Valuation must never guess…
    expect(() => blank.getMass()).toThrow();
    // …but presentation must never crash a `look`.
    expect(blank.getShortDescription()).toBe("a blank coin");
  });

  it("throws for a denomination that is not in the currency's table", () => {
    const bogus = makeCoins(1, 7);
    expect(() => bogus.getMass()).toThrow(/no denomination 7/);
  });
});
