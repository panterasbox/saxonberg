/**
 * The economic bootstrap's money substrate (W4): the four leg kinds
 * conserve; THE FLOOR refuses a posting that would take a real account
 * below zero, whole, with the cache untouched; a wage is refused where it
 * used to run red; `disburse` is supply-neutral cash genesis; the
 * perpetual rule buys up to money-per-active-member and never redeems;
 * `appropriate` moves without moving supply and refuses below the floor;
 * the override goes on the record with its reason; the price index reads
 * par over a basket nobody stocks.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi } from "../../../api/banking";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { PlayerApi } from "../../../api/player";
import { Money } from "../Money";
import { Account } from "../Account";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../stuff/Idea";
import { StuffApi } from "../../../api/stuff";
import Coin from "../../../platform/thing/Coin";
import { ContainerMixin } from "../../spatial/Container";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

const DAVE = "/platform/agent/Avatar/dave";
const BAR = "/test/business/bar";

class TestOwner extends Idea {
  static _mixinName = "TestOwner";
}
class Hands extends ContainerMixin(Idea) {
  static _mixinName = "Hands";
}

const zm = (n: number) => Money.of(n, BankingApi.compactCurrency());

async function asActor<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const actor = makeStuffAtPath(() => new TestOwner(), path);
  return withRootContext(null, "bootstrap.reserve.test", () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

/** Layer Schedule rows over the harness's setting stub. */
function withRows(rows: Record<string, string>): void {
  const current = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) => rows[k] ?? current(k));
}

describe("the floor (D3)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("⭐ refuses a posting that would take a real account below zero — whole, at the chokepoint, cache untouched", async () => {
    // The demo tax has NO upstream solvency check (it runs after a sale
    // landed) — so it reaches the chokepoint, and the chokepoint refuses.
    withRows({ [AppSettingKeys.bankingSalesTaxRate]: "0.5" });
    await BankingApi.mint("acct-seller", zm(10), "harness");
    await expect(
      BankingApi.remitDemoTax("acct-seller", zm(40)),
    ).rejects.toThrow(/below zero/);
    expect(BankingApi.balanceOf("acct-seller").minor).toBe(10);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
    // Within its means, it posts.
    await BankingApi.remitDemoTax("acct-seller", zm(20));
    expect(BankingApi.balanceOf("acct-seller").minor).toBe(0);
  });

  it("an account the ledger has never seen holds nothing — it cannot pay", async () => {
    withRows({ [AppSettingKeys.bankingSalesTaxRate]: "0.5" });
    await expect(
      BankingApi.remitDemoTax("acct-ghost", zm(40)),
    ).rejects.toThrow(/below zero/);
  });

  it("⭐ a wage the employer cannot cover is REFUSED, never paid into the red", async () => {
    await BankingApi.mint("acct-bar", zm(10), "harness");
    await asActor(DAVE, () =>
      BankingApi.ensureVenueAccount(DAVE, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency()),
    );
    await expect(BankingApi.payWage("acct-bar", DAVE, zm(20))).rejects.toThrow(/holds less than/);
    expect(BankingApi.balanceOf("acct-bar").minor).toBe(10);
    await BankingApi.payWage("acct-bar", DAVE, zm(10));
    expect(BankingApi.balanceOf("acct-bar").minor).toBe(0);
  });
});

describe("the four kinds (D2)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("advance / repayment / appropriation / escheat are real→real and conserve", async () => {
    await BankingApi.mint("acct-a", zm(100), "harness");
    // The Api has no generic poster; the kinds are exercised through the
    // rules that post them below. Here: the vocabulary is closed and the
    // sentinel rule holds for each (a mint's sentinel on an advance fails).
    const { BankTransaction } = await import("../Transaction");
    for (const kind of ["advance", "repayment", "appropriation", "escheat"] as const) {
      expect(() =>
        BankTransaction.assertConserving(kind, [
          { from: "acct-a", to: "acct-b", amount: 10, currency: BankingApi.compactCurrency() },
        ]),
      ).not.toThrow();
      expect(() =>
        BankTransaction.assertConserving(kind, [
          { from: Account.ISSUANCE, to: "acct-b", amount: 10, currency: BankingApi.compactCurrency() },
        ]),
      ).toThrow(/real accounts/);
    }
  });
});

describe("disburse — cash genesis is a withdrawal (D9)", () => {
  beforeEach(() => {
    installBankingHarness();
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) =>
      makeStuffAtPath(() => {
        const coin = new Coin();
        coin.currency = "zorkmid";
        coin.denomination = 1;
        return coin;
      }, path)) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => teardownBankingHarness());

  it("moves balance into coin without moving supply, and refuses below the floor", async () => {
    await BankingApi.mint("acct-t", zm(40), "harness");
    const supply = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;
    const hands = makeStuffAtPath(() => new Hands(), "/test/hands");
    const coin = await BankingApi.disburse("acct-t", hands, zm(25), "arrival");
    expect(coin).toBeDefined();
    expect(BankingApi.balanceOf("acct-t").minor).toBe(15);
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(supply);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
    await expect(BankingApi.disburse("acct-t", hands, zm(16), "arrival")).rejects.toThrow(/holds less than/);
  });
});

describe("the perpetual rule (D9)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("buys up to money-per-active-member × active members into the treasury, and never redeems", async () => {
    withRows({ [AppSettingKeys.reserveMoneyPerActiveMember]: "2000" });
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(3);
    const first = await BankingApi.reconcilePerpetual(BankingApi.compactCurrency());
    expect(first.target).toBe(6000);
    expect(first.minted).toBe(6000);
    const treasury = await BankingApi.treasuryAccountId(BankingApi.compactCurrency());
    expect(BankingApi.balanceOf(treasury).minor).toBe(6000);
    // Idempotent at the same target.
    const again = await BankingApi.reconcilePerpetual(BankingApi.compactCurrency());
    expect(again.minted).toBe(0);
    // Fewer members: NEVER redeems.
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(1);
    const fewer = await BankingApi.reconcilePerpetual(BankingApi.compactCurrency());
    expect(fewer.minted).toBe(0);
    expect(fewer.outstanding).toBe(6000);
    // More members: buys the difference only.
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(4);
    const more = await BankingApi.reconcilePerpetual(BankingApi.compactCurrency());
    expect(more.minted).toBe(2000);
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(8000);
    // The treasury's own account is at the Central Bank.
    const rows = await BankingApi.accountsOf();
    void rows;
    expect(await BankingApi.custodianOf(treasury)).toBe(Account.CENTRAL_BANK_INSTITUTION);
  });
});

describe("appropriate (D9)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("moves treasury → the payee's primary without moving supply; refuses below the floor", async () => {
    withRows({ [AppSettingKeys.reserveMoneyPerActiveMember]: "1000" });
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(1);
    const bar = await asActor(BAR, () =>
      BankingApi.ensureVenueAccount(BAR, BankingApi.defaultCustodianBank(), "", BankingApi.compactCurrency()),
    );
    await asActor("/platform/agent/Avatar/minister", () =>
      BankingApi.appropriate(BAR, zm(300), "a grant"),
    );
    const treasury = await BankingApi.treasuryAccountId(BankingApi.compactCurrency());
    expect(BankingApi.balanceOf(bar).minor).toBe(300);
    expect(BankingApi.balanceOf(treasury).minor).toBe(700);
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(1000);
    const rows = await BankingApi.entriesFor(bar);
    expect(rows.find((r) => r.kind === "appropriation")?.category).toBe("appropriation");
    await expect(BankingApi.appropriate(BAR, zm(701), "too much")).rejects.toThrow(/holds less than/);
  });
});

describe("the override (D9)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("mints on the record with a reason; refuses without one", async () => {
    await expect(BankingApi.override("acct-x", zm(5), "   ")).rejects.toThrow(/reason/);
    await BankingApi.override("acct-x", zm(5), "the bar froze on a bug");
    const rows = await BankingApi.entriesFor("acct-x");
    const row = rows.find((r) => r.kind === "mint");
    expect(row?.category).toBe("override");
    expect(row?.memo).toBe("the bar froze on a bug");
    const d = await BankingApi.reserveDashboard(BankingApi.compactCurrency());
    expect(d.overridesOutstanding).toBe(5);
  });
});

describe("the price index (D20)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("reads par over a basket nobody has stood up", () => {
    withRows({ [AppSettingKeys.reserveIndexBasket]: "/test/nowhere/counter" });
    const index = BankingApi.priceIndex();
    expect(index.percent).toBe(100);
    expect(index.lines).toEqual([]);
  });
});
