/**
 * Escrow — the contract system's conserved hold/release/revert family over
 * a per-contract REAL account (`escrow:contract:<id>`). The load-bearing
 * claims: reconcile stays green with escrow in flight and after both
 * outcomes; supply never moves (all four kinds are supply-neutral); an
 * over-release throws (per-contract accounts make the invariant loud); the
 * row carries registry fields and dies at close.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Account } from "../Account";
import AccountBalance from "../AccountBalance";
import BankCounter from "../../../obj/BankCounter";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
  col,
} from "./banking-test-harness";
import { Collections } from "../../../../backend/PersistenceManager";

const ISSUER = "acct-issuer";
const CONTRACTOR = "acct-contractor";
const CONTRACT = "gig-123";

describe("BankingApi escrow — hold / release / revert / close", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  async function fund(accountId: string, minor: number): Promise<void> {
    await BankingApi.mint(accountId, Money.of(minor, Currency.compact()));
  }

  it("hold → release round-trips issuer → escrow → contractor with the escrow kinds", async () => {
    await fund(ISSUER, 100);
    const held = await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    expect(held.ok).toBe(true);
    if (held.ok) expect(held.txId).toMatch(/^tx-/);

    expect(BankingApi.balanceOf(ISSUER).minor).toBe(40);
    expect(BankingApi.escrowBalanceOf(CONTRACT).minor).toBe(60);
    // In flight: the held funds sit in a REAL row, so the audit stays green.
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(100);

    await BankingApi.escrowRelease(CONTRACT, CONTRACTOR, Money.of(60, Currency.compact()));
    expect(BankingApi.balanceOf(CONTRACTOR).minor).toBe(60);
    expect(BankingApi.escrowBalanceOf(CONTRACT).minor).toBe(0);
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(100);

    // The ledger rows carry the distinct kinds + the escrow category.
    const legs = await BankingApi.entriesFor(
      Account.escrowAccountFor(CONTRACT),
    );
    expect(legs.map((l) => l.kind).sort()).toEqual([
      "escrow-hold",
      "escrow-release",
    ]);
    for (const leg of legs) expect(leg.category).toBe("escrow");
  });

  it("hold → revert returns the stake to the issuer", async () => {
    await fund(ISSUER, 100);
    await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    await BankingApi.escrowRevert(CONTRACT, ISSUER, Money.of(60, Currency.compact()));
    expect(BankingApi.balanceOf(ISSUER).minor).toBe(100);
    expect(BankingApi.escrowBalanceOf(CONTRACT).minor).toBe(0);
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
  });

  it("a hold against insufficient funds refuses before any row is written", async () => {
    await fund(ISSUER, 10);
    const result = await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    expect(result).toEqual({ ok: false, reason: "insufficient-funds" });
    expect(BankingApi.balanceOf(ISSUER).minor).toBe(10);
    // No escrow account row was minted for the refused hold.
    const row = [...col(Collections.BankAccounts).values()].find(
      (d) => d.accountId === Account.escrowAccountFor(CONTRACT),
    );
    expect(row).toBeUndefined();
  });

  it("an over-release throws (the per-contract account makes it loud)", async () => {
    await fund(ISSUER, 100);
    await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    await expect(
      BankingApi.escrowRelease(CONTRACT, CONTRACTOR, Money.of(61, Currency.compact())),
    ).rejects.toThrow(/over-release/);
    expect(BankingApi.escrowBalanceOf(CONTRACT).minor).toBe(60);
  });

  it("the escrow row is custodied at the ISSUER'S bank (owner = the contract)", async () => {
    // The issuer's funding account is custodied at Veshko (a live branch
    // makes the institution real) — the escrow must follow it (your bank
    // holds your stake), never the default.
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("veshko");
      return b;
    }, "/domain/test/veshko-bank");
    const funded = new AccountBalance();
    funded.accountId = ISSUER;
    funded.owner = "/obj/Avatar/issuer";
    funded.bank = "veshko";
    funded.isPrimary = true;
    funded.isActive = true;
    funded.balance = 0;
    await funded.save();
    AccountBalance.putCached(ISSUER, 0);
    await fund(ISSUER, 100);
    await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    const row = [...col(Collections.BankAccounts).values()].find(
      (d) => d.accountId === Account.escrowAccountFor(CONTRACT),
    );
    expect(row).toBeDefined();
    expect(row?.owner).toBe(`contract:${CONTRACT}`);
    expect(row?.bank).toBe("veshko");
  });

  it("a bare (legacy) funding account falls back to the default custodian", async () => {
    await fund(ISSUER, 100); // applyDelta bare auto-create — no custodian
    await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    const row = [...col(Collections.BankAccounts).values()].find(
      (d) => d.accountId === Account.escrowAccountFor(CONTRACT),
    );
    expect(row?.bank).toBe(BankingApi.defaultCustodianBank());
  });

  it("escrowClose removes the zero-balance row and refuses a non-zero one", async () => {
    await fund(ISSUER, 100);
    await BankingApi.escrowHold(ISSUER, CONTRACT, Money.of(60, Currency.compact()));
    await expect(BankingApi.escrowClose(CONTRACT)).rejects.toThrow(
      /still holds/,
    );
    await BankingApi.escrowRelease(CONTRACT, CONTRACTOR, Money.of(60, Currency.compact()));
    await BankingApi.escrowClose(CONTRACT);
    const row = [...col(Collections.BankAccounts).values()].find(
      (d) => d.accountId === Account.escrowAccountFor(CONTRACT),
    );
    expect(row).toBeUndefined();
    expect(
      AccountBalance.cached().has(Account.escrowAccountFor(CONTRACT)),
    ).toBe(false);
    // No lingering row for a terminal contract; the audit stays green.
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
    // Idempotent — a second close is a no-op.
    await expect(BankingApi.escrowClose(CONTRACT)).resolves.toBeUndefined();
  });
});
