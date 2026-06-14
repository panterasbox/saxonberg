/**
 * Material — the Wave-2 nutrition shape: `toxicity` reshaped to
 * `{type, amount}[]` (the per-consumable dose; default-Hydrator
 * round-trip like `composition`) and `nutrientAmounts` (the inspectable
 * profile). The label RENDER lives on `NutritionLabelMixin` (an opt-in
 * consumable affordance that rides the long-description augmenter seam),
 * NOT on `look` — so it shows only on things that carry a label and
 * only for an edible Material, viewer-blind.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Material from "../Material";
import Thing from "../../stuff/Thing";
import { NutritionLabelMixin } from "../../metabolism/NutritionLabel";
import { Stuff } from "../../stuff/Stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../mixin";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class LabelledThing extends NutritionLabelMixin(Thing) {
  static _mixinName = "LabelledThing";
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

describe("NutritionLabelMixin — the inspectable label", () => {
  let viewer: Stuff;

  function material(
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

  function labelled(label: string, mat: Material): LabelledThing {
    return makeStuff(() => {
      const t = new LabelledThing();
      t.setShortDescription(label);
      t.setLongDescription(`It is ${label}.`);
      t.setMaterial(mat);
      return t;
    });
  }

  beforeEach(() => {
    installV1QuantityMarshallers();
    viewer = makeStuff(() => new Thing()) as unknown as Stuff;
  });
  afterEach(() => StuffApi.clearAll());

  it("composes the mixin / passes the predicate", () => {
    const t = labelled("a ration", material("/m/r", "ration", true, {}, []));
    expect(MixinApi.hasMixin(t, Mixins.NutritionLabel)).toBe(true);
  });

  it("appends the profile to the long description for an edible", () => {
    const apple = material(
      "/lib/material/food/apple",
      "apple",
      true,
      { carb: 20, sugar: 12 },
      [{ type: "cyanide", amount: 1 }],
    );
    const out = labelled("an apple", apple).getMarkupLong(viewer);
    expect(out).toContain("Nutrition:");
    expect(out).toContain("carb 20mg");
    expect(out).toContain("Contains:");
    expect(out).toContain("cyanide 1mg");
  });

  it("omits the profile for a non-edible material", () => {
    const granite = material(
      "/lib/material/element/granite",
      "granite",
      false,
      {},
      [],
    );
    const out = labelled("a chunk", granite).getMarkupLong(viewer);
    expect(out).not.toContain("Nutrition:");
    expect(out).not.toContain("Contains:");
  });

  it("a plain (un-labelled) Thing shows no profile even when edible", () => {
    const apple = material(
      "/lib/material/food/apple2",
      "apple",
      true,
      { carb: 20 },
      [],
    );
    const plain = makeStuff(() => {
      const t = new Thing();
      t.setShortDescription("an apple");
      t.setLongDescription("It is an apple.");
      t.setMaterial(apple);
      return t;
    });
    expect(plain.getMarkupLong(viewer)).not.toContain("Nutrition:");
  });
});
