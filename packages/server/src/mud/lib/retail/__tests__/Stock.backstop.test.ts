/**
 * ⭐ The import backstop (ceramics D28): a SUPPLIED line may name a dearer
 * fallback — buy local first, and only when the supplier's counter holds
 * none does the reset sweep import to par, at the base × `importBackstop`.
 *
 *  1. The supplier's counter holds none → the sweep imports to par.
 *  2. The supplier's counter holds some → nothing is cloned (the keeper's
 *     `stocks` beat buys it, never the sweep).
 *  3. ⭐ An import is DERIVABLY a good nobody here made — no maker — and the
 *     line asks the backstop's multiple; a local piece on the shelf sells
 *     at the base.
 *  4. A supplied line with no backstop is bought only, never cloned.
 *  5. The backstop is a supplier line's, and a multiple of at least one.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StockBase from "../Stock";
import Good from "../../../platform/thing/Good";
import { CraftedMixin } from "../../craft/Crafted";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { AppApi } from "../../../api/app";
import { ContainmentApi } from "../../../api/containment";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { Containable } from "../../spatial/Containable";
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from "../../security/__tests__/test-setup";

const COUNTER = "/test/stock-backstop/thing/stall";
const SUPPLIER_COUNTER = "/test/stock-backstop/thing/ware-shelf";
const POTTERY = "/test/stock-backstop/idea/pottery";
const POT = "/trade/ceramics/thing/plant-pot-small";

class Stock extends StockBase {}
class Pot extends CraftedMixin(Good) {}

let stall: Stock;
let shelf: Stock;
let clones: number;

/** A plant pot of the line's row — made by `maker`, or an import (nobody). */
function pot(maker = ""): Pot {
  const p = makeStuff(() => {
    const t = new Pot();
    t.setKeywords(["pot", "plant pot"]);
    return t;
  });
  if (maker !== "") p.setMaker(maker);
  stampTemplatePathForTest(p as unknown as Stuff, POT);
  return p;
}

function put(where: Stock, what: Pot): void {
  ContainmentApi.move(what as unknown as Stuff & Containable, where as unknown as Stuff & Container);
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(AppApi, "setting").mockImplementation((() => "") as never);
  clones = 0;
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    expect(path).toBe(POT);
    clones += 1;
    return pot() as unknown as Stuff;
  }) as unknown as typeof StuffApi.clone);
  shelf = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [];
    s.prices = { [POT]: 3 };
    return s;
  }, SUPPLIER_COUNTER);
  // The supplier business: its operating locations name the shelf. Loaded
  // on use (`StuffApi.singleton`), never by the line.
  const pottery = { getOperatingLocations: () => ["/test/stock-backstop/location/shop", SUPPLIER_COUNTER] };
  vi.spyOn(StuffApi, "singleton").mockImplementation((async (path: string) => {
    if (path === POTTERY) return pottery as unknown as Stuff;
    throw new Error(`no singleton at ${path}`);
  }) as unknown as typeof StuffApi.singleton);
  const realIsBusiness = MixinApi.isBusiness.bind(MixinApi);
  vi.spyOn(MixinApi, "isBusiness").mockImplementation(((s: Stuff) =>
    (s as unknown) === pottery || realIsBusiness(s)) as never);
  stall = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [{ itemTemplatePath: POT, par: 3, from: { supplier: POTTERY, importBackstop: 1.5 } }];
    s.prices = { [POT]: 4 };
    return s;
  }, COUNTER);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("⭐ buy local first; import dearer only when local is out", () => {
  it("the supplier's counter holds none → the sweep imports to par", async () => {
    await stall.reset();
    expect(clones).toBe(3);
    expect(stall.onHand(POT)).toBe(3);
    await stall.reset();
    expect(clones).toBe(3); // at par: nothing more
  });

  it("the supplier's counter holds some → nothing is cloned", async () => {
    put(shelf, pot("/test/stock-backstop/agent/potter"));
    await stall.reset();
    expect(clones).toBe(0);
    expect(stall.onHand(POT)).toBe(0);
  });

  it("⭐ an import asks the backstop's multiple; a local piece asks the base", async () => {
    await stall.reset();
    // Every pot on the shelf is an import (no maker): 4 × 1.5.
    expect(stall.priceFor(POT)).toBe(6);
    // A pot somebody here made goes up beside them: the line asks the base.
    put(stall, pot("/platform/agent/Avatar/potter"));
    expect(stall.priceFor(POT)).toBe(4);
  });

  it("an empty shelf asks the base — there is nothing on it to be an import", () => {
    expect(stall.priceFor(POT)).toBe(4);
  });

  it("a supplied line with NO backstop is bought, never cloned", async () => {
    stall.stockLines = [{ itemTemplatePath: POT, par: 3, from: { supplier: POTTERY } }];
    await stall.reset();
    expect(clones).toBe(0);
    expect(stall.sourceOf(stall.stockLines[0]!)).toEqual({ kind: "supplier", business: POTTERY, importBackstop: null });
  });
});

describe("the backstop's shape", () => {
  it("decodes onto the supplier source", () => {
    expect(stall.sourceOf(stall.stockLines[0]!)).toEqual({ kind: "supplier", business: POTTERY, importBackstop: 1.5 });
  });

  it("⭐ refuses a backstop under one, or on a store line", () => {
    const c = makeStuff(() => new Stock());
    expect(() =>
      c.setStockLines([{ itemTemplatePath: POT, par: 1, from: { supplier: POTTERY, importBackstop: 0.5 } }]),
    ).toThrow(/exactly one/);
    expect(() =>
      c.setStockLines([{ itemTemplatePath: POT, par: 1, from: { store: "/s", importBackstop: 2 } as never }]),
    ).toThrow(/exactly one/);
  });
});
