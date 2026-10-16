/**
 * BuyController — the general store's buy loop, over real ownership.
 *
 * Proves: `buy <thing>` settles a presented Charge (card AND cash), credits
 * the store account, remits the demo tax, hands the good over, **stamps the
 * buyer as owner**, and decrements the shelf; an unattended (closed) counter
 * refuses. Harness: the shared banking fake + the chattel registry + a
 * direct controller invocation (the `PutController` precedent).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BuyController from "../BuyController";
import StockBase from "../../../../../lib/retail/Stock";
import Good from "../../../../../lib/stuff/Good";
import Coin from "../../../../thing/Coin";
import PlantPot, { PLANT_SLOT } from "../../../../thing/PlantPot";
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
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import { NamedMixin } from "../../../../../lib/description/Named";
import { StackableMixin } from "../../../../../lib/stuff/Stackable";
import { StackableApi } from "../../../../../api/stackable";
import { Idea } from "../../../../../lib/stuff/Idea";
import Location from "../../../../../lib/stuff/Location";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import type { Chattel } from '../../../../../lib/chattel/Chattel';
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../../lib/banking/__tests__/banking-test-harness";
// The counter mechanism is kernel substrate; the instanceable twin is
// the shopkeeping pack's, which the kernel may not import. A local
// fixture over the base is the whole of what these tests need.
class Stock extends StockBase {}

const BANK = "/world/terminus/counting-houses/bank-counter";
const STORE = "/world/terminus/general-store/counter";
const SHELF = "/world/terminus/general-store/consignment-shelf";

/** The store's Business (operates the counter + shelf; authored custody). */
async function makeStoreBusiness(): Promise<string> {
  const biz = makeStuffAtPath(
    () => new BusinessEntity(),
    "/world/terminus/general-store/business",
  );
  biz.proprietorPath = "";
  biz.positions = [];
  biz.operatingLocations = [STORE, SHELF];
  biz.banksAt = BankingApi.defaultCustodianBank();
  return EmploymentApi.operatingAccountOf(biz);
}
const TORCH = "/obj/test/Torch";
const POT = "/trade/farming/thing/pot/large";

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = "TestGiver";
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

class Torch extends Good {}

/** A stackable shelf good — a heap of thirty is ONE object. */
class Stave extends StackableMixin(Good) {
  static _mixinName = "Stave";
}
const STAVE = "/obj/test/Stave";

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "buy.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function stubClones(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    if (path === TORCH) {
      const t = makeStuffAtPath(() => new Torch(), path);
      t.setKeywords(["torch"]);
      return t;
    }
    if (path === POT) return makePot(path);
    if (path === STAVE) {
      const st = makeStuffAtPath(() => new Stave(), path);
      st.setKeywords(["stave"]);
      return st;
    }
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

async function bootChattel(): Promise<void> {
  const reg = makeStuffAtPath(
    () => new ChattelRegistry(),
    "/platform/idea/ChattelRegistry",
  );
  await reg.onCreate();
}

function makeStore(opts: {
  attendDurationMs: number;
  staffingPolicy: "close" | "self-service";
  price: number;
}): { stock: Stock; torch: Torch } {
  const stock = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [{ itemTemplatePath: TORCH, par: 1 }];
    s.setPrice(TORCH, opts.price);
    s.discipline = "line";
    s.attendDurationMs = opts.attendDurationMs;
    s.staffingPolicy = opts.staffingPolicy;
    s.serverPositionKeys = ["clerk"];
    return s;
  }, STORE);
  const torch = makeStuffAtPath(() => {
    const t = new Torch();
    t.setKeywords(["torch"]);
    return t;
  }, TORCH);
  ContainmentApi.move(torch, stock as never);
  return { stock, torch };
}

/** A real `/trade/farming/thing/pot/large`-shaped good: Slotted + a bulk soil interior. */
function makePot(path: string): PlantPot {
  const pot = makeStuffAtPath(() => new PlantPot(), path);
  pot.setKeywords(["pot", "large pot"]);
  pot.interiorBulk = true;
  pot.setInteriorCapacity(Quantity.of(3, "L"));
  pot.setStaticSlots([
    { name: PLANT_SLOT, accepts: "SlottableMixin", capacity: 1 },
  ]);
  return pot;
}

/** A counter stocking the gardening line's headline good. */
function makePotStore(price: number): { stock: Stock; pot: PlantPot } {
  const stock = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [{ itemTemplatePath: POT, par: 1 }];
    s.setPrice(POT, price);
    s.discipline = "line";
    s.attendDurationMs = 0;
    s.staffingPolicy = "self-service";
    s.serverPositionKeys = ["clerk"];
    return s;
  }, STORE);
  const pot = makePot(POT);
  ContainmentApi.move(pot as never, stock as never);
  return { stock, pot };
}

function makeContext(
  giver: TestGiver,
  location: Location,
  stock: Stock,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandSource: stock as never,
    commandText: "buy torch",
    executionId: "t",
    commandId: "t",
    verb: "buy",
    command: CommandDefinition.fromYaml(
      "verbs: [buy]\ncontroller: NoopController\ndescription: stub\n",
      "<test>",
    ),
  });
}

describe("BuyController — buy that stamps", () => {
  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    stubClones();
    await bootChattel();
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it("buy by card: settles, credits the store, hands over + stamps, decrements", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/pat");
    ContainmentApi.move(giver as never, loc as never);
    const card = makeStuff(() => new PaymentCard());
    ContainmentApi.move(card as never, giver as never);
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);

    // Fund the patron.
    await asOwner(giver, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    const cash = await asOwner(giver, () =>
      BankingApi.issueCash(giver as never, Money.of(300, BankingApi.compactCurrency())),
    );
    await asOwner(giver, () => bank.deposit(cash as never));
    const storeAcct = await makeStoreBusiness();

    const { stock, torch } = makeStore({
      attendDurationMs: 0,
      staffingPolicy: "self-service",
      price: 5,
    });

    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute(
        // ⚠ A controller test skips the BINDER, so the model carries what
        // `buy.yaml` would have bound — the counter is a declared arg now.
        { thing: "torch", counter: { stuff: stock as never, raw: "counter" } },
        makeContext(giver, loc, stock),
      ),
    );

    expect(torch.getContainer()).toBe(giver);
    const owner = await torch.chattelOwner();
    expect(owner).toEqual({ kind: "player", templatePath: "/platform/agent/Avatar/pat" });
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(5);
    expect(stock.onHand(TORCH)).toBe(0);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });

  it("⭐ a heap on the shelf sells ONE piece at the piece price (the assembly drive)", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/pat");
    ContainmentApi.move(giver as never, loc as never);
    const card = makeStuff(() => new PaymentCard());
    ContainmentApi.move(card as never, giver as never);
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);
    await asOwner(giver, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    const cash = await asOwner(giver, () =>
      BankingApi.issueCash(giver as never, Money.of(300, BankingApi.compactCurrency())),
    );
    await asOwner(giver, () => bank.deposit(cash as never));
    const storeAcct = await makeStoreBusiness();
    const stock = makeStuffAtPath(() => {
      const st = new Stock();
      st.stockLines = [{ itemTemplatePath: STAVE, par: 30 }];
      st.setPrice(STAVE, 2);
      st.discipline = "line";
      st.attendDurationMs = 0;
      st.staffingPolicy = "self-service";
      st.serverPositionKeys = ["clerk"];
      return st;
    }, STORE);
    const heap = makeStuffAtPath(() => new Stave(), STAVE);
    heap.setKeywords(["stave"]);
    heap.setQuantity(30);
    ContainmentApi.move(heap as never, stock as never);

    StackableApi.installMergeOnArrival();
    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute(
        { thing: "stave", counter: { stuff: stock as never, raw: "counter" } },
        makeContext(giver, loc, stock),
      ),
    );

    expect(heap.getContainer()).toBe(stock);
    expect(stock.onHand(STAVE)).toBe(29);
    const bought = giver.getContents().filter((c) => c !== card);
    expect(bought).toHaveLength(1);
    expect((bought[0] as unknown as Stave).getQuantity()).toBe(1);
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(2);

    // ⚠ A bought piece is TITLED, and a titled lot does not merge — the
    // second stave arrives as its own piece beside the first.
    await asOwner(giver, () =>
      controller.execute(
        { thing: "stave", counter: { stuff: stock as never, raw: "counter" } },
        makeContext(giver, loc, stock),
      ),
    );
    const after = giver.getContents().filter((c) => c !== card);
    expect(after).toHaveLength(2);
    expect(after.every((c) => (c as unknown as Stave).getQuantity() === 1)).toBe(true);
    expect(stock.onHand(STAVE)).toBe(28);
  });

  it("⭐ a broke buyer at a heap is told the price of ONE piece, not the heap (the browser walk)", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/broke");
    ContainmentApi.move(giver as never, loc as never);
    await makeStoreBusiness();
    const stock = makeStuffAtPath(() => {
      const st = new Stock();
      st.stockLines = [{ itemTemplatePath: STAVE, par: 30 }];
      st.setPrice(STAVE, 2);
      st.discipline = "line";
      st.attendDurationMs = 0;
      st.staffingPolicy = "self-service";
      st.serverPositionKeys = ["clerk"];
      return st;
    }, STORE);
    const heap = makeStuffAtPath(() => new Stave(), STAVE);
    heap.setKeywords(["stave"]);
    heap.setShortDescription("stave");
    heap.setQuantity(30);
    ContainmentApi.move(heap as never, stock as never);
    const ctx = makeContext(giver, loc, stock);
    await asOwner(giver, () =>
      makeStuff(() => new BuyController()).execute(
        { thing: "stave", counter: { stuff: stock as never, raw: "counter" } },
        ctx,
      ),
    );
    const reason = ctx
      .getNotes()
      .find((n) => n.kind === "controller-rejected") as { reason?: string } | undefined;
    expect(reason?.reason).toBe("insufficient-funds");
    const said = JSON.stringify(giver.received);
    expect(said).toMatch(/can't cover a stave/);
    expect(said).not.toMatch(/30 staves/);
    expect(stock.onHand(STAVE)).toBe(30);
  });

  it("buy by cash: coin-holder settles across the bridge to the store", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/cash");
    ContainmentApi.move(giver as never, loc as never);
    // Coin on hand, no card.
    const coins = await asOwner(giver, () =>
      BankingApi.issueCash(giver as never, Money.of(20, BankingApi.compactCurrency())),
    );
    void coins;
    const storeAcct = await makeStoreBusiness();

    const { stock, torch } = makeStore({
      attendDurationMs: 0,
      staffingPolicy: "self-service",
      price: 5,
    });

    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute(
        // ⚠ A controller test skips the BINDER, so the model carries what
        // `buy.yaml` would have bound — the counter is a declared arg now.
        { thing: "torch", counter: { stuff: stock as never, raw: "counter" } },
        makeContext(giver, loc, stock),
      ),
    );

    expect(torch.getContainer()).toBe(giver);
    expect(await torch.chattelOwner()).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/cash",
    });
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(5);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });

  it("the gardening line buys like any other good — a pot changes hands, stamped", async () => {
    // Husbandry phase 1 stocks the pots / soil / seed from shared `/obj/`
    // templates rather than store-local `goods/` copies. That is a stock-line
    // path difference and nothing more, so the shipped buy loop has to carry
    // them unchanged — including the chattel stamp, which is what makes the
    // pot the buyer's.
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/gardener");
    ContainmentApi.move(giver as never, loc as never);
    const card = makeStuff(() => new PaymentCard());
    ContainmentApi.move(card as never, giver as never);
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);
    await asOwner(giver, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
    const cash = await asOwner(giver, () =>
      BankingApi.issueCash(giver as never, Money.of(300, BankingApi.compactCurrency())),
    );
    await asOwner(giver, () => bank.deposit(cash as never));
    const storeAcct = await makeStoreBusiness();

    // The shipped price of `/trade/farming/thing/pot/large` — a real but reachable purchase
    // against the 20-credit arrival stipend.
    const { stock, pot } = makePotStore(8);

    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute(
        // ⚠ A controller test skips the BINDER, so the model carries what
        // `buy.yaml` would have bound — the counter is a declared arg now.
        { thing: "pot", counter: { stuff: stock as never, raw: "counter" } },
        makeContext(giver, loc, stock),
      ),
    );

    expect(pot.getContainer()).toBe(giver);
    const owner = await (pot as unknown as Stuff & Chattel).chattelOwner();
    expect(owner).toEqual({ kind: "player", templatePath: "/platform/agent/Avatar/gardener" });
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(8);
    expect(stock.onHand(POT)).toBe(0);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
    // …and it is a working pot, not a prop: empty of soil, one plant slot.
    expect(pot.hasSoil()).toBe(false);
    expect(pot.getSlotNames()).toContain(PLANT_SLOT);
  });

  it("an unattended (closed) counter refuses; nothing changes hands", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/nope");
    ContainmentApi.move(giver as never, loc as never);

    const { stock, torch } = makeStore({
      attendDurationMs: 60_000, // not instant → needs a server
      staffingPolicy: "close", // no server on duty → closed
      price: 5,
    });

    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute(
        // ⚠ A controller test skips the BINDER, so the model carries what
        // `buy.yaml` would have bound — the counter is a declared arg now.
        { thing: "torch", counter: { stuff: stock as never, raw: "counter" } },
        makeContext(giver, loc, stock),
      ),
    );

    expect(torch.getContainer()).toBe(stock); // still on the shelf
    expect(await torch.chattelOwner()).toBeNull(); // unstamped, unauthored
    expect(stock.onHand(TORCH)).toBe(1);
  });

  it("⭐ a bare shelf is SOLD OUT, not 'isn't for sale' — the counter lists what it carries (the fishing live drive)", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/platform/agent/Avatar/bare");
    ContainmentApi.move(giver as never, loc as never);
    const { stock, torch } = makeStore({
      attendDurationMs: 0,
      staffingPolicy: "self-service",
      price: 5,
    });
    // The line is carried; the shelf is empty (somebody bought the last one).
    StuffApi.destruct(torch);
    expect(stock.onHand(TORCH)).toBe(0);
    expect(stock.carriesLine("torch")).toBe(true);
    expect(stock.carriesLine("harpsichord")).toBe(false);

    const controller = makeStuff(() => new BuyController());
    const ctx = makeContext(giver, loc, stock);
    await asOwner(giver, () =>
      controller.execute(
        { thing: "torch", counter: { stuff: stock as never, raw: "counter" } },
        ctx,
      ),
    );
    const reason = ctx
      .getNotes()
      .find((n) => n.kind === "controller-rejected") as { reason?: string } | undefined;
    expect(reason?.reason).toBe("sold-out");
  });
});
