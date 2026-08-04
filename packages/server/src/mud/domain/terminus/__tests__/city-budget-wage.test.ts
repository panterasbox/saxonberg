/**
 * Terminus city-budget wage loop — the conserved fare-in → wage-out loop over
 * the real banking ledger. Fund the city-budget account (as a run of fares
 * would), drive a shift on→off boundary, and the terminal clerk is paid from
 * the city budget: clerk balance up, city budget down, money conserved.
 *
 * Also covers the worker-account guard ([DECIDE-W]): the clerk never opened an
 * account, yet `settleShiftWage` provisions one and pays — closing the loop
 * for NPC workers that the bar mechanism left open.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import { EmploymentApi } from "../../../api/employment";
import { Employment } from "../../../lib/employment/Employment";
import BusinessEntity from "../../../obj/Business";
import { WorldClockApi } from "../../../api/worldclock";
import { Quantity } from "../../../lib/quantity";
import { Idea } from "../../../lib/stuff/Idea";
import {
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../lib/banking/__tests__/banking-test-harness";

const BUDGET = "/domain/terminus/budget";
const CLERK = "/domain/terminus/terminal/clerk";
const HOUR = 3_600;

class Person extends Idea {
  static _mixinName = "Person";
}

function setGameClock(gameSeconds: number): void {
  vi.spyOn(WorldClockApi, "getNow").mockReturnValue(Quantity.of(gameSeconds, "s"));
}

function seedBudget(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUDGET);
  b.proprietorPath = ""; // municipal
  b.banksAt = BankingApi.defaultCustodianBank();
  b.positions = [{ key: "clerk", label: "staffing the ticket office", wageRate: 4, confers: [] }];
  // Fixture-keyed: the budget operates the departure TERMINAL, not the room.
  b.operatingLocations = ["/domain/terminus/terminal/departure-terminal-a"];
  return b;
}

function shift(onSince: number): Employment {
  return Employment.of({
    organizationPath: BUDGET,
    positionKey: "clerk",
    status: "on-shift",
    hiredAt: 0,
    onShiftSince: onSince,
  });
}

async function balanceOf(ownerKey: string): Promise<number> {
  const acct = await BankingApi.primaryAccountIdOf(ownerKey);
  return acct ? BankingApi.balanceOf(acct).minor : 0;
}

describe("Terminus city-budget wage loop", () => {
  beforeEach(() => {
    installBankingHarness();
    setGameClock(8 * HOUR);
  });
  afterEach(() => teardownBankingHarness());

  it("pays the clerk from the city budget at the shift boundary, conserved", async () => {
    const biz = seedBudget();
    // Make the clerk a live Stuff (settleShiftWage keys on the templatePath).
    makeStuffAtPath(() => new Person(), CLERK);

    // Fund the city-budget account as a run of fares would (a CB seed here).
    const cityAccount = await BankingApi.ensureVenueAccount(
      BUDGET,
      BankingApi.defaultCustodianBank(),
      "",
    );
    await BankingApi.mint(cityAccount, Money.of(1000), "fare income (seed)", "fare");

    const supplyBefore = BankingApi.moneySupply().minor;
    const cityBefore = BankingApi.balanceOf(cityAccount).minor;

    // The clerk has NO account — the worker-account guard must provision one.
    expect(await BankingApi.primaryAccountIdOf(CLERK)).toBeNull();

    // onShiftSince = 0, now = 8h → 8 game-hours × 4 = 32.
    await EmploymentApi.settleShiftWage(biz, CLERK, shift(0));

    expect(await balanceOf(CLERK)).toBe(32); // paid (account auto-provisioned)
    expect(BankingApi.balanceOf(cityAccount).minor).toBe(cityBefore - 32);
    expect(BankingApi.moneySupply().minor).toBe(supplyBefore); // no mint on wage
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("resolves the municipal budget as the operator of the departure terminal", async () => {
    seedBudget();
    // Fixture-keyed: the operator is resolved from the terminal, not the room.
    const op = EmploymentApi.businessAt("/domain/terminus/terminal/departure-terminal-a");
    expect(op).toBeTruthy();
    expect(op!.getAccountPath()).toBe(BUDGET);
    expect(op!.getProprietor()).toBeUndefined(); // municipal (proprietor-absent)
  });
});
