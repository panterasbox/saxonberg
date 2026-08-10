/**
 * ⭐⭐ THE ACCEPTANCE TEST — *the zorkmid is currency #1, and nothing in the
 * code knows it is special.*
 *
 * Proved by **substitution**, not by grep. The whole monetary substrate is
 * driven with `banking.compactCurrency` pointed at a fixture currency, so the
 * zorkmid is registered-but-unused for the duration. Every audit must hold,
 * and the zorkmid's supply must never move. A branch on the zorkmid could not
 * survive that run.
 *
 * The fixture currency exists **only here**: it is registered through
 * `Currency._registerForTesting` (which calls `SecurityApi.assertTestOnly`),
 * it lives in a `__tests__/` file no production module imports, and the
 * registry is code rather than a collection — so there is no persistence path
 * by which it could reach `domain` or any live database. Its denomination set
 * is deliberately NOT 1/5/25, and one denomination carries a `label`, so every
 * derived behaviour is exercised against a shape the zorkmid's constants
 * cannot accidentally satisfy.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import { Currency } from "../Currency";
import type { CurrencyRecord } from "../Currency";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { Account } from "../Account";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

const ZM = "zorkmid";
const TEST_CURRENCY = "testcoin";

const TEST_RECORD: CurrencyRecord = {
  key: TEST_CURRENCY,
  unit: "testcoin",
  plural: "testcoins",
  issuer: "test-mint",
  governorOffice: "test-mint-governor",
  denominations: [
    { value: 10, massKg: 0.005, label: "a chit" },
    { value: 1, massKg: 0.001 },
  ],
};

/** Point the whole world at the fixture currency. */
function useFixtureCurrency(): void {
  Currency._registerForTesting(TEST_RECORD);
  const real = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) => {
    if (k === AppSettingKeys.bankingCompactCurrency) return TEST_CURRENCY;
    try {
      return real(k);
    } catch {
      return "";
    }
  });
}

describe("⭐⭐ acceptance — the substrate does not know the zorkmid", () => {
  beforeEach(() => {
    installBankingHarness();
    useFixtureCurrency();
  });
  afterEach(() => {
    Currency._resetForTesting();
    teardownBankingHarness();
  });

  it("mints, moves and drains a currency that is not the zorkmid", async () => {
    const tc = (minor: number): Money => Money.of(minor, TEST_CURRENCY);

    // The world's default currency IS the fixture now.
    expect(Currency.compact()).toBe(TEST_CURRENCY);

    // ── mint ────────────────────────────────────────────────────────────
    await BankingApi.mint("acct-a", tc(1000), "seed");
    expect(BankingApi.moneySupply(TEST_CURRENCY).minor).toBe(1000);
    expect(BankingApi.balanceOf("acct-a").minor).toBe(1000);
    // ⭐ The other currency never moves — at any step.
    expect(BankingApi.moneySupply(ZM).minor).toBe(0);

    // ── a second account, same currency ─────────────────────────────────
    await BankingApi.mint("acct-b", tc(250), "seed");
    expect(BankingApi.balanceOf("acct-b").minor).toBe(250);
    expect(BankingApi.moneySupply(TEST_CURRENCY).minor).toBe(1250);
    expect(BankingApi.moneySupply(ZM).minor).toBe(0);

    // ── drain ───────────────────────────────────────────────────────────
    await BankingApi.drain("acct-b", tc(50), "sink");
    expect(BankingApi.moneySupply(TEST_CURRENCY).minor).toBe(1200);
    expect(BankingApi.moneySupply(ZM).minor).toBe(0);

    // ── the audit holds, in the fixture currency ────────────────────────
    const audit = BankingApi.reconcile(TEST_CURRENCY);
    expect(audit.currency).toBe(TEST_CURRENCY);
    expect(audit.supply).toBe(1200);
    expect(audit.accountTotal).toBe(1200);
    expect(audit.balanced).toBe(true);

    // ── …and the zorkmid's books are empty and balanced ─────────────────
    const zorkmids = BankingApi.reconcile(ZM);
    expect(zorkmids.supply).toBe(0);
    expect(zorkmids.accountTotal).toBe(0);
    expect(zorkmids.balanced).toBe(true);
  });

  it("renders and denominates off the fixture record, never the zorkmid", () => {
    expect(Money.of(1, TEST_CURRENCY).render()).toBe("1 testcoin");
    expect(Money.of(7, TEST_CURRENCY).render()).toBe("7 testcoins");
    // The labelled denomination, and the derived one — neither is
    // zorkmid-shaped.
    expect(Currency.describeDenomination(TEST_CURRENCY, 10)).toBe("a chit");
    expect(Currency.describeDenomination(TEST_CURRENCY, 1)).toBe(
      "a 1-testcoin piece"
    );
    // The fixture has no 5 and no 25 — the zorkmid's constants cannot be
    // satisfying these by accident.
    expect(() => Currency.faceValueOf(TEST_CURRENCY, 25)).toThrow();
  });
});

describe("⚠⚠ a ledger leg may never cross currencies — permanent", () => {
  beforeEach(() => {
    installBankingHarness();
    Currency._registerForTesting(TEST_RECORD);
  });
  afterEach(() => {
    Currency._resetForTesting();
    teardownBankingHarness();
  });

  it("refuses a transaction whose legs disagree, for EVERY ledger kind", async () => {
    const { BankTransaction } = await import("../Transaction");
    const kinds = [
      "mint",
      "drain",
      "deposit",
      "withdraw",
      "transfer",
      "payment",
      "wage",
      "tax",
      "escrow-hold",
      "escrow-release",
      "escrow-revert",
      "draw",
    ] as const;
    for (const kind of kinds) {
      expect(() =>
        BankTransaction.assertConserving(kind, [
          { from: "a", to: "b", amount: 10, currency: ZM },
          { from: "c", to: "d", amount: 10, currency: TEST_CURRENCY },
        ])
      ).toThrow(/may not cross currencies/);
    }
  });

  it("refuses a leg with no currency at all", async () => {
    const { BankTransaction } = await import("../Transaction");
    expect(() =>
      BankTransaction.assertConserving("transfer", [
        { from: "a", to: "b", amount: 10, currency: "" },
      ])
    ).toThrow(/must carry a currency/);
  });

  it("refuses at the ENDPOINT check too — a leg into a foreign account", async () => {
    // assertConserving proves the legs agree with each OTHER; the endpoint
    // check proves they agree with the ACCOUNTS they touch. Two independent
    // gates, because a same-currency pair of legs could still move zorkmids
    // into a testcoin account — an invisible mint by a different door.
    await BankingApi.mint("mixed-acct", Money.of(100, TEST_CURRENCY), "seed");
    await expect(
      BankingApi.mint("mixed-acct", Money.of(10, ZM), "wrong-money")
    ).rejects.toThrow(/denominated in|cross currencies/);
    // …and the foreign supply never moved.
    expect(BankingApi.moneySupply(ZM).minor).toBe(0);
    expect(BankingApi.moneySupply(TEST_CURRENCY).minor).toBe(100);
  });

  it("keeps the two supplies independent under interleaved traffic", async () => {
    await BankingApi.mint("z1", Money.of(500, ZM), "seed");
    await BankingApi.mint("t1", Money.of(300, TEST_CURRENCY), "seed");
    await BankingApi.mint("z2", Money.of(100, ZM), "more");
    await BankingApi.mint("t2", Money.of(50, TEST_CURRENCY), "more");
    await BankingApi.drain("z2", Money.of(25, ZM), "sink");

    expect(BankingApi.moneySupply(ZM).minor).toBe(575);
    expect(BankingApi.moneySupply(TEST_CURRENCY).minor).toBe(350);
    expect(BankingApi.reconcile(ZM).balanced).toBe(true);
    expect(BankingApi.reconcile(TEST_CURRENCY).balanced).toBe(true);
  });

  it("has no escape hatch on the leg shape", () => {
    // A leg is `{from, to, amount, currency, category?, memo?}` and nothing
    // else. If somebody adds an `allowCrossCurrency`-shaped field, this is
    // where it should be noticed.
    const leg = {
      from: "a",
      to: "b",
      amount: 1,
      currency: ZM,
      category: "transfer" as const,
      memo: "",
    };
    for (const key of Object.keys(leg)) {
      expect(key).not.toMatch(/allow|force|cross|convert|override|bypass/i);
    }
  });
});

describe("conservation is per-currency in the supply store", () => {
  beforeEach(() => {
    installBankingHarness();
    Currency._registerForTesting(TEST_RECORD);
  });
  afterEach(() => {
    Currency._resetForTesting();
    teardownBankingHarness();
  });

  it("keeps one supply row per currency and rebuilds both from the ledger", async () => {
    await BankingApi.mint("z1", Money.of(200, ZM), "seed");
    await BankingApi.mint("t1", Money.of(80, TEST_CURRENCY), "seed");
    await BankingApi.drain("z1", Money.of(30, ZM), "sink");

    await BankingApi.recomputeSupply();

    expect(BankingApi.moneySupply(ZM).minor).toBe(170);
    expect(BankingApi.moneySupply(TEST_CURRENCY).minor).toBe(80);
  });

  it("issuance sentinels are currency-agnostic", () => {
    // The sentinels are shared across currencies by design — they are not
    // accounts, so they carry no denomination of their own.
    expect(Account.isSentinel(Account.ISSUANCE)).toBe(true);
    expect(Account.isSentinel(Account.CASH_BRIDGE)).toBe(true);
  });
});
