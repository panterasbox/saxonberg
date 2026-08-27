/**
 * BrandedMixin tests — the per-product mark: resolve-on-read brand / corpo
 * accessors (through CorpoApi over a warmed catalogue), the independent
 * (null-corpo) case, the unbranded / unknown cases, the derived corpo line
 * in the long-description perception surface, and the MQL projection.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BrandedBottle from "../../../platform/thing/corpo/BrandedBottle";
import CorpoCatalogue from "../../../platform/idea/CorpoCatalogue";
import Corpo from "../../../platform/idea/corpo/Corpo";
import Brand from "../../../platform/idea/corpo/Brand";
import Thing from "../../stuff/Thing";
import { Stuff } from "../../stuff/Stuff";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { MixinApi } from "../../../api/mixin";
import { Template } from "../../stuff/Template";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

type Loose = Record<string, unknown>;

const CORPOS: Loose[] = [{ key: "veshko", label: "Veshko" }];
const BRANDS: Loose[] = [
  { key: "volk", name: "Volk", owner: "veshko", category: "vodka" },
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
      const prefix = basePath;
      return seeds.map((seed) => ({
        path: `${prefix}${String(seed.key)}`,
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

function bottle(brandKey: string, long = "A squat bottle."): BrandedBottle {
  return makeStuff(() => {
    const b = new BrandedBottle();
    b.setShortDescription("a bottle");
    b.setLongDescription(long);
    b.setBrandKey(brandKey);
    return b;
  });
}

describe("BrandedMixin", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    await warmCatalogue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips the brand key", () => {
    const b = bottle("volk");
    expect(b.getBrandKey()).toBe("volk");
  });

  it("resolves an owned brand to its brand and corpo", () => {
    const b = bottle("volk");
    expect(b.getBrand()?.name).toBe("Volk");
    expect(b.getCorpo()?.key).toBe("veshko");
    expect(b.getCorpo()?.label).toBe("Veshko");
  });

  it("resolves an independent brand to a brand but no corpo", () => {
    const b = bottle("crowsfoot-gin");
    expect(b.getBrand()?.name).toBe("Crowsfoot Gin");
    expect(b.getCorpo()).toBeNull();
  });

  it("an unbranded product resolves to null brand and corpo", () => {
    const b = bottle("");
    expect(b.getBrand()).toBeNull();
    expect(b.getCorpo()).toBeNull();
  });

  it("an unknown brand key resolves to null brand and corpo", () => {
    const b = bottle("does-not-exist");
    expect(b.getBrand()).toBeNull();
    expect(b.getCorpo()).toBeNull();
  });

  it("appends the derived corpo line to the long description", () => {
    const viewer = makeStuff(() => new Thing()) as unknown as Stuff;
    const out = bottle("volk").getMarkupLong(viewer);
    expect(out).toContain("A squat bottle.");
    expect(out).toContain("a product of Veshko");
  });

  it("renders the independent line for an independent brand", () => {
    const viewer = makeStuff(() => new Thing()) as unknown as Stuff;
    const out = bottle("crowsfoot-gin").getMarkupLong(viewer);
    expect(out).toContain("an independent label");
  });

  it("leaves the description untouched when unbranded", () => {
    const viewer = makeStuff(() => new Thing()) as unknown as Stuff;
    const out = bottle("").getMarkupLong(viewer);
    expect(out).not.toContain("a product of");
    expect(out).not.toContain("independent label");
  });

  it("projects the mark into the MQL subscribable surface", () => {
    const b = bottle("volk");
    const fields = MixinApi.getAllSubscribableFields(
      BrandedBottle as unknown as Parameters<
        typeof MixinApi.getAllSubscribableFields
      >[0]
    );
    const brandField = fields.find((f) => f.name === "brand");
    const corpoField = fields.find((f) => f.name === "corpo");
    expect(brandField).toBeDefined();
    expect(corpoField).toBeDefined();
    expect(
      (brandField as unknown as { read: (s: unknown) => unknown }).read(b)
    ).toBe("volk");
    expect(
      (corpoField as unknown as { read: (s: unknown) => unknown }).read(b)
    ).toBe("veshko");
  });

  it("projects a null corpo for an independent brand", () => {
    const b = bottle("crowsfoot-gin");
    const fields = MixinApi.getAllSubscribableFields(
      BrandedBottle as unknown as Parameters<
        typeof MixinApi.getAllSubscribableFields
      >[0]
    );
    const corpoField = fields.find((f) => f.name === "corpo");
    expect(
      (corpoField as unknown as { read: (s: unknown) => unknown }).read(b)
    ).toBeNull();
  });
});
