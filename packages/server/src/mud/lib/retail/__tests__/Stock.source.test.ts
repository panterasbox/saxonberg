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
 *  4. The price rises as the store's days of supply fall.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StockBase from "../Stock";
import Stockpile from "../../../platform/thing/Stockpile";
import Good from "../../../platform/thing/Good";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
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
  vi.spyOn(store, "daysOfSupply").mockImplementation(() => days);
  counter = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [{ itemTemplatePath: BLOCK, par: 1, source: STACK, pricing: "stocking" }];
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
