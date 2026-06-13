/**
 * Material — the Wave-2 nutrition shape: `toxicity` reshaped to
 * `{type, amount}[]` (the per-consumable dose; default-Hydrator
 * round-trip like `composition`), `nutrientAmounts` (the inspectable
 * profile), and `examine <food>` surfacing that profile (data + display,
 * viewer-blind) for an edible while omitting it for a non-edible.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import LookController from "../../../obj/command/perception/LookController";
import Material from "../Material";
import Thing from "../../stuff/Thing";
import Location from "../../stuff/Location";
import { Idea } from "../../stuff/Idea";
import { SensorMixin } from "../../message/Sensor";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { NamedMixin } from "../../description/Named";
import { ContainableMixin } from "../../spatial/Containable";
import { Stuff } from "../../stuff/Stuff";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi, type CommandContext } from "../../../api/command";
import { CommandDefinition } from "../../../lib/command/CommandDefinition";
import type { MqlOneResult } from "../../../api/mql";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class CaptureActor extends SensorMixin(
  CommandGiverMixin(NamedMixin(ContainableMixin(Idea))),
) {
  static _mixinName = "CaptureActor";
  public received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function foodMaterial(
  path: string,
  name: string,
  edible: boolean,
  nutrientAmounts: Record<string, number>,
  toxicity: { type: string; amount: number }[],
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setAppearance(`a ${name}`);
    m.setEdibility(edible);
    m.setNutrientAmounts(nutrientAmounts);
    m.setToxicity(toxicity);
    return m;
  }, path) as unknown as Material;
}

function thingOf(label: string, mat: Material): Stuff {
  return makeStuff(() => {
    const t = new Thing();
    t.setShortDescription(label);
    t.setLongDescription(`It is ${label}.`);
    t.setKeywords([label.replace(/^an? /, "")]);
    t.setMaterial(mat);
    return t;
  }) as unknown as Stuff;
}

function one(stuff: Stuff): MqlOneResult {
  return { stuff, raw: "x" } as MqlOneResult;
}

describe("Material — nutrition shape", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("toxicity round-trips as {type, amount}[]", () => {
    const m = makeStuff(() => new Material());
    m.setToxicity([{ type: "alcohol", amount: 14 }]);
    expect(m.getToxicity()).toEqual([{ type: "alcohol", amount: 14 }]);
  });

  it("setToxicity rejects malformed entries", () => {
    const m = makeStuff(() => new Material());
    expect(() =>
      m.setToxicity([{ type: "x", amount: -1 } as never]),
    ).toThrow(TypeError);
    expect(() => m.setToxicity([{ amount: 1 } as never])).toThrow(TypeError);
  });

  it("nutrientAmounts round-trips and rejects bad values", () => {
    const m = makeStuff(() => new Material());
    m.setNutrientAmounts({ carb: 20, sugar: 5 });
    expect(m.getNutrientAmounts()).toEqual({ carb: 20, sugar: 5 });
    expect(() => m.setNutrientAmounts({ carb: -3 })).toThrow(RangeError);
  });
});

describe("Material — examine surfacing", () => {
  let actor: CaptureActor;
  let loc: Stuff;

  beforeEach(() => {
    installV1QuantityMarshallers();
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    actor = makeStuff(() => new CaptureActor());
    (actor as unknown as { setName(n: string): void }).setName("bob");
    ContainmentApi.move(actor as never, loc as never);
  });
  afterEach(() => StuffApi.clearAll());

  function lookAt(item: Stuff): string {
    const ctx: CommandContext = CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: loc as never,
      commandText: "look",
      executionId: "t",
      commandId: "t",
      verb: "look",
      command: CommandDefinition.fromYaml(
        "verbs: [look]\ncontroller: NoopController\ndescription: stub\n",
        "<test>",
      ),
    });
    actor.received = [];
    makeStuff(() => new LookController()).execute(
      { target: one(item) } as never,
      ctx,
    );
    return JSON.stringify(actor.received);
  }

  it("includes the profile for an edible", () => {
    const apple = foodMaterial(
      "/lib/material/food/apple",
      "apple",
      true,
      { carb: 20, sugar: 12 },
      [{ type: "cyanide", amount: 1 }],
    );
    const out = lookAt(thingOf("an apple", apple));
    expect(out).toContain("Nutrition:");
    expect(out).toContain("carb 20mg");
    expect(out).toContain("Contains:");
    expect(out).toContain("cyanide 1mg");
  });

  it("omits the profile for a non-edible", () => {
    const granite = foodMaterial(
      "/lib/material/element/granite",
      "granite",
      false,
      {},
      [],
    );
    const out = lookAt(thingOf("a rock", granite));
    expect(out).not.toContain("Nutrition:");
    expect(out).not.toContain("Contains:");
  });
});
