/**
 * Conservation — the load-bearing invariant. Covers AC#3:
 *   - the structural conservation rule throws on a violating posting;
 *   - total supply changes ONLY by mint/drain (every other kind is
 *     supply-neutral, asserted at the pure rule level);
 *   - a mixed mint/drain sequence leaves supply = Σ mints − Σ drains.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Account } from "../Account";
import { BankTransaction } from "../Transaction";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

describe("BankTransaction.assertConserving — the throwing rule", () => {
  it("throws when a transfer leg touches the issuance sentinel (money from nowhere)", () => {
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: Account.ISSUANCE, to: "acct-a", amount: 100 },
      ])
    ).toThrow(/move between real accounts/);
  });

  it("throws when a payment leg drains to the cash bridge", () => {
    expect(() =>
      BankTransaction.assertConserving("payment", [
        { from: "acct-a", to: Account.CASH_BRIDGE, amount: 100 },
      ])
    ).toThrow(/move between real accounts/);
  });

  it("throws on a non-positive or non-integer amount", () => {
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 0 },
      ])
    ).toThrow(/positive integer/);
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 1.5 },
      ])
    ).toThrow(/positive integer/);
  });

  it("throws when a mint isn't sourced from issuance", () => {
    expect(() =>
      BankTransaction.assertConserving("mint", [
        { from: "acct-a", to: "acct-b", amount: 100 },
      ])
    ).toThrow(/'mint' leg must be issuance/);
  });

  it("accepts a well-formed transfer / mint / drain / deposit / withdraw", () => {
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 10 },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("mint", [
        { from: Account.ISSUANCE, to: "a", amount: 10 },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("drain", [
        { from: "a", to: Account.ISSUANCE, amount: 10 },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("deposit", [
        { from: Account.CASH_BRIDGE, to: "a", amount: 10 },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("withdraw", [
        { from: "a", to: Account.CASH_BRIDGE, amount: 10 },
      ])
    ).not.toThrow();
  });
});

describe("BankTransaction.supplyDelta — only mint/drain change supply", () => {
  it("mint adds, drain removes, everything else is neutral", () => {
    const legs = [{ from: "a", to: "b", amount: 100 }];
    expect(BankTransaction.supplyDelta("mint", legs)).toEqual({
      minted: 100,
      drained: 0,
    });
    expect(BankTransaction.supplyDelta("drain", legs)).toEqual({
      minted: 0,
      drained: 100,
    });
    for (const kind of [
      "transfer",
      "payment",
      "wage",
      "tax",
      "deposit",
      "withdraw",
    ] as const) {
      expect(BankTransaction.supplyDelta(kind, legs)).toEqual({
        minted: 0,
        drained: 0,
      });
    }
  });
});

describe("BankingApi — supply under a mixed mint/drain sequence", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("supply tracks Σ mints − Σ drains", async () => {
    expect(BankingApi.moneySupply().minor).toBe(0);
    await BankingApi.mint("acct-a", Money.of(1000));
    await BankingApi.mint("acct-b", Money.of(500));
    expect(BankingApi.moneySupply().minor).toBe(1500);
    await BankingApi.drain("acct-a", Money.of(300));
    expect(BankingApi.moneySupply().minor).toBe(1200);
  });

  it("refuses to drain more than an account holds (would destroy absent money)", async () => {
    await BankingApi.mint("acct-a", Money.of(100));
    await expect(BankingApi.drain("acct-a", Money.of(101))).rejects.toThrow(
      /holds less than/
    );
    // supply unchanged by the rejected drain
    expect(BankingApi.moneySupply().minor).toBe(100);
  });
});
