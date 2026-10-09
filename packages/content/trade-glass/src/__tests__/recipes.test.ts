/**
 * The glass recipes — the batch, the amber batch and the cullet remelt.
 * These parse the shipped rows through the real `Recipe.fromData` and pin
 * what a firing will do with them: item slots matched on the right
 * material tags, a mass yield that conserves (the gall and gases lost on
 * the batch, nothing lost on the remelt), and the melt as the output.
 *
 * The firing CARRY itself (mass from the charge, the sand's iron merged
 * onto the melt) is proven on the real FireController in the server suite
 * (glass W1); the live batch → melt → bottle flow is the W8 drive. This
 * pins the ROWS, which is what W4 adds.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "yaml";
import { Recipe } from "@saxonberg/server/mud/lib/craft/Recipe";

const here = dirname(fileURLToPath(import.meta.url));
const recipesDir = join(here, "..", "..", "content", "recipes");

function load(file: string): Recipe {
  const raw = parse(readFileSync(join(recipesDir, file), "utf8"));
  return Recipe.fromData(raw as Record<string, unknown>);
}

describe("glass recipes", () => {
  it("glass-batch: sand + ash + lime (item slots on the right tags), 0.72 yield → melt", () => {
    const r = load("glass-batch.yaml");
    expect(r.getOutputTemplate()).toBe("/trade/glass/thing/melt");
    expect(r.getMassYield()).toBeCloseTo(0.72, 6);
    expect(r.getRequiresHeatK()).toBe(1400); // above the liquidus — the bellows
    expect(r.getDiscipline()).toBe("glasswork");
    const cats = r.getInputSlots().map((s) => s.category).sort();
    expect(cats).toEqual(["alkali", "potash", "silica"]);
    expect(r.getInputSlots().every((s) => Recipe.isItemSlot(s))).toBe(true);
    const sand = r.getInputSlots().find((s) => s.category === "silica");
    expect(sand?.count).toBe(2); // two of sand, one each of ash and lime
  });

  it("glass-batch-amber: adds charcoal, outputs the amber melt", () => {
    const r = load("glass-batch-amber.yaml");
    expect(r.getOutputTemplate()).toBe("/trade/glass/thing/amber-melt");
    expect(r.getMassYield()).toBeCloseTo(0.72, 6);
    const cats = r.getInputSlots().map((s) => s.category).sort();
    expect(cats).toEqual(["alkali", "charcoal", "potash", "silica"]);
  });

  it("remelt-cullet: one glass item, full mass back, cheaper heat", () => {
    const r = load("remelt-cullet.yaml");
    expect(r.getOutputTemplate()).toBe("/trade/glass/thing/melt");
    expect(r.getMassYield()).toBe(1.0); // glass pays its entropy in colour, not mass
    expect(r.getRequiresHeatK()).toBe(1200); // below the batch — no bellows
    expect(r.getRequiresHeatK()).toBeLessThan(load("glass-batch.yaml").getRequiresHeatK());
    const slots = r.getInputSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]!.category).toBe("glass");
    expect(Recipe.isItemSlot(slots[0]!)).toBe(true);
  });
});
