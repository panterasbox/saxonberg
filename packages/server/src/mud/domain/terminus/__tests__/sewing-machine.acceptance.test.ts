/**
 * The capability table's acceptance content, end to end: the sewing
 * machine is a SEED-ONLY variant — `class: /lib/craft/ToolItem`, no
 * class of its own — whose `mending` spec (rate 3, control fine)
 * confers the repair/salvage surface when carried, works in a third
 * the time (asserted in tool-pacing.test.ts), and floors a repaired
 * soft good's grade at `fine`. Reads the REAL seed row, so a drifted
 * seed fails here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi } from "../../../api/command";
import { CraftingApi } from "../../../api/crafting";
import { ExecutionContextApi } from "../../../api/execution-context";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Quantity } from "../../../lib/quantity";
import Material from "../../../lib/material/Material";
import Thing from "../../../lib/stuff/Thing";
import Armor from "../../../obj/equipment/Armor";
import ToolItem from "../../../obj/ToolItem";
import PersistentHydrator from "../../../obj/persistence/PersistentHydrator";
import RecipeCatalogue from "../../../obj/RecipeCatalogue";
import { Idea } from "../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../lib/spatial/Container";
import { ContainableMixin } from "../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../lib/command/CommandGiver";
import type { Stuff } from "../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const SEED = fileURLToPath(
  new URL(
    "../../../seeds/domain/terminus/general-store/goods/sewing-machine.yaml",
    import.meta.url,
  ),
);
const LEATHER = "/obj/material/_test/sm-leather";

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

async function hydrateMachine(): Promise<ToolItem> {
  const seed = YAML.parse(readFileSync(SEED, "utf8")) as Seed;
  // The whole point: no class beyond the generic ToolItem.
  expect(seed.class).toBe("/obj/ToolItem");
  const machine = makeStuff(() => new ToolItem());
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName("iron");
    m.setTags(["metal"]);
    return m;
  }, "/obj/material/element/iron");
  const data = { ...seed.data };
  delete data["_materialPath"]; // instruction field — not this test's business
  await makeStuff(() => new PersistentHydrator()).hydrate(machine, data);
  return machine;
}

describe("the sewing machine (seed-only variant)", () => {
  it("the seed's spec confers rate 3 + control fine on the mending kind", async () => {
    const machine = await hydrateMachine();
    expect(machine.hasCapability("mending")).toBe(true);
    expect(machine.capabilityRate("mending")).toBe(3);
    expect(machine.capabilityControl("mending")).toBe("fine");
    expect(machine.getMass().rawValue()).toBe(18); // shop capital by mass
  });

  it("carried, it affords repair/salvage with zero code; dropped keeps them reachable", async () => {
    CommandApi.getCommand("crafting/repair.yaml");
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
      "/obj/RecipeCatalogue",
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
