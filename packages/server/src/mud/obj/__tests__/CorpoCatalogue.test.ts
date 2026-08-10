/**
 * CorpoCatalogue tests — warm-from-templates over two leaf rosters, corpo /
 * brand key lookup, the portfolio forward edge, rivalry reads, the
 * independent (empty-owner) case, malformed-entry rejection, cold state,
 * and singleton destruct refusal.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CorpoCatalogue from "../CorpoCatalogue";
import Corpo from "../corpo/Corpo";
import Brand from "../corpo/Brand";
import { StuffApi } from "../../api/stuff";
import { ShadowApi } from "../../api/shadow";
import { Template } from "../../lib/stuff/Template";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

type Loose = Record<string, unknown>;

function stubTemplates(corpos: Loose[], brands: Loose[]): void {
  vi.spyOn(Template, "findDescendants").mockImplementation(
    async (basePath: string) => {
      const pick =
        basePath === Corpo.TEMPLATE_PATH_PREFIX
          ? { prefix: Corpo.TEMPLATE_PATH_PREFIX, seeds: corpos }
          : basePath === Brand.TEMPLATE_PATH_PREFIX
            ? { prefix: Brand.TEMPLATE_PATH_PREFIX, seeds: brands }
            : null;
      if (!pick) return [];
      return pick.seeds.map((seed) => ({
        path: `${pick.prefix}${String(seed.key)}`,
        data: seed,
      })) as unknown as Template[];
    }
  );
}

async function warm(corpos: Loose[], brands: Loose[]): Promise<CorpoCatalogue> {
  stubTemplates(corpos, brands);
  const cat = makeStuff(() => new CorpoCatalogue());
  await cat.postRegister();
  return cat;
}

const CORPOS: Loose[] = [
  { key: "veshko", label: "Veshko", sector: "industry", rivals: ["aevex"] },
  { key: "goodkin", label: "Goodkin", rivals: [] },
  { key: "vionne", label: "Vionne", rivals: ["hollis"] },
  { key: "hollis", label: "Hollis", rivals: ["vionne"] },
  { key: "aevex", label: "Aevex", rivals: ["veshko"] },
];

const BRANDS: Loose[] = [
  { key: "volk", name: "Volk", owner: "veshko", category: "vodka" },
  { key: "vionne-noir", name: "Vionne Noir", owner: "vionne", category: "gin" },
  { key: "crowsfoot-gin", name: "Crowsfoot Gin", owner: "", category: "gin" },
];

describe("CorpoCatalogue", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warms both rosters keyed by `key`", async () => {
    const cat = await warm(CORPOS, BRANDS);
    expect(cat.getCorpo("veshko")?.label).toBe("Veshko");
    expect(cat.getBrand("volk")?.name).toBe("Volk");
    expect(cat.allCorpos()).toHaveLength(5);
    expect(cat.allBrands()).toHaveLength(3);
  });

  it("defaults a missing label to the key and a missing owner to ''", async () => {
    const cat = await warm([{ key: "veshko" }], [{ key: "volk" }]);
    expect(cat.getCorpo("veshko")?.label).toBe("veshko");
    expect(cat.getBrand("volk")?.owner).toBe("");
  });

  it("builds the portfolio forward edge, excluding independents", async () => {
    const cat = await warm(CORPOS, BRANDS);
    expect(cat.portfolioOf("veshko")).toEqual(["volk"]);
    expect(cat.portfolioOf("vionne")).toEqual(["vionne-noir"]);
    // Crowsfoot is independent (empty owner) — in no corpo's portfolio.
    expect(cat.portfolioOf("goodkin")).toEqual([]);
  });

  it("exposes the rivalry edges", async () => {
    const cat = await warm(CORPOS, BRANDS);
    expect(cat.rivalsOf("vionne")).toEqual(["hollis"]);
    expect(cat.rivalsOf("veshko")).toEqual(["aevex"]);
    expect(cat.rivalsOf("goodkin")).toEqual([]);
  });

  it("drops malformed entries (no key)", async () => {
    const cat = await warm(
      [{ key: "veshko" }, { label: "no key" }],
      [{ key: "volk", owner: "veshko" }, { name: "no key" }]
    );
    expect(cat.allCorpos()).toHaveLength(1);
    expect(cat.allBrands()).toHaveLength(1);
  });

  it("degrades to empty in the cold (un-warmed) state", () => {
    const cat = makeStuff(() => new CorpoCatalogue());
    expect(cat.getCorpo("veshko")).toBeNull();
    expect(cat.getBrand("volk")).toBeNull();
    expect(cat.portfolioOf("veshko")).toEqual([]);
    expect(cat.allCorpos()).toEqual([]);
  });

  it("returns defensive copies callers can't mutate", async () => {
    const cat = await warm(CORPOS, BRANDS);
    const rivals = cat.rivalsOf("veshko");
    rivals.push("hollis");
    expect(cat.rivalsOf("veshko")).toEqual(["aevex"]);
    const portfolio = cat.portfolioOf("veshko");
    portfolio.push("xxx");
    expect(cat.portfolioOf("veshko")).toEqual(["volk"]);
  });

  it("refuses to be destructed", async () => {
    const cat = await warm(CORPOS, BRANDS);
    expect(cat.canDestruct().ok).toBe(false);
  });
});
