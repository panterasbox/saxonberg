/**
 * Currency — the registry that holds every currency-intrinsic fact.
 *
 * The load-bearing tests here are the two NEGATIVE ones:
 *   - an unknown denomination **throws** (the retired `?? 1` fallback, whose
 *     silence would revalue a 25-coin to 1 on an unmigrated rename while the
 *     conservation audit still passed);
 *   - the record **carries no rate and no cross-currency reference**, which
 *     is what keeps a peg an issuer's promise rather than a world oracle.
 */

import { describe, it, expect, afterEach } from "vitest";
import { Currency } from "../Currency";
import type { CurrencyRecord } from "../Currency";

const ZM = "zorkmid";

/** A second currency with a deliberately DIFFERENT shape from the zorkmid. */
const FIXTURE: CurrencyRecord = {
  key: "testcoin",
  unit: "testcoin",
  plural: "testcoins",
  issuer: "test-mint",
  governorOffice: "test-mint-governor",
  denominations: [
    { value: 10, massKg: 0.005, label: "a chit" },
    { value: 1, massKg: 0.001 },
  ],
};

describe("Currency — the shipped record", () => {
  it("ships exactly one currency: the zorkmid", () => {
    expect(Currency.all().map((r) => r.key)).toEqual([ZM]);
    expect(Currency.has(ZM)).toBe(true);
    expect(Currency.has("nope")).toBe(false);
  });

  it("carries the 1/5/25 denomination set with its mass gradient", () => {
    const record = Currency.of(ZM);
    expect(record.denominations.map((d) => d.value)).toEqual([25, 5, 1]);
    expect(record.denominations.map((d) => d.massKg)).toEqual([
      0.008, 0.004, 0.002,
    ]);
    // The Compact declines to name its coins — no labels anywhere.
    expect(record.denominations.every((d) => d.label === undefined)).toBe(true);
  });

  it("throws on an unknown currency", () => {
    expect(() => Currency.of("not-a-currency")).toThrow(/unknown currency/);
  });
});

describe("Currency — valuation never guesses", () => {
  it("resolves face value and per-coin mass for a real denomination", () => {
    expect(Currency.faceValueOf(ZM, 25)).toBe(25);
    expect(Currency.perCoinMass(ZM, 25).rawValue()).toBeCloseTo(0.008);
  });

  it("⭐ THROWS on an unknown denomination (the retired `?? 1` fallback)", () => {
    // This is the whole point: valuing an unresolvable coin at 1 launders a
    // corrupt object into the money supply, and the conservation audit would
    // pass because its bottom-up term recomputes from the same broken lookup.
    expect(() => Currency.faceValueOf(ZM, 7)).toThrow(/no denomination 7/);
    expect(() => Currency.perCoinMass(ZM, 7)).toThrow(/no denomination 7/);
    expect(() => Currency.faceValueOf("nope", 1)).toThrow(/unknown currency/);
  });

  it("knows its base coin", () => {
    expect(Currency.baseDenomination(ZM)).toBe(1);
  });
});

describe("Currency — presentation derives, it is never authored", () => {
  it("renders amounts off the record's own vocabulary", () => {
    expect(Currency.renderMinor(1, ZM)).toBe("1 zorkmid");
    expect(Currency.renderMinor(12, ZM)).toBe("12 zorkmids");
    expect(Currency.renderMinor(-1, ZM)).toBe("-1 zorkmid");
  });

  it("describes a coin from (currency, faceValue) with no authored name", () => {
    expect(Currency.describeDenomination(ZM, 25)).toBe("a 25-zorkmid piece");
    expect(Currency.describeDenomination(ZM, 1)).toBe("a 1-zorkmid piece");
  });

  it("uses an issuer's label when it chose to name its coins", () => {
    Currency._registerForTesting(FIXTURE);
    expect(Currency.describeDenomination("testcoin", 10)).toBe("a chit");
    // …and still derives for the one it left unnamed.
    expect(Currency.describeDenomination("testcoin", 1)).toBe(
      "a 1-testcoin piece"
    );
  });
});

describe("⚠⚠ Currency — no rate, no cross-currency reference, permanently", () => {
  afterEach(() => Currency._resetForTesting());

  it("has no field that could hold an exchange rate", () => {
    // A `pegRate` beside the denominations is the WORLD-ORACLE shape: every
    // reader of the currency would get an authoritative cross-currency rate
    // for free, which makes a price a property of a thing rather than an
    // event between two parties. A peg is an issuer's standing offer to
    // redeem — it belongs to that offer, not to the money.
    //
    // This test fails the moment somebody adds one.
    const banned = /rate|peg|exchange|convert|worth|value.?of|per.?unit/i;
    for (const record of [Currency.of(ZM), FIXTURE]) {
      for (const key of Object.keys(record)) {
        expect(key).not.toMatch(banned);
      }
      for (const denom of record.denominations) {
        for (const key of Object.keys(denom)) {
          // `value` IS the denomination's own face value — its structural
          // identity within its own currency, not a rate against another.
          if (key === "value") continue;
          expect(key).not.toMatch(banned);
        }
      }
    }
  });

  it("names no other currency anywhere in its record", () => {
    Currency._registerForTesting(FIXTURE);
    const others = Currency.all()
      .map((r) => r.key)
      .filter((k) => k !== ZM);
    const serialized = JSON.stringify(Currency.of(ZM));
    for (const other of others) {
      expect(serialized).not.toContain(other);
    }
  });
});

describe("Currency — the compact-currency accessor", () => {
  afterEach(() => Currency._resetForTesting());

  it("falls back to the sole registered currency when unwarmed", () => {
    // Currency-agnostic, not a zorkmid branch: with one currency registered
    // there is nothing to guess between.
    expect(Currency.compact()).toBe(ZM);
  });

  it("refuses to guess once a second currency exists", () => {
    Currency._registerForTesting(FIXTURE);
    expect(() => Currency.compact()).toThrow(/cannot be guessed/);
  });
});

describe("Currency — the test-only registration seam", () => {
  afterEach(() => Currency._resetForTesting());

  it("refuses a currency with no 1-unit coin (exact change would break)", () => {
    expect(() =>
      Currency._registerForTesting({
        ...FIXTURE,
        key: "coarse",
        denominations: [{ value: 5, massKg: 0.004 }],
      })
    ).toThrow(/no 1-unit coin/);
  });

  it("leaves the shipped set alone after a reset", () => {
    Currency._registerForTesting(FIXTURE);
    expect(Currency.all()).toHaveLength(2);
    Currency._resetForTesting();
    expect(Currency.all().map((r) => r.key)).toEqual([ZM]);
  });
});
