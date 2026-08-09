/**
 * Conservation — the load-bearing invariant. Covers AC#3:
 *   - the structural conservation rule throws on a violating posting;
 *   - total supply changes ONLY by mint/drain (every other kind is
 *     supply-neutral, asserted at the pure rule level);
 *   - a mixed mint/drain sequence leaves supply = Σ mints − Σ drains.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Account } from "../Account";
import { BankTransaction } from "../Transaction";
import type { LedgerLeg } from "../Transaction";
import { LEDGER_KINDS } from "../LedgerEntry";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

describe("BankTransaction.assertConserving — the throwing rule", () => {
  it("throws when a transfer leg touches the issuance sentinel (money from nowhere)", () => {
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: Account.ISSUANCE, to: "acct-a", amount: 100, currency: Currency.compact() },
      ])
    ).toThrow(/move between real accounts/);
  });

  it("throws when a payment leg drains to the cash bridge", () => {
    expect(() =>
      BankTransaction.assertConserving("payment", [
        { from: "acct-a", to: Account.CASH_BRIDGE, amount: 100, currency: Currency.compact() },
      ])
    ).toThrow(/move between real accounts/);
  });

  it("throws on a non-positive or non-integer amount", () => {
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 0, currency: Currency.compact() },
      ])
    ).toThrow(/positive integer/);
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 1.5, currency: Currency.compact() },
      ])
    ).toThrow(/positive integer/);
  });

  it("throws when a mint isn't sourced from issuance", () => {
    expect(() =>
      BankTransaction.assertConserving("mint", [
        { from: "acct-a", to: "acct-b", amount: 100, currency: Currency.compact() },
      ])
    ).toThrow(/'mint' leg must be sourced from issuance/);
  });

  it("accepts a well-formed transfer / mint / drain / deposit / withdraw", () => {
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 10, currency: Currency.compact() },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("mint", [
        { from: Account.ISSUANCE, to: "a", amount: 10, currency: Currency.compact() },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("drain", [
        { from: "a", to: Account.ISSUANCE, amount: 10, currency: Currency.compact() },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("deposit", [
        { from: Account.CASH_BRIDGE, to: "a", amount: 10, currency: Currency.compact() },
      ])
    ).not.toThrow();
    expect(() =>
      BankTransaction.assertConserving("withdraw", [
        { from: "a", to: Account.CASH_BRIDGE, amount: 10, currency: Currency.compact() },
      ])
    ).not.toThrow();
  });
});

describe("the escrow/draw kinds — real accounts only (the audit's new rows)", () => {
  it.each(["escrow-hold", "escrow-release", "escrow-revert", "draw"] as const)(
    "'%s' rejects a sentinel counterparty on either side",
    (kind) => {
      expect(() =>
        BankTransaction.assertConserving(kind, [
          { from: Account.ISSUANCE, to: "acct-a", amount: 100, currency: Currency.compact() },
        ])
      ).toThrow(/move between real accounts/);
      expect(() =>
        BankTransaction.assertConserving(kind, [
          { from: "acct-a", to: Account.CASH_BRIDGE, amount: 100, currency: Currency.compact() },
        ])
      ).toThrow(/move between real accounts/);
      expect(() =>
        BankTransaction.assertConserving(kind, [
          { from: "acct-a", to: "acct-b", amount: 100, currency: Currency.compact() },
        ])
      ).not.toThrow();
    }
  );
});

describe("the leg-kind vocabulary — no untyped legs", () => {
  it("every LEDGER_KINDS member is handled by assertLegKind (nothing falls through)", () => {
    // The switch's default throws on an unhandled kind; a handled kind
    // either accepts a well-formed leg or refuses it with its own rule —
    // never the fall-through error. Drive each kind with its correct shape.
    const wellFormed: Record<(typeof LEDGER_KINDS)[number], LedgerLeg> = {
      mint: { from: Account.ISSUANCE, to: "a", amount: 1, currency: Currency.compact() },
      drain: { from: "a", to: Account.ISSUANCE, amount: 1, currency: Currency.compact() },
      deposit: { from: Account.CASH_BRIDGE, to: "a", amount: 1, currency: Currency.compact() },
      withdraw: { from: "a", to: Account.CASH_BRIDGE, amount: 1, currency: Currency.compact() },
      transfer: { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      payment: { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      wage: { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      tax: { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      "escrow-hold": { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      "escrow-release": { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      "escrow-revert": { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      draw: { from: "a", to: "b", amount: 1, currency: Currency.compact() },
    };
    for (const kind of LEDGER_KINDS) {
      expect(() =>
        BankTransaction.assertConserving(kind, [wellFormed[kind]])
      ).not.toThrow();
    }
  });

  it("an out-of-vocabulary kind is refused outright (the backstop)", () => {
    expect(() =>
      BankTransaction.assertConserving("bribe" as never, [
        { from: "a", to: "b", amount: 1, currency: Currency.compact() },
      ])
    ).toThrow(/no counterparty rule/);
  });
});

describe("BankTransaction.supplyDelta — only mint/drain change supply", () => {
  it("mint adds, drain removes, everything else is neutral", () => {
    const legs = [{ from: "a", to: "b", amount: 100, currency: Currency.compact() }];
    expect(BankTransaction.supplyDelta("mint", legs)).toEqual({
      currency: Currency.compact(),
      minted: 100,
      drained: 0,
    });
    expect(BankTransaction.supplyDelta("drain", legs)).toEqual({
      currency: Currency.compact(),
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
      "escrow-hold",
      "escrow-release",
      "escrow-revert",
      "draw",
    ] as const) {
      expect(BankTransaction.supplyDelta(kind, legs)).toEqual({
        currency: Currency.compact(),
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
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(0);
    await BankingApi.mint("acct-a", Money.of(1000, Currency.compact()));
    await BankingApi.mint("acct-b", Money.of(500, Currency.compact()));
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(1500);
    await BankingApi.drain("acct-a", Money.of(300, Currency.compact()));
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(1200);
  });

  it("refuses to drain more than an account holds (would destroy absent money)", async () => {
    await BankingApi.mint("acct-a", Money.of(100, Currency.compact()));
    await expect(BankingApi.drain("acct-a", Money.of(101, Currency.compact()))).rejects.toThrow(
      /holds less than/
    );
    // supply unchanged by the rejected drain
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(100);
  });
});
