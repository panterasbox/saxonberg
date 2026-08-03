/**
 * EatController + the `eat` verb's gates. Eating a discrete edible adds
 * a portion to the digestion buffer's solid sub-volume and routes its
 * nutrient tags into the pools, then consumes the whole item; eating
 * when the solid sub-volume is full refuses (item survives); the
 * `mustBeEdible` arg gate rejects a non-edible; the `requiresConscious`
 * verb gate blocks a collapsed eater.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import EatController from "../EatController";
import { Creature } from "../../../../lib/creature/Creature";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import Thing from "../../../../lib/stuff/Thing";
import Location from "../../../../lib/stuff/Location";
import Material from "../../../../lib/material/Material";
import { Stuff } from "../../../../lib/stuff/Stuff";
import { StuffApi } from "../../../../api/stuff";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { METABOLIC_DEFAULTS } from "../../../../lib/metabolism/Metabolic";
import { TemplatePaths } from "../../../../lib/paths";
import mustBeEdible from "../../../../lib/command/validators/mustBeEdible";
import requiresConscious from "../../../../lib/command/validators/requiresConscious";

class TestEater extends SensorMixin(CommandGiverMixin(Creature)) {
  static _mixinName = "TestEater";
}

function material(path: string, name: string, edible: boolean, nutrients: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setAppearance(`a ${name}`);
    m.setEdibility(edible);
    m.setNutrients(nutrients);
    return m;
  }, path) as unknown as Material;
}

function edibleItem(label: string, mat: Material): Stuff {
  return makeStuff(() => {
    const t = new Thing();
    t.setShortDescription(label);
    t.setMaterial(mat);
    return t;
  }) as unknown as Stuff;
}

function ctxFor(actor: Stuff, loc: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: loc as never,
    commandText: "eat",
    executionId: "test",
    commandId: "test",
    verb: "eat",
    command: CommandDefinition.fromYaml(
      "verbs: [eat]\ncontroller: NoopController\ndescription: stub\n",
      "<test>",
    ),
  });
}

function one(stuff: Stuff | null, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe("EatController", () => {
  let eater: TestEater;
  let loc: Stuff;
  let apple: Material;

  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    eater = makeStuff(() => new TestEater());
    (eater as unknown as { setName(n: string): void }).setName("bob");
    ContainmentApi.move(eater as never, loc as never);
    apple = material("/obj/material/food/apple", "apple", true, ["sugar"]);
  });
  afterEach(() => StuffApi.clearAll());

  it("eats an edible: fills the solid sub-volume, routes pools, consumes the item", async () => {
    const item = edibleItem("an apple", apple);
    ContainmentApi.move(item as never, loc as never);

    await makeStuff(() => new EatController()).execute(
      { target: one(item, "apple") } as never,
      ctxFor(eater, loc),
    );

    expect(eater.solidVolume).toBeCloseTo(METABOLIC_DEFAULTS.EAT_PORTION_LITRES);
    expect((eater.digestionPools.sugar ?? 0)).toBeGreaterThan(0);
    expect(eater.lastMealLabel).toBe("apple");
    // The whole item is consumed.
    const stillHere = (loc as unknown as { getContents(): Stuff[] })
      .getContents()
      .includes(item);
    expect(stillHere).toBe(false);
  });

  it("refuses when too full to eat: the item survives", async () => {
    eater.setSolidVolume(METABOLIC_DEFAULTS.SOLID_CAP_LITRES); // stomach full
    const item = edibleItem("an apple", apple);
    ContainmentApi.move(item as never, loc as never);

    await makeStuff(() => new EatController()).execute(
      { target: one(item, "apple") } as never,
      ctxFor(eater, loc),
    );

    expect(eater.solidVolume).toBeCloseTo(METABOLIC_DEFAULTS.SOLID_CAP_LITRES);
    const stillHere = (loc as unknown as { getContents(): Stuff[] })
      .getContents()
      .includes(item);
    expect(stillHere).toBe(true);
  });

  it("mustBeEdible rejects a non-edible target and accepts an edible one", () => {
    const rockMat = material("/obj/material/element/granite", "granite", false, []);
    const rock = edibleItem("a rock", rockMat);
    const fruit = edibleItem("an apple", apple);
    expect(mustBeEdible(one(rock, "rock"), "target", {} as never)).toBeTypeOf(
      "string",
    );
    expect(
      mustBeEdible(one(fruit, "apple"), "target", {} as never),
    ).toBeUndefined();
    void MixinApi; // tangible check exercised inside the validator
  });

  it("requiresConscious blocks a collapsed eater", () => {
    eater.afflict({
      kind: "affliction",
      templatePath: TemplatePaths.metabolismCollapse,
      stage: 0,
      elapsed: 0,
    });
    expect(
      requiresConscious({ commandGiver: eater } as never),
    ).toBeTypeOf("string");
  });
});
