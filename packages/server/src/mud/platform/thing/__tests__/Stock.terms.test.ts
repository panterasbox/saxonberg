/**
 * The counter under the economic bootstrap (D11 / D14): a `terms`
 * purchasing policy, supplied lines the reset sweep never clones, the
 * stocking rule's ask against the shelf, and the terms price a shop that
 * never priced a good asks.
 *
 * ⚠ SYNTHETIC fixtures under `/test/**` — the kernel rule, not the
 * general store's rows.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Stock from "../Stock";
import Thing from "../Thing";
import ChattelRegistry from "../../idea/ChattelRegistry";
import Location from "../../../lib/stuff/Location";
import { Idea } from "../../../lib/stuff/Idea";
import { NamedMixin } from "../../../lib/description/Named";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
import { ContainmentApi } from "../../../api/containment";
import { ExecutionContextApi } from "../../../api/execution-context";
import type { Stuff } from "../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../lib/security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../lib/banking/__tests__/banking-test-harness";

const COUNTER = "/test/stock-terms/thing/counter";
const LIMES = "/test/stock-terms/thing/crate-of-limes";
const TORCH = "/test/stock-terms/thing/torch";
const SUPPLIER = "/test/stock-terms/idea/farm";

class Crate extends Thing {}
class Party extends NamedMixin(Idea) {
  static _mixinName = "StockTermsParty";
}

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "stock-terms.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

let counter: Stock;
let room: Location;
let settings: Record<string, string>;

function crate(path: string, kw: string): Crate {
  const c = makeStuffAtPath(() => {
    const t = new Crate();
    t.setKeywords([kw]);
    return t;
  }, path);
  ContainmentApi.move(c as never, counter as never);
  return c;
}

beforeEach(async () => {
  StuffApi.clearAll();
  installBankingHarness(); // the in-memory Document path the chattel registry reads
  settings = { "retail.stockingElasticity": "0.5", "retail.termsMargin": "0.25" };
  vi.spyOn(AppApi, "setting").mockImplementation(((key: string) => settings[key] ?? "") as never);
  const reg = makeStuffAtPath(() => new ChattelRegistry(), "/platform/idea/ChattelRegistry");
  await reg.postRegister();
  room = makeStuff(() => new Location());
  counter = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [
      { itemTemplatePath: TORCH, par: 2 },
      { itemTemplatePath: LIMES, par: 4, supplier: SUPPLIER, pricing: "stocking" },
    ];
    s.prices = { [TORCH]: 2, [LIMES]: 10 };
    return s;
  }, COUNTER);
  ContainmentApi.move(counter as never, room as never);
});

afterEach(() => {
  teardownBankingHarness();
  vi.restoreAllMocks();
});

describe("Stock.purchasing — rung 0 is a counter that says terms", () => {
  it("defaults to consignment and refuses an unknown policy", () => {
    expect(counter.getPurchasing()).toBe("consignment");
    counter.setPurchasing("terms");
    expect(counter.getPurchasing()).toBe("terms");
    expect(() => counter.setPurchasing("wholesale")).toThrow(/not a policy/);
  });
});

describe("a supplied line is bought, never cloned", () => {
  it("reset() tops the import line and leaves the supplied one short", async () => {
    const clone = vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) =>
      makeStuffAtPath(() => new Crate(), path)) as never);
    await counter.reset();
    const cloned = clone.mock.calls.map((c) => c[0]);
    expect(cloned.filter((p) => p === TORCH)).toHaveLength(2);
    expect(cloned).not.toContain(LIMES);
    expect(counter.onHand(TORCH)).toBe(2);
    expect(counter.onHand(LIMES)).toBe(0);
  });

  it("shortSuppliedLines() names the supplier and the shortfall", () => {
    crate(LIMES, "limes");
    const short = counter.shortSuppliedLines();
    expect(short).toHaveLength(1);
    expect(short[0]).toMatchObject({ itemTemplatePath: LIMES, supplier: SUPPLIER, shortfall: 3 });
  });
});

describe("⭐ the stocking rule — the ask moves with the shelf (D14)", () => {
  it("an empty shelf asks base × (1 + e); at par, base; over par, less", () => {
    expect(counter.priceFor(LIMES)).toBe(15); // 10 × 1.5
    crate(LIMES, "limes");
    crate(LIMES, "limes");
    expect(counter.priceFor(LIMES)).toBe(13); // 10 × (1 + 0.5 × 0.5) = 12.5 → 13
    crate(LIMES, "limes");
    crate(LIMES, "limes");
    expect(counter.priceFor(LIMES)).toBe(10); // at par
    for (let i = 0; i < 4; i += 1) crate(LIMES, "limes");
    expect(counter.priceFor(LIMES)).toBe(5); // 2×par: 10 × (1 − 0.5)
  });

  it("a fixed line asks its authored price whatever the shelf holds", () => {
    expect(counter.priceFor(TORCH)).toBe(2);
    crate(TORCH, "torch");
    crate(TORCH, "torch");
    crate(TORCH, "torch");
    expect(counter.priceFor(TORCH)).toBe(2);
    expect(counter.basePriceFor(LIMES)).toBe(10);
  });

  it("the elasticity is the Schedule's", () => {
    settings["retail.stockingElasticity"] = "1";
    expect(counter.priceFor(LIMES)).toBe(20);
  });
});

describe("a terms good the shop never priced asks the supplier's price plus the margin", () => {
  const COFFEE = "/test/stock-terms/thing/coffee-sack";

  it("priceFor derives from the terms listing; the title line says whose it is", async () => {
    counter.setPurchasing("terms");
    const farm = makeStuffAtPath(() => {
      const p = new Party();
      p.setName("the farm outfit");
      return p;
    }, SUPPLIER);
    const sack = crate(COFFEE, "coffee");
    await asOwner(farm, () => sack.stampChattel(farm));
    counter.recordListing(sack.getChattelId(), SUPPLIER, 20, "terms");
    expect(counter.priceFor(COFFEE)).toBe(25); // 20 × 1.25
    const line = counter.termsLineFor(sack);
    expect(line).toMatch(/^Held on .*terms until sold; the shop asks /);
    // Priced by the house, the base wins and the terms price is history.
    counter.setPrice(COFFEE, 30);
    expect(counter.priceFor(COFFEE)).toBe(30);
  });

  it("a good on consignment says its consignor's ask; a stock good says nothing", async () => {
    const alice = makeStuffAtPath(() => {
      const p = new Party();
      p.setName("Alice");
      return p;
    }, "/test/stock-terms/agent/alice");
    const torch = crate(TORCH, "torch");
    await asOwner(alice, () => torch.stampChattel(alice));
    counter.recordListing(torch.getChattelId(), "/test/stock-terms/agent/alice", 4);
    expect(counter.termsLineFor(torch)).toMatch(/^On consignment for .* at /);
    const plain = crate(TORCH, "torch");
    expect(counter.termsLineFor(plain)).toMatch(/^The shop asks /);
    const unpriced = crate("/test/stock-terms/thing/oddment", "oddment");
    expect(counter.termsLineFor(unpriced)).toBe("");
  });
});
