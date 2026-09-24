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

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BuyController from "../BuyController";
import ConsignController from "../ConsignController";
import ReclaimController from "../ReclaimController";
import { Vessel } from "../../../../../lib/stuff/Vessel";
import { DetailedMixin } from "../../../../../lib/description/Detailed";
import { PersistableMixin } from "../../../../../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../../../../../lib/stuff/PostRegistration";
import { ConsignmentShelfMixin } from "../../../../../lib/retail/Consignment";
import StockBase from "../../../../../lib/retail/Stock";
import Thing from "../../../../../lib/stuff/Thing";
import { StackableMixin } from "../../../../../lib/stuff/Stackable";
import BankCounter from "../../../../thing/BankCounter";
import PaymentCard from "../../../../thing/PaymentCard";
import ChattelRegistry from "../../../ChattelRegistry";
import { EmploymentApi } from "../../../../../api/employment";
import BusinessEntity from "../../../Business";
import { ChattelApi } from "../../../../../api/chattel";
import { Currency, BankingApi, Money } from "../../../../../api/banking";
import { ContainmentApi } from "../../../../../api/containment";
import { StuffApi } from "../../../../../api/stuff";
import { ExecutionContextApi } from "../../../../../api/execution-context";
import { Quantity } from "../../../../../lib/quantity";
import { Document } from "../../../../../lib/persistence/Document";
import { AppSettings, AppSettingKeys } from "../../../../../lib/config/AppSettings";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import { NamedMixin } from "../../../../../lib/description/Named";
import { Idea } from "../../../../../lib/stuff/Idea";
import Location from "../../../../../lib/stuff/Location";
import Provision from "../../../../thing/Provision";
import Material from "../../../../../lib/material/Material";
import { Freshness } from "../../../../../lib/material/Freshness";
import { Creature } from "../../../../../lib/creature/Creature";
import { WorldClockApi } from "../../../../../api/worldclock";
import WorldClockRegistry from "../../../WorldClockRegistry";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import Coin from "../../../../thing/Coin";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../../lib/banking/__tests__/banking-test-harness";

// The brokerage shelf is a composition of kernel mixins; the instanceable
// class ships in `/trade/shopkeeping`, which the kernel may not import.
// The composition line IS the fixture.
class ConsignmentShelf extends PersistableMixin(
  ConsignmentShelfMixin(PostRegistrationMixin(DetailedMixin(Vessel))),
) {}

// The counter mechanism is kernel substrate; the instanceable twin is
// the shopkeeping pack's, which the kernel may not import. A local
// fixture over the base is the whole of what these tests need.
class Stock extends StockBase {}

const BANK = "/world/terminus/counting-houses/bank-counter";
const SHELF = "/world/terminus/general-store/consignment-shelf";

/** The store's Business (operates the shelf; authored custody). */
async function makeStoreBusiness(): Promise<string> {
  const biz = makeStuffAtPath(
    () => new BusinessEntity(),
    "/world/terminus/general-store/business",
  );
  biz.proprietorPath = "";
  biz.positions = [];
  biz.operatingLocations = [SHELF];
  biz.banksAt = BankingApi.defaultCustodianBank();
  return EmploymentApi.operatingAccountOf(biz);
}
const TORCH = "/obj/test/Torch";
const BALE = "/obj/test/Bale";

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = "TestGiver";
}

class Torch extends Thing {}

/** A fungible good — the shape a bolt of cloth has. */
class Bale extends StackableMixin(Thing) {
  static _mixinName = "Bale";
}

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "consign.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function stubClones(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    const c = makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, path);
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
  await asOwner(av, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
  if (minor > 0) {
    const bank = StuffApi.findByTemplatePath<BankCounter>(BANK)!;
    const cash = await asOwner(av, () =>
      BankingApi.issueCash(av as never, Money.of(minor, BankingApi.compactCurrency())),
    );
    await asOwner(av, () => bank.deposit(cash as never));
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
    const reg = makeStuffAtPath(() => new ChattelRegistry(), "/platform/idea/ChattelRegistry");
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

    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const aliceAcct = (await BankingApi.primaryAccountIdOf("/platform/agent/Avatar/alice"))!;
    const torch = ownedTorch(alice);
    await asOwner(alice, () => torch.stampChattel(alice));

    // Alice consigns the torch for 8.
    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: torch as never, raw: "torch" }, ask: "8" , shelf: { stuff: shelf as never, raw: "shelf" } },
        ctx(alice, loc, shelf, "consign"),
      ),
    );
    expect(torch.getContainer()).toBe(shelf); // custody → shop
    expect(await torch.chattelOwner()).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/alice",
    }); // ownership stays with Alice
    expect(shelf.activeListingCount("/platform/agent/Avatar/alice")).toBe(1);

    // Bob buys it (Alice is offline — payout is a pure DB read).
    const bob = await fundedAvatar("/platform/agent/Avatar/bob", 100);
    ContainmentApi.move(bob as never, loc as never);
    const bobAcct = (await BankingApi.primaryAccountIdOf("/platform/agent/Avatar/bob"))!;
    const storeAcct = await makeStoreBusiness();

    await asOwner(bob, () =>
      makeStuff(() => new BuyController()).execute({ thing: "torch", counter: { stuff: shelf as never, raw: "counter" } }, ctx(bob, loc, shelf, "buy")),
    );

    // commission = round(8 * 0.15) = 1; remainder = 7.
    expect(torch.getContainer()).toBe(bob); // custody → buyer
    expect((await torch.chattelOwner())).toEqual({ kind: "player", templatePath: "/platform/agent/Avatar/bob" }); // stamp → buyer
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(92); // 100 − 8
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(7); // remainder
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(1); // commission
    expect(shelf.activeListingCount("/platform/agent/Avatar/alice")).toBe(0); // listing cleared
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });

  describe("⭐ no shelf lists what has turned (fishing A4)", () => {
    let fleshSeq = 0;
    function flesh(): Material {
      fleshSeq += 1;
      return makeStuffAtPath(() => {
        const m = new Material();
        m.setName("test-flesh");
        m.setSpoilActivationEnergy(Quantity.of(60_000, "J/mol"));
        m.setWaterActivity(0.99);
        return m;
      }, `/test/retail/flesh-${fleshSeq}`) as unknown as Material;
    }
    function provision(owner: Stuff, load: number): Provision {
      const p = makeStuffAtPath(() => {
        const p = new Provision();
        p.setKeywords(["loaf"]);
        p.setMass(Quantity.of(1, "kg"));
        p.setMaterial(flesh());
        p.setStampedTemperatureK(293);
        p.setLastAmbientK(293);
        return p;
      }, `/test/retail/loaf-${fleshSeq}`);
      p.setMicrobialLoad(load);
      ContainmentApi.move(p as never, owner as never);
      return p;
    }
    async function consign(who: TestGiver, loc: Location, shelf: ConsignmentShelf, item: Stuff, raw: string) {
      const c = ctx(who, loc, shelf, "consign");
      await asOwner(who, () =>
        makeStuff(() => new ConsignController()).execute(
          { thing: { stuff: item as never, raw }, ask: "4", shelf: { stuff: shelf as never, raw: "shelf" } },
          c,
        ),
      );
      return c;
    }

    it("a fresh provision lists; a spoiled one is refused `turned` and stays in hand", async () => {
      const loc = makeStuff(() => new Location());
      const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
      ContainmentApi.move(shelf as never, loc as never);
      const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
      ContainmentApi.move(alice as never, loc as never);

      const fresh = provision(alice, 0);
      await asOwner(alice, () => fresh.stampChattel(alice));
      await consign(alice, loc, shelf, fresh, "loaf");
      expect(fresh.getContainer()).toBe(shelf);

      const bad = provision(alice, 0.9);
      await asOwner(alice, () => bad.stampChattel(alice));
      expect(bad.getFreshnessBand()).not.toBe("fresh");
      const c = await consign(alice, loc, shelf, bad, "loaf");
      expect(bad.getContainer()).toBe(alice);
      expect(c.getNotes().some((n) => n.kind === "controller-rejected" && (n as { reason?: string }).reason === "turned")).toBe(true);
    });

    it("a LIVE body lists; a body whose flesh has turned is refused", async () => {
      WorldClockApi._resetForTesting();
      let real = 100_000;
      WorldClockApi._setNowProviderForTesting(() => real);
      makeStuffAtPath(() => new WorldClockRegistry(), "/platform/idea/WorldClockRegistry");
      const loc = makeStuff(() => new Location());
      const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
      ContainmentApi.move(shelf as never, loc as never);
      const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
      ContainmentApi.move(alice as never, loc as never);

      const fish = makeStuffAtPath(() => {
        const c = new Creature();
        c.setKeywords(["fish"]);
        c.setMaterial(flesh());
        return c;
      }, "/test/retail/fish");
      ContainmentApi.move(fish as never, alice as never);
      await asOwner(alice, () => fish.stampChattel(alice));
      // Alive: fresh by definition.
      await consign(alice, loc, shelf, fish, "fish");
      expect(fish.getContainer()).toBe(shelf);

      const dead = makeStuffAtPath(() => {
        const c = new Creature();
        c.setKeywords(["fish"]);
        c.setMaterial(flesh());
        return c;
      }, "/test/retail/dead-fish");
      ContainmentApi.move(dead as never, alice as never);
      await asOwner(alice, () => dead.stampChattel(alice));
      dead.setLifecycleState("dead");
      dead.markDeceasedAt(WorldClockApi.getNow().rawValue());
      real += (2 * 86_400 / 12) * 1000; // two game-days at the default scale
      expect(Freshness.bandFor(dead.freshnessLoad())).not.toBe("fresh");
      const c = await consign(alice, loc, shelf, dead, "fish");
      expect(dead.getContainer()).toBe(alice);
      expect(c.getNotes().some((n) => n.kind === "controller-rejected" && (n as { reason?: string }).reason === "turned")).toBe(true);
      WorldClockApi._resetForTesting();
    });
  });

  it("consign without a bank account nudges; nothing moves", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const broke = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/broke");
    ContainmentApi.move(broke as never, loc as never);
    const torch = ownedTorch(broke);
    await asOwner(broke, () => torch.stampChattel(broke));

    await asOwner(broke, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: torch as never, raw: "torch" }, ask: "8" , shelf: { stuff: shelf as never, raw: "shelf" } },
        ctx(broke, loc, shelf, "consign"),
      ),
    );
    expect(torch.getContainer()).toBe(broke); // still held
    expect(shelf.activeListingCount("/platform/agent/Avatar/broke")).toBe(0);
  });

  it("the per-consignor cap refuses an over-cap listing", async () => {
    (AppSettings as unknown as { _cached: AppSettings | null })._cached =
      new AppSettings();
    AppSettings.getCached().setValue(AppSettingKeys.retailConsignmentListingCap, "1");

    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
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
    await asOwner(alice, () => t1.stampChattel(alice));
    await asOwner(alice, () => t2.stampChattel(alice));

    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute({ thing: { stuff: t1 as never, raw: "torch" }, ask: "8" , shelf: { stuff: shelf as never, raw: "shelf" } }, ctx(alice, loc, shelf, "consign")),
    );
    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute({ thing: { stuff: t2 as never, raw: "lantern" }, ask: "9" , shelf: { stuff: shelf as never, raw: "shelf" } }, ctx(alice, loc, shelf, "consign")),
    );
    // Only the first listing took (cap = 1).
    expect(shelf.activeListingCount("/platform/agent/Avatar/alice")).toBe(1);
    expect(t2.getContainer()).toBe(alice); // the second stayed with Alice
  });

  it("⭐ a shelf's authored cap OVERRIDES the global — and only that shelf's (farming A6)", async () => {
    (AppSettings as unknown as { _cached: AppSettings | null })._cached =
      new AppSettings();
    AppSettings.getCached().setValue(AppSettingKeys.retailConsignmentListingCap, "1");

    const loc = makeStuff(() => new Location());
    // The market stall authors a generous cap (loose produce = dozens of
    // listings per seller); the plain shelf beside it keeps the dial.
    const stall = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    stall.setListingCapOverride(3);
    ContainmentApi.move(stall as never, loc as never);
    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const goods = ["torch", "lantern", "whetstone"].map((kw, i) => {
      const t = makeStuffAtPath(() => {
        const g = new Torch();
        g.setKeywords([kw]);
        return g;
      }, `/obj/test/Cap-${i}`);
      ContainmentApi.move(t as never, alice as never);
      return t;
    });
    for (const g of goods) await asOwner(alice, () => g.stampChattel(alice));

    // ⭐ The GOOD is bound by the view now, so the fixture names the
    // stuff the binder would have resolved rather than the keyword it
    // would have resolved it from.
    for (const [i, kw] of ["torch", "lantern", "whetstone"].entries()) {
      await asOwner(alice, () =>
        makeStuff(() => new ConsignController()).execute(
          {
            thing: { stuff: goods[i] as never, raw: kw },
            ask: "5",
            shelf: { stuff: stall as never, raw: "shelf" },
          },
          ctx(alice, loc, stall, "consign"),
        ),
      );
    }
    // All three took — the stall's authored 3 outranks the global 1.
    expect(stall.activeListingCount("/platform/agent/Avatar/alice")).toBe(3);

    // A sibling shelf with NO override still rides the global cap.
    const plain = makeStuffAtPath(
      () => new ConsignmentShelf(),
      "/world/terminus/general-store/plain-shelf",
    );
    ContainmentApi.move(plain as never, loc as never);
    const extra = makeStuffAtPath(() => {
      const g = new Torch();
      g.setKeywords(["candle"]);
      return g;
    }, "/obj/test/Cap-x");
    const extra2 = makeStuffAtPath(() => {
      const g = new Torch();
      g.setKeywords(["taper"]);
      return g;
    }, "/obj/test/Cap-y");
    ContainmentApi.move(extra as never, alice as never);
    ContainmentApi.move(extra2 as never, alice as never);
    await asOwner(alice, () => extra.stampChattel(alice));
    await asOwner(alice, () => extra2.stampChattel(alice));
    for (const [i, kw] of ["candle", "taper"].entries()) {
      await asOwner(alice, () =>
        makeStuff(() => new ConsignController()).execute(
          {
            thing: { stuff: [extra, extra2][i] as never, raw: kw },
            ask: "5",
            shelf: { stuff: plain as never, raw: "shelf" },
          },
          ctx(alice, loc, plain, "consign"),
        ),
      );
    }
    expect(plain.activeListingCount("/platform/agent/Avatar/alice")).toBe(1);
  });

  it("reclaim returns an unsold listing; ownership never changed", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const torch = ownedTorch(alice);
    await asOwner(alice, () => torch.stampChattel(alice));

    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute({ thing: { stuff: torch as never, raw: "torch" }, ask: "8" , shelf: { stuff: shelf as never, raw: "shelf" } }, ctx(alice, loc, shelf, "consign")),
    );
    expect(torch.getContainer()).toBe(shelf);

    await asOwner(alice, () =>
      makeStuff(() => new ReclaimController()).execute({ thing: "torch", shelf: { stuff: shelf as never, raw: "shelf" } }, ctx(alice, loc, shelf, "reclaim")),
    );
    expect(torch.getContainer()).toBe(alice); // custody back
    expect((await torch.chattelOwner())).toEqual({ kind: "player", templatePath: "/platform/agent/Avatar/alice" });
    expect(shelf.activeListingCount("/platform/agent/Avatar/alice")).toBe(0);
  });

  /*
   * ⭐⭐ A STACK GOES UP A LOT AT A TIME.
   *
   * `consign` refused every `Stackable` outright — a true statement
   * about a stack ("owned-by-possession") and the wrong conclusion
   * about a sale. A bolt of cloth is a stack ON PURPOSE (two dye lots
   * must never merge), so the rule meant a mill could weave cloth it
   * could never sell: a live drive of the textile chain ended on
   * `controller-rejected:fungible(bolt)`.
   *
   * A LOT is a discrete good. It carries the stack's identity fields
   * and gets a chattel id of its own the moment it is listed.
   */
  // ⚠ A UNIQUE path per bale: `makeStuffAtPath` registers one instance
  // per path, so a second bale at the same path destroys the first.
  let baleSeq = 0;
  function ownedBale(owner: Stuff, quantity: number): Bale {
    const path = `${BALE}${(baleSeq += 1)}`;
    const bale = makeStuffAtPath(() => {
      const b = new Bale();
      b.setKeywords(["bale"]);
      return b;
    }, path);
    bale.setQuantity(quantity);
    ContainmentApi.move(bale as never, owner as never);
    return bale;
  }

  it("⭐⭐ consigns ONE unit off a stack and leaves the rest in hand", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    const bale = ownedBale(alice, 5);

    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: bale as never, raw: "bale" }, ask: "7" , shelf: { stuff: shelf as never, raw: "shelf" } },
        ctx(alice, loc, shelf, "consign"),
      ),
    );

    // The stack stays with Alice, one short.
    expect(bale.getQuantity()).toBe(4);
    expect(bale.getContainer()).toBe(alice);
    // …and a one-unit lot is on the shelf, listed.
    expect(shelf.activeListingCount("/platform/agent/Avatar/alice")).toBe(1);
    const lot = (shelf.getContents() as Stuff[]).find(
      (c) => (c.getTemplatePath() ?? "").startsWith(BALE),
    ) as Bale | undefined;
    expect(lot, "a lot on the shelf").toBeTruthy();
    expect(lot!.getQuantity()).toBe(1);
    expect(lot).not.toBe(bale);
    // ⭐ The lot is a THING now: its own chattel id, owned by the consignor.
    expect(lot!.getChattelId()).toBeTruthy();
    expect(lot!.getChattelId()).not.toBe(bale.getChattelId());
    expect(await lot!.chattelOwner()).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/alice",
    });
  });

  it("⭐⭐ a TITLED lot does not merge — that is what makes the rule safe", async () => {
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    const bale = ownedBale(alice, 5);

    // (That untitled stacks still merge normally is the Stackable
    // suite's own `canMergeWith` coverage — the veto below is the only
    // new reason a merge can be refused.)

    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: bale as never, raw: "bale" }, ask: "7" , shelf: { stuff: shelf as never, raw: "shelf" } },
        ctx(alice, loc, shelf, "consign"),
      ),
    );
    const lot = (shelf.getContents() as Stuff[]).find(
      (c) => (c.getTemplatePath() ?? "").startsWith(BALE),
    ) as Bale;

    // The lot has an owner in the registry now, so folding it into a
    // stack would silently destroy a title. It refuses, both ways.
    expect(lot.getChattelId()).toBeTruthy();
    expect(lot.canMergeWith(bale as unknown as Stuff)).toBe(false);
    expect(bale.canMergeWith(lot as unknown as Stuff)).toBe(false);
  });

  it("⚠ a STACK still cannot be stamped — only a lot of one", async () => {
    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    const stack = ownedBale(alice, 4);
    const stamped = await asOwner(alice, () => stack.stampChattel(alice));
    expect(stamped.ok).toBe(false);
    expect(stack.getChattelId()).toBe("");

    const single = ownedBale(alice, 1);
    const ok = await asOwner(alice, () => single.stampChattel(alice));
    expect(ok.ok).toBe(true);
    expect(single.getChattelId()).toBeTruthy();
  });

  it("⚠⚠ a refused consignment never splits the stack", async () => {
    // The gates run BEFORE the split for exactly this reason: a stack
    // divided by a consignment that then declines is a stack the caller
    // has to put back together. `broke` holds no account.
    const loc = makeStuff(() => new Location());
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const broke = makeStuffAtPath(
      () => new TestGiver(),
      "/platform/agent/Avatar/broke",
    );
    ContainmentApi.move(broke as never, loc as never);
    const bale = ownedBale(broke as unknown as Stuff, 4);

    await asOwner(broke as unknown as Stuff, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: bale as never, raw: "bale" }, ask: "9" , shelf: { stuff: shelf as never, raw: "shelf" } },
        ctx(broke, loc, shelf, "consign"),
      ),
    );

    expect(bale.getQuantity()).toBe(4);
    expect(bale.getContainer()).toBe(broke);
    expect(shelf.activeListingCount("/platform/agent/Avatar/broke")).toBe(0);
  });

  /**
   * ⭐ Rung 0 — supplier terms (economic bootstrap D11). At a
   * `purchasing: terms` counter the consignor's `--ask` is the PRICE the
   * shop owes at sale; the shop prices the good (the supplier's price plus
   * the Schedule's margin until `house price` says otherwise) and keeps
   * the margin. A sale posts TWICE: the buyer pays the shop's ask, then the
   * shop pays its supplier — a `terms` leg the ladder's rung-1 gate counts.
   */
  it("terms: the buyer pays the shop's ask, the shop pays its supplier, title transfers, conserved", async () => {
    const STOCK = "/test/consignment/thing/terms-counter";
    const loc = makeStuff(() => new Location());
    const counter = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [];
      s.prices = {};
      s.discipline = "scrum";
      s.attendDurationMs = 0;
      s.staffingPolicy = "self-service";
      s.serverPositionKeys = [];
      s.setPurchasing("terms");
      return s;
    }, STOCK);
    ContainmentApi.move(counter as never, loc as never);
    const biz = makeStuffAtPath(() => new BusinessEntity(), "/test/consignment/idea/shop");
    biz.proprietorPath = "";
    biz.positions = [];
    biz.operatingLocations = [STOCK];
    // ⚠ Literal, not `defaultCustodianBank()`: the cap test above replaces
    // the cached AppSettings and the seeded default goes with it.
    biz.banksAt = "goodkin";
    const storeAcct = await EmploymentApi.operatingAccountOf(biz);

    const alice = await fundedAvatar("/platform/agent/Avatar/alice", 0);
    ContainmentApi.move(alice as never, loc as never);
    const aliceAcct = (await BankingApi.primaryAccountIdOf("/platform/agent/Avatar/alice"))!;
    const torch = ownedTorch(alice);
    await asOwner(alice, () => torch.stampChattel(alice));

    // Alice leaves the torch on the shop's terms at 8 — her PRICE.
    const consignCtx = ctx(alice, loc, counter as never, "consign");
    await asOwner(alice, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: torch as never, raw: "torch" }, ask: "8", shelf: { stuff: counter as never, raw: "counter" } },
        consignCtx,
      ),
    );
    expect(torch.getContainer()).toBe(counter);
    expect(counter.listingFor(torch.getChattelId())?.basis).toBe("terms");
    // The SHOP's ask: 8 × (1 + 0.25) = 10.
    expect(counter.priceFor(TORCH)).toBe(10);
    expect(counter.termsLineFor(torch)).toMatch(/Held on .* terms until sold/);

    const bob = await fundedAvatar("/platform/agent/Avatar/bob", 100);
    ContainmentApi.move(bob as never, loc as never);
    const bobAcct = (await BankingApi.primaryAccountIdOf("/platform/agent/Avatar/bob"))!;
    await asOwner(bob, () =>
      makeStuff(() => new BuyController()).execute(
        { thing: "torch", counter: { stuff: counter as never, raw: "counter" } },
        ctx(bob, loc, counter as never, "buy"),
      ),
    );

    expect(torch.getContainer()).toBe(bob);
    expect(await torch.chattelOwner()).toEqual({ kind: "player", templatePath: "/platform/agent/Avatar/bob" });
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(90); // the shop's ask
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(8); // her price, paid by the shop
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(2); // the margin
    expect(counter.listingFor(torch.getChattelId())).toBeNull();
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });
});
