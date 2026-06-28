/**
 * The banking laws are observable:
 *   - Law 1 (count, don't price): no good carries a readable "worth"
 *     property — value lives transiently in Money / the ledger, never
 *     stamped on a Stuff. A coin carries a denomination (identity), not a
 *     worth; its face value is intrinsic to the currency.
 *   - Law 2 (never tax absence): no fee / rent / decay accrues to an idle
 *     account balance or coin stack over a game-clock advance.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
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
    const coin = makeStuffAtPath(() => new Coin(), "/obj/Coin");
    coin.setMass(Quantity.of(0.008, "kg"));
    coin.setQuantity(10);
    // denomination is identity; there is no worth/value/price on the good
    expect(coin.getDenomination()).toBe("credit");
    for (const banned of ["worth", "value", "price"]) {
      expect(banned in coin).toBe(false);
      expect(
        typeof (coin as unknown as Record<string, unknown>)[
          `get${banned[0]!.toUpperCase()}${banned.slice(1)}`
        ]
      ).not.toBe("function");
    }
    // value is a currency property, not a good property
    expect(Money.faceValueOf("credit")).toBe(1);
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
      BankingApi.openAccount("/domain/test/bank", "goodkin")
    );
    await BankingApi.mint(acct, Money.of(1000));
    const coin = makeStuffAtPath(() => new Coin(), "/obj/Coin");
    coin.setMass(Quantity.of(0.008, "kg"));
    coin.setQuantity(50);

    expect(BankingApi.balanceOf(acct).minor).toBe(1000);

    // advance the game clock far into the future — banking has NO scheduled
    // recompute that touches balances or coin (unlike renown); nothing decays.
    WorldClockApi._setNowProviderForTesting(() => 4242 + 86_400 * 365);

    expect(BankingApi.balanceOf(acct).minor).toBe(1000); // no idle fee/decay
    expect(coin.getQuantity()).toBe(50); // coin stack unchanged
  });
});
