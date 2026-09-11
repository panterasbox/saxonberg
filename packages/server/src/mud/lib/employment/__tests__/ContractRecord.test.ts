/**
 * ContractRecord / ContractEvent — persistence round-trips through the
 * shared in-memory harness: fields survive save→find, the finders shape
 * their reads (live-by-board, active-by-claimant, oldest-first events).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ContractRecord } from "../ContractRecord";
import { ContractEvent } from "../ContractEvent";
import { Condition } from "../Condition";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../banking/__tests__/banking-test-harness";

function makeRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  const r = new ContractRecord();
  r.contractId = "gig-1";
  r.state = "open";
  r.boardPath = "/world/test/board";
  r.issuer = { kind: "player", templatePath: "/platform/agent/Avatar/issuer" };
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
      templatePath: "/platform/agent/Avatar/issuer",
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
      claimant: "/platform/agent/Avatar/courier",
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
      claimant: "/platform/agent/Avatar/courier",
    }).save();
    await makeRecord({ contractId: "other" }).save();
    const active = await ContractRecord.findActiveByClaimant(
      "/platform/agent/Avatar/courier",
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

/* ─────────── the watch reconcile's storage (no verb) ─────────── */

describe("⭐⭐ watch accrual — presence, not a verb", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  function watchGig(over: Partial<ContractRecord> = {}): ContractRecord {
    return makeRecord({
      contractId: "gig-watch",
      state: "claimed",
      claimant: "/platform/agent/Avatar/guard",
      clause: {
        shape: "achieve",
        condition: {
          template: "watch",
          item: { kind: "template", path: "/obj/test/nothing" },
          destinationPath: "/world/test/pithead",
          gameHours: 4,
        },
      },
      ...over,
    });
  }

  it("⭐ both watch fields round-trip", async () => {
    const r = watchGig({ watchedSec: 7_200, watchSeenSec: 99_000 });
    await r.save();
    const back = await ContractRecord.findByContractId("gig-watch");
    expect(back?.watchedSec).toBe(7_200);
    expect(back?.watchSeenSec).toBe(99_000);
  });

  it("⚠ a fresh claim carries NO high-water mark", async () => {
    // The first-touch rule lives on this default. If an unstamped record
    // read as `seen: 0` meaning "seen at the dawn of the world", the
    // first sweep would pay a claimant for the entire age of the game.
    const r = watchGig();
    expect(r.watchSeenSec).toBe(0);
    await r.save();
    expect((await ContractRecord.findByContractId("gig-watch"))?.watchSeenSec).toBe(0);
  });

  it("⭐ findAllClaimed is claimant-agnostic — a sweep asks nobody's question", async () => {
    await watchGig().save();
    await watchGig({ contractId: "gig-b", claimant: "/platform/agent/Avatar/other" }).save();
    await makeRecord({ contractId: "gig-open", state: "open" }).save();
    const claimed = await ContractRecord.findAllClaimed();
    expect(claimed.map((r) => r.contractId).sort()).toEqual(["gig-b", "gig-watch"]);
  });

  it("the clause holds once the hours are stood, and not before", async () => {
    const r = watchGig({ watchedSec: 3 * 3600 });
    const c = r.clause!.condition;
    expect(Condition.watchHolds(c, r.watchedSec)).toBe(false);
    r.watchedSec = 4 * 3600;
    expect(Condition.watchHolds(c, r.watchedSec)).toBe(true);
  });
});

