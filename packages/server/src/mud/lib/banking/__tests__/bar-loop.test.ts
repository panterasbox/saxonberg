/**
 * The whole money loop, end to end (the bar demo, AC): open an account →
 * deposit cash → buy a drink (a presented Charge settled from the implant) →
 * the bar pays cogs + a wage and runs RED → the central bank mints subsidy to
 * cover it → the P&L shows the deficit → the reconciliation invariant holds
 * throughout. (Pay-per-drink only — no tab; the soft-credit tab was retired.)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Currency, BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import Coin from "../../../obj/Coin";
import BankCounter from "../../../obj/BankCounter";
import PaymentCard from "../../../obj/PaymentCard";
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

const BANK = "/domain/terminus/counting-houses/bank-counter";
const BAR = "/domain/lounge/bar";
const PATRON = "/obj/Avatar/patron";

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

  it("open → deposit → buy → wages/cogs run red → subsidy covers", async () => {
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);
    const patron = avatar(PATRON);
    const card = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
    ContainmentApi.move(card, patron as never);
    const worker = avatar("/obj/Avatar/wenna");

    // the bar's P&L account (lazily ensured)
    const barAcct = await BankingApi.ensureVenueAccount(
      BAR,
      BankingApi.defaultCustodianBank(),
      "", Currency.compact());

    // 1. open an account + deposit cash
    const patronAcct = await asOwner(patron, () =>
      BankingApi.openAccount("goodkin", "goodkin", Currency.compact())
    );
    const cash = (await asOwner(patron, () =>
      BankingApi.issueCash(patron as never, Money.of(300, Currency.compact()))
    )) as Stuff & Globbable;
    await asOwner(patron, () => BankingApi.deposit(bank, cash));
    expect(BankingApi.balanceOf(patronAcct).minor).toBe(300);

    // 2. buy a drink — a presented Charge settled from the implant/card
    const drink: Charge = {
      amount: Money.of(60, Currency.compact()),
      reason: "a martini",
      presented: true,
      payeeAccountId: barAcct,
      category: "sales",
    };
    await asOwner(patron, () => BankingApi.settle(drink, { kind: "credential" }));
    expect(BankingApi.balanceOf(patronAcct).minor).toBe(240);
    expect(BankingApi.balanceOf(barAcct).minor).toBe(60);

    // 3. the bar pays a wage that exceeds its takings → it runs RED
    await asOwner(worker, () => BankingApi.openAccount("goodkin", "goodkin", Currency.compact()));
    await BankingApi.payWage(barAcct, "/obj/Avatar/wenna", Money.of(150, Currency.compact()));
    expect(BankingApi.balanceOf(barAcct).minor).toBe(-90); // red by design

    // 4. the P&L shows the deficit
    const pnl = await BankingApi.profitAndLoss(barAcct);
    expect(pnl.lines.sales).toBe(60);
    expect(pnl.lines.wages).toBe(-150);
    expect(pnl.balance).toBe(-90);

    // 5. the central bank mints subsidy to cover the red — logged + visible
    const red = -BankingApi.balanceOf(barAcct).minor;
    await BankingApi.mint(barAcct, Money.of(red, Currency.compact()), "deficit subsidy", "subsidy");
    expect(BankingApi.balanceOf(barAcct).minor).toBe(0);

    // 6. the conservation invariant holds across the whole loop
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
  });
});
