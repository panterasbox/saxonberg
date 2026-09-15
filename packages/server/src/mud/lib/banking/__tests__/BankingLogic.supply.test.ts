/**
 * Money supply + reconciliation substrate. Covers:
 *   - supply = CB net issuance (Σ mints − Σ drains), O(1) off the aggregate;
 *   - `recomputeSupply` rebuilds the headline from a full ledger scan
 *     (the rebuildable-aggregate invariant);
 *   - the Phase-1 reconciliation slice: with all minted money sitting in
 *     accounts (no coin bridges yet), supply == Σ account balances.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import AccountBalance from "../AccountBalance";
import SupplyAggregate from "../SupplyAggregate";
import { Collections } from "../../../../backend/PersistenceManager";
import {
  col,
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

/** Σ over every materialized account balance. */
function sumBalances(): number {
  let total = 0;
  for (const row of AccountBalance.cached().values()) total += row.balance;
  return total;
}

describe("BankingApi — supply query + reconciliation", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("supply = Σ mints − Σ drains", async () => {
    await BankingApi.mint("acct-a", Money.of(1000, BankingApi.compactCurrency()));
    await BankingApi.mint("acct-b", Money.of(400, BankingApi.compactCurrency()));
    await BankingApi.drain("acct-b", Money.of(150, BankingApi.compactCurrency()));
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(1250);
  });

  it("reconciles: supply == Σ account balances (Phase-1, no coin bridge)", async () => {
    await BankingApi.mint("acct-a", Money.of(1000, BankingApi.compactCurrency()));
    await BankingApi.float("acct-b", Money.of(500, BankingApi.compactCurrency()));
    await BankingApi.drain("acct-a", Money.of(200, BankingApi.compactCurrency()));
    // transfers conserve, so move some between accounts via two postings is
    // a Phase-2 op; here mint/drain/float already exercise both sign changes.
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(sumBalances());
  });

  it("recomputeSupply rebuilds the headline from the ledger", async () => {
    await BankingApi.mint("acct-a", Money.of(900, BankingApi.compactCurrency()));
    await BankingApi.drain("acct-a", Money.of(100, BankingApi.compactCurrency()));
    const before = BankingApi.moneySupply(BankingApi.compactCurrency()).minor;

    // Corrupt the aggregate + drop the mirror; only the ledger is truth.
    col(Collections.BankSupply).clear();
    SupplyAggregate._resetForTesting();
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(0);

    await BankingApi.recomputeSupply();
    expect(BankingApi.moneySupply(BankingApi.compactCurrency()).minor).toBe(before);
  });
});
