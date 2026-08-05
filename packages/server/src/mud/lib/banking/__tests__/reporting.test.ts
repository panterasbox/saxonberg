/**
 * Wages, demo tax, and the deficit P&L. Covers:
 *   - payWage moves coin employer → worker as a categorized `wages` line;
 *   - the demo sales tax remits seller → treasury at the authored/inert rate,
 *     visible as a `tax` line in the seller's P&L; the treasury accumulates;
 *   - the deficit-as-target P&L: cogs/sales/wages/tax run the bar red, and a
 *     logged CB subsidy mint covers it — a visible, accountable faucet.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import PaymentCard from "../../../obj/PaymentCard";
import { AppSettings } from "../../config/AppSettings";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { ExecutionContextApi } from "../../../api/execution-context";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

class TestAvatar extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestAvatar";
}


function avatar(path: string): TestAvatar {
  return makeStuffAtPath(() => new TestAvatar(), path);
}

async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

async function seedTax(rate: string): Promise<void> {
  const s = new AppSettings();
  s.setValue("banking.salesTaxRate", rate);
  s.setValue("banking.treasuryAccount", "treasury");
  await s.save();
  await AppSettings.warm();
}

/** A bar operator carrying a wallet, owning a funded bar account. */
async function barWith(funds: number): Promise<{
  operator: TestAvatar;
  barAcct: string;
}> {
  const operator = avatar("/obj/Avatar/operator");
  const card = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
  ContainmentApi.move(card, operator as never);
  const barAcct = await asOwner(operator, () =>
    BankingApi.openAccount("goodkin", "goodkin", Currency.compact())
  );
  if (funds > 0) await BankingApi.mint(barAcct, Money.of(funds, Currency.compact()), "float", "subsidy");
  return { operator, barAcct };
}

describe("Wages", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("pays a wage employer → worker as a categorized line", async () => {
    const { barAcct } = await barWith(1000);
    const worker = avatar("/obj/Avatar/wenna");
    const workerAcct = await asOwner(worker, () =>
      BankingApi.openAccount("goodkin", "goodkin", Currency.compact())
    );

    await BankingApi.payWage(barAcct, "/obj/Avatar/wenna", Money.of(80, Currency.compact()));
    expect(BankingApi.balanceOf(workerAcct).minor).toBe(80);

    const pnl = await BankingApi.profitAndLoss(barAcct);
    expect(pnl.lines.wages).toBe(-80); // money out, on the labor line
  });
});

describe("Demo sales tax", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    teardownBankingHarness();
    AppSettings._resetForTesting();
  });

  it("remits seller → treasury at the inert rate; treasury accumulates", async () => {
    await seedTax("0.08");
    const { barAcct } = await barWith(1000);

    const tax = await BankingApi.remitDemoTax(barAcct, Money.of(100, Currency.compact()));
    expect(tax.minor).toBe(8); // floor(100 * 0.08)
    expect(BankingApi.balanceOf("treasury").minor).toBe(8);

    const barPnl = await BankingApi.profitAndLoss(barAcct);
    expect(barPnl.lines.tax).toBe(-8); // visible as a P&L line on the seller
    const treasuryPnl = await BankingApi.profitAndLoss("treasury");
    expect(treasuryPnl.lines.tax).toBe(8); // accumulates

    // another sale accumulates more; the treasury only grows
    await BankingApi.remitDemoTax(barAcct, Money.of(50, Currency.compact()));
    expect(BankingApi.balanceOf("treasury").minor).toBe(12);
  });

  it("is inert when no rate is configured (no tax)", async () => {
    const { barAcct } = await barWith(1000);
    const tax = await BankingApi.remitDemoTax(barAcct, Money.of(100, Currency.compact()));
    expect(tax.minor).toBe(0);
  });
});

describe("Deficit-as-target P&L", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    teardownBankingHarness();
    AppSettings._resetForTesting();
  });

  it("runs red across cogs/sales/wages/tax, then a CB subsidy covers it", async () => {
    await seedTax("0.08");
    // The bar starts with a small float; a supplier + a worker + a patron.
    const { operator, barAcct } = await barWith(0);
    const worker = avatar("/obj/Avatar/wenna");
    await asOwner(worker, () => BankingApi.openAccount("goodkin", "goodkin", Currency.compact()));
    const patron = avatar("/obj/Avatar/patron");
    const patronCard = makeStuffAtPath(() => new PaymentCard(), "/obj/PaymentCard");
    ContainmentApi.move(patronCard, patron as never);
    const patronAcct = await asOwner(patron, () =>
      BankingApi.openAccount("goodkin", "goodkin", Currency.compact())
    );
    await BankingApi.mint(patronAcct, Money.of(1000, Currency.compact()));

    // cogs: the operator buys booze from a supplier (out of the bar account)
    await BankingApi.mint(barAcct, Money.of(200, Currency.compact()), "opening float", "subsidy");
    const cogs: Charge = {
      amount: Money.of(150, Currency.compact()),
      reason: "booze in",
      presented: true,
      payeeAccountId: "supplier-acct",
      category: "cogs",
    };
    await asOwner(operator, () => BankingApi.settle(cogs, { kind: "credential" }));

    // sales: a patron buys a drink (into the bar account) + tax remitted
    const sale: Charge = {
      amount: Money.of(60, Currency.compact()),
      reason: "a martini",
      presented: true,
      payeeAccountId: barAcct,
      category: "sales",
    };
    await asOwner(patron, () => BankingApi.settle(sale, { kind: "credential" }));
    await BankingApi.remitDemoTax(barAcct, Money.of(60, Currency.compact()));

    // wages: pay the worker
    await BankingApi.payWage(barAcct, "/obj/Avatar/wenna", Money.of(120, Currency.compact()));

    // running balance: 200(float) − 150(cogs) + 60(sales) − 4(tax) − 120(wages)
    expect(BankingApi.balanceOf(barAcct).minor).toBe(-14); // red by design

    const pnl = await BankingApi.profitAndLoss(barAcct);
    expect(pnl.lines.sales).toBe(60);
    expect(pnl.lines.cogs).toBe(-150);
    expect(pnl.lines.wages).toBe(-120);
    expect(pnl.lines.tax).toBe(-4);
    expect(pnl.balance).toBe(-14);

    // the CB mints subsidy to cover the red — a logged, visible faucet
    await BankingApi.mint(barAcct, Money.of(14, Currency.compact()), "deficit subsidy", "subsidy");
    expect(BankingApi.balanceOf(barAcct).minor).toBe(0);
    const covered = await BankingApi.profitAndLoss(barAcct);
    expect((covered.lines.subsidy ?? 0)).toBe(214); // 200 float + 14 cover
  });
});
