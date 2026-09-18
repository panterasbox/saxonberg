/**
 * ComposedMixin (docs/subsystems/spoilage.md § composition) — what a discrete food is
 * made of.
 *
 * The point is the LABEL: `BlendLabel.amountsOf` already sums a blend's
 * parts, and a tangible food had no parts to sum, so it fell back to its
 * own Material. A wholemeal loaf and a white one are both made of
 * `bread`, and without this they feed you identically however far the
 * extraction travelled.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Provision from "../../../platform/thing/Provision";
import Material from "../../material/Material";
import { BlendLabel } from "../BlendLabel";
import { MixinApi } from "../../../api/mixin";
import { StuffApi } from "../../../api/stuff";
import { Quantity } from "../../quantity";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

const BREAD = "/stuff/idea/material/food/test-bread";
const ENDOSPERM = "/stuff/idea/material/food/test-endosperm";
const BRAN = "/stuff/idea/material/food/test-bran-c";

function material(
  path: string,
  name: string,
  amounts: Record<string, number>,
): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setEdibility(true);
    m.setNutrientAmounts(amounts);
    m.setDensity(Quantity.of(570, "kg/m³"));
    return m;
  }, path);
}

function loaf(): Provision {
  const p = makeStuff(() => new Provision());
  p.setMass(Quantity.of(0.8, "kg"));
  p.setMaterial(
    StuffApi.findByTemplatePath<Material>(BREAD)! as unknown as Material,
  );
  return p;
}

beforeEach(() => {
  StuffApi.clearAll();
  // The loaf's own material is deliberately thin — a loaf is not "made
  // of bread" in any nutritional sense, it is made of what went in.
  material(BREAD, "bread", { carb: 100 });
  material(ENDOSPERM, "flour", { carb: 1000, protein: 80 });
  material(BRAN, "bran", { carb: 200, protein: 150, fibre: 430 });
});

describe("ComposedMixin — the claim is on Provision", () => {
  it("every Provision can be made of parts, and starts made of none", () => {
    const l = loaf();
    expect(MixinApi.isComposed(l)).toBe(true);
    expect(l.getComposition()).toEqual([]);
  });

  it("a composition with no parts falls straight through to the material", () => {
    const l = loaf();
    expect(BlendLabel.amountsOf(null, l.getMaterial())).toEqual({ carb: 100 });
  });

  it("⭐ a loaf that knows its parts reads its label off them", () => {
    const l = loaf();
    l.setComposition([
      { materialPath: ENDOSPERM, servings: 8 },
      { materialPath: BRAN, servings: 2 },
    ]);
    const amounts = BlendLabel.amountsOf(
      { composition: [...l.getComposition()] },
      l.getMaterial(),
    );
    expect(amounts.carb).toBeCloseTo(1000 * 8 + 200 * 2, 6);
    expect(amounts.protein).toBeCloseTo(80 * 8 + 150 * 2, 6);
    expect(amounts.fibre).toBeCloseTo(430 * 2, 6);
  });

  it("⭐⭐ a wholemeal loaf feeds you MORE than a white one of the same weight", () => {
    // Same total servings, different proportions — which is exactly the
    // difference an extraction setting makes, carried all the way here.
    const white = loaf();
    white.setComposition([
      { materialPath: ENDOSPERM, servings: 9.6 },
      { materialPath: BRAN, servings: 0.4 },
    ]);
    const wholemeal = loaf();
    wholemeal.setComposition([
      { materialPath: ENDOSPERM, servings: 7.5 },
      { materialPath: BRAN, servings: 2.5 },
    ]);
    const w = BlendLabel.amountsOf(
      { composition: [...white.getComposition()] },
      white.getMaterial(),
    );
    const m = BlendLabel.amountsOf(
      { composition: [...wholemeal.getComposition()] },
      wholemeal.getMaterial(),
    );
    expect(m.fibre!).toBeGreaterThan(w.fibre!);
    expect(m.protein!).toBeGreaterThan(w.protein!);
    // …and less starch, which is the honest trade rather than a free win.
    expect(m.carb!).toBeLessThan(w.carb!);
  });

  it("junk parts are refused rather than stored", () => {
    const l = loaf();
    l.setComposition([
      { materialPath: ENDOSPERM, servings: 5 },
      { materialPath: "", servings: 3 },
      { materialPath: BRAN, servings: 0 },
      { materialPath: BRAN, servings: Number.NaN },
    ]);
    expect(l.getComposition()).toEqual([
      { materialPath: ENDOSPERM, servings: 5 },
    ]);
  });
});
