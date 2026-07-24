/**
 * The custodian rule (Decision L): every account names a REAL custodian —
 * `ensureVenueAccount` refuses an empty or non-bank `bankPath` (the retired
 * self-custody shape) and accepts the CB, the default custodian bank, or a
 * live branch. The boot restamp pass moves legacy rows idempotently (a
 * cache-field fill — balances untouched, conservation green) with the
 * `treasury` row going to the central bank.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Account } from "../Account";
import AccountBalance from "../AccountBalance";
import BankCounter from "../BankCounter";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
  col,
} from "./banking-test-harness";
import { Collections } from "../../../../backend/PersistenceManager";

const LIVE_BANK = "/domain/test/goodkin-bank";
const VENUE = "/domain/lounge/business";

function makeBank(path: string): void {
  makeStuffAtPath(() => {
    const b = new BankCounter();
    b.setCorpoKey("goodkin");
    return b;
  }, path);
}

/** Seed a legacy AccountBalance row directly (pre-rule data). */
async function seedRow(fields: {
  accountId: string;
  owner: string;
  bankPath: string;
  balance?: number;
  corpoKey?: string;
}): Promise<void> {
  const row = new AccountBalance();
  row.accountId = fields.accountId;
  row.owner = fields.owner;
  row.bankPath = fields.bankPath;
  row.corpoKey = fields.corpoKey ?? "";
  row.isPrimary = true;
  row.isActive = true;
  row.balance = fields.balance ?? 0;
  await row.save();
  AccountBalance.putCached(fields.accountId, row.balance);
}

function storedRow(accountId: string): Record<string, unknown> | undefined {
  return [...col(Collections.BankAccounts).values()].find(
    (d) => d.accountId === accountId,
  );
}

describe("ensureVenueAccount — the custodian gate", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("throws on an empty bankPath (an account held nowhere)", async () => {
    await expect(
      BankingApi.ensureVenueAccount(VENUE, "", ""),
    ).rejects.toThrow(/not a real custodian/);
  });

  it("throws on self-custody at a non-bank (the retired shape)", async () => {
    await expect(
      BankingApi.ensureVenueAccount(VENUE, VENUE, ""),
    ).rejects.toThrow(/not a real custodian/);
  });

  it("accepts the CB path, the default custodian, and a live branch", async () => {
    makeBank(LIVE_BANK);
    await expect(
      BankingApi.ensureVenueAccount("treasury-owner", Account.CENTRAL_BANK_PATH, ""),
    ).resolves.toBeTruthy();
    await expect(
      BankingApi.ensureVenueAccount(
        VENUE,
        BankingApi.defaultCustodianBankPath(),
        "",
      ),
    ).resolves.toBeTruthy();
    await expect(
      BankingApi.ensureVenueAccount("/domain/test/other", LIVE_BANK, "goodkin"),
    ).resolves.toBeTruthy();
  });

  it("a re-pointed call site finds its existing account (no duplicate row)", async () => {
    // A legacy self-custodied row exists; the re-pointed call passes the
    // custodian path and must land on the same account via `?? owned[0]`.
    await seedRow({ accountId: "acct-legacy", owner: VENUE, bankPath: VENUE });
    const found = await BankingApi.ensureVenueAccount(
      VENUE,
      BankingApi.defaultCustodianBankPath(),
      "",
    );
    expect(found).toBe("acct-legacy");
    const rows = [...col(Collections.BankAccounts).values()].filter(
      (d) => d.owner === VENUE,
    );
    expect(rows).toHaveLength(1);
  });
});

describe("the boot restamp pass", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("moves empty + self-custodied rows to the default custodian and treasury to the CB, idempotently", async () => {
    makeBank(LIVE_BANK);
    const custodian = BankingApi.defaultCustodianBankPath();
    // Legacy shapes: the bare treasury, a self-custodied venue, an
    // empty-bankPath worker — plus rows the pass must NOT touch: a customer
    // at a live branch, a corpo treasury at its own bank.
    await seedRow({ accountId: "treasury", owner: "", bankPath: "", balance: 80 });
    await seedRow({ accountId: "acct-venue", owner: VENUE, bankPath: VENUE, balance: 500 });
    await seedRow({ accountId: "acct-worker", owner: "/obj/Avatar/wenna", bankPath: "", balance: 25 });
    await seedRow({ accountId: "acct-cust", owner: "/obj/Avatar/alice", bankPath: LIVE_BANK, balance: 90, corpoKey: "goodkin" });
    await seedRow({ accountId: "acct-corpo", owner: "corpo:goodkin", bankPath: LIVE_BANK, balance: 40, corpoKey: "goodkin" });
    // Back the balances with supply so the audit means something.
    await BankingApi.mint("acct-sink", Money.of(735));
    await BankingApi.drain("acct-sink", Money.of(735));
    const supplyBefore = BankingApi.moneySupply().minor;

    await BankingApi.boot();

    expect(storedRow("treasury")?.bankPath).toBe(Account.CENTRAL_BANK_PATH);
    expect(storedRow("acct-venue")?.bankPath).toBe(custodian);
    expect(storedRow("acct-worker")?.bankPath).toBe(custodian);
    expect(storedRow("acct-cust")?.bankPath).toBe(LIVE_BANK);
    expect(storedRow("acct-corpo")?.bankPath).toBe(LIVE_BANK);
    // A cache-field fill, never a money movement.
    expect(storedRow("treasury")?.balance).toBe(80);
    expect(storedRow("acct-venue")?.balance).toBe(500);
    expect(storedRow("acct-worker")?.balance).toBe(25);
    expect(BankingApi.moneySupply().minor).toBe(supplyBefore);

    // Idempotent — a second boot changes nothing.
    await BankingApi.boot();
    expect(storedRow("treasury")?.bankPath).toBe(Account.CENTRAL_BANK_PATH);
    expect(storedRow("acct-venue")?.bankPath).toBe(custodian);
  });
});
