/**
 * LedgerEntry — the append-only ledger row. Covers the round-trip and the
 * entry-shape AC: a row carries kind / from-to / amount / both clocks / a
 * scope tag, rich enough for derive-on-read reports with no backfill.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import LedgerEntry from "../LedgerEntry";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

describe("LedgerEntry", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("round-trips every field through save/find", async () => {
    const e = new LedgerEntry();
    e.kind = "payment";
    e.fromAccount = "acct-a";
    e.toAccount = "acct-b";
    e.amount = 1200;
    e.memo = "a round of drinks";
    e.category = "sales";
    e.actor = "/obj/Avatar/patron";
    e.locality = "/university-avenue";
    e.txId = "tx-1";
    e.at = 4242;
    e.realAt = 1_700_000_000_000;
    await e.save();

    const [back] = await LedgerEntry.find<LedgerEntry>({ fromAccount: "acct-a" });
    expect(back).toBeDefined();
    expect(back!.kind).toBe("payment");
    expect(back!.fromAccount).toBe("acct-a");
    expect(back!.toAccount).toBe("acct-b");
    expect(back!.amount).toBe(1200);
    expect(back!.memo).toBe("a round of drinks");
    expect(back!.category).toBe("sales");
    expect(back!.actor).toBe("/obj/Avatar/patron");
    expect(back!.locality).toBe("/university-avenue");
    expect(back!.at).toBe(4242);
    expect(back!.realAt).toBe(1_700_000_000_000);
  });

  it("the entry shape carries kind / from-to / amount / both clocks / scope", () => {
    const e = new LedgerEntry();
    // The reporting-substrate guarantee: every tag a derive-on-read report
    // needs is present on the row.
    expect(e).toHaveProperty("kind");
    expect(e).toHaveProperty("fromAccount");
    expect(e).toHaveProperty("toAccount");
    expect(e).toHaveProperty("amount");
    expect(e).toHaveProperty("category");
    expect(e).toHaveProperty("actor");
    expect(e).toHaveProperty("locality"); // the scope-location tag
    expect(e).toHaveProperty("at"); // game clock
    expect(e).toHaveProperty("realAt"); // wall clock
  });
});
