/**
 * The gig lifecycle end-to-end over the real banking ledger (the shared
 * in-memory harness): post → claim → escrow → the two-beat turn-in
 * (`fulfill` seals proof-of-delivery, `complete` redeems) → settle /
 * breach / expiry — with the load-bearing negatives: no ambient
 * settlement (a containment move alone settles nothing), strict
 * possession, exclusive lockout, the verification boundary, funding
 * refusals, and conservation green in every state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BankingApi, Money } from "../../../api/banking";
import { ContractApi } from "../../../api/contract";
import type { GigSpec } from "../../../api/contract";
import { RegardApi } from "../../../api/regard";
import { WorldClockApi } from "../../../api/worldclock";
import { ExecutionContextApi } from "../../../api/execution-context";
import { ContainmentApi } from "../../../api/containment";
import { Quantity } from "../../quantity";
import { Idea } from "../../stuff/Idea";
import { Creature } from "../../creature/Creature";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { BeliefStoreMixin } from "../../belief/BeliefStore";
import { LEDGER_KINDS } from "../../banking/LedgerEntry";
import type { Stuff } from "../../stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
  col,
} from "../../banking/__tests__/banking-test-harness";
import { Collections } from "../../../../backend/PersistenceManager";

class TestIssuer extends BeliefStoreMixin(Idea) {
  static _mixinName = "TestIssuer";
}
class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = "TestRoom";
}
class TestCrate extends ContainableMixin(Idea) {
  static _mixinName = "TestCrate";
}

const BOARD = "/domain/test/board";
const BAR = "/domain/test/bar";
const WAREHOUSE = "/domain/test/warehouse";
const CRATE = "/obj/test/crate";
const ISSUER = "/obj/Avatar/issuer";
const COURIER = "/obj/Avatar/courier";
const RIVAL = "/obj/Avatar/rival";

const HOUR = 3_600;
const REWARD = 25;

let gameNow = 10_000;
let issuer: TestIssuer;
let courier: Creature;
let rival: Creature;
let bar: TestRoom;
let warehouse: TestRoom;
let crate: TestCrate;
let issuerAcct: string;

function spec(overrides: Partial<GigSpec> = {}): GigSpec {
  return {
    boardPath: BOARD,
    condition: {
      template: "delivery",
      item: { kind: "template", path: CRATE },
      destinationPath: BAR,
    },
    rewardMinor: REWARD,
    claimMode: "exclusive",
    ...overrides,
  };
}

async function as<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "contract.test", () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

async function balanceOfKey(key: string): Promise<number> {
  const acct = await BankingApi.primaryAccountIdOf(key);
  return acct ? BankingApi.balanceOf(acct).minor : 0;
}

describe("contract lifecycle", () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    installBankingHarness();
    gameNow = 10_000;
    vi.spyOn(WorldClockApi, "getNow").mockImplementation(() =>
      Quantity.of(gameNow, "s"),
    );
    issuer = makeStuffAtPath(() => new TestIssuer(), ISSUER);
    courier = makeStuffAtPath(() => new Creature(), COURIER);
    rival = makeStuffAtPath(() => new Creature(), RIVAL);
    bar = makeStuffAtPath(() => new TestRoom(), BAR);
    warehouse = makeStuffAtPath(() => new TestRoom(), WAREHOUSE);
    crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    ContainmentApi.move(crate, warehouse);
    ContainmentApi.move(courier as never, warehouse);
    issuerAcct = await as(issuer, () =>
      BankingApi.ensureVenueAccount(
        ISSUER,
        BankingApi.defaultCustodianBank(),
        "",
      ),
    );
    await BankingApi.mint(issuerAcct, Money.of(100));
    // The couriers live under /obj/Avatar/ — the PLAYER namespace — so per
    // the players-hold-their-own-accounts rule they arrive banked (the
    // no-account refusal has its own test below).
    for (const key of [COURIER, RIVAL]) {
      await BankingApi.ensureVenueAccount(
        key,
        BankingApi.defaultCustodianBank(),
        "",
      );
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  async function postAndClaim(): Promise<string> {
    const posted = await as(issuer, () => ContractApi.post(spec()));
    expect(posted.ok).toBe(true);
    const id = posted.ok ? posted.contractId : "";
    const claimed = await as(courier, () => ContractApi.claim(id));
    expect(claimed).toEqual({ ok: true });
    return id;
  }

  function deliver(): void {
    ContainmentApi.move(crate, bar);
  }

  it("happy path: post → claim → deliver → complete settles (never ambiently)", async () => {
    const id = await postAndClaim();
    // Exclusive: escrow held at claim.
    expect(BankingApi.balanceOf(issuerAcct).minor).toBe(100 - REWARD);
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(REWARD);
    expect(BankingApi.reconcile().balanced).toBe(true);

    deliver();
    // NOTHING settles on the move itself — no ambient detection.
    const mid = await ContractApi.contractById(id);
    expect(mid?.state).toBe("claimed");
    expect(await balanceOfKey(COURIER)).toBe(0);

    const done = await as(courier, () => ContractApi.complete(id));
    expect(done).toEqual({ ok: true, paidMinor: REWARD });
    expect(await balanceOfKey(COURIER)).toBe(REWARD);
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(0);
    // The escrow account row died with the contract.
    const escrowRow = [...col(Collections.BankAccounts).values()].find(
      (d) => d.accountId === `escrow:contract:${id}`,
    );
    expect(escrowRow).toBeUndefined();
    expect(BankingApi.reconcile().balanced).toBe(true);

    const record = await ContractApi.contractById(id);
    expect(record?.state).toBe("settled");
    expect(record?.settledBy).toBe(COURIER);
    const events = await ContractApi.eventsFor(id);
    const settled = events.find((e) => e.event === "settled");
    expect(settled?.actor).toBe(COURIER);
    expect(settled?.txId).toMatch(/^tx-/);
  });

  it("two-beat path: fulfill seals the row; complete redeems after state drift", async () => {
    const id = await postAndClaim();
    deliver();
    ContainmentApi.move(courier as never, bar);
    const sealed = await as(courier, () => ContractApi.fulfill(id));
    expect(sealed).toEqual({ ok: true });
    // No money moved, no state transition at the capture beat.
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(REWARD);
    expect((await ContractApi.contractById(id))?.state).toBe("claimed");

    // State drifts: the recipient takes the crate inside.
    ContainmentApi.move(crate, warehouse);

    const done = await as(courier, () => ContractApi.complete(id));
    expect(done).toEqual({ ok: true, paidMinor: REWARD });
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("capture refusals: not-done / still-carried / away / duplicate / not-your-claim", async () => {
    const id = await postAndClaim();
    ContainmentApi.move(courier as never, bar);
    // Before delivery.
    expect(await as(courier, () => ContractApi.fulfill(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't done/),
    });
    // Still carried (standing at the destination, crate in hand).
    ContainmentApi.move(crate, courier as never);
    expect(await as(courier, () => ContractApi.fulfill(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't done/),
    });
    // Away from the destination.
    ContainmentApi.move(crate, bar);
    ContainmentApi.move(courier as never, warehouse);
    expect(await as(courier, () => ContractApi.fulfill(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/aren't at the destination/),
    });
    // At the destination, delivered — seals; a second seal refused.
    ContainmentApi.move(courier as never, bar);
    expect(await as(courier, () => ContractApi.fulfill(id))).toEqual({
      ok: true,
    });
    expect(await as(courier, () => ContractApi.fulfill(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/already fulfilled/),
    });
    // A non-claimant's fulfill on an exclusive gig.
    ContainmentApi.move(rival as never, bar);
    expect(await as(rival, () => ContractApi.fulfill(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't your claim/),
    });
  });

  it("turn-in refusals: not-done / still-carried / drift without a seal / foreign seal", async () => {
    const id = await postAndClaim();
    expect(await as(courier, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't done/),
    });
    // Standing in the destination with the crate still in inventory.
    ContainmentApi.move(courier as never, bar);
    ContainmentApi.move(crate, courier as never);
    expect(await as(courier, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't done/),
    });
    // Deliver, then remove WITHOUT a fulfill — live verification must hold.
    ContainmentApi.move(crate, bar);
    ContainmentApi.move(crate, warehouse);
    expect(await as(courier, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't done/),
    });
  });

  it("exclusive lockout: second claimant, issuer self-claim, foreign complete", async () => {
    const posted = await as(issuer, () => ContractApi.post(spec()));
    const id = posted.ok ? posted.contractId : "";
    expect(await as(issuer, () => ContractApi.claim(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/your own gig/),
    });
    expect(await as(courier, () => ContractApi.claim(id))).toEqual({
      ok: true,
    });
    expect(await as(rival, () => ContractApi.claim(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't open/),
    });
    deliver();
    expect(await as(rival, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't your claim/),
    });
  });

  it("claim expiry: lazy breach reopens, reverts escrow, records, nudges regard", async () => {
    const id = await postAndClaim();
    expect(RegardApi.getRegard(issuer, courier)).toBe(0);
    gameNow += 49 * HOUR; // past the 48h default
    const open = await ContractApi.openGigsOn(BOARD);
    expect(open).toHaveLength(1);
    expect(open[0]?.state).toBe("open");
    expect(open[0]?.claimant).toBe("");
    expect(BankingApi.balanceOf(issuerAcct).minor).toBe(100);
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(0);
    const events = (await ContractApi.eventsFor(id)).map((e) => e.event);
    expect(events).toContain("breached");
    expect(events).toContain("released-back");
    expect(RegardApi.getRegard(issuer, courier)).toBe(-15);
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("abandon: same breach consequences, then a re-claim can succeed", async () => {
    const id = await postAndClaim();
    expect(await as(courier, () => ContractApi.abandon(id))).toEqual({
      ok: true,
    });
    expect(BankingApi.balanceOf(issuerAcct).minor).toBe(100);
    expect((await ContractApi.contractById(id))?.state).toBe("open");
    expect(RegardApi.getRegard(issuer, courier)).toBe(-15);
    // The gig reopened — another courier can claim it (escrow re-held).
    expect(await as(rival, () => ContractApi.claim(id))).toEqual({ ok: true });
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(REWARD);
  });

  it("posting expiry: lazy revert to issuer, state expired, escrow closed", async () => {
    const posted = await as(issuer, () =>
      ContractApi.post(spec({ claimMode: "open-bounty", expiresGameHours: 2 })),
    );
    const id = posted.ok ? posted.contractId : "";
    expect(BankingApi.balanceOf(issuerAcct).minor).toBe(100 - REWARD);
    gameNow += 3 * HOUR;
    expect(await ContractApi.openGigsOn(BOARD)).toHaveLength(0);
    const record = await ContractApi.contractById(id);
    expect(record?.state).toBe("expired");
    expect(BankingApi.balanceOf(issuerAcct).minor).toBe(100);
    expect(
      (await ContractApi.eventsFor(id)).map((e) => e.event),
    ).toContain("reverted");
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("open-bounty: escrow at post, no claim step, first verified completer paid, terminal guard", async () => {
    const posted = await as(issuer, () =>
      ContractApi.post(spec({ claimMode: "open-bounty" })),
    );
    const id = posted.ok ? posted.contractId : "";
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(REWARD);
    expect(await as(rival, () => ContractApi.claim(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/no claim/),
    });
    deliver();
    // The delivering move alone settles nothing.
    expect((await ContractApi.contractById(id))?.state).toBe("open");
    // A third party who delivers and completes is the payee.
    expect(await as(rival, () => ContractApi.complete(id))).toEqual({
      ok: true,
      paidMinor: REWARD,
    });
    expect(await balanceOfKey(RIVAL)).toBe(REWARD);
    // A second complete after settlement is refused by the state guard.
    expect(await as(courier, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/closed/),
    });
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("a fulfilled row redeems only for its own actor (bounty)", async () => {
    const posted = await as(issuer, () =>
      ContractApi.post(spec({ claimMode: "open-bounty" })),
    );
    const id = posted.ok ? posted.contractId : "";
    deliver();
    ContainmentApi.move(courier as never, bar);
    expect(await as(courier, () => ContractApi.fulfill(id))).toEqual({
      ok: true,
    });
    // Drift: the crate leaves. The rival holds no seal — refused; the
    // courier's seal pays the courier.
    ContainmentApi.move(crate, warehouse);
    expect(await as(rival, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/isn't done/),
    });
    expect(await as(courier, () => ContractApi.complete(id))).toEqual({
      ok: true,
      paidMinor: REWARD,
    });
  });

  it("verification boundary: non-template + pre-satisfied posts refused", async () => {
    const bad = await as(issuer, () =>
      ContractApi.post(
        spec({
          condition: {
            template: "make-dave-happy",
            item: { kind: "template", path: CRATE },
            destinationPath: BAR,
          } as never,
        }),
      ),
    );
    expect(bad).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/unknown condition template/),
    });
    deliver(); // condition already holds
    expect(await as(issuer, () => ContractApi.post(spec()))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/already holds/),
    });
  });

  it("funding: unfundable post refused (both modes); drained issuer closes at claim", async () => {
    expect(
      await as(issuer, () => ContractApi.post(spec({ rewardMinor: 500 }))),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/fund/) });
    expect(
      await as(issuer, () =>
        ContractApi.post(spec({ rewardMinor: 500, claimMode: "open-bounty" })),
      ),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/fund/) });

    const posted = await as(issuer, () => ContractApi.post(spec()));
    const id = posted.ok ? posted.contractId : "";
    // Funds move away between post and claim.
    await BankingApi.drain(issuerAcct, Money.of(90));
    expect(await as(courier, () => ContractApi.claim(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/no longer fund/),
    });
    const record = await ContractApi.contractById(id);
    expect(record?.state).toBe("expired");
    expect(
      (await ContractApi.eventsFor(id)).find((e) => e.event === "reverted")
        ?.memo,
    ).toBe("unfundable");
  });

  it("business-issued: post --business escrows from the Business account, settles identically", async () => {
    const BUSINESS = "/domain/test/business";
    const DAVE = "/domain/test/npc/dave";
    const { default: BusinessEntity } = await import("../Business");
    const biz = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
    (biz as unknown as { proprietorPath: string }).proprietorPath = DAVE;
    biz.banksAt = BankingApi.defaultCustodianBank();
    const dave = makeStuffAtPath(() => new TestIssuer(), DAVE);
    const bizAcct = await BankingApi.ensureVenueAccount(
      biz.getAccountPath(),
      BankingApi.defaultCustodianBank(),
      "",
    );
    await BankingApi.mint(bizAcct, Money.of(100));

    const posted = await as(dave, () =>
      ContractApi.post(spec({ asBusiness: true, claimMode: "open-bounty" })),
    );
    expect(posted.ok).toBe(true);
    const id = posted.ok ? posted.contractId : "";
    // Escrow came from the Business account, not any personal one.
    expect(BankingApi.balanceOf(bizAcct).minor).toBe(100 - REWARD);
    expect(BankingApi.balanceOf(issuerAcct).minor).toBe(100);
    // A non-proprietor can't post as a business.
    expect(
      await as(courier, () => ContractApi.post(spec({ asBusiness: true }))),
    ).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/don't run a business/),
    });
    deliver();
    expect(await as(courier, () => ContractApi.complete(id))).toEqual({
      ok: true,
      paidMinor: REWARD,
    });
    expect(await balanceOfKey(COURIER)).toBe(REWARD);
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("an unbanked player completer is refused before the terminal flip", async () => {
    // A walk-in under /obj/Avatar/ (the player namespace) with NO account:
    // players are never silently signed up for a bank — the refusal is the
    // nudge to open one (coin settlement is a named deferred seam). The
    // record must NOT settle (payee resolves before the CAS flip) and the
    // stake stays held; opening an account unblocks the payout.
    const walkin = makeStuffAtPath(() => new Creature(), "/obj/Avatar/walkin");
    const posted = await as(issuer, () =>
      ContractApi.post(spec({ claimMode: "open-bounty" })),
    );
    const id = posted.ok ? posted.contractId : "";
    deliver();
    expect(await as(walkin, () => ContractApi.complete(id))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/no account/),
    });
    expect((await ContractApi.contractById(id))?.state).toBe("open");
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(REWARD);
    await BankingApi.ensureVenueAccount(
      "/obj/Avatar/walkin",
      BankingApi.defaultCustodianBank(),
      "",
    );
    expect(await as(walkin, () => ContractApi.complete(id))).toEqual({
      ok: true,
      paidMinor: REWARD,
    });
  });

  it("conservation sweep: every ledger row's kind is in the vocabulary; reconcile green", async () => {
    const id = await postAndClaim();
    deliver();
    await as(courier, () => ContractApi.complete(id));
    for (const row of [...col(Collections.BankLedger).values()]) {
      expect(LEDGER_KINDS).toContain(row.kind);
    }
    expect(BankingApi.reconcile().balanced).toBe(true);
  });
});
