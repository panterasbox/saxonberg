/**
 * The reconciliation invariant (the conservation audit). Across a mixed
 * sequence of issueCash / deposit / withdraw / mint / transfer / wage /
 * drain, top-down supply always equals bottom-up (Σ account balances + Σ
 * circulating coins outside vaults). Also the money-supply query
 * (Σ mints − Σ drains).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Currency, BankingApi, Money } from "../../../api/banking";
import Coin from "../../../platform/thing/Coin";
import BankCounter from "../../../platform/thing/BankCounter";
import PaymentCard from "../../../platform/thing/PaymentCard";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Quantity } from "../../quantity";
import type { Stuff } from "../../stuff/Stuff";
import type { Globbable } from "../../stuff/Globbable";
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

const BANK = "/world/test/goodkin-bank";

function avatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function stubCoinClone(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, path);
    c.setMass(Quantity.of(0.008, "kg"));
    return c;
  }) as unknown as typeof StuffApi.clone);
}

describe("Reconciliation invariant", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
    stubCoinClone();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("supply == Σ balances + Σ circulating coin across a mixed sequence", async () => {
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);
    const alice = avatar("/platform/agent/Avatar/alice");
    const card = makeStuffAtPath(() => new PaymentCard(), "/stuff/thing/PaymentCard");
    ContainmentApi.move(card, alice as never);
    const worker = avatar("/platform/agent/Avatar/wenna");

    const expectBalanced = (supply: number) => {
      const r = BankingApi.reconcile(Currency.compact());
      expect(r.balanced).toBe(true);
      expect(r.supply).toBe(supply);
      expect(r.accountTotal + r.circulatingCoin).toBe(supply);
    };

    // 1. issue cash into Alice's hand → circulating
    const cash = (await asOwner(alice, () =>
      BankingApi.issueCash(alice as never, Money.of(500, Currency.compact()))
    )) as Stuff & Globbable;
    expectBalanced(500);
    expect(BankingApi.reconcile(Currency.compact()).circulatingCoin).toBe(500);

    // 2. open an account + deposit the whole stack → coin into the vault
    const aliceAcct = await asOwner(alice, () =>
      BankingApi.openAccount("goodkin", "goodkin", Currency.compact())
    );
    await asOwner(alice, () => BankingApi.deposit(bank, cash));
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(500);
    expect(BankingApi.reconcile(Currency.compact()).circulatingCoin).toBe(0); // all in the vault
    expectBalanced(500);

    // 3. withdraw 200 → coin back into circulation
    await asOwner(alice, () => BankingApi.withdraw(bank, Money.of(200, Currency.compact())));
    expect(BankingApi.reconcile(Currency.compact()).circulatingCoin).toBe(200);
    expectBalanced(500);

    // 4. CB mints 1000 to a merchant account
    await BankingApi.mint("merchant", Money.of(1000, Currency.compact()));
    expectBalanced(1500);

    // 5. a transfer + a wage (balance-neutral to supply)
    await asOwner(alice, () =>
      BankingApi.transfer(aliceAcct, "merchant", Money.of(100, Currency.compact()))
    );
    await asOwner(worker, () => BankingApi.openAccount("goodkin", "goodkin", Currency.compact()));
    await BankingApi.payWage("merchant", "/platform/agent/Avatar/wenna", Money.of(50, Currency.compact()));
    expectBalanced(1500);

    // 6. drain 100 from the merchant → supply shrinks
    await BankingApi.drain("merchant", Money.of(100, Currency.compact()));
    expectBalanced(1400);

    // money supply query
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(1400);
  });
});
