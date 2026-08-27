/**
 * CraftingLogic.mintFromBuild — the manual-build terminal mint.
 *
 * Drives `CraftingApi.mintFromBuild` over a buffer of contributions and
 * an empty glass: the recipe reverse-match (martini), the weakest-link
 * grade, the generic fallback for an off-spec build, conservation (glass
 * filled to the summed measure), and the un-spoofable maker (live acting
 * author, then the dispatch-captured `makerPath` fallback).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CraftingApi } from "../../../../api/crafting";
import { StuffApi } from "../../../../api/stuff";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { WorldClockApi } from "../../../../api/worldclock";
import { MixinApi } from "../../../../api/mixin";
import { BulkableApi } from "../../../../api/bulk";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { Quantity } from "../../../../lib/quantity";
import Material from "../../../../lib/material/Material";
import CraftedDrink from "../../../../world/lounge/CraftedDrink";
import RecipeCatalogue from "../../RecipeCatalogue";
import { Idea } from "../../../../lib/stuff/Idea";
import { NamedMixin } from "../../../../lib/description/Named";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainmentApi } from "../../../../api/containment";
import ToolItem from "../../../thing/ToolItem";
import { Stuff } from "../../../../lib/stuff/Stuff";
import type { BuildContribution } from "../../../../lib/craft/ManualBuild";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";

const GIN = "/stuff/idea/material/spirit/gin";
const VERMOUTH = "/stuff/idea/material/spirit/vermouth";
const MARTINI_MAT = "/stuff/idea/material/cocktail/martini";
const MIXED_MAT = "/stuff/idea/material/cocktail/mixed";
const DAVE = "/world/lounge/dave-buildmint";

class TestMaker extends NamedMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestMaker";
}
class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = "TestRoomBuildMint";
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
  const g = makeStuff(() => new CraftedDrink());
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
    outputTemplate: "/world/lounge/cocktail-glass",
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

const martiniBuild: BuildContribution[] = [
  { category: "gin", measureL: 0.06, gradeBand: "fine" },
  { category: "vermouth", measureL: 0.06, gradeBand: "fair" },
];

describe("CraftingApi.mintFromBuild", () => {
  it("reverse-matches a build to a recipe and mints a graded, stamped drink", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), DAVE);
    const glass = makeGlass();
    const outcome = await mintAs(maker, {
      vessel: glass,
      contributions: martiniBuild,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.grade.getBand()).toBe("fair"); // weakest-link min(fine, fair)
    expect(MixinApi.isCrafted(outcome.output)).toBe(true);
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(slot.getMaterialPath()).toBe(MARTINI_MAT);
    expect(slot.getAmount().rawValue()).toBeCloseTo(0.12, 6); // Σ measures
    expect((outcome.output as unknown as { getRecipe(): string }).getRecipe()).toBe(
      "martini",
    );
    expect((outcome.output as unknown as { getMaker(): string }).getMaker()).toBe(
      DAVE,
    );
  });

  it("derives the weakest-link grade across the buffer", async () => {
    const glass = makeGlass();
    const outcome = await mintAs(makeStuffAtPath(() => new TestMaker(), DAVE), {
      vessel: glass,
      contributions: [
        { category: "gin", measureL: 0.06, gradeBand: "fine" },
        { category: "vermouth", measureL: 0.06, gradeBand: "poor" },
      ],
    });
    expect(outcome.ok && outcome.grade.getBand()).toBe("poor");
  });

  it("mints a generic 'mixed drink' for an off-spec build (no recipe match)", async () => {
    const glass = makeGlass();
    const outcome = await mintAs(makeStuffAtPath(() => new TestMaker(), DAVE), {
      vessel: glass,
      contributions: [{ category: "gin", measureL: 0.06, gradeBand: "fine" }],
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const slot = BulkableApi.slotFor(outcome.output, undefined)!;
    expect(slot.getMaterialPath()).toBe(MIXED_MAT);
    expect((outcome.output as unknown as { getRecipe(): string }).getRecipe()).toBe(
      "",
    );
    expect(outcome.grade.getBand()).toBe("fine");
  });

  it("falls back to the dispatch-captured makerPath outside a command frame", async () => {
    const glass = makeGlass();
    // No tagActingAuthor → getActingAuthor is null; makerPath carries it.
    const outcome = await ExecutionContextApi.runRoot(null, "test", () =>
      CraftingApi.mintFromBuild({
        vessel: glass,
        contributions: martiniBuild,
        makerPath: DAVE,
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect((outcome.output as unknown as { getMaker(): string }).getMaker()).toBe(
      DAVE,
    );
  });

  it("declines an empty build", async () => {
    const outcome = await mintAs(null, { vessel: makeGlass(), contributions: [] });
    expect(outcome).toMatchObject({ ok: false, reason: "insufficient-input" });
  });

  it("a control-bearing build vessel in the maker's reach floors the minted grade", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), DAVE);
    const room = makeStuff(() => new TestRoom());
    ContainmentApi.move(maker, room);
    const rig = makeStuff(() => new ToolItem());
    rig.setCapabilities([{ kind: "shaker", control: "exceptional" }]);
    ContainmentApi.move(rig, room);

    const outcome = await mintAs(maker, {
      vessel: makeGlass(),
      contributions: martiniBuild, // weakest-link would be `fair`
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.grade.getBand()).toBe("exceptional"); // the floor
  });
});
