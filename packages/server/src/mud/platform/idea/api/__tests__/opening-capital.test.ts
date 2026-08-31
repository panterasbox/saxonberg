/**
 * Opening capital — how a business first has money.
 *
 * ⭐ Wages post with NO solvency check (a venue runs its P&L red by design —
 * the deficit-as-target, covered by CB subsidy), but PURCHASES do check:
 * `settle` refuses an overdrawn payer. So an uncapitalized venue pays its
 * staff into the red and then cannot buy stock, and the supply chain stops
 * at the first `buy`. A live drive found Dave's Bar at -349 with a world
 * money supply of ZERO and no way forward.
 *
 * The fix is `banking.openingFloat`'s sibling one tier down: a branch's till
 * is capitalized for its customers, a venue's account for its trade — minted
 * once, on the first materialization of that account.
 *
 * Two things this file pins that are easy to get wrong: a WORKER is not
 * capitalized (they earn), and the seed does not repeat.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import { BankingApi, Currency, Money } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";
import BusinessEntity from "../../Business";
import { makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../lib/banking/__tests__/banking-test-harness";

const BUSINESS = "/world/test/business";
const WORKER = "/world/test/npc/worker";
const DEFAULT_CAPITAL = 20_000;

/** Layer the opening-capital dial over the harness's setting stub. */
function withCapitalDial(minor: number): void {
  const current = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) =>
    k === AppSettingKeys.bankingOpeningCapital ? String(minor) : current(k)
  );
}

function seedBusiness(openingCapital?: number): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.proprietorPath = "/world/test/npc/dave";
  b.banksAt = BankingApi.defaultCustodianBank();
  if (openingCapital !== undefined) b.openingCapital = openingCapital;
  return b;
}

describe("a business is capitalized when its account is first materialized", () => {
  beforeEach(() => {
    installBankingHarness();
    withCapitalDial(DEFAULT_CAPITAL);
  });
  afterEach(() => teardownBankingHarness());

  it("takes the configured default when the row authors none", async () => {
    const b = seedBusiness();
    const acct = await EmploymentApi.operatingAccountOf(b);
    expect(BankingApi.balanceOf(acct).minor).toBe(DEFAULT_CAPITAL);
  });

  it("an authored openingCapital wins — a distillery is not a bar", async () => {
    const b = seedBusiness(75_000);
    const acct = await EmploymentApi.operatingAccountOf(b);
    expect(BankingApi.balanceOf(acct).minor).toBe(75_000);
  });

  it("an authored 0 opens the business on nothing, deliberately", async () => {
    const b = seedBusiness(0);
    const acct = await EmploymentApi.operatingAccountOf(b);
    expect(BankingApi.balanceOf(acct).minor).toBe(0);
  });

  it("does not seed twice — the account is resolved on every beat", async () => {
    const b = seedBusiness();
    const first = await EmploymentApi.operatingAccountOf(b);
    const second = await EmploymentApi.operatingAccountOf(b);
    const third = await EmploymentApi.operatingAccountOf(b);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(BankingApi.balanceOf(first).minor).toBe(DEFAULT_CAPITAL);
  });

  it("the capital is REAL money — the supply grew by it", async () => {
    const b = seedBusiness();
    await EmploymentApi.operatingAccountOf(b);
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(
      DEFAULT_CAPITAL
    );
  });

  it("⚠ a WORKER's account is not capitalized — a worker earns", async () => {
    const acct = await BankingApi.ensureVenueAccount(
      WORKER,
      BankingApi.defaultCustodianBank(),
      "",
      Currency.compact(),
      0
    );
    expect(BankingApi.balanceOf(acct).minor).toBe(0);
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(0);
  });
});

describe("the supply report names the overdraft", () => {
  beforeEach(() => {
    installBankingHarness();
    withCapitalDial(0);
  });
  afterEach(() => teardownBankingHarness());

  it("an unfunded venue's wages are spendable money that was never issued", async () => {
    const b = seedBusiness();
    const employer = await EmploymentApi.operatingAccountOf(b);
    await BankingApi.ensureVenueAccount(
      WORKER,
      BankingApi.defaultCustodianBank(),
      "",
      Currency.compact(),
      0
    );
    await BankingApi.payWage(employer, WORKER, Money.of(349, Currency.compact()));

    const r = BankingApi.reconcile(Currency.compact());
    // The worker really holds it, and it really was never minted.
    expect(r.supply).toBe(0);
    // ⭐ Netting hides it: the -349 employer cancels the +349 worker.
    expect(r.accountTotal).toBe(0);
    expect(r.balanced).toBe(true);
    // …which is exactly why the overdraft is reported on its own line.
    expect(r.overdraft).toBe(349);
  });

  it("a funded venue reports no overdraft", async () => {
    withCapitalDial(DEFAULT_CAPITAL);
    const b = seedBusiness();
    await EmploymentApi.operatingAccountOf(b);
    expect(BankingApi.reconcile(Currency.compact()).overdraft).toBe(0);
  });
});
