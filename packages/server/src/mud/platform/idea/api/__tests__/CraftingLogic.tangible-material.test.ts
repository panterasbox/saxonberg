/**
 * ⭐⭐ **What a tangible mint's output is MADE OF** — the two rules the
 * ferrous ladder needs, on both mint paths.
 *
 * 1. **An authored `outputMaterial` wins; the stock's flows otherwise.**
 *    The field has existed since the first recipe schema and the edible
 *    and bulk paths read it; the tangible path did not, so a transform
 *    that genuinely CHANGES what the matter is had no way to say so.
 *    That is right for a knife — a steel bar makes a steel knife — and
 *    wrong for the one smithing act that is a chemical change rather
 *    than a shaping: hammering a BLOOM squeezes the slag out of it, and
 *    what is left is iron, not bloom iron.
 *
 * 2. ⭐ **A piece's own alloying rides the transform** when both ends can
 *    carry it. That is what keeps a carburized bar's carbon through
 *    consolidation: the MATERIAL becomes iron (the kind changed) and the
 *    carbon figure is still this piece's own.
 *
 * ⚠ And the negative case, which is the host-placement claim asserted
 * rather than argued: a knife is NOT Alloyed and silently takes nothing.
 * A blade's metal is its Material row.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CraftingApi } from "../../../../api/crafting";
import { StuffApi } from "../../../../api/stuff";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { WorldClockApi } from "../../../../api/worldclock";
import { MixinApi } from "../../../../api/mixin";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { Quantity } from "../../../../lib/quantity";
import Material from "../../../../lib/material/Material";
import Ingot from "../../../thing/Ingot";
import { AlloyedMixin } from "../../../../lib/material/Alloyed";
import RecipeCatalogue from "../../RecipeCatalogue";
import { Idea } from "../../../../lib/stuff/Idea";
import { NamedMixin } from "../../../../lib/description/Named";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { CraftedMixin } from "../../../../lib/craft/Crafted";
import Thing from "../../../../lib/stuff/Thing";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { BuildContribution } from "../../../../lib/craft/ManualBuild";
import { makeStuff, makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";

const IRON = "/stuff/idea/material/element/iron";
const CARBON = "/stuff/idea/material/element/carbon";
const BLOOM_IRON = "/stuff/idea/material/alloy/bloom-iron";
const BAR_T = "/trade/smithing/thing/iron-ingot";
const KNIFE_T = "/stuff/thing/arms/belt-knife";
const SMITH = "/test/agent/smith-tangible";

class TestMaker extends NamedMixin(ContainableMixin(Idea)) {
  static _mixinName = "TestMakerTangible";
}
/** A Crafted output that is NOT Alloyed — a blade. */
class TestKnife extends CraftedMixin(Thing) {
  static _mixinName = "TestKnifeTangible";
}
/**
 * A Crafted output that IS Alloyed — the shape a made piece of metal
 * stock takes.
 *
 * ⚠⚠ `mintWorkpiece` REQUIRES its recipe output to compose
 * `CraftedMixin` (it stamps a maker's mark on it), and `isItemCandidate`
 * EXCLUDES a Crafted non-food from the one-shot `forge` gather (a made
 * form is not raw matter). Those two rules are a pincer on any recipe
 * whose output is meant to be STOCK for the next recipe: a plain `Ingot`
 * cannot be minted, and a Crafted bar cannot be forged. It is why this
 * build's bloom consolidation is a transform at the hammer rather than a
 * recipe at the quench — see the plan's W4 note. The rules under test
 * here are the kernel's and hold either way.
 */
class TestCastPiece extends CraftedMixin(AlloyedMixin(Thing)) {
  static _mixinName = "TestCastPieceTangible";
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

/** A workpiece: an `Ingot` of `materialPath`, optionally carburized. */
function workpiece(materialPath: string, carbon = 0): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMass(Quantity.of(2, "kg"));
  i.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath) as Material);
  if (carbon > 0) i.setFractionOf(CARBON, carbon);
  return i;
}

async function mint(
  maker: Stuff,
  req: Parameters<typeof CraftingApi.mintFromBuild>[0],
): ReturnType<typeof CraftingApi.mintFromBuild> {
  return ExecutionContextApi.runRoot(null, "test", () => {
    ExecutionContextApi.tagActingAuthor(maker);
    return CraftingApi.mintFromBuild(req);
  }) as ReturnType<typeof CraftingApi.mintFromBuild>;
}

/**
 * The banked build a hammered workpiece leaves behind — exactly what
 * `ManualBuild.bankWorkpiece` writes. ⚠ No `category`: a slot matches
 * against the material's authored TAG SET, which is why the fixture
 * carries `tags` and not a word.
 */
function banked(materialPath: string, tags: string[]): BuildContribution[] {
  return [
    { measureL: 0, gradeBand: "fair", kind: "item", count: 1, tags, materialPath },
  ];
}

const bloomBuild = banked(BLOOM_IRON, ["metal", "ferrous", "bloom"]);
const ironBuild = banked(IRON, ["metal", "ferrous", "forgeable"]);

beforeEach(async () => {
  store = { recipes: [] };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
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

  registerMaterial(IRON, "iron", ["metal", "ferrous", "forgeable"]);
  registerMaterial(CARBON, "carbon", ["element"]);
  registerMaterial(BLOOM_IRON, "bloom iron", ["metal", "ferrous", "bloom"]);

  // The consolidate recipe: bloom in, IRON out — an authored change of
  // kind, because the slag left on the floor.
  store.recipes!.push({
    recipeId: "consolidate-bloom",
    name: "Consolidate a Bloom",
    keywords: ["bloom", "bar"],
    inputSlots: [{ slot: "stock", category: "bloom", minGrade: "fair", kind: "item", count: 1 }],
    toolCapabilities: ["striking", "anvil"],
    outputTemplate: BAR_T,
    outputMaterial: IRON,
    outputApplication: "tangible",
    baseGradeBand: "",
    requiresHeatK: 1100,
    difficulty: "standard",
    discipline: "smithing",
  });
  // …and a shaping recipe, which authors NO output material, so the
  // stock's flows exactly as it always has.
  store.recipes!.push({
    recipeId: "belt-knife",
    name: "Belt Knife",
    keywords: ["knife"],
    inputSlots: [{ slot: "stock", category: "forgeable", minGrade: "fair", kind: "item", count: 1 }],
    toolCapabilities: ["striking", "anvil"],
    outputTemplate: KNIFE_T,
    outputMaterial: "",
    outputApplication: "tangible",
    baseGradeBand: "",
    requiresHeatK: 1400,
    difficulty: "standard",
    discipline: "smithing",
  });

  vi.spyOn(StuffApi, "clone").mockImplementation(async (path: string) => {
    if (path === BAR_T) return makeStuff(() => new TestCastPiece()) as never;
    if (path === KNIFE_T) return makeStuff(() => new TestKnife()) as never;
    if (path === "/stuff/thing/Casting") {
      const { default: Casting } = await import("../../../thing/Casting");
      return makeStuff(() => new Casting()) as never;
    }
    throw new Error(`unexpected clone ${path}`);
  });

  const catalogue = makeStuffAtPath(() => new RecipeCatalogue(), "/platform/idea/RecipeCatalogue");
  await catalogue.warm();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe("a tangible mint's output material", () => {
  it("⭐⭐ an authored outputMaterial WINS — a bloom becomes IRON, not bloom iron", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), SMITH);
    const outcome = await mint(maker, {
      workpiece: workpiece(BLOOM_IRON),
      contributions: bloomBuild,
      heatedToK: 1200,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.recipeId).toBe("consolidate-bloom");
    expect(MixinApi.isTangible(outcome.output)).toBe(true);
    // The kind CHANGED: the recipe said what the transform makes, and
    // it is not what went in.
    expect((outcome.output as Stuff & { getMaterial(): Material | null })
      .getMaterial()!.getName()).toBe("iron");
  });

  it("⭐ a recipe that authors NONE flows the stock's material, exactly as before", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), SMITH);
    const outcome = await mint(maker, {
      workpiece: workpiece(IRON),
      contributions: ironBuild,
      heatedToK: 1450,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.recipeId).toBe("belt-knife");
    expect((outcome.output as Stuff & { getMaterial(): Material | null })
      .getMaterial()!.getName()).toBe("iron");
  });

  it("⭐⭐ the piece's own CARBON rides the transform onto an Alloyed output", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), SMITH);
    const outcome = await mint(maker, {
      workpiece: workpiece(BLOOM_IRON, 0.006),
      contributions: bloomBuild,
      heatedToK: 1200,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // The material became iron and the carbon is still this bar's own —
    // which is exactly what makes a carburized bloom a STEEL bar.
    expect(MixinApi.isAlloyed(outcome.output)).toBe(true);
    expect(MixinApi.isAlloyed(outcome.output) && outcome.output.fractionOf(CARBON))
      .toBeCloseTo(0.006, 8);
  });

  it("⚠ a NON-Alloyed output silently takes nothing — a blade's metal is its row", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), SMITH);
    const outcome = await mint(maker, {
      workpiece: workpiece(IRON, 0.006),
      contributions: ironBuild,
      heatedToK: 1450,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // No guard was needed and none was added: the knife does not compose
    // the mixin, so there is nothing to write and nothing to refuse.
    expect(MixinApi.isAlloyed(outcome.output)).toBe(false);
  });

  it("⚠ the OFF-SPEC lump keeps the carbon — one mistake, not two", async () => {
    const maker = makeStuffAtPath(() => new TestMaker(), SMITH);
    const outcome = await mint(maker, {
      workpiece: workpiece(IRON, 0.012),
      contributions: ironBuild,
      // Under the knife's 1400 K, so nothing matches and the generic
      // worked lump is what you get.
      heatedToK: 700,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.recipeId).toBe("");
    // A player who spent three smelts carburizing a bar and quenched it
    // at the wrong heat made a mistake about the FORM. Losing the
    // chemistry too would punish them twice, and the Casting is
    // re-meltable precisely so the work is recoverable.
    expect(MixinApi.isAlloyed(outcome.output)).toBe(true);
    expect(MixinApi.isAlloyed(outcome.output) && outcome.output.fractionOf(CARBON))
      .toBeCloseTo(0.012, 8);
  });
});
