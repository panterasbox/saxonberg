/**
 * Consignment — the sell loop over real ownership, conservation-clean.
 *
 * Proves: `consign` moves custody to the shop while the owner-stamp stays
 * put; a second player buying the listing splits the ask (commission →
 * store, remainder → the consignor's primary account) and transfers the
 * stamp; the store fronts no coin and `reconcile().balanced` holds; the
 * account-required nudge, the per-consignor cap, and `reclaim` (ownership
 * unchanged) all behave. The consignor is never online during the sale —
 * payout rides `primaryAccountIdOf`, a pure DB read.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BuyController from "../BuyController";
import ConsignController from "../ConsignController";
import ReclaimController from "../ReclaimController";
import ConsignmentShelf from "../../../ConsignmentShelf";
import Thing from "../../../../lib/stuff/Thing";
import BankCounter from "../../../BankCounter";
import PaymentCard from "../../../PaymentCard";
import ChattelRegistry from "../../../ChattelRegistry";
import { EmploymentApi } from "../../../../api/employment";
import BusinessEntity from "../../../Business";
import { ChattelApi } from "../../../../api/chattel";
import { BankingApi, Money } from "../../../../api/banking";
import { ContainmentApi } from "../../../../api/containment";
import { StuffApi } from "../../../../api/stuff";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { Quantity } from "../../../../lib/quantity";
import { Document } from "../../../../lib/persistence/Document";
import { AppSettings, AppSettingKeys } from "../../../../lib/config/AppSettings";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { NamedMixin } from "../../../../lib/description/Named";
import { Idea } from "../../../../lib/stuff/Idea";
import Location from "../../../../lib/stuff/Location";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../api/command";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import Coin from "../../../Coin";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../lib/banking/__tests__/banking-test-harness";

const BANK = "/domain/terminus/counting-houses/bank-counter";
const SHELF = "/domain/terminus/general-store/consignment-shelf";

/** The store's Business (operates the shelf; authored custody). */
async function makeStoreBusiness(): Promise<string> {
  const biz = makeStuffAtPath(
    () => new BusinessEntity(),
    "/domain/terminus/general-store/business",
  );
  biz.proprietorPath = "";
  biz.positions = [];
  biz.operatingLocations = [SHELF];
  biz.banksAt = BankingApi.defaultCustodianBank();
  return EmploymentApi.operatingAccountOf(biz);
}
const TORCH = "/obj/test/Torch";

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = "TestGiver";
}

class Torch extends Thing {}

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "consign.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function stubClones(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    const c = makeStuffAtPath(() => new Coin(), path);
    c.setMass(Quantity.of(0.008, "kg"));
    return c;
  }) as unknown as typeof StuffApi.clone);
}

function ctx(giver: TestGiver, loc: Location, shelf: ConsignmentShelf, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandSource: shelf as never,
    commandText: verb,
    executionId: "t",
    commandId: "t",
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      "<test>",
    ),
  });
}

async function fundedAvatar(path: string, minor: number): Promise<TestGiver> {
  const av = makeStuffAtPath(() => new TestGiver(), path);
  const card = makeStuff(() => new PaymentCard());
  ContainmentApi.move(card as never, av as never);
  await asOwner(av, () => BankingApi.openAccount("goodkin", "goodkin"));
  if (minor > 0) {
    const bank = StuffApi.findByTemplatePath<BankCounter>(BANK)!;
    const cash = await asOwner(av, () =>
      BankingApi.issueCash(av as never, Money.of(minor)),
    );
    await asOwner(av, () => BankingApi.deposit(bank, cash as never));
  }
  return av;
}

describe("Consignment — sell loop over real ownership", () => {
  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    stubClones();
    const reg = makeStuffAtPath(() => new ChattelRegistry(), "/obj/ChattelRegistry");
    await reg.postRegister();
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  function ownedTorch(owner: Stuff, keyword = "torch"): Torch {
    const torch = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords([keyword]);
      return t;
    }, TORCH);
    ContainmentApi.move(torch as never, owner as never);
    return torch;
  }

  it("consign → another player buys → split payout, stamp transfers, conserved", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);

    const alice = await fundedAvatar("/obj/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const aliceAcct = (await BankingApi.primaryAccountIdOf("/obj/Avatar/alice"))!;
    const torch = ownedTorch(alice);
    await asOwner(alice, () => ChattelApi.stamp(torch, alice));

    // Alice consigns the torch for 8.
    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: "torch", ask: "8" },
        ctx(alice, loc, shelf, "consign"),
      ),
    );
    expect(torch.getContainer()).toBe(shelf); // custody → shop
    expect(await ChattelApi.ownerOf(torch)).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/alice",
    }); // ownership stays with Alice
    expect(shelf.activeListingCount("/obj/Avatar/alice")).toBe(1);

    // Bob buys it (Alice is offline — payout is a pure DB read).
    const bob = await fundedAvatar("/obj/Avatar/bob", 100);
    ContainmentApi.move(bob as never, loc as never);
    const bobAcct = (await BankingApi.primaryAccountIdOf("/obj/Avatar/bob"))!;
    const storeAcct = await makeStoreBusiness();

    await asOwner(bob, () =>
      makeStuff(() => new BuyController()).execute({ thing: "torch" }, ctx(bob, loc, shelf, "buy")),
    );

    // commission = round(8 * 0.15) = 1; remainder = 7.
    expect(torch.getContainer()).toBe(bob); // custody → buyer
    expect((await ChattelApi.ownerOf(torch))).toEqual({ kind: "player", templatePath: "/obj/Avatar/bob" }); // stamp → buyer
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(92); // 100 − 8
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(7); // remainder
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(1); // commission
    expect(shelf.activeListingCount("/obj/Avatar/alice")).toBe(0); // listing cleared
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("consign without a bank account nudges; nothing moves", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const broke = makeStuffAtPath(() => new TestGiver(), "/obj/Avatar/broke");
    ContainmentApi.move(broke as never, loc as never);
    const torch = ownedTorch(broke);
    await asOwner(broke, () => ChattelApi.stamp(torch, broke));

    await asOwner(broke, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: "torch", ask: "8" },
        ctx(broke, loc, shelf, "consign"),
      ),
    );
    expect(torch.getContainer()).toBe(broke); // still held
    expect(shelf.activeListingCount("/obj/Avatar/broke")).toBe(0);
  });

  it("the per-consignor cap refuses an over-cap listing", async () => {
    (AppSettings as unknown as { _cached: AppSettings | null })._cached =
      new AppSettings();
    AppSettings.getCached().setValue(AppSettingKeys.retailConsignmentListingCap, "1");

    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const alice = await fundedAvatar("/obj/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const t1 = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords(["torch"]);
      return t;
    }, TORCH);
    ContainmentApi.move(t1 as never, alice as never);
    const t2 = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords(["lantern"]);
      return t;
    }, "/obj/test/Lantern");
    ContainmentApi.move(t2 as never, alice as never);
    await asOwner(alice, () => ChattelApi.stamp(t1, alice));
    await asOwner(alice, () => ChattelApi.stamp(t2, alice));

    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute({ thing: "torch", ask: "8" }, ctx(alice, loc, shelf, "consign")),
    );
    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute({ thing: "lantern", ask: "9" }, ctx(alice, loc, shelf, "consign")),
    );
    // Only the first listing took (cap = 1).
    expect(shelf.activeListingCount("/obj/Avatar/alice")).toBe(1);
    expect(t2.getContainer()).toBe(alice); // the second stayed with Alice
  });

  it("reclaim returns an unsold listing; ownership never changed", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const alice = await fundedAvatar("/obj/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const torch = ownedTorch(alice);
    await asOwner(alice, () => ChattelApi.stamp(torch, alice));

    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute({ thing: "torch", ask: "8" }, ctx(alice, loc, shelf, "consign")),
    );
    expect(torch.getContainer()).toBe(shelf);

    await asOwner(alice, () =>
      makeStuff(() => new ReclaimController()).execute({ thing: "torch" }, ctx(alice, loc, shelf, "reclaim")),
    );
    expect(torch.getContainer()).toBe(alice); // custody back
    expect((await ChattelApi.ownerOf(torch))).toEqual({ kind: "player", templatePath: "/obj/Avatar/alice" });
    expect(shelf.activeListingCount("/obj/Avatar/alice")).toBe(0);
  });
});
