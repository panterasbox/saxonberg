/**
 * Compensation bases over the real banking ledger (a test Business, no
 * content venue — per the systems-over-content stance): per-settlement
 * pays `units × rate` as wage/piecework legs with the participant checks;
 * share-of-flow yields commission splits that settle conserved through a
 * Charge; a time-basis roster shift settles the shift wage identically to
 * before (the in-file regression); a non-time basis accrues no shift
 * wage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import { EmploymentApi } from "../../../api/employment";
import { Employment } from "../../../lib/employment/Employment";
import BusinessEntity from "../../Business";
import { EmployedMixin } from "../../../lib/employment/Employed";
import { Idea } from "../../../lib/stuff/Idea";
import { WorldClockApi } from "../../../api/worldclock";
import { Quantity } from "../../../lib/quantity";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../lib/banking/__tests__/banking-test-harness";

const BUSINESS = "/domain/test/business";
const DAVE = "/domain/test/npc/dave";
const HEWER = "/domain/test/npc/hewer";
const BARKER = "/domain/test/npc/barker";
const WENNA = "/domain/test/npc/wenna";
const HOUR = 3_600;

class Worker extends EmployedMixin(Idea) {
  static _mixinName = "Worker";
}

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.proprietorPath = DAVE;
  b.banksAt = BankingApi.defaultCustodianBank();
  b.positions = [
    {
      key: "bartender",
      label: "tending bar",
      wageRate: 12,
      confers: [],
    },
    {
      key: "hewer",
      label: "hewing",
      // A nonzero wageRate PLUS a piece-rate basis: the basis guard (not
      // the zero-rate short-circuit) is what keeps the shift wage at 0.
      wageRate: 5,
      confers: [],
      compensation: { basis: "per-settlement", rate: 3 },
    },
    {
      key: "barker",
      label: "barking",
      wageRate: 0,
      confers: [],
      compensation: { basis: "share-of-flow", share: 0.2 },
    },
  ];
  return b;
}

async function bizAccount(b: BusinessEntity): Promise<string> {
  const acct = await BankingApi.ensureVenueAccount(
    b.getAccountPath(),
    BankingApi.defaultCustodianBank(),
    "",
  );
  return acct;
}

async function balanceOfKey(key: string): Promise<number> {
  const acct = await BankingApi.primaryAccountIdOf(key);
  return acct ? BankingApi.balanceOf(acct).minor : 0;
}

describe("compensation bases", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("a business with no authored banksAt cannot open an operating account", async () => {
    const bare = makeStuffAtPath(
      () => new BusinessEntity(),
      "/domain/test/bankless",
    );
    bare.positions = [];
    await expect(EmploymentApi.operatingAccountOf(bare)).rejects.toThrow(
      /banksAt/,
    );
  });

  it("per-settlement: settlePiecework pays units × rate as wage/piecework", async () => {
    const biz = seedBusiness();
    const hewer = makeStuffAtPath(() => new Worker(), HEWER);
    EmploymentApi.hire(biz, hewer, "hewer");
    const acct = await bizAccount(biz);
    await BankingApi.mint(acct, Money.of(100));

    await EmploymentApi.settlePiecework(biz, HEWER, 4);
    expect(await balanceOfKey(HEWER)).toBe(12); // 4 × 3
    expect(BankingApi.balanceOf(acct).minor).toBe(88);
    const rows = await BankingApi.entriesFor(
      (await BankingApi.primaryAccountIdOf(HEWER))!,
    );
    const leg = rows.find((r) => r.kind === "wage");
    expect(leg?.category).toBe("piecework");
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("per-settlement refuses a non-employee and a time-basis employee", async () => {
    const biz = seedBusiness();
    const wenna = makeStuffAtPath(() => new Worker(), WENNA);
    EmploymentApi.hire(biz, wenna, "bartender");
    await expect(
      EmploymentApi.settlePiecework(biz, "/domain/test/npc/stranger", 1),
    ).rejects.toThrow(/no such employee/);
    await expect(
      EmploymentApi.settlePiecework(biz, WENNA, 1),
    ).rejects.toThrow(/not piece-rate/);
  });

  it("share-of-flow: splits route share × amount as commission, conserved", async () => {
    const biz = seedBusiness();
    const barker = makeStuffAtPath(() => new Worker(), BARKER);
    EmploymentApi.hire(biz, barker, "barker");
    const acct = await bizAccount(biz);

    const splits = await EmploymentApi.flowSplitsFor(biz, 50);
    expect(splits).toHaveLength(1);
    expect(splits[0]?.amount.minor).toBe(10); // floor(0.2 × 50)
    expect(splits[0]?.category).toBe("commission");

    // Settle a 50 charge carrying the splits: payer → venue 40 + holder 10.
    const payerAcct = "acct-payer";
    await BankingApi.mint(payerAcct, Money.of(100));
    const { BankTransaction } = await import(
      "../../../lib/banking/Transaction"
    );
    // The splits are exactly the settle's rider shape (real accounts only).
    expect(() =>
      BankTransaction.assertConserving("payment", [
        { from: payerAcct, to: acct, amount: 40 },
        {
          from: payerAcct,
          to: splits[0]!.accountId,
          amount: splits[0]!.amount.minor,
          category: splits[0]!.category,
        },
      ]),
    ).not.toThrow();
    // And no splits exist for a business with no share-of-flow holder.
    const bare = makeStuffAtPath(
      () => new BusinessEntity(),
      "/domain/test/bare-biz",
    );
    bare.positions = [];
    expect(await EmploymentApi.flowSplitsFor(bare, 50)).toHaveLength(0);
  });

  it("time-basis shift wage settles identically; a non-time basis accrues none", async () => {
    const biz = seedBusiness();
    const acct = await bizAccount(biz);
    await BankingApi.mint(acct, Money.of(1000));
    vi.spyOn(WorldClockApi, "getNow").mockReturnValue(
      Quantity.of(10 * HOUR, "s"),
    );

    // The shipped time-wage path: 2h × 12 = 24 (in-file regression).
    await EmploymentApi.settleShiftWage(
      biz,
      WENNA,
      Employment.of({
        businessPath: BUSINESS,
        positionKey: "bartender",
        status: "on-shift",
        hiredAt: 0,
        onShiftSince: 8 * HOUR,
      }),
    );
    expect(await balanceOfKey(WENNA)).toBe(24);

    // A per-settlement position on shift accrues NO shift wage.
    await EmploymentApi.settleShiftWage(
      biz,
      HEWER,
      Employment.of({
        businessPath: BUSINESS,
        positionKey: "hewer",
        status: "on-shift",
        hiredAt: 0,
        onShiftSince: 8 * HOUR,
      }),
    );
    expect(await balanceOfKey(HEWER)).toBe(0);
    expect(BankingApi.reconcile().balanced).toBe(true);
  });
});
