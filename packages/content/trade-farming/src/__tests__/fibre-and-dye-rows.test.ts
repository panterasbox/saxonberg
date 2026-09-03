/**
 * The chain's left edge, as content.
 *
 * Flax and the three dyestuffs are **farming** rows, not textiles ones:
 * cultivation is farming's mechanism, and textiles' begins at the
 * retting pit. ⭐ That split is what makes the fibre the chain's ENTRY
 * POINT rather than the pit — so wool, cotton and one day a synthetic
 * plug into the same chain without the textile trade changing a line.
 *
 * Reads the YAML rather than cloning: a clone wants a live DB and a
 * hydrator, and what regresses here is the authoring contract.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const FARMING = join(here, "..", "..", "content", "trade", "farming");
const SPECIES = join(
  here, "..", "..", "content", "stuff", "idea", "species",
  "plantae", "tracheophyta", "magnoliopsida",
);

function data(file: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(file, "utf-8")) as {
    class?: string;
    data?: Record<string, unknown>;
  };
  return { __class: doc.class, ...(doc.data ?? {}) };
}

const CROPS = ["flax", "madder", "weld", "woad"] as const;

describe("the fibre and dye crops", () => {
  it.each(CROPS)("%s has a seed, a plant, a species and a harvest", (key) => {
    const seed = data(join(FARMING, "thing", "seed", `${key}.yaml`));
    const plant = data(join(FARMING, "thing", "plant", `${key}.yaml`));
    expect(seed.growsIntoPath).toBe(`/trade/farming/thing/plant/${key}`);
    expect(plant.seedTemplatePath).toBe(`/trade/farming/thing/seed/${key}`);
    expect(typeof plant.harvestTemplatePath).toBe("string");
    // The species row the seed and the plant BOTH name — one taxon.
    expect(plant._speciesPath).toBe(seed._speciesPath);
    const rel = String(plant._speciesPath).replace(
      "/stuff/idea/species/plantae/tracheophyta/magnoliopsida/",
      "",
    );
    expect(existsSync(join(SPECIES, `${rel}.yaml`))).toBe(true);
  });

  it("⭐ the flax harvest is a BULK sheaf, not a discrete crop", () => {
    // What comes off the bed is a QUANTITY of straw, and the whole chain
    // downstream is measured in kilos.
    const sheaf = data(join(FARMING, "thing", "crop", "flax-sheaf.yaml"));
    expect(sheaf.__class).toBe("/platform/thing/GradedReceptacle");
    expect(sheaf.interiorBulk).toBe(true);
    expect(sheaf.interiorMaterial).toBe(
      "/trade/farming/idea/material/flax-straw",
    );
    expect(sheaf.interiorAmount as number).toBeGreaterThan(0);
  });

  it("⭐⭐ the sheaf is GRADED — the staple length, carried from the field", () => {
    // `GradedReceptacle` is Crafted, so `harvest` stamps the band off
    // the plant's worst stretch. That band IS the staple length, and it
    // rides `CraftedMixin` all the way to the bolt on the shipped
    // weakest-link rule — nothing new carries it.
    const sheaf = data(join(FARMING, "thing", "crop", "flax-sheaf.yaml"));
    expect(sheaf.__class).toMatch(/GradedReceptacle$/);
  });

  it("⚠ the harvest is STRAW, and straw is not a fibre", () => {
    // The whole reason the chain has a preparation stage: the fibre is
    // bast, glued into the stem by pectin. `retting` is the tag the pit
    // matches on — the MATERIAL says what can be done to it, so wool's
    // scouring arrives later as its own profile with the trade
    // unchanged.
    const straw = data(join(FARMING, "idea", "material", "flax-straw.yaml"));
    const tags = straw.tags as string[];
    expect(tags).toContain("retting");
    expect(tags).toContain("fibre-stock");
    expect(tags).not.toContain("textile");
  });

  it("⚠⚠ woad is tagged a VAT dye and the other two MORDANT dyes", () => {
    // Dyeing is TWO chemistries, not one, and this tag is where the
    // trade reads which. A uniform grid would assert that every dye
    // works one way.
    for (const key of ["madder", "weld"]) {
      const m = data(join(FARMING, "idea", "material", `${key}.yaml`));
      expect(m.tags as string[]).toContain("mordant-dye");
      expect(m.tags as string[]).not.toContain("vat-dye");
    }
    const woad = data(join(FARMING, "idea", "material", "woad.yaml"));
    expect(woad.tags as string[]).toContain("vat-dye");
    expect(woad.tags as string[]).not.toContain("mordant-dye");
  });

  it("every dyestuff names its species as a {speciesPath, tissueType}", () => {
    // ⚠ A composite, not a bare path. Every shipped material left this
    // null, so these are the first rows to populate it — and the census
    // caught the bare-path shape the moment they did.
    for (const key of ["flax-straw", "madder", "weld", "woad"]) {
      const m = data(join(FARMING, "idea", "material", `${key}.yaml`));
      const bio = m.biologicalSource as Record<string, string>;
      expect(typeof bio.speciesPath).toBe("string");
      expect(typeof bio.tissueType).toBe("string");
    }
  });

  it("⭐ madder costs YEARS where weld costs a season", () => {
    // Not a difficulty knob: it is why madder was a landholder's crop
    // and weld a weed that pays, and why red cloth cost what it cost.
    // The garden teaches the price of red without a price being written.
    const madder = data(join(FARMING, "thing", "plant", "madder.yaml"));
    const weld = data(join(FARMING, "thing", "plant", "weld.yaml"));
    const stage = (p: Record<string, unknown>): number =>
      (p.profile as { daysToStage: { mature: number } }).daysToStage.mature;
    expect(stage(madder)).toBeGreaterThan(stage(weld) * 10);
  });

  it("⭐ woad is the one POLYCARP — you cut it and it comes again", () => {
    // The reason a small bed can feed a vat at all.
    const woad = data(join(FARMING, "thing", "plant", "woad.yaml"));
    const profile = woad.profile as Record<string, unknown>;
    expect(profile.fruitSetCount as number).toBeGreaterThan(1);
    expect(typeof profile.fruitFillDays).toBe("number");
    // …and flax is not: pulling it ends it.
    const flax = data(join(FARMING, "thing", "plant", "flax.yaml"));
    expect((flax.profile as Record<string, unknown>).fruitSetCount).toBeUndefined();
  });

  it("flax is a LIGHT feeder — the rotation crop", () => {
    const flax = data(join(FARMING, "thing", "plant", "flax.yaml"));
    const carrot = data(join(FARMING, "thing", "plant", "carrot.yaml"));
    expect(flax.nutrientDraw as number).toBeLessThan(
      carrot.nutrientDraw as number,
    );
  });
});
