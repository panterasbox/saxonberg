/**
 * ContractRecord / ContractEvent — persistence round-trips through the
 * shared in-memory harness: fields survive save→find, the finders shape
 * their reads (live-by-board, active-by-claimant, oldest-first events).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ContractRecord } from "../ContractRecord";
import { ContractEvent } from "../ContractEvent";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../banking/__tests__/banking-test-harness";

function makeRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  const r = new ContractRecord();
  r.contractId = "gig-1";
  r.state = "open";
  r.boardPath = "/world/test/board";
  r.issuer = { kind: "player", templatePath: "/obj/Avatar/issuer" };
  r.issuerAccountId = "acct-issuer";
  r.claimMode = "exclusive";
  r.clause = {
    shape: "achieve",
    condition: {
      template: "delivery",
      item: { kind: "template", path: "/obj/test/crate" },
      destinationPath: "/world/test/bar",
    },
  };
  r.rewardMinor = 25;
  r.postedAt = 100;
  Object.assign(r, overrides);
  return r;
}

describe("ContractRecord round-trip + finders", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("round-trips the full record shape", async () => {
    await makeRecord().save();
    const found = await ContractRecord.findByContractId("gig-1");
    expect(found?.issuer).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/issuer",
    });
    expect(found?.clause?.condition.destinationPath).toBe("/world/test/bar");
    expect(found?.rewardMinor).toBe(25);
    expect(await ContractRecord.findByContractId("gig-nope")).toBeNull();
  });

  it("findLiveByBoard returns open+claimed on this board, oldest-first", async () => {
    await makeRecord({ contractId: "a", postedAt: 300 }).save();
    await makeRecord({
      contractId: "b",
      postedAt: 100,
      state: "claimed",
      claimant: "/obj/Avatar/courier",
    }).save();
    await makeRecord({ contractId: "c", state: "settled" }).save();
    await makeRecord({
      contractId: "d",
      boardPath: "/world/other/board",
    }).save();
    const live = await ContractRecord.findLiveByBoard("/world/test/board");
    expect(live.map((r) => r.contractId)).toEqual(["b", "a"]);
  });

  it("findActiveByClaimant resolves the single-active-claim read", async () => {
    await makeRecord({
      contractId: "held",
      state: "claimed",
      claimant: "/obj/Avatar/courier",
    }).save();
    await makeRecord({ contractId: "other" }).save();
    const active = await ContractRecord.findActiveByClaimant(
      "/obj/Avatar/courier",
    );
    expect(active.map((r) => r.contractId)).toEqual(["held"]);
  });

  it("ContractEvent chain reads oldest-first", async () => {
    for (const [event, at] of [
      ["claimed", 200],
      ["posted", 100],
      ["settled", 300],
    ] as const) {
      const e = new ContractEvent();
      e.contractId = "gig-1";
      e.event = event;
      e.at = at;
      await e.save();
    }
    const chain = await ContractEvent.findByContractId("gig-1");
    expect(chain.map((e) => e.event)).toEqual([
      "posted",
      "claimed",
      "settled",
    ]);
  });
});
