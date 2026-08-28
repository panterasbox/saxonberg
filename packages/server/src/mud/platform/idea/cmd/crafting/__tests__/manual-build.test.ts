/**
 * Manual-build verbs as engaged activities — the integration capstone.
 *
 * Drives the real controllers (`pour` / `strain`) via direct `execute`
 * over hand-built models, then advances the game clock to fire the
 * engaged completion. Covers the plan's P4 ACs: a step claims/releases
 * the `hands` slot; the effect lands **at completion** (not dispatch);
 * matter is conserved across a build (bottles drain by the poured
 * measure; the strain conserves into the glass); the terminal step mints
 * a graded, stamped drink via the one quality model; and a barge-in
 * (cancel) mid-step leaves partial matter standing (the step's effect
 * never lands).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PourController from "../PourController";
import StrainController from "../StrainController";
import { CommandApi } from "../../../../../api/command";
import type { CommandContext } from "../../../../../api/command";
import type { MqlOneResult } from "../../../../../api/mql";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import { SchedulerApi } from "../../../../../api/scheduler";
import { WorldClockApi } from "../../../../../api/worldclock";
import { StuffApi } from "../../../../../api/stuff";
import { ContainmentApi } from "../../../../../api/containment";
import { BulkableApi } from "../../../../../api/bulk";
import { MixinApi } from "../../../../../api/mixin";
import { PersistenceManager } from "../../../../../../backend/PersistenceManager";
import { Quantity } from "../../../../../lib/quantity";
import Material from "../../../../../lib/material/Material";
import { Idea } from "../../../../../lib/stuff/Idea";
import { EventApi } from "../../../../../api/event";
import EventRegistry from "../../../EventRegistry";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import { EngagedMixin } from "../../../../../lib/activity/Engaged";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import GradedReceptacle from "../../../../thing/GradedReceptacle";
import CraftedDrink from "../../../../thing/CraftedDrink";
import CocktailShaker from "../../../../thing/CocktailShaker";
import RecipeCatalogue from "../../../RecipeCatalogue";
import { Stuff } from "../../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../../lib/security/__tests__/test-setup";

const GIN = "/stuff/idea/material/spirit/gin";
const VERMOUTH = "/stuff/idea/material/spirit/vermouth";
const MARTINI_MAT = "/stuff/idea/material/cocktail/martini";
const MIXED_MAT = "/platform/idea/material/blend";

class TestActor extends CommandGiverMixin(
  SensorMixin(EngagedMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

let store: Record<string, Record<string, unknown>[]>;

function registerMaterial(path: string, name: string, tags: string[]): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setKeywords(tags.slice(-1)); // primary keyword = the category tag
    return m;
  }, path);
}

function makeBottle(materialPath: string, band: string, amountL: number) {
  const b = makeStuff(() => new GradedReceptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  b.setInteriorCapacity(Quantity.of(1, "L"));
  b.setInteriorAmount(Quantity.of(amountL, "L"));
  b.setGradeBand(band);
  return b;
}

function makeGlass() {
  const g = makeStuff(() => new CraftedDrink());
  (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
  g.setInteriorCapacity(Quantity.of(0.3, "L"));
  return g;
}

const stubCommand = CommandDefinition.fromYaml(
  "verbs: [pour]\ncontroller: x\ndescription: d\n",
  "<test>",
);

function makeContext(actor: TestActor, room: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: verb,
    executionId: "t",
    commandId: "t",
    verb,
    command: stubCommand,
  });
}

/** Build an MqlOneResult-shaped model field. */
function ref(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw } as unknown as MqlOneResult;
}

let room: TestActor;
let actor: TestActor;

beforeEach(async () => {
  store = { recipes: [] };
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  SchedulerApi._clearAllForTesting();
  StuffApi.clearAll();
  // The scheduler subscribes to StuffDestructed (the host-destruction hook)
  // on start → the EventRegistry must be bootstrapped.
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/platform/idea/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
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

  registerMaterial(GIN, "house gin", ["spirit", "gin"]);
  registerMaterial(VERMOUTH, "dry vermouth", ["spirit", "vermouth"]);
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

  room = makeStuff(() => new TestActor());
  actor = makeStuff(() => new TestActor());
  ContainmentApi.move(actor, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

async function flush(): Promise<void> {
  // Drain all microtasks queued by a completion (incl. strain's async
  // mint chain) by bouncing off a real macrotask.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("pour as an engaged activity", () => {
  it("claims the hands slot, then debits + banks at completion (not dispatch)", async () => {
    const bottle = makeBottle(GIN, "fine", 0.7);
    const shaker = makeStuff(() => new CocktailShaker());
    ContainmentApi.move(bottle, room);
    ContainmentApi.move(shaker, room);

    const controller = makeStuff(() => new PourController());
    await controller.execute(
      { spirit: ref(bottle, "gin"), vessel: ref(shaker, "shaker") } as never,
      makeContext(actor, room, "pour"),
    );

    // Engaged immediately; the effect has NOT landed yet.
    expect(actor.hasEngagement("hands")).toBe(true);
    expect(shaker.isBuildEmpty()).toBe(true);
    expect(BulkableApi.slotFor(bottle, undefined)!.getAmount().rawValue()).toBeCloseTo(0.7, 6);

    // Complete on the game clock: debit 0.06, bank a gin contribution.
    WorldClockApi._advanceForTesting(3000);
    await flush();

    expect(actor.hasEngagement("hands")).toBe(false); // slot released
    expect(BulkableApi.slotFor(bottle, undefined)!.getAmount().rawValue()).toBeCloseTo(0.64, 6);
    expect(shaker.getContributions()).toHaveLength(1);
    expect(shaker.getContributions()[0]).toMatchObject({
      category: "gin",
      gradeBand: "fine",
    });
  });

  it("a second build step conflicts while the hands slot is held", async () => {
    const bottle = makeBottle(GIN, "fine", 0.7);
    const shaker = makeStuff(() => new CocktailShaker());
    ContainmentApi.move(bottle, room);
    ContainmentApi.move(shaker, room);
    const controller = makeStuff(() => new PourController());

    await controller.execute(
      { spirit: ref(bottle, "gin"), vessel: ref(shaker, "shaker") } as never,
      makeContext(actor, room, "pour"),
    );
    const ctx2 = makeContext(actor, room, "pour");
    await makeStuff(() => new PourController()).execute(
      { spirit: ref(bottle, "gin"), vessel: ref(shaker, "shaker") } as never,
      ctx2,
    );
    expect(
      ctx2.getNotes().some((n) => n.kind === "controller-rejected"),
    ).toBe(true);
  });

  it("a barge-in (cancel) mid-pour leaves the matter standing (no debit)", async () => {
    const bottle = makeBottle(GIN, "fine", 0.7);
    const shaker = makeStuff(() => new CocktailShaker());
    ContainmentApi.move(bottle, room);
    ContainmentApi.move(shaker, room);

    await makeStuff(() => new PourController()).execute(
      { spirit: ref(bottle, "gin"), vessel: ref(shaker, "shaker") } as never,
      makeContext(actor, room, "pour"),
    );
    // Barge in before the pour completes.
    SchedulerApi.cancelAll(actor);
    WorldClockApi._advanceForTesting(3000);
    await flush();

    // The pour's effect never landed: bottle full, build empty.
    expect(BulkableApi.slotFor(bottle, undefined)!.getAmount().rawValue()).toBeCloseTo(0.7, 6);
    expect(shaker.isBuildEmpty()).toBe(true);
  });
});

describe("strain as the terminal mint", () => {
  it("conserves a full build into a graded, stamped drink", async () => {
    const gin = makeBottle(GIN, "fine", 0.7);
    const vermouth = makeBottle(VERMOUTH, "fair", 0.7);
    const shaker = makeStuff(() => new CocktailShaker());
    const glass = makeGlass();
    for (const s of [gin, vermouth, shaker, glass]) ContainmentApi.move(s, room);

    // Pour gin, then vermouth (two completed engaged steps).
    for (const bottle of [gin, vermouth]) {
      await makeStuff(() => new PourController()).execute(
        { spirit: ref(bottle, "x"), vessel: ref(shaker, "shaker") } as never,
        makeContext(actor, room, "pour"),
      );
      WorldClockApi._advanceForTesting(3000);
      await flush();
    }
    // Conservation: each bottle drained 0.06; buffer holds 0.12.
    expect(BulkableApi.slotFor(gin, undefined)!.getAmount().rawValue()).toBeCloseTo(0.64, 6);
    expect(BulkableApi.slotFor(vermouth, undefined)!.getAmount().rawValue()).toBeCloseTo(0.64, 6);
    expect(shaker.getBuildVolumeL()).toBeCloseTo(0.12, 6);

    // Strain into the glass.
    await makeStuff(() => new StrainController()).execute(
      { vessel: ref(shaker, "shaker"), glass: ref(glass, "glass") } as never,
      makeContext(actor, room, "strain"),
    );
    WorldClockApi._advanceForTesting(2500);
    await flush();

    // Terminal: the glass is a graded, recipe-stamped martini; buffer cleared.
    expect(MixinApi.isCrafted(glass)).toBe(true);
    const slot = BulkableApi.slotFor(glass, undefined)!;
    expect(slot.getMaterialPath()).toBe(MARTINI_MAT);
    expect(slot.getAmount().rawValue()).toBeCloseTo(0.12, 6); // mass conserved
    expect((glass as unknown as { getGradeBand(): string }).getGradeBand()).toBe("fair");
    expect((glass as unknown as { getRecipe(): string }).getRecipe()).toBe("martini");
    expect(shaker.isBuildEmpty()).toBe(true);
  });
});
