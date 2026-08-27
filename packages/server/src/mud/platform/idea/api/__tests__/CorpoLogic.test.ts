/**
 * CorpoApi / CorpoLogic tests — the gated query surface over a warmed
 * catalogue: brand→corpo resolution, the independent (null) + unknown
 * cases, a branded Stuff → its corpo end-to-end, the portfolio forward
 * edge, rivalry reads, and the listings.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CorpoApi } from "../../../../api/corpo";
import CorpoCatalogue from "../../CorpoCatalogue";
import Corpo from "../../corpo/Corpo";
import Brand from "../../corpo/Brand";
import BrandedBottle from "../../../thing/corpo/BrandedBottle";
import { StuffApi } from "../../../../api/stuff";
import { ShadowApi } from "../../../../api/shadow";
import { Template } from "../../../../lib/stuff/Template";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";

type Loose = Record<string, unknown>;

const CORPOS: Loose[] = [
  { key: "veshko", label: "Veshko", rivals: ["aevex"] },
  { key: "aevex", label: "Aevex", rivals: ["veshko"] },
  { key: "vionne", label: "Vionne", rivals: ["hollis"] },
  // hollis rivals vionne plus a ghost key that isn't cataloged (dropped).
  { key: "hollis", label: "Hollis", rivals: ["vionne", "ghostcorp"] },
];

const BRANDS: Loose[] = [
  { key: "volk", name: "Volk", owner: "veshko", category: "vodka" },
  { key: "aevex-zero", name: "aevex zero", owner: "aevex", category: "synthetic" },
  { key: "vionne-noir", name: "Vionne Noir", owner: "vionne", category: "gin" },
  { key: "crowsfoot-gin", name: "Crowsfoot Gin", owner: "", category: "gin" },
];

async function warmCatalogue(): Promise<void> {
  vi.spyOn(Template, "findDescendants").mockImplementation(
    async (basePath: string) => {
      const seeds =
        basePath === Corpo.TEMPLATE_PATH_PREFIX
          ? CORPOS
          : basePath === Brand.TEMPLATE_PATH_PREFIX
            ? BRANDS
            : [];
      return seeds.map((seed) => ({
        path: `${basePath}${String(seed.key)}`,
        data: seed,
      })) as unknown as Template[];
    }
  );
  const cat = makeStuffAtPath(
    () => new CorpoCatalogue(),
    "/platform/idea/CorpoCatalogue"
  );
  await cat.postRegister();
}

describe("CorpoApi / CorpoLogic", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    await warmCatalogue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a brand key to its owning corpo", () => {
    expect(CorpoApi.corpoOfBrand("volk")?.key).toBe("veshko");
    expect(CorpoApi.corpoOfBrand("vionne-noir")?.label).toBe("Vionne");
  });

  it("resolves an independent brand to no corpo", () => {
    expect(CorpoApi.getBrand("crowsfoot-gin")?.name).toBe("Crowsfoot Gin");
    expect(CorpoApi.corpoOfBrand("crowsfoot-gin")).toBeNull();
  });

  it("resolves an unknown brand key to no corpo", () => {
    expect(CorpoApi.corpoOfBrand("nope")).toBeNull();
    expect(CorpoApi.getBrand("nope")).toBeNull();
  });

  it("resolves a branded Stuff to its corpo and brand end-to-end", () => {
    const b = makeStuff(() => {
      const bottle = new BrandedBottle();
      bottle.setBrandKey("volk");
      return bottle;
    });
    expect(CorpoApi.corpoOf(b)?.key).toBe("veshko");
    expect(CorpoApi.brandOf(b)?.name).toBe("Volk");
  });

  it("resolves an independent branded Stuff to a brand but no corpo", () => {
    const b = makeStuff(() => {
      const bottle = new BrandedBottle();
      bottle.setBrandKey("crowsfoot-gin");
      return bottle;
    });
    expect(CorpoApi.brandOf(b)?.name).toBe("Crowsfoot Gin");
    expect(CorpoApi.corpoOf(b)).toBeNull();
  });

  it("resolves a non-branded Stuff to null", () => {
    const plain = makeStuff(() => new BrandedBottle());
    plain.setBrandKey("");
    expect(CorpoApi.corpoOf(plain)).toBeNull();
    expect(CorpoApi.brandOf(plain)).toBeNull();
  });

  it("returns a corpo's portfolio (the forward edge)", () => {
    const portfolio = CorpoApi.portfolioOf("veshko");
    expect(portfolio.map((b) => b.key)).toEqual(["volk"]);
    // No corpo owns the independent brand.
    expect(
      CorpoApi.listCorpos().every(
        (c) =>
          !CorpoApi.portfolioOf(c.key).some((b) => b.key === "crowsfoot-gin")
      )
    ).toBe(true);
  });

  it("returns a corpo's rivals", () => {
    expect(CorpoApi.rivalsOf("veshko").map((c) => c.key)).toEqual(["aevex"]);
    expect(CorpoApi.rivalsOf("vionne").map((c) => c.key)).toEqual(["hollis"]);
  });

  it("drops rival keys that aren't cataloged", () => {
    // hollis rivals vionne + 'ghostcorp'; the ghost resolves away.
    expect(CorpoApi.rivalsOf("hollis").map((c) => c.key)).toEqual(["vionne"]);
  });

  it("lists every corpo and brand", () => {
    expect(CorpoApi.listCorpos().map((c) => c.key).sort()).toEqual([
      "aevex",
      "hollis",
      "veshko",
      "vionne",
    ]);
    expect(CorpoApi.listBrands()).toHaveLength(4);
  });
});
