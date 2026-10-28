/**
 * ⭐⭐ A recipe is a PROPORTION (ceramics re-plan R1-D2/D3). The by-hand
 * build matches a recipe while every bulk category's mass fraction sits
 * within `crafting.proportion.tolerance` (0.12) of the recipe's, the
 * build holds at least `crafting.proportion.minScale` (0.5) of the
 * recipe's measured mass, every category is present and nothing is left
 * over. Off the proportion it costs grade — a third of the tolerance is
 * free, two thirds one band, the rest two — and past it the build is
 * something else (pot-luck).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CraftingApi } from "../../../../api/crafting";
import { StuffApi } from "../../../../api/stuff";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { WorldClockApi } from "../../../../api/worldclock";
import { BulkableApi } from "../../../../api/bulk";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { Quantity } from "../../../../lib/quantity";
import Material from "../../../../lib/material/Material";
import CraftVessel from "../../../thing/CraftVessel";
import RecipeCatalogue from "../../RecipeCatalogue";
import { Idea } from "../../../../lib/stuff/Idea";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { NamedMixin } from "../../../../lib/description/Named";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import type { BuildContribution } from "../../../../lib/craft/ManualBuild";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";

const GIN = "/stuff/idea/material/spirit/gin";
const VERMOUTH = "/stuff/idea/material/spirit/vermouth";
const MARTINI_MAT = "/stuff/idea/material/cocktail/martini";
const MIXED_MAT = "/platform/idea/material/blend";
const DAVE = "/test/lounge/dave-proportion";

class TestMaker extends NamedMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestMakerProportion";
}

let store: Record<string, Record<string, unknown>[]>;

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, path);
}

function makeGlass() {
  const g = makeStuff(() => new CraftVessel());
  (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
  g.setInteriorCapacity(Quantity.of(0.3, "L"));
  return g;
}

function mintAs(
  principal: Stuff | null,
  req: Parameters<typeof CraftingApi.mintFromBuild>[0],
): ReturnType<typeof CraftingApi.mintFromBuild> {
  return ExecutionContextApi.runRoot(null, "test", () => {
    if (principal) ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.mintFromBuild(req);
  }) as ReturnType<typeof CraftingApi.mintFromBuild>;
}

beforeEach(async () => {
  store = { recipes: [] };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      // Recipes are `documents` rows of kind `recipe` (content-packs wave
      // 2); the fixtures keep the legacy row shape and are wrapped here.
      if (col === "documents" && query.kind === "recipe") {
        return (store["recipes"] ?? []).map((d) => ({
          path: `/generic-objects/recipes/${String(d.recipeId)}`,
          owner: "/generic-objects",
          kind: "recipe",
          data: d,
        })) as never;
      }
      return (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 1000);

  registerMaterial(GIN, "house gin", ["gin"]);
  registerMaterial(VERMOUTH, "dry vermouth", ["vermouth"]);
  registerMaterial(MARTINI_MAT, "martini", ["cocktail"]);
  registerMaterial(MIXED_MAT, "mixed drink", ["cocktail"]);

  store.recipes!.push({
    recipeId: "martini",
    name: "Gin Martini",
    keywords: ["martini"],
    inputSlots: [
      { slot: "base", category: "gin", minGrade: "fair", measureL: 0.06 },
      { slot: "mod", category: "vermouth", minGrade: "fair", measureL: 0.01 },
    ],
    toolCapabilities: ["mixing-glass"],
    outputTemplate: "/trade/hospitality/thing/coupe",
    outputMaterial: MARTINI_MAT,
    baseGradeBand: "",
  });
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    "/platform/idea/RecipeCatalogue",
  );
  await catalogue.warm();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});


function pour(category: string, measureL: number, gradeBand = "exceptional"): BuildContribution {
  return { category, measureL, gradeBand };
}

async function build(contributions: BuildContribution[]) {
  return mintAs(makeStuffAtPath(() => new TestMaker(), DAVE), {
    vessel: makeGlass(),
    contributions,
  });
}

describe("matching by proportion", () => {
  it("60 + 10 is the martini at full grade", async () => {
    const out = await build([pour("gin", 0.06), pour("vermouth", 0.01)]);
    expect(out.ok && out.recipeId).toBe("martini");
    expect(out.ok && out.grade.getBand()).toBe("exceptional");
  });

  it("60 + 15 is still a martini, one band down (d ≈ 0.057)", async () => {
    const out = await build([pour("gin", 0.06), pour("vermouth", 0.015)]);
    expect(out.ok && out.recipeId).toBe("martini");
    expect(out.ok && out.grade.getBand()).toBe("fine");
  });

  it("60 + 20 is a lean martini, two bands down (d ≈ 0.107)", async () => {
    const out = await build([pour("gin", 0.06), pour("vermouth", 0.02)]);
    expect(out.ok && out.recipeId).toBe("martini");
    expect(out.ok && out.grade.getBand()).toBe("fair");
  });

  it("60 + 30 is off the proportion: pot-luck", async () => {
    const out = await build([pour("gin", 0.06), pour("vermouth", 0.03)]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.recipeId).toBe("");
    expect(BulkableApi.slotFor(out.output, undefined)!.getMaterialPath()).toBe(MIXED_MAT);
  });

  it("two pours of gin are one gin", async () => {
    const out = await build([
      pour("gin", 0.03),
      pour("vermouth", 0.01),
      pour("gin", 0.03),
    ]);
    expect(out.ok && out.recipeId).toBe("martini");
    expect(out.ok && out.grade.getBand()).toBe("exceptional");
  });

  it("a half-scale martini is a martini; a thimble is a taste", async () => {
    const half = await build([pour("gin", 0.03), pour("vermouth", 0.005)]);
    expect(half.ok && half.recipeId).toBe("martini");
    const thimble = await build([pour("gin", 0.012), pour("vermouth", 0.002)]);
    expect(thimble.ok && thimble.recipeId).toBe("");
  });

  it("weighs by the banked material's density, not the litre", async () => {
    // A heavy vermouth (2000 kg/m³): 10 ml of it is 20 g against 60 g of
    // gin, so the fraction is a lean martini's by mass.
    StuffApi.findByTemplatePath<Material>(VERMOUTH)!.setDensity(Quantity.of(2000, "kg/m³"));
    StuffApi.findByTemplatePath<Material>(GIN)!.setDensity(Quantity.of(1000, "kg/m³"));
    const out = await build([
      { ...pour("gin", 0.06), materialPath: GIN },
      { ...pour("vermouth", 0.01), materialPath: VERMOUTH },
    ]);
    // Target and build both read the BANKED density, so the authored
    // litres still match exactly.
    expect(out.ok && out.recipeId).toBe("martini");
    expect(out.ok && out.grade.getBand()).toBe("exceptional");
  });

  it("an unlisted pour is a leftover: the build is something else", async () => {
    const out = await build([
      pour("gin", 0.06),
      pour("vermouth", 0.01),
      pour("juice", 0.01),
    ]);
    expect(out.ok && out.recipeId).toBe("");
  });

  it("a missing category is no match however close the rest", async () => {
    const out = await build([pour("gin", 0.06)]);
    expect(out.ok && out.recipeId).toBe("");
  });

  it("a zero-measure slot is presence-only, outside the sum", async () => {
    store.recipes!.push({
      recipeId: "steep",
      name: "Steep",
      keywords: ["steep"],
      inputSlots: [
        { slot: "leaf", category: "leaf", minGrade: "poor" },
        { slot: "water", category: "water", minGrade: "poor", measureL: 0.25 },
      ],
      toolCapabilities: [],
      outputTemplate: "/trade/hospitality/thing/coupe",
      outputMaterial: MARTINI_MAT,
      baseGradeBand: "",
    });
    await StuffApi.findByTemplatePath<RecipeCatalogue>("/platform/idea/RecipeCatalogue")!.warm();
    const steeped = await build([pour("water", 0.25), pour("leaf", 0.5)]);
    expect(steeped.ok && steeped.recipeId).toBe("steep");
    const bare = await build([pour("water", 0.25)]);
    expect(bare.ok && bare.recipeId).toBe("");
  });

  it("of two recipes over the same parts, the closer proportion wins", async () => {
    store.recipes!.push({
      recipeId: "wet-martini",
      name: "Wet Martini",
      keywords: ["wet martini"],
      inputSlots: [
        { slot: "base", category: "gin", minGrade: "fair", measureL: 0.06 },
        { slot: "mod", category: "vermouth", minGrade: "fair", measureL: 0.02 },
      ],
      toolCapabilities: ["mixing-glass"],
      outputTemplate: "/trade/hospitality/thing/coupe",
      outputMaterial: MARTINI_MAT,
      baseGradeBand: "",
    });
    await StuffApi.findByTemplatePath<RecipeCatalogue>("/platform/idea/RecipeCatalogue")!.warm();
    const wet = await build([pour("gin", 0.06), pour("vermouth", 0.02)]);
    expect(wet.ok && wet.recipeId).toBe("wet-martini");
    expect(wet.ok && wet.grade.getBand()).toBe("exceptional");
    const dry = await build([pour("gin", 0.06), pour("vermouth", 0.01)]);
    expect(dry.ok && dry.recipeId).toBe("martini");
  });
});
