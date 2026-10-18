/**
 * ⭐ The third stock source (storage-and-ice D8): a counter line fed from a
 * STORE, brought up to order on the house's claim and priced on the
 * store's days of supply.
 *
 *  1. A sourced line is never cloned by the reset sweep; it is brought up
 *     from the store.
 *  2. An empty claim brings nothing up — the shelf stays bare.
 *  3. ⭐ `buy block` on a bare shelf brings one up first (`bringUpFor`
 *     matches a word of the line's leaf).
 *  4. The price rises as the HOUSE's days of supply in the store fall.
 *  5. A line names ONE source (`from:`), checked at the setter.
 *  6. ⭐ The house BUYS a line it says it buys (`sell`): the bid is the ask
 *     less the terms margin, every gate is asked before money moves, and
 *     the good goes into the store on the house's claim.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StockBase from "../Stock";
import Stockpile from "../../../platform/thing/Stockpile";
import Good from "../../../platform/thing/Good";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
import { EmploymentApi } from "../../../api/employment";
import { BankingApi } from "../../../api/banking";
import type { Stuff } from "../../stuff/Stuff";
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from "../../security/__tests__/test-setup";

const COUNTER = "/test/stock-source/thing/counter";
const STACK = "/test/stock-source/thing/stack";
const BLOCK = "/stuff/thing/ice-block";

class Stock extends StockBase {}
class Block extends Good {}

let counter: Stock;
let store: Stockpile;
let drawn: number;
let days: number;

function block(): Block {
  const b = makeStuff(() => {
    const t = new Block();
    t.setKeywords(["ice", "block", "ice-block"]);
    return t;
  });
  stampTemplatePathForTest(b as unknown as Stuff, BLOCK);
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  const settings: Record<string, string> = {
    "retail.stockingElasticity": "0.5",
    "retail.stockingHorizonDays": "120",
    "retail.termsMargin": "0.25",
  };
  vi.spyOn(AppApi, "setting").mockImplementation(((key: string) => settings[key] ?? "") as never);
  store = makeStuffAtPath(() => new Stockpile(), STACK);
  drawn = 3;
  days = 200;
  vi.spyOn(store, "drawForHouse").mockImplementation(async (_good: string, units: number) => {
    const n = Math.min(units, drawn);
    drawn -= n;
    return Array.from({ length: n }, () => block() as unknown as Stuff);
  });
  vi.spyOn(store, "houseDaysOfSupply").mockImplementation(() => days);
  counter = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [{ itemTemplatePath: BLOCK, par: 1, from: { store: STACK }, pricing: "stocking" }];
    s.prices = { [BLOCK]: 10 };
    return s;
  }, COUNTER);
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    throw new Error(`a sourced line must never be cloned (${path})`);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("a counter fed from a store", () => {
  it("⭐ the sweep brings a sourced line up from the store, never by cloning", async () => {
    await counter.reset();
    expect(counter.onHand(BLOCK)).toBe(1);
    expect(drawn).toBe(2);
    await counter.reset();
    expect(counter.onHand(BLOCK)).toBe(1); // at par: nothing drawn
    expect(drawn).toBe(2);
  });

  it("an empty claim leaves the shelf bare", async () => {
    drawn = 0;
    expect(await counter.bringUp(BLOCK)).toBe(0);
    expect(counter.onHand(BLOCK)).toBe(0);
  });

  it("⭐ a buyer's word brings one up TO ORDER — `block` as well as `ice-block`", async () => {
    expect(counter.resolveBuy("block")).toBeNull();
    expect(await counter.bringUpFor("block")).toBe(1);
    expect(counter.resolveBuy("block")).not.toBeNull();
    expect(await counter.bringUpFor("lantern")).toBe(0);
  });

  it("⭐ dearer as the store's days of supply fall: base at the horizon, base × 1.5 empty", () => {
    days = 200;
    expect(counter.priceFor(BLOCK)).toBe(10);
    days = 60;
    expect(counter.priceFor(BLOCK)).toBe(13);
    days = 0;
    expect(counter.priceFor(BLOCK)).toBe(15);
  });
});

describe("a line names one source", () => {
  it("decodes the three: an import, a supplier, a store", () => {
    const c = makeStuff(() => new Stock());
    c.setStockLines([
      { itemTemplatePath: "/a", par: 1 },
      { itemTemplatePath: "/b", par: 1, from: { supplier: "/biz" } },
      { itemTemplatePath: "/c", par: 1, from: { store: STACK } },
    ]);
    expect(c.getStockLines().map((l) => c.sourceOf(l).kind)).toEqual(["import", "supplier", "store"]);
  });

  it("⭐ refuses a line with two sources, or the retired keys", () => {
    const c = makeStuff(() => new Stock());
    expect(() => c.setStockLines([{ itemTemplatePath: "/x", par: 1, from: { supplier: "/b", store: "/s" } }])).toThrow(/exactly one/);
    expect(() => c.setStockLines([{ itemTemplatePath: "/x", par: 1, supplier: "/b" }])).toThrow(/retired/);
    expect(() => c.setStockLines([{ itemTemplatePath: "/x", par: 1, source: "/s" }])).toThrow(/from: \{ store/);
  });
});

describe("⭐ the house buys what it says it buys (`sell`)", () => {
  const HOUSE = "/test/stock-source/idea/house";
  const SELLER = "/platform/agent/Avatar/seller";
  let paid: number[];
  let received: string[];
  let seller: Stuff;

  beforeEach(() => {
    counter.stockLines = [{ itemTemplatePath: BLOCK, par: 1, from: { store: STACK }, pricing: "stocking", buys: true }];
    paid = [];
    received = [];
    seller = { getIdentityPath: () => SELLER } as unknown as Stuff;
    vi.spyOn(EmploymentApi, "ensureOperatorAt").mockResolvedValue({ getOrganizationPath: () => HOUSE } as never);
    vi.spyOn(EmploymentApi, "operatingAccountOf").mockResolvedValue("acct-house");
    vi.spyOn(BankingApi, "primaryAccountIdOf").mockResolvedValue("acct-seller");
    vi.spyOn(BankingApi, "payTerms").mockImplementation((async (_from: string, _to: string, m: { minor: number }) => {
      paid.push(m.minor);
      return "tx";
    }) as never);
    vi.spyOn(counter, "requestAttention").mockReturnValue({ status: "served" } as never);
    vi.spyOn(store, "getBusinessPath").mockReturnValue(HOUSE);
    vi.spyOn(store, "canAddContainable").mockReturnValue({ ok: true });
    vi.spyOn(store, "receive").mockImplementation((async (_item: unknown, depositor: string) => {
      received.push(depositor);
      return { ok: true } as never;
    }) as never);
  });

  const mine = (): Block => {
    const b = block();
    vi.spyOn(b as never, "chattelOwner").mockResolvedValue({ kind: "player", templatePath: SELLER } as never);
    return b;
  };

  it("⭐ the bid is the ask less the terms margin — and rises with the ask", () => {
    days = 200;
    expect(counter.bidFor(BLOCK)).toBe(8); // ask 10 / 1.25
    days = 0;
    expect(counter.bidFor(BLOCK)).toBe(12); // ask 15 / 1.25
  });

  it("⭐ pays its bid and takes the block into the store on the house's claim", async () => {
    days = 200;
    const out = await counter.buyFrom(seller, mine() as never);
    expect(out).toMatchObject({ ok: true, paidMinor: 8, intoStore: true });
    expect(paid).toEqual([8]);
    expect(received).toEqual([HOUSE]);
  });

  it("a line the house does not buy is refused, and nothing is paid", async () => {
    counter.stockLines = [{ itemTemplatePath: BLOCK, par: 1, from: { store: STACK }, pricing: "stocking" }];
    expect(await counter.buyFrom(seller, mine() as never)).toMatchObject({ ok: false, reason: "not-bought" });
    expect(paid).toEqual([]);
  });

  it("somebody else's good is not yours to sell", async () => {
    const b = block();
    vi.spyOn(b as never, "chattelOwner").mockResolvedValue({ kind: "player", templatePath: "/platform/agent/Avatar/other" } as never);
    expect(await counter.buyFrom(seller, b as never)).toMatchObject({ ok: false, reason: "not-yours" });
    expect(paid).toEqual([]);
  });

  it("⭐ a store that will not take it refuses BEFORE any money moves", async () => {
    vi.spyOn(store, "canAddContainable").mockReturnValue({ ok: false, reason: "This stack does not take that." });
    expect(await counter.buyFrom(seller, mine() as never)).toMatchObject({ ok: false, reason: "store-refuses", line: "This stack does not take that." });
    expect(paid).toEqual([]);
  });

  it("⭐ the counter says what the house buys before anybody makes the trip: its bid, full, or short of money", async () => {
    days = 200;
    vi.spyOn(store, "getCapacityKg").mockReturnValue(30_000);
    vi.spyOn(store, "getLines").mockReturnValue([{ amountKg: 10_000 }] as never);
    expect(counter.getLong()).toMatch(/The house buys ice-block at 8/);
    // A sale fails on the house's money: the counter says so until a good one.
    vi.spyOn(BankingApi, "payTerms").mockRejectedValueOnce(new Error("the shop holds less"));
    await counter.buyFrom(seller, mine() as never);
    expect(counter.getLong()).toMatch(/buying no ice-block just now — it is short of money/);
    await counter.buyFrom(seller, mine() as never);
    expect(counter.getLong()).toMatch(/The house buys ice-block at/);
    // A full store buys nothing.
    vi.spyOn(store, "getLines").mockReturnValue([{ amountKg: 30_000 }] as never);
    expect(counter.getLong()).toMatch(/buying no ice-block — its store is full/);
  });

  it("a house that cannot pay keeps its money and the seller keeps the good", async () => {
    vi.spyOn(BankingApi, "payTerms").mockRejectedValue(new Error("the shop holds less"));
    expect(await counter.buyFrom(seller, mine() as never)).toMatchObject({ ok: false, reason: "house-cannot-pay" });
    expect(received).toEqual([]);
  });
});
