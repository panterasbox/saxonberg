/**
 * BuyController — the general store's buy loop, over real ownership.
 *
 * Proves: `buy <thing>` settles a presented Charge (card AND cash), credits
 * the store account, remits the demo tax, hands the good over, **stamps the
 * buyer as owner**, and decrements the shelf; an unattended (closed) counter
 * refuses. Harness: the shared banking fake + the chattel registry + a
 * direct controller invocation (the `PutController` precedent).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BuyController from "../BuyController";
import Stock from "../../../../lib/retail/Stock";
import Thing from "../../../../lib/stuff/Thing";
import Coin from "../../../../obj/Coin";
import BankCounter from "../../../../lib/banking/BankCounter";
import PaymentCard from "../../../../lib/banking/PaymentCard";
import ChattelRegistry from "../../../ChattelRegistry";
import { EmploymentApi } from "../../../../api/employment";
import BusinessEntity from "../../../../lib/employment/Business";
import { ChattelApi } from "../../../../api/chattel";
import { BankingApi, Money } from "../../../../api/banking";
import { ContainmentApi } from "../../../../api/containment";
import { StuffApi } from "../../../../api/stuff";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { Quantity } from "../../../../lib/quantity";
import { Document } from "../../../../lib/persistence/Document";
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
const STORE = "/domain/terminus/general-store/counter";
const SHELF = "/domain/terminus/general-store/consignment-shelf";

/** The store's Business (operates the counter + shelf; authored custody). */
async function makeStoreBusiness(): Promise<string> {
  const biz = makeStuffAtPath(
    () => new BusinessEntity(),
    "/domain/terminus/general-store/business",
  );
  biz.proprietorPath = "";
  biz.positions = [];
  biz.operatingLocations = [STORE, SHELF];
  biz.banksAt = BankingApi.defaultCustodianBankPath();
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
    const c = makeStuffAtPath(() => new Coin(), path);
    c.setMass(Quantity.of(0.008, "kg"));
    return c;
  }) as unknown as typeof StuffApi.clone);
}

async function bootChattel(): Promise<void> {
  const reg = makeStuffAtPath(
    () => new ChattelRegistry(),
    "/obj/ChattelRegistry",
  );
  await reg.postRegister();
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
    const giver = makeStuffAtPath(() => new TestGiver(), "/obj/Avatar/pat");
    ContainmentApi.move(giver as never, loc as never);
    const card = makeStuff(() => new PaymentCard());
    ContainmentApi.move(card as never, giver as never);
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK);

    // Fund the patron.
    await asOwner(giver, () => BankingApi.openAccount(BANK, "goodkin"));
    const cash = await asOwner(giver, () =>
      BankingApi.issueCash(giver as never, Money.of(300)),
    );
    await asOwner(giver, () => BankingApi.deposit(bank, cash as never));
    const storeAcct = await makeStoreBusiness();

    const { stock, torch } = makeStore({
      attendDurationMs: 0,
      staffingPolicy: "self-service",
      price: 5,
    });

    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute({ thing: "torch" }, makeContext(giver, loc, stock)),
    );

    expect(torch.getContainer()).toBe(giver);
    const owner = await ChattelApi.ownerOf(torch);
    expect(owner?.templatePath).toBe("/obj/Avatar/pat");
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(5);
    expect(stock.onHand(TORCH)).toBe(0);
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("buy by cash: coin-holder settles across the bridge to the store", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/obj/Avatar/cash");
    ContainmentApi.move(giver as never, loc as never);
    // Coin on hand, no card.
    const coins = await asOwner(giver, () =>
      BankingApi.issueCash(giver as never, Money.of(20)),
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
      controller.execute({ thing: "torch" }, makeContext(giver, loc, stock)),
    );

    expect(torch.getContainer()).toBe(giver);
    expect((await ChattelApi.ownerOf(torch))?.templatePath).toBe(
      "/obj/Avatar/cash",
    );
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(5);
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("an unattended (closed) counter refuses; nothing changes hands", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), "/obj/Avatar/nope");
    ContainmentApi.move(giver as never, loc as never);

    const { stock, torch } = makeStore({
      attendDurationMs: 60_000, // not instant → needs a server
      staffingPolicy: "close", // no server on duty → closed
      price: 5,
    });

    const controller = makeStuff(() => new BuyController());
    await asOwner(giver, () =>
      controller.execute({ thing: "torch" }, makeContext(giver, loc, stock)),
    );

    expect(torch.getContainer()).toBe(stock); // still on the shelf
    expect(await ChattelApi.ownerOf(torch)).toBeNull(); // unstamped, unauthored
    expect(stock.onHand(TORCH)).toBe(1);
  });
});
