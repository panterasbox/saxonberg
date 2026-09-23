/**
 * The house account in the wallet — libations D6.
 *
 * ⭐ *The wallet's active account is the principal you trade as.* Proves:
 * `buysFor` over a purchasing position and a proprietor; `wallet use
 * house` links + activates the business's operating account and refuses a
 * non-holder; `buy` with the house account active debits the business and
 * stamps the chattel `{ organization }`; a personal account stamps the
 * player (the named regression); `quit` unlinks and the next `buy` settles
 * personally; `consign` as the house records the business as consignor
 * and a resale splits to its operating account; `house` refuses a
 * non-staff giver. Harness: the shared banking fake + the chattel
 * registry + direct controller invocation (the `BuyController` precedent).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BuyController from "../../retail/BuyController";
import ConsignController from "../../retail/ConsignController";
import ReclaimController from "../../retail/ReclaimController";
import WalletController from "../WalletController";
import HouseController from "../HouseController";
import QuitController from "../../employment/QuitController";
import StockBase from "../../../../../lib/retail/Stock";
import { Vessel } from "../../../../../lib/stuff/Vessel";
import { DetailedMixin } from "../../../../../lib/description/Detailed";
import { PersistableMixin } from "../../../../../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../../../../../lib/stuff/PostRegistration";
import { ConsignmentShelfMixin } from "../../../../../lib/retail/Consignment";
import Thing from "../../../../../lib/stuff/Thing";
import Coin from "../../../../thing/Coin";
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
import { EmployedMixin } from "../../../../../lib/employment/Employed";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import { NamedMixin } from "../../../../../lib/description/Named";
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

const BANK = "/stuff/test/bank-counter";
const STORE = "/stuff/test/store/counter";
const SHELF = "/stuff/test/store/consignment-shelf";
const STORE_BIZ = "/stuff/test/store/business";
const BAR_BIZ = "/stuff/test/bar/business";
const TORCH = "/stuff/test/Torch";

class TestGiver extends EmployedMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
  ),
) {
  static _mixinName = "TestGiver";
}

class Torch extends Thing {}

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "house-account.test", () => {
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

/** The store's Business — the seller; operates the counter + shelf. */
async function makeStoreBusiness(): Promise<string> {
  const biz = makeStuffAtPath(() => new BusinessEntity(), STORE_BIZ);
  biz.proprietorPath = "";
  biz.positions = [];
  biz.operatingLocations = [STORE, SHELF];
  biz.banksAt = BankingApi.defaultCustodianBank();
  return EmploymentApi.operatingAccountOf(biz);
}

/** The bar's Business — the buyer; a `keeper` position that purchases. */
async function makeBarBusiness(
  proprietor: string,
  floatMinor: number,
): Promise<{ biz: BusinessEntity; account: string }> {
  const biz = makeStuffAtPath(() => new BusinessEntity(), BAR_BIZ);
  biz.proprietorPath = proprietor;
  biz.positions = [
    { key: "bartender", label: "tending bar", wageRate: 12, confers: [] },
    { key: "keeper", label: "keeping the bar", wageRate: 0, confers: [], purchases: true },
  ];
  biz.operatingLocations = ["/stuff/test/bar/room"];
  biz.banksAt = BankingApi.defaultCustodianBank();
  const account = await EmploymentApi.operatingAccountOf(biz);
  if (floatMinor > 0) await BankingApi.mint(account, Money.of(floatMinor, BankingApi.compactCurrency()), "harness");
  return { biz, account };
}

function makeStore(price: number): { stock: Stock; torch: Torch } {
  const stock = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [{ itemTemplatePath: TORCH, par: 1 }];
    s.setPrice(TORCH, price);
    s.discipline = "line";
    s.attendDurationMs = 0;
    s.staffingPolicy = "self-service";
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

function ctx(
  giver: TestGiver,
  loc: Location,
  source: Stuff | null,
  text: string,
  subcommand?: string,
): CommandContext {
  const verb = text.split(" ")[0] ?? text;
  const c = CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandSource: (source ?? undefined) as never,
    commandText: text,
    executionId: "t",
    commandId: "t",
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      "<test>",
    ),
  });
  void subcommand;
  return c;
}

async function fundedGiver(path: string, minor: number): Promise<TestGiver> {
  const g = makeStuffAtPath(() => new TestGiver(), path);
  g.setName(path.split("/").pop() ?? "someone");
  const card = makeStuff(() => new PaymentCard());
  ContainmentApi.move(card as never, g as never);
  await asOwner(g, () => BankingApi.openAccount("goodkin", "goodkin", BankingApi.compactCurrency()));
  if (minor > 0) {
    const bank = StuffApi.findByTemplatePath<BankCounter>(BANK)!;
    const cash = await asOwner(g, () =>
      BankingApi.issueCash(g as never, Money.of(minor, BankingApi.compactCurrency())),
    );
    await asOwner(g, () => bank.deposit(cash as never));
  }
  return g;
}

async function walletUse(giver: TestGiver, loc: Location, corpo: string): Promise<CommandContext> {
  const c = ctx(giver, loc, null, `wallet use ${corpo}`);
  const controller = makeStuff(() => new WalletController());
  await asOwner(giver, () =>
    controller.execute({ subcommand: "use", corpo } as never, c),
  );
  return c;
}

async function buy(giver: TestGiver, loc: Location, stock: Stock, thing: string): Promise<CommandContext> {
  const c = ctx(giver, loc, stock, `buy ${thing}`);
  const controller = makeStuff(() => new BuyController());
  await asOwner(giver, () =>
    // ⚠ Skips the BINDER: the counter is a declared arg in `buy.yaml`.
    controller.execute({ thing, counter: { stuff: stock as never, raw: "counter" } }, c),
  );
  return c;
}

function rejections(c: CommandContext): string[] {
  return c
    .getNotes()
    .filter((n) => n.kind === "controller-rejected")
    .map((n) => (n as { reason: string }).reason);
}

describe("the house account in the wallet (D6)", () => {
  let loc: Location;
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
    loc = makeStuff(() => new Location());
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it("buysFor: a purchasing position and the proprietorship; a bartender buys for nobody", async () => {
    const dave = await fundedGiver("/platform/agent/Avatar/dave", 0);
    const mara = await fundedGiver("/platform/agent/Avatar/mara", 0);
    const augie = await fundedGiver("/platform/agent/Avatar/augie", 0);
    const { biz } = await makeBarBusiness(dave.getTemplatePath()!, 0);
    biz.appoint(mara, "keeper");
    biz.appoint(augie, "bartender");

    expect(await dave.buysFor()).toEqual([biz]);
    expect(await mara.buysFor()).toEqual([biz]);
    expect(await augie.buysFor()).toEqual([]);
  });

  it("wallet use house links + activates the operating account; a non-holder is refused", async () => {
    const mara = await fundedGiver("/platform/agent/Avatar/mara", 0);
    const pat = await fundedGiver("/platform/agent/Avatar/pat", 0);
    const { biz, account } = await makeBarBusiness("", 0);
    biz.appoint(mara, "keeper");
    ContainmentApi.move(mara as never, loc as never);
    ContainmentApi.move(pat as never, loc as never);

    const ok = await walletUse(mara, loc, "house");
    expect(rejections(ok)).toEqual([]);
    const cred = await asOwner(mara, async () => BankingApi.activeCredential());
    expect(cred?.hasAccount(account)).toBe(true);
    expect(cred?.getActiveAccount()).toBe(account);

    const no = await walletUse(pat, loc, "house");
    expect(rejections(no)).toEqual(["not-staff"]);
    const patCred = await asOwner(pat, async () => BankingApi.activeCredential());
    expect(patCred?.hasAccount(account)).toBe(false);
  });

  it("buy with the house account active debits the business and stamps {organization}", async () => {
    const mara = await fundedGiver("/platform/agent/Avatar/mara", 0);
    ContainmentApi.move(mara as never, loc as never);
    const { biz, account } = await makeBarBusiness("", 100);
    biz.appoint(mara, "keeper");
    const storeAcct = await makeStoreBusiness();
    const { stock, torch } = makeStore(5);

    await walletUse(mara, loc, "house");
    const c = await buy(mara, loc, stock, "torch");
    expect(rejections(c)).toEqual([]);

    expect(torch.getContainer()).toBe(mara);
    expect(await torch.chattelOwner()).toEqual({
      kind: "organization",
      templatePath: BAR_BIZ,
    });
    expect(BankingApi.balanceOf(account).minor).toBe(95);
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(5);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });

  it("⚠ regression: buy with a personal account stamps the player, even for a keeper", async () => {
    const mara = await fundedGiver("/platform/agent/Avatar/mara", 50);
    ContainmentApi.move(mara as never, loc as never);
    const { biz, account } = await makeBarBusiness("", 100);
    biz.appoint(mara, "keeper");
    await makeStoreBusiness();
    const { stock, torch } = makeStore(5);

    await walletUse(mara, loc, "house");
    await walletUse(mara, loc, "goodkin"); // back to her own
    const c = await buy(mara, loc, stock, "torch");
    expect(rejections(c)).toEqual([]);
    expect(await torch.chattelOwner()).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/mara",
    });
    expect(BankingApi.balanceOf(account).minor).toBe(100);
  });

  it("quit unlinks the house account; the next buy settles personally", async () => {
    const mara = await fundedGiver("/platform/agent/Avatar/mara", 50);
    ContainmentApi.move(mara as never, loc as never);
    const { biz, account } = await makeBarBusiness("", 100);
    biz.appoint(mara, "keeper");
    await makeStoreBusiness();
    const { stock, torch } = makeStore(5);

    await walletUse(mara, loc, "house");
    const q = ctx(mara, loc, null, "quit");
    await asOwner(mara, () => makeStuff(() => new QuitController()).execute({}, q));
    expect(rejections(q)).toEqual([]);
    expect(mara.getEmployment(BAR_BIZ)?.status).toBe("quit");
    const cred = await asOwner(mara, async () => BankingApi.activeCredential());
    expect(cred?.hasAccount(account)).toBe(false);

    const c = await buy(mara, loc, stock, "torch");
    expect(rejections(c)).toEqual([]);
    expect(await torch.chattelOwner()).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/mara",
    });
    expect(BankingApi.balanceOf(account).minor).toBe(100);
    // …and a second wallet use house is refused: the seat is gone.
    expect(rejections(await walletUse(mara, loc, "house"))).toEqual(["not-staff"]);
  });

  it("consign as the house: the business is the consignor and a resale splits to its account", async () => {
    const hand = await fundedGiver("/platform/agent/Avatar/hand", 0);
    ContainmentApi.move(hand as never, loc as never);
    const { biz, account } = await makeBarBusiness("", 0);
    biz.appoint(hand, "keeper");
    const storeAcct = await makeStoreBusiness();
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    const torch = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords(["torch"]);
      return t;
    }, TORCH);
    ContainmentApi.move(torch, hand as never);

    await walletUse(hand, loc, "house");
    const c = ctx(hand, loc, shelf, "consign torch");
    await asOwner(hand, () =>
      makeStuff(() => new ConsignController()).execute(
        // ⚠ Skips the BINDER: the shelf is a declared arg in `consign.yaml`.
        { thing: { stuff: torch as never, raw: "torch" }, ask: "20", shelf: { stuff: shelf as never, raw: "shelf" } },
        c,
      ),
    );
    expect(rejections(c)).toEqual([]);
    expect(await torch.chattelOwner()).toEqual({ kind: "organization", templatePath: BAR_BIZ });
    expect(shelf.listingFor(torch.getChattelId())?.consignorKey).toBe(BAR_BIZ);

    // A stranger buys it: commission to the store, the rest to the bar.
    const pat = await fundedGiver("/platform/agent/Avatar/pat", 100);
    ContainmentApi.move(pat as never, loc as never);
    const b = ctx(pat, loc, shelf, "buy torch");
    await asOwner(pat, () => makeStuff(() => new BuyController()).execute(
        // ⚠ Skips the BINDER: the counter is a declared arg in `buy.yaml`.
        { thing: "torch", counter: { stuff: shelf as never, raw: "counter" } },
        b,
      ));
    expect(rejections(b)).toEqual([]);
    expect(await torch.chattelOwner()).toEqual({ kind: "player", templatePath: "/platform/agent/Avatar/pat" });
    expect(BankingApi.balanceOf(account).minor).toBe(17); // 20 − 15% commission
    expect(BankingApi.balanceOf(storeAcct).minor).toBe(3);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });

  /**
   * ⭐ Rung 0's repossession (economic bootstrap D11): an unpaid crate on
   * a shop's counter is still the outfit's, and the outfit's hand — trading
   * as the house — takes it back. A stranger cannot; nor can the hand
   * trading personally, because the crate is not THEIRS.
   */
  it("reclaim as the house: the outfit's hand takes back what the outfit consigned; a stranger is refused", async () => {
    const hand = await fundedGiver("/platform/agent/Avatar/hand", 0);
    ContainmentApi.move(hand as never, loc as never);
    const { biz } = await makeBarBusiness("", 0);
    biz.appoint(hand, "keeper");
    await makeStoreBusiness();
    const shelf = makeStuffAtPath(() => new ConsignmentShelf(), SHELF);
    ContainmentApi.move(shelf as never, loc as never);
    const torch = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords(["torch"]);
      return t;
    }, TORCH);
    ContainmentApi.move(torch, hand as never);

    await walletUse(hand, loc, "house");
    await asOwner(hand, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: torch as never, raw: "torch" }, ask: "20", shelf: { stuff: shelf as never, raw: "shelf" } },
        ctx(hand, loc, shelf, "consign torch"),
      ),
    );
    expect(torch.getContainer()).toBe(shelf);
    expect(await torch.chattelOwner()).toEqual({ kind: "organization", templatePath: BAR_BIZ });

    // A stranger: not theirs.
    const pat = await fundedGiver("/platform/agent/Avatar/pat", 0);
    ContainmentApi.move(pat as never, loc as never);
    const no = ctx(pat, loc, shelf, "reclaim torch");
    await asOwner(pat, () =>
      makeStuff(() => new ReclaimController()).execute(
        { thing: "torch", shelf: { stuff: shelf as never, raw: "shelf" } },
        no,
      ),
    );
    expect(rejections(no)).toEqual(["not-owner"]);
    expect(torch.getContainer()).toBe(shelf);

    // The outfit's own hand, as the house: taken back, title unchanged.
    const ok = ctx(hand, loc, shelf, "reclaim torch");
    await asOwner(hand, () =>
      makeStuff(() => new ReclaimController()).execute(
        { thing: "torch", shelf: { stuff: shelf as never, raw: "shelf" } },
        ok,
      ),
    );
    expect(rejections(ok)).toEqual([]);
    expect(torch.getContainer()).toBe(hand);
    expect(await torch.chattelOwner()).toEqual({ kind: "organization", templatePath: BAR_BIZ });
    expect(shelf.listingFor(torch.getChattelId())).toBeNull();
  });

  it("house refuses a non-staff giver (no wizard axis anywhere)", async () => {
    const pat = await fundedGiver("/platform/agent/Avatar/pat", 0);
    ContainmentApi.move(pat as never, loc as never);
    await makeBarBusiness("", 0);
    const c = ctx(pat, loc, null, "house stock");
    await asOwner(pat, () =>
      makeStuff(() => new HouseController()).execute({ subcommand: "stock" } as never, c),
    );
    expect(rejections(c)).toEqual(["not-staff"]);
  });
});
