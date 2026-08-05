/**
 * The proprietor draw — a distinct, solvency-checked leg kind (`draw`)
 * from the business account to the proprietor's primary. The deliberate
 * asymmetry: `payWage` still pays red by design (the deficit model), the
 * draw refuses on a short business balance — a proprietor pocketing from
 * an insolvent business is exactly the wedge the kind exists to expose.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Currency, BankingApi } from "../../../api/banking";
import { Money } from "../Money";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../stuff/Idea";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

const BIZ_ACCT = "acct-business";
const DAVE = "/obj/Avatar/dave";

class TestOwner extends Idea {
  static _mixinName = "TestOwner";
}

async function asActor<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const actor = makeStuffAtPath(() => new TestOwner(), path);
  return withRootContext(null, "draw.test", () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

describe("BankingApi.payDraw", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("posts kind 'draw' to the proprietor's primary account", async () => {
    await BankingApi.mint(BIZ_ACCT, Money.of(500, Currency.compact()));
    // The proprietor opens a primary account (context-derived owner).
    const primary = await asActor(DAVE, () =>
      BankingApi.ensureVenueAccount(
        DAVE,
        BankingApi.defaultCustodianBank(),
        "",
      ),
    );
    await BankingApi.payDraw(BIZ_ACCT, DAVE, Money.of(200, Currency.compact()));
    expect(BankingApi.balanceOf(BIZ_ACCT).minor).toBe(300);
    expect(BankingApi.balanceOf(primary).minor).toBe(200);
    const rows = await BankingApi.entriesFor(primary);
    const draw = rows.find((r) => r.kind === "draw");
    expect(draw).toBeDefined();
    expect(draw?.category).toBe("draw");
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("refuses when the business balance is short (solvency-checked)", async () => {
    await BankingApi.mint(BIZ_ACCT, Money.of(50, Currency.compact()));
    await asActor(DAVE, () =>
      BankingApi.ensureVenueAccount(
        DAVE,
        BankingApi.defaultCustodianBank(),
        "",
      ),
    );
    await expect(
      BankingApi.payDraw(BIZ_ACCT, DAVE, Money.of(51, Currency.compact())),
    ).rejects.toThrow(/holds less than/);
    expect(BankingApi.balanceOf(BIZ_ACCT).minor).toBe(50);
  });

  it("refuses when the proprietor has no account", async () => {
    await BankingApi.mint(BIZ_ACCT, Money.of(500, Currency.compact()));
    await expect(
      BankingApi.payDraw(BIZ_ACCT, "/obj/Avatar/nobody", Money.of(10, Currency.compact())),
    ).rejects.toThrow(/no account/);
  });

  it("payWage still pays red by design (regression — the deliberate asymmetry)", async () => {
    const worker = "/obj/Avatar/wenna";
    const workerAcct = await BankingApi.ensureVenueAccount(
      worker,
      BankingApi.defaultCustodianBank(),
      "",
    );
    // Business holds nothing — the wage is owed regardless (CB subsidizes).
    await BankingApi.payWage(BIZ_ACCT, worker, Money.of(75, Currency.compact()));
    expect(BankingApi.balanceOf(BIZ_ACCT).minor).toBe(-75);
    expect(BankingApi.balanceOf(workerAcct).minor).toBe(75);
  });
});
