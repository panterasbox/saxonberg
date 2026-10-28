/**
 * ⭐ One mint, two namers (ceramics re-plan R1-D7): a compounding
 * vessel's CHARGE runs the path a shaker's buffer runs. Its pieces and
 * belly are read as contributions, folded by mass, carry their spoilage
 * and the maker into the product, and are consumed by the mint; the
 * vessel's `productMaterial` names what it makes, and a vessel that names
 * nothing falls to the matched recipe, else the generic pot-luck.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CraftingApi } from "../../../../api/crafting";
import { StuffApi } from "../../../../api/stuff";
import { ContainmentApi } from "../../../../api/containment";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { WorldClockApi } from "../../../../api/worldclock";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { Quantity } from "../../../../lib/quantity";
import Material from "../../../../lib/material/Material";
import CompoundingVessel from "../../../thing/CompoundingVessel";
import Provision from "../../../thing/Provision";
import RecipeCatalogue from "../../RecipeCatalogue";
import { Idea } from "../../../../lib/stuff/Idea";
import { NamedMixin } from "../../../../lib/description/Named";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const ROOT = "/stuff/idea/material/_charge";
const CURD = `${ROOT}/curd`;
const HERB = `${ROOT}/herb`;
const WATER = `${ROOT}/water`;
const PASTE = `${ROOT}/paste`;
const COOKED = "/platform/idea/material/cooked";
const PRODUCT_ROW = "/stuff/thing/_charge/paste";
const MAKER = "/world/_charge/maker";

class TestMaker extends NamedMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestMakerCharge";
}

function material(path: string, name: string, tags: string[] = []): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(1000, "kg/m³"));
    return m;
  }, path) as unknown as Material;
}

function piece(path: string, kg: number): Provision {
  const p = makeStuff(() => new Provision());
  p.setMaterial(StuffApi.findByTemplatePath<Material>(path) as unknown as Material);
  p.setMass(Quantity.of(kg, "kg"));
  return p;
}

function tub(productMaterial: string, productTemplate: string): CompoundingVessel {
  return makeStuff(() => {
    const v = new CompoundingVessel();
    (v as unknown as { productMaterial: string }).productMaterial = productMaterial;
    (v as unknown as { productTemplate: string }).productTemplate = productTemplate;
    v.interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(20, "L"));
    return v;
  });
}

function mintAs(maker: Stuff, v: CompoundingVessel): ReturnType<typeof CraftingApi.mintFromBuild> {
  return ExecutionContextApi.runRoot(null, "test", () => {
    ExecutionContextApi.tagActingAuthor(maker);
    return CraftingApi.mintFromBuild({ charge: v });
  }) as ReturnType<typeof CraftingApi.mintFromBuild>;
}

beforeEach(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  // An empty recipe book: nothing a charge holds matches a recipe.
  vi.spyOn(pm, "find").mockImplementation((async () => []) as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  material(CURD, "curd");
  material(HERB, "herb");
  material(WATER, "water", ["water"]);
  material(PASTE, "paste");
  material(COOKED, "cooked food");
  const realClone = StuffApi.clone;
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === PRODUCT_ROW) return makeStuff(() => new Provision());
    return (realClone as (...a: unknown[]) => Promise<Stuff>).call(StuffApi, path, ...rest);
  }) as never);
  const catalogue = makeStuffAtPath(() => new RecipeCatalogue(), "/platform/idea/RecipeCatalogue");
  await catalogue.warm();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("a charge runs the one mint", () => {
  it("⭐ two pieces and a belly mint the vessel's product: the mass fold, the loads, the maker, the charge consumed", async () => {
    const v = tub(PASTE, PRODUCT_ROW);
    v.setBulkMaterial("interior", StuffApi.findByTemplatePath<Material>(WATER)!);
    v.setBulkAmount("interior", Quantity.of(1, "L"));
    const spoiled = piece(CURD, 2);
    spoiled.setMicrobialLoad(0.8);
    spoiled.setPathogenLoads({ salmonella: 0.5 });
    const clean = piece(HERB, 1);
    ContainmentApi.move(spoiled as never, v as never);
    ContainmentApi.move(clean as never, v as never);
    const maker = makeStuffAtPath(() => new TestMaker(), MAKER);

    const out = await mintAs(maker, v);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.recipeId).toBe("");
    const product = out.output as unknown as Provision;
    expect(product).toBeInstanceOf(Provision);
    expect(product.getMaterial()?.getTemplatePath()).toBe(PASTE);
    expect(product.getMass().rawValue()).toBeCloseTo(4, 6);
    // 2 kg curd + 1 kg herb + 1 L water, by mass.
    expect(product.fractionOf(CURD)).toBeCloseTo(0.5, 6);
    expect(product.fractionOf(HERB)).toBeCloseTo(0.25, 6);
    expect(product.fractionOf(WATER)).toBeCloseTo(0.25, 6);
    // ⭐ A spoiled curd compounded in does not come out clean.
    expect(product.getMicrobialLoad()).toBeCloseTo(0.4, 6);
    expect(product.getPathogenLoads().salmonella ?? 0).toBeGreaterThan(0);
    expect(product.getMaker()).toBe(MAKER);
    // The charge is consumed: the inputs are gone, the belly is empty, and
    // the product is what the vessel holds.
    expect(spoiled.isDestroyed()).toBe(true);
    expect(clean.isDestroyed()).toBe(true);
    expect(v.getBulkAmount("interior").rawValue()).toBe(0);
    expect(v.getContents()).toEqual([product]);
  });

  it("a vessel that names no product and matches no recipe falls to the pot-luck", async () => {
    const v = tub("", "");
    const p = piece(HERB, 1);
    ContainmentApi.move(p as never, v as never);
    const maker = makeStuffAtPath(() => new TestMaker(), MAKER);

    const out = await mintAs(maker, v);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.output).toBe(v);
    expect(out.recipeId).toBe("");
    expect(p.isDestroyed()).toBe(true);
    expect(v.getBulkMaterial("interior")?.getTemplatePath()).toBe(COOKED);
    expect(v.getBulkAmount("interior").rawValue()).toBeGreaterThan(0);
    expect(v.getBulkPayload("interior")?.maker).toBe(MAKER);
  });

  it("a charge on something that does not compound is refused", async () => {
    const notATub = makeStuff(() => new Provision());
    const out = await CraftingApi.mintFromBuild({ charge: notATub });
    expect(out).toEqual({ ok: false, reason: "no-output", detail: "not-compounding" });
  });
});
