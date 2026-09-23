/**
 * The FREEZE (economic bootstrap D16): a dormant member's account pays
 * nobody — a transfer out is refused with the reason — while credits
 * still land; and the ESCHEAT / RECLAIM legs (D17) are real → real,
 * conserving, and the reclaim cannot be refused.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi } from "../../../api/banking";
import { PlayerApi } from "../../../api/player";
import { Money } from "../Money";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../stuff/Idea";
import { makeStuffAtPath, withRootContext } from "../../security/__tests__/test-setup";
import { installBankingHarness, teardownBankingHarness } from "./banking-test-harness";

const DAVE = "/platform/agent/Avatar/dave";
const ERIN = "/platform/agent/Avatar/erin";

class TestOwner extends Idea {
  static _mixinName = "FreezeTestOwner";
}

const zm = (n: number) => Money.of(n, BankingApi.compactCurrency());

async function asActor<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const actor = makeStuffAtPath(() => new TestOwner(), path);
  return withRootContext(null, "estate.freeze.test", () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

describe("the freeze (D16)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it("⭐ a dormant member's account refuses a transfer OUT, with the reason; a credit still lands", async () => {
    const dave = await asActor(DAVE, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    const erin = await asActor(ERIN, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    await BankingApi.mint(dave, zm(50), "harness");
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(2);
    vi.spyOn(PlayerApi, "estateStateOf").mockImplementation(async (key: string) => (key === DAVE ? "dormant" : "active"));
    await expect(
      asActor(DAVE, () => BankingApi.transfer(dave, erin, zm(10), "a gift")),
    ).rejects.toThrow(/frozen — its holder is dormant/);
    expect(BankingApi.balanceOf(dave).minor).toBe(50);
    // Erin, active, pays Dave: the credit lands on the frozen account.
    await BankingApi.mint(erin, zm(20), "harness");
    await asActor(ERIN, () => BankingApi.transfer(erin, dave, zm(5), "owed"));
    expect(BankingApi.balanceOf(dave).minor).toBe(55);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });
});

describe("escheat and reclaim (D17)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it("the escheat leg moves a balance to the treasury, conserving; the reclaim pays it back", async () => {
    vi.spyOn(PlayerApi, "activeMemberCount").mockResolvedValue(1);
    const dave = await asActor(DAVE, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    await BankingApi.mint(dave, zm(80), "harness");
    const currency = BankingApi.compactCurrency();
    const treasury = await BankingApi.treasuryAccountId(currency);
    const before = BankingApi.balanceOf(treasury).minor;
    const supply = BankingApi.moneySupply(currency).minor;
    await BankingApi.escheat(dave, zm(80), "escheat", "the estate passed");
    expect(BankingApi.balanceOf(dave).minor).toBe(0);
    expect(BankingApi.balanceOf(treasury).minor).toBe(before + 80);
    expect(BankingApi.moneySupply(currency).minor).toBe(supply);
    await expect(BankingApi.escheat(dave, zm(1), "escheat", "again")).rejects.toThrow(/holds less than/);
    await BankingApi.reclaim(dave, zm(80), "reclaimed on return");
    expect(BankingApi.balanceOf(dave).minor).toBe(80);
    expect(BankingApi.balanceOf(treasury).minor).toBe(before);
    expect(BankingApi.reconcile(currency).balanced).toBe(true);
  });
});
