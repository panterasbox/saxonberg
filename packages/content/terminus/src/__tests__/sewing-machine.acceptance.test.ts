/**
 * The sewing machine end to end: a `MendingTool` ROW whose `mending`
 * spec (rate 3, control fine) works in a third the time (asserted in
 * tool-pacing.test.ts) and floors a repaired soft good's grade at
 * `fine`. Reads the REAL seed row, so a drifted seed fails here.
 *
 * ⭐ It shares its class with the sewing KIT, and the line between them
 * is the point: what they AFFORD is identical and lives on the class
 * (`repair`, `salvage`, once); what they are LIKE — rate, control —
 * varies per row. The machine was a bare `ToolItem` row naming its own
 * verbs until verbs became a single class-level record; a row can no
 * longer vary its verb set, and nothing here wanted to.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { CommandApi } from "@saxonberg/server/mud/api/command";
import { CraftingApi } from "@saxonberg/server/mud/api/crafting";
import { ExecutionContextApi } from "@saxonberg/server/mud/api/execution-context";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";
import { PersistenceManager } from "@saxonberg/server/mud/lib/persistence/__tests__/backend-store";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import Material from "@saxonberg/server/mud/lib/material/Material";
import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import Armor from "@saxonberg/server/mud/platform/thing/equipment/Armor";
import MendingTool from "@saxonberg/server/mud/platform/thing/MendingTool";
import PersistentHydrator from "@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator";
import RecipeCatalogue from "@saxonberg/server/mud/platform/idea/RecipeCatalogue";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { ContainableMixin } from "@saxonberg/server/mud/lib/spatial/Containable";
import { CommandGiverMixin } from "@saxonberg/server/mud/lib/command/CommandGiver";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";

const SEED = fileURLToPath(
  new URL(
    "../../../terminus/content/world/terminus/general-store/goods/sewing-machine.yaml",
    import.meta.url,
  ),
);
const LEATHER = "/stuff/idea/material/_test/sm-leather";

class Room extends ContainerMixin(Idea) {}
class Shopper extends ContainerMixin(
  CommandGiverMixin(ContainableMixin(Idea)),
) {}

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(async () => [] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

async function hydrateMachine(): Promise<MendingTool> {
  const seed = YAML.parse(readFileSync(SEED, "utf8")) as Seed;
  // One class shared with the sewing kit — they afford identically.
  expect(seed.class).toBe("/platform/thing/MendingTool");
  const machine = makeStuff(() => new MendingTool());
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName("iron");
    m.setTags(["metal"]);
    return m;
  }, "/stuff/idea/material/element/iron");
  const data = { ...seed.data };
  delete data["_materialPath"]; // instruction field — not this test's business
  await makeStuff(() => new PersistentHydrator()).hydrate(machine, data);
  return machine;
}

describe("the sewing machine (a MendingTool row)", () => {
  it("the seed's spec confers rate 3 + control fine on the mending kind", async () => {
    const machine = await hydrateMachine();
    expect(machine.hasCapability("mending")).toBe(true);
    expect(machine.capabilityRate("mending")).toBe(3);
    expect(machine.capabilityControl("mending")).toBe("fine");
    expect(machine.getMass().rawValue()).toBe(18); // shop capital by mass
  });

  it("carried, it affords repair/salvage with zero code; dropped keeps them reachable", async () => {
    CommandApi.getCommand("platform/cmd/crafting/repair.yaml");
    const room = makeStuff(() => new Room());
    const shopper = makeStuff(() => new Shopper());
    ContainmentApi.move(shopper, room);
    const machine = await hydrateMachine();

    const affords = (verb: string): boolean =>
      shopper.getAvailableCommands().some((c) => c.verbs.includes(verb));

    expect(affords("repair")).toBe(false);
    ContainmentApi.move(machine, shopper);
    expect(affords("repair")).toBe(true);
    expect(affords("salvage")).toBe(true);
    ContainmentApi.move(machine, room); // on the floor: still reachable
    expect(affords("repair")).toBe(true);
  });

  it("a worn soft good repaired with it comes out floored at fine", async () => {
    const room = makeStuff(() => new Room());
    const smith = makeStuff(() => new Shopper());
    ContainmentApi.move(smith, room);
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName("leather");
      m.setTags(["organic", "leather", "hide"]);
      return m;
    }, LEATHER);
    const catalogue = makeStuffAtPath(
      () => new RecipeCatalogue(),
      "/platform/idea/RecipeCatalogue",
    );
    await catalogue.warm();

    const machine = await hydrateMachine();
    ContainmentApi.move(machine, room);
    const hide = makeStuff(() => new Thing());
    hide.setMaterial(
      StuffApi.findByTemplatePath<Material>(LEATHER) as unknown as Material,
    );
    hide.setMass(Quantity.of(2, "kg"));
    ContainmentApi.move(hide, room);

    const jerkin = makeStuff(() => new Armor());
    jerkin.setMaterial(
      StuffApi.findByTemplatePath<Material>(LEATHER) as unknown as Material,
    );
    jerkin.setMass(Quantity.of(4, "kg"));
    jerkin.setCondition(0.4);
    (jerkin as unknown as { setGradeBand(b: string): void }).setGradeBand(
      "poor",
    );
    ContainmentApi.move(jerkin, room);

    const outcome = await ExecutionContextApi.runRoot(null, "test", () => {
      ExecutionContextApi.tagActingAuthor(smith as unknown as Stuff);
      return CraftingApi.repair({ item: jerkin });
    });
    expect(outcome.ok).toBe(true);
    expect(jerkin.getCondition()).toBe(1);
    expect(
      (jerkin as unknown as { getGradeBand(): string }).getGradeBand(),
    ).toBe("fine"); // the machine's control floor
  });
});
