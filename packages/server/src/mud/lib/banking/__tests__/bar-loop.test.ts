/**
 * The whole money loop, end to end (the bar demo, AC): open an account →
 * deposit cash → buy a drink (a presented Charge settled from the implant) →
 * the bar pays a wage within its takings; one beyond them is REFUSED (the
 * floor) → the P&L shows the lines → the reconciliation invariant holds
 * throughout. (Pay-per-drink only — no tab; the soft-credit tab was retired.)
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Currency, BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
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
import type { Stackable } from "../../stuff/Stackable";
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

const BANK = "/world/terminus/counting-houses/bank-counter";
const BAR = "/world/lounge/location/bar";
const PATRON = "/platform/agent/Avatar/patron";

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

describe("The bar money loop (end to end)", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
    stubCoinClone();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("open → deposit → buy → a wage within the takings pays, one beyond them is refused", async () => {
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);
    const patron = avatar(PATRON);
    const card = makeStuffAtPath(() => new PaymentCard(), "/stuff/thing/PaymentCard");
    ContainmentApi.move(card, patron as never);
    const worker = avatar("/platform/agent/Avatar/wenna");

    // the bar's P&L account (lazily ensured)
    const barAcct = await BankingApi.ensureVenueAccount(
      BAR,
      BankingApi.defaultCustodianBank(),
      "", BankingApi.compactCurrency());

    // 1. open an account + deposit cash
    const patronAcct = await asOwner(patron, () =>
      BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency())
    );
    const cash = (await asOwner(patron, () =>
      BankingApi.issueCash(patron as never, Money.of(300, BankingApi.compactCurrency()))
    )) as Stuff & Stackable;
    await asOwner(patron, () => bank.deposit(cash));
    expect(BankingApi.balanceOf(patronAcct).minor).toBe(300);

    // 2. buy a drink — a presented Charge settled from the implant/card
    const drink: Charge = {
      amount: Money.of(60, BankingApi.compactCurrency()),
      reason: "a martini",
      presented: true,
      payeeAccountId: barAcct,
      category: "sales",
    };
    await asOwner(patron, () => BankingApi.settle(drink, { kind: "credential" }));
    expect(BankingApi.balanceOf(patronAcct).minor).toBe(240);
    expect(BankingApi.balanceOf(barAcct).minor).toBe(60);

    // 3. a wage that exceeds the takings is REFUSED (economic bootstrap D3:
    //    the floor) — the house borrows or the proprietor reads why; it
    //    never runs red against nobody.
    await asOwner(worker, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    await expect(
      BankingApi.payWage(barAcct, "/platform/agent/Avatar/wenna", Money.of(150, BankingApi.compactCurrency())),
    ).rejects.toThrow(/holds less than/);
    expect(BankingApi.balanceOf(barAcct).minor).toBe(60);
    // …a wage within the takings posts.
    await BankingApi.payWage(barAcct, "/platform/agent/Avatar/wenna", Money.of(50, BankingApi.compactCurrency()));

    // 4. the P&L shows the lines
    const pnl = await BankingApi.profitAndLoss(barAcct);
    expect(pnl.lines.sales).toBe(60);
    expect(pnl.lines.wages).toBe(-50);
    expect(pnl.balance).toBe(10);

    // 5. no subsidy exists any more: the overdraft line reads zero
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).overdraft).toBe(0);

    // 6. the conservation invariant holds across the whole loop
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });
});
