/**
 * The banking laws are observable:
 *   - Law 1 (count, don't price): no good carries a readable "worth"
 *     property — value lives transiently in Money / the ledger, never
 *     stamped on a Stuff. A coin carries a denomination (identity), not a
 *     worth; its face value is intrinsic to the currency.
 *   - Law 2 (never tax absence): no fee / rent / decay accrues to an idle
 *     account balance or coin stack over a game-clock advance.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi, Money } from "../../../api/banking";
import Coin from "../../../obj/Coin";
import { WorldClockApi } from "../../../api/worldclock";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { Quantity } from "../../quantity";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

class TestAvatar extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestAvatar";
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

describe("Law 1 — count, don't price (no worth on goods)", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => teardownBankingHarness());
  beforeEach(() => installBankingHarness());

  it("a coin carries a denomination, not a readable worth property", () => {
    const coin = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, "/obj/Coin");
    coin.setMass(Quantity.of(0.008, "kg"));
    // Raw fixture state: `setQuantity` on a Coin is gated (only the glob
    // mechanics and the cash faucet may resize a money stack), so a test
    // building a starting stack writes the field, it does not mint.
    coin.quantity = 10;
    // denomination is identity; there is no worth/value/price on the good
    expect(coin.getCurrency()).toBe("zorkmid");
    expect(coin.getDenomination()).toBe(1);
    for (const banned of ["worth", "value", "price"]) {
      expect(banned in coin).toBe(false);
      expect(
        typeof (coin as unknown as Record<string, unknown>)[
          `get${banned[0]!.toUpperCase()}${banned.slice(1)}`
        ]
      ).not.toBe("function");
    }
    // value is a currency property, not a good property. The number on the
    // good is the denomination's STRUCTURAL KEY: the currency validates and
    // prices it, and a pair that does not resolve throws rather than being
    // worth what it says.
    expect(Currency.faceValueOf("zorkmid", 1)).toBe(1);
    expect(() => Currency.faceValueOf("zorkmid", 7)).toThrow();
  });
});

describe("Law 2 — never tax absence (no idle fee / decay)", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => teardownBankingHarness());

  it("an idle balance and coin stack are unchanged over a game-clock advance", async () => {
    const alice = makeStuffAtPath(() => new TestAvatar(), "/obj/Avatar/alice");
    const acct = await asOwner(alice, () =>
      BankingApi.openAccount("/domain/test/bank", "goodkin", Currency.compact())
    );
    await BankingApi.mint(acct, Money.of(1000, Currency.compact()));
    const coin = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, "/obj/Coin");
    coin.setMass(Quantity.of(0.008, "kg"));
    // Raw fixture state: `setQuantity` on a Coin is gated (only the glob
    // mechanics and the cash faucet may resize a money stack), so a test
    // building a starting stack writes the field, it does not mint.
    coin.quantity = 50;

    expect(BankingApi.balanceOf(acct).minor).toBe(1000);

    // advance the game clock far into the future — banking has NO scheduled
    // recompute that touches balances or coin (unlike renown); nothing decays.
    WorldClockApi._setNowProviderForTesting(() => 4242 + 86_400 * 365);

    expect(BankingApi.balanceOf(acct).minor).toBe(1000); // no idle fee/decay
    expect(coin.getQuantity()).toBe(50); // coin stack unchanged
  });
});
