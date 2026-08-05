/**
 * The custodian rule (institution-keyed): every account names
 * a REAL custodian **bank** — an institution key (`goodkin`,
 * `central-bank`, a live branch's key), never `""`, never a path, never a
 * non-bank. The boot restamp migrates legacy rows idempotently (a
 * cache-field fill — balances untouched): pre-institution `bankPath`
 * branch paths map to institution keys, the `treasury` row goes to the
 * central bank, the raw `tpa` accumulator is re-owned to the TPA
 * Business.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { Account } from "../Account";
import AccountBalance from "../AccountBalance";
import BankCounter from "../../../obj/BankCounter";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import {
  installBankingHarness,
  teardownBankingHarness,
  col,
} from "./banking-test-harness";
import { Collections } from "../../../../backend/PersistenceManager";

const LIVE_BANK_PATH = "/domain/test/goodkin-bank";
const VENUE = "/domain/lounge/business";

function makeBank(path: string, corpoKey = "goodkin"): void {
  makeStuffAtPath(() => {
    const b = new BankCounter();
    b.setCorpoKey(corpoKey);
    return b;
  }, path);
}

/** Seed an AccountBalance row directly (legacy / pre-rule data). */
async function seedRow(fields: {
  accountId: string;
  owner: string;
  bank?: string;
  bankPath?: string;
  balance?: number;
  corpoKey?: string;
}): Promise<void> {
  const row = new AccountBalance();
  row.accountId = fields.accountId;
  row.owner = fields.owner;
  row.bank = fields.bank ?? "";
  row.bankPath = fields.bankPath ?? "";
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

describe("ensureVenueAccount — the custodian gate (institution keys)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("throws on an empty custodian (an account held nowhere)", async () => {
    await expect(
      BankingApi.ensureVenueAccount(VENUE, "", "", Currency.compact()),
    ).rejects.toThrow(/not a real custodian/);
  });

  it("throws on a non-institution string (the retired self-custody shape)", async () => {
    // The old shape passed the owner's own path as the custodian — a path
    // is not an institution, and no branch of any such bank is live.
    await expect(
      BankingApi.ensureVenueAccount(VENUE, VENUE, "", Currency.compact()),
    ).rejects.toThrow(/not a real custodian/);
  });

  it("accepts the CB, the default custodian, and a live branch's institution", async () => {
    await expect(
      BankingApi.ensureVenueAccount(
        "treasury-owner",
        Account.CENTRAL_BANK_INSTITUTION,
        "", Currency.compact()),
    ).resolves.toBeTruthy();
    await expect(
      BankingApi.ensureVenueAccount(
        VENUE,
        BankingApi.defaultCustodianBank(),
        "", Currency.compact()),
    ).resolves.toBeTruthy();
    // An institution beyond the default is real iff one of its branches
    // is live (veshko's counter stands → veshko custody accepted).
    makeBank("/domain/test/veshko-bank", "veshko");
    await expect(
      BankingApi.ensureVenueAccount("/domain/test/other", "veshko", "veshko", Currency.compact()),
    ).resolves.toBeTruthy();
    // …and an institution with no live branch is refused.
    await expect(
      BankingApi.ensureVenueAccount("/domain/test/other2", "hollis", "", Currency.compact()),
    ).rejects.toThrow(/not a real custodian/);
  });

  it("a re-pointed call site finds its existing account (no duplicate row)", async () => {
    // A legacy self-custodied row exists; the re-pointed call passes the
    // institution key and must land on the same account via `?? owned[0]`.
    await seedRow({ accountId: "acct-legacy", owner: VENUE, bankPath: VENUE });
    const found = await BankingApi.ensureVenueAccount(
      VENUE,
      BankingApi.defaultCustodianBank(),
      "", Currency.compact());
    expect(found).toBe("acct-legacy");
    const rows = [...col(Collections.BankAccounts).values()].filter(
      (d) => d.owner === VENUE,
    );
    expect(rows).toHaveLength(1);
  });
});

describe("the boot restamp pass (legacy → institution keys)", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("migrates legacy bankPath rows to institutions, treasury to the CB, idempotently", async () => {
    makeBank(LIVE_BANK_PATH);
    const custodian = BankingApi.defaultCustodianBank();
    // Legacy shapes: the bare treasury, a self-custodied venue, an
    // empty-bankPath worker, a customer whose bankPath names a LIVE branch
    // (maps to its institution), a corpo treasury likewise.
    await seedRow({ accountId: "treasury", owner: "", bankPath: "", balance: 80 });
    await seedRow({ accountId: "acct-venue", owner: VENUE, bankPath: VENUE, balance: 500 });
    await seedRow({ accountId: "acct-worker", owner: "/obj/Avatar/wenna", bankPath: "", balance: 25 });
    await seedRow({ accountId: "acct-cust", owner: "/obj/Avatar/alice", bankPath: LIVE_BANK_PATH, balance: 90, corpoKey: "goodkin" });
    await seedRow({ accountId: "acct-corpo", owner: "corpo:goodkin", bankPath: LIVE_BANK_PATH, balance: 40, corpoKey: "goodkin" });
    await BankingApi.mint("acct-sink", Money.of(735, Currency.compact()));
    await BankingApi.drain("acct-sink", Money.of(735, Currency.compact()));
    const supplyBefore = BankingApi.moneySupply(Currency.compact()).minor;

    await BankingApi.boot();

    expect(storedRow("treasury")?.bank).toBe(Account.CENTRAL_BANK_INSTITUTION);
    expect(storedRow("acct-venue")?.bank).toBe(custodian);
    expect(storedRow("acct-worker")?.bank).toBe(custodian);
    // The live branch's path mapped to its institution key.
    expect(storedRow("acct-cust")?.bank).toBe("goodkin");
    expect(storedRow("acct-corpo")?.bank).toBe("goodkin");
    // The legacy carrier is cleared on migration.
    expect(storedRow("acct-cust")?.bankPath).toBe("");
    // A cache-field fill, never a money movement.
    expect(storedRow("treasury")?.balance).toBe(80);
    expect(storedRow("acct-venue")?.balance).toBe(500);
    expect(storedRow("acct-worker")?.balance).toBe(25);
    expect(BankingApi.moneySupply(Currency.compact()).minor).toBe(supplyBefore);

    // Idempotent — a second boot changes nothing.
    await BankingApi.boot();
    expect(storedRow("treasury")?.bank).toBe(Account.CENTRAL_BANK_INSTITUTION);
    expect(storedRow("acct-venue")?.bank).toBe(custodian);
  });

  it("re-owns the legacy raw `tpa` accumulator to the TPA Business", async () => {
    const TPA_BIZ = "/domain/terminus/terminal/tpa";
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) => {
      if (k === AppSettingKeys.fasttravelTpaBusinessPath) return TPA_BIZ;
      if (k === AppSettingKeys.bankingDefaultCustodianBank) return "goodkin";
      return "";
    });
    await seedRow({ accountId: "tpa", owner: "", balance: 30 });
    await BankingApi.boot();
    const row = storedRow("tpa");
    expect(row?.owner).toBe(TPA_BIZ);
    expect(row?.bank).toBe(BankingApi.defaultCustodianBank());
    expect(row?.balance).toBe(30); // a cache-field fill, never a movement
    // The Business's account resolution now finds the accumulated fees.
    expect(await BankingApi.primaryAccountIdOf(TPA_BIZ)).toBe("tpa");
  });
});
