/**
 * Uniform settlement — the `pay` primitive at the Api level. Covers:
 *   - cash clears off-ledger (coin handed over, no account touched);
 *   - credential clears on-ledger (debit/credit routed via the account);
 *   - a presented charge and a stated transfer both clear through the one
 *     primitive by either method;
 *   - the remittance-split seam routes a cut to a third account, conserving.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Currency, BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import PaymentCard from "../../../obj/PaymentCard";
import Coin from "../../../obj/Coin";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import type { Container } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { ExecutionContextApi } from "../../../api/execution-context";
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

const BANK_A = "/world/test/bank-a";
const BANK_B = "/world/test/bank-b";
const TREASURY = "/world/test/treasury";

function avatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

/** A funded payer: avatar carrying a wallet card, account at BANK_A funded. */
async function fundedPayer(
  path: string,
  funds: number
): Promise<{ who: TestAvatar; accountId: string }> {
  const who = avatar(path);
  const card = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
  ContainmentApi.move(card, who as never);
  const accountId = await asOwner(who, () =>
    BankingApi.openAccount(BANK_A, "goodkin", Currency.compact())
  );
  await BankingApi.mint(accountId, Money.of(funds, Currency.compact()));
  return { who, accountId };
}

function coinsIn(holder: Stuff, qty: number): Coin {
  const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, "/obj/Coin");
  c.setMass(Quantity.of(0.01, "kg"));
  // Raw fixture state: `setQuantity` on a Coin is gated (only the glob
  // mechanics and the cash faucet may resize a money stack), so a test
  // building a starting stack writes the field, it does not mint.
  c.quantity = qty;
  ContainmentApi.move(c, holder as never);
  return c;
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

/** Stub clone so partial coin-stack splits work without a domain collection. */
function stubCoinClone(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, path);
    c.setMass(Quantity.of(0.01, "kg"));
    return c;
  }) as unknown as typeof StuffApi.clone);
}

describe("Settlement — cash (off-ledger) vs credential (on-ledger)", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("cash clears by coin handover; no account is touched", async () => {
    stubCoinClone();
    const alice = avatar("/obj/Avatar/alice");
    const bob = avatar("/obj/Avatar/bob");
    coinsIn(alice, 100);
    const supplyBefore = BankingApi.moneySupply(Currency.compact()).minor;

    const charge: Charge = {
      amount: Money.of(40, Currency.compact()),
      reason: "drinks",
      presented: false,
      payeeAccountId: "",
      payeeContainer: bob as never,
    };
    const receipt = await asOwner(alice, () =>
      BankingApi.settle(charge, { kind: "cash" })
    );
    expect(receipt.method).toBe("cash");

    const bobCoins = (bob as Stuff & Container).getContents().filter(
      (s) => s instanceof Coin
    ) as Coin[];
    expect(bobCoins.reduce((n, c) => n + c.getQuantity(), 0)).toBe(40);
    // off-ledger: total supply unchanged (coin only moved)
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(supplyBefore);
  });

  it("credential clears on-ledger via the routed account", async () => {
    const { who: alice, accountId: aliceAcct } = await fundedPayer(
      "/obj/Avatar/alice",
      1000
    );
    const bob = avatar("/obj/Avatar/bob");
    const bobAcct = await asOwner(bob, () =>
      BankingApi.openAccount(BANK_B, "vionne", Currency.compact())
    );

    const charge: Charge = {
      amount: Money.of(200, Currency.compact()),
      reason: "a round",
      presented: true, // the bar priced it
      payeeAccountId: bobAcct,
      category: "sales",
    };
    const receipt = await asOwner(alice, () =>
      BankingApi.settle(charge, { kind: "credential" })
    );
    expect(receipt.method).toBe("credential");
    expect(receipt.accountId).toBe(aliceAcct);
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(800);
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(200);
  });

  it("one primitive settles a stated transfer by both methods", async () => {
    stubCoinClone();
    const { who: alice, accountId: aliceAcct } = await fundedPayer(
      "/obj/Avatar/alice",
      500
    );
    coinsIn(alice, 100);
    const bob = avatar("/obj/Avatar/bob");
    const bobAcct = await asOwner(bob, () =>
      BankingApi.openAccount(BANK_B, "vionne", Currency.compact())
    );

    // stated transfer by credential
    await asOwner(alice, () =>
      BankingApi.settle(
        {
          amount: Money.of(150, Currency.compact()),
          reason: "gift",
          presented: false,
          payeeAccountId: bobAcct,
          category: "transfer",
        },
        { kind: "credential" }
      )
    );
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(350);

    // stated transfer by cash (coins to bob)
    await asOwner(alice, () =>
      BankingApi.settle(
        {
          amount: Money.of(30, Currency.compact()),
          reason: "cash gift",
          presented: false,
          payeeAccountId: bobAcct,
          payeeContainer: bob as never,
        },
        { kind: "cash" }
      )
    );
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(150); // unchanged by cash
    const bobCoins = (bob as Stuff & Container).getContents().filter(
      (s) => s instanceof Coin
    ) as Coin[];
    expect(bobCoins.reduce((n, c) => n + c.getQuantity(), 0)).toBe(30);
  });

  it("routes a remittance split to a third account, conserving", async () => {
    const { who: alice, accountId: aliceAcct } = await fundedPayer(
      "/obj/Avatar/alice",
      1000
    );
    const bob = avatar("/obj/Avatar/bob");
    const bobAcct = await asOwner(bob, () =>
      BankingApi.openAccount(BANK_B, "vionne", Currency.compact())
    );
    // the treasury account row is created on first credit by postTransaction

    await asOwner(alice, () =>
      BankingApi.settle(
        {
          amount: Money.of(100, Currency.compact()),
          reason: "taxed sale",
          presented: true,
          payeeAccountId: bobAcct,
          category: "sales",
          splits: [{ accountId: TREASURY, amount: Money.of(10, Currency.compact()), category: "tax" }],
        },
        { kind: "credential" }
      )
    );
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(900); // −100
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(90); // +90 (main)
    expect(BankingApi.balanceOf(TREASURY).minor).toBe(10); // +10 (split)
  });
});
