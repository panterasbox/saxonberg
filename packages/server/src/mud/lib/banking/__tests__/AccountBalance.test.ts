/**
 * AccountBalance — the materialized balance cache. Covers AC#2: a balance
 * is byte-identical whether read from the warm cache or rebuilt by replaying
 * the ledger; dropping the collection + cache and rebuilding reproduces it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import AccountBalance from "../AccountBalance";
import { Collections } from "../../../../backend/PersistenceManager";
import {
  col,
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

const A = "acct-a";
const B = "acct-b";

describe("AccountBalance — rebuild from log", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("cached balance equals the replay-from-log balance", async () => {
    await BankingApi.mint(A, Money.of(1000, Currency.compact()));
    await BankingApi.mint(B, Money.of(250, Currency.compact()));
    await BankingApi.drain(A, Money.of(100, Currency.compact()));

    expect(BankingApi.balanceOf(A).minor).toBe(900);
    expect(BankingApi.balanceOf(B).minor).toBe(250);

    const rebuiltA = await BankingApi.rebuildBalance(A);
    const rebuiltB = await BankingApi.rebuildBalance(B);
    expect(rebuiltA.minor).toBe(BankingApi.balanceOf(A).minor);
    expect(rebuiltB.minor).toBe(BankingApi.balanceOf(B).minor);
  });

  it("dropping the materialized collection + cache and replaying reproduces it", async () => {
    await BankingApi.mint(A, Money.of(777, Currency.compact()));
    await BankingApi.drain(A, Money.of(77, Currency.compact()));
    const before = BankingApi.balanceOf(A).minor;

    // Drop the materialized rows + warm cache: only the ledger survives.
    col(Collections.BankAccounts).clear();
    AccountBalance._resetForTesting();
    expect(BankingApi.balanceOf(A).minor).toBe(0); // cold cache

    const rebuilt = await BankingApi.rebuildBalance(A);
    expect(rebuilt.minor).toBe(before);
  });
});
