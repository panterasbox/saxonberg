/**
 * ⭐ The line a good is bought on. Firing keeps a piece's identity (ceramics
 * M1), so a cake of black salts calcined in a kiln is the same cake made of
 * pearl ash — and a counter that lists pearl ash buys it as pearl ash, not
 * at the black-salts price (the ceramics × potash merge).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StockBase from "../Stock";
import Good from "../../stuff/Good";
import Material from "../../material/Material";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
import type { Stuff } from "../../stuff/Stuff";
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from "../../security/__tests__/test-setup";

class Stock extends StockBase {}

const CAKE = "/test/stock-line-key/thing/black-salts";
const PEARL = "/test/stock-line-key/thing/pearl-ash";

function material(name: string, castTemplate: string): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.castTemplate = castTemplate;
    return m;
  }, `/test/stock-line-key/idea/material/${name.replace(/\s+/g, "-")}`) as unknown as Material;
}

function cake(made: Material): Good {
  const g = makeStuff(() => new Good());
  g.setMaterial(made);
  stampTemplatePathForTest(g as unknown as Stuff, CAKE);
  return g;
}

function counter(lines: string[]): Stock {
  const c = makeStuff(() => new Stock());
  c.stockLines = lines.map((itemTemplatePath) => ({ itemTemplatePath, par: 1, buys: true }));
  return c;
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(AppApi, "setting").mockImplementation((() => "") as never);
});
afterEach(() => vi.restoreAllMocks());

describe("Stock.lineKeyFor", () => {
  it("⭐ a calcined cake is bought on the pearl-ash line, though it came as black salts", () => {
    const pearl = material("pearl ash", PEARL);
    expect(counter([CAKE, PEARL]).lineKeyFor(cake(pearl) as unknown as Stuff)).toBe(PEARL);
  });

  it("a fresh cake is bought as what it is", () => {
    const salts = material("black salts", "");
    expect(counter([CAKE, PEARL]).lineKeyFor(cake(salts) as unknown as Stuff)).toBe(CAKE);
  });

  it("a house that does not list the material's lump buys the good's own row", () => {
    const pearl = material("pearl ash", PEARL);
    expect(counter([CAKE]).lineKeyFor(cake(pearl) as unknown as Stuff)).toBe(CAKE);
  });
});
