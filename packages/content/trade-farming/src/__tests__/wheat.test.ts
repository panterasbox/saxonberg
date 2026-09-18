/**
 * Wheat (docs/subsystems/husbandry.md § wheat) — barley's five rows, shifted where
 * the agronomy says.
 *
 * ⭐⭐ **A second cereal has to earn its rows.** Barley already closed the
 * cereal faucet — it malts, it feeds pigs, it is the arable half of the
 * four-course — so wheat is only worth authoring if it is different in a
 * way a player can act on.
 *
 * It is, and the difference is one protein pair: barley's proteins do
 * not form the elastic sheet that traps gas, so barley bread is flat
 * however well you knead it. Wheat's do. Gluten is the baker's whole
 * frontier, and without a wheat there is nothing to develop.
 *
 * ⚠ And it is a TRADE, not a free upgrade. The three shifted numbers
 * below are the whole of it, and nobody authors the comparison anywhere:
 * a player who sows both on thin ground finds it out by looking at the
 * field. Reads the YAML rather than cloning — what regresses here is the
 * authoring contract.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, "..", "..", "content");
const FARMING = join(CONTENT, "trade", "farming");
const POACEAE = join(
  CONTENT, "stuff", "idea", "species",
  "plantae", "tracheophyta", "liliopsida", "poales", "poaceae",
);
const MATERIALS = join(CONTENT, "stuff", "idea", "material", "food");

function data(file: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(file, "utf-8")) as {
    class?: string;
    data?: Record<string, unknown>;
  };
  return { __class: doc.class, ...(doc.data ?? {}) };
}

const wheatPlant = () => data(join(FARMING, "thing", "plant", "wheat.yaml"));
const barleyPlant = () => data(join(FARMING, "thing", "plant", "barley.yaml"));
const profile = (p: Record<string, unknown>) =>
  p.profile as Record<string, number | Record<string, number>>;

describe("wheat has the five rows a cereal needs", () => {
  it("species, material, seed, plant, crop — and they point at each other", () => {
    const seed = data(join(FARMING, "thing", "seed", "wheat.yaml"));
    const plant = wheatPlant();
    const crop = data(join(FARMING, "thing", "crop", "wheat.yaml"));

    expect(seed.growsIntoPath).toBe("/trade/farming/thing/plant/wheat");
    expect(plant.seedTemplatePath).toBe("/trade/farming/thing/seed/wheat");
    expect(plant.harvestTemplatePath).toBe("/trade/farming/thing/crop/wheat");
    expect(plant._speciesPath).toBe(seed._speciesPath);
    expect(existsSync(join(POACEAE, "triticum", "aestivum.yaml"))).toBe(true);
    // ⚠ `_materialPath` — the key the Hydrator writes; `material:` was a dead
    // key 49 rows carried (found by the grain-chain wire flow).
    expect(crop._materialPath).toBe("/stuff/idea/material/food/wheat-grain");
    expect(existsSync(join(MATERIALS, "wheat-grain.yaml"))).toBe(true);
  });

  it("the crop is a discrete sack, the same shape barley's is", () => {
    const wheat = data(join(FARMING, "thing", "crop", "wheat.yaml"));
    const barley = data(join(FARMING, "thing", "crop", "barley.yaml"));
    expect(wheat.__class).toBe("/platform/thing/Crop");
    expect(wheat.__class).toBe(barley.__class);
    expect(wheat.mass).toBe(barley.mass);
  });
});

describe("⭐ the grain is INERT — a dry sack does not rot", () => {
  it("wheat grain tabulates no spoilage, exactly as barley does not", () => {
    // The sparse-storage rule: a gauge that would read zero forever
    // should not exist. It is the FLOUR that is perishable — milling
    // breaks the seed coat and lets the oil out, which is the honest
    // reason flour keeps worse than the grain it came from.
    const wheat = data(join(MATERIALS, "wheat-grain.yaml"));
    const barley = data(join(MATERIALS, "barley-grain.yaml"));
    for (const m of [wheat, barley]) {
      expect(m.spoilActivationEnergy).toBeUndefined();
      expect(m.waterActivity).toBeUndefined();
    }
  });

  it("⭐ it carries the `wheat` tag — one flour per CEREAL, none per band", () => {
    const m = data(join(MATERIALS, "wheat-grain.yaml"));
    const tags = m.tags as string[];
    expect(tags).toContain("grain");
    expect(tags).toContain("cereal");
    expect(tags).toContain("wheat");
    // ⚠ No `wholemeal`, no `white`. Extraction is continuous and lives
    // on the flour's payload; a band in the tag vocabulary would be the
    // material-row-per-band shape this build exists to avoid.
    expect(tags).not.toContain("wholemeal");
    expect(tags).not.toContain("white");
  });

  it("the two cereals' nutrient figures are on ONE scale", () => {
    // ⚠ `base-library`'s malt row authors carb 14000 against barley's
    // 730000 — two packs disagreeing on the unit. The new grain follows
    // BARLEY's, so the nitrogen ledger reads one number.
    const wheat = data(join(MATERIALS, "wheat-grain.yaml")) as {
      nutrientAmounts: Record<string, number>;
    };
    const barley = data(join(MATERIALS, "barley-grain.yaml")) as {
      nutrientAmounts: Record<string, number>;
    };
    expect(wheat.nutrientAmounts.carb!).toBeGreaterThan(500000);
    expect(
      Math.abs(wheat.nutrientAmounts.carb! - barley.nutrientAmounts.carb!),
    ).toBeLessThan(100000);
  });

  it("⭐ wheat carries MORE protein, so it draws more nitrogen", () => {
    // Crude protein is nitrogen x 6.25 — the feed value and the
    // fertility cost are the same number seen twice, so a wheat that
    // fed you better and cost the soil nothing would be a lie.
    const wheatM = data(join(MATERIALS, "wheat-grain.yaml")) as {
      nutrientAmounts: Record<string, number>;
    };
    const barleyM = data(join(MATERIALS, "barley-grain.yaml")) as {
      nutrientAmounts: Record<string, number>;
    };
    expect(wheatM.nutrientAmounts.protein!).toBeGreaterThan(
      barleyM.nutrientAmounts.protein!,
    );
    expect(wheatPlant().nutrientDraw as number).toBeGreaterThan(
      barleyPlant().nutrientDraw as number,
    );
  });
});

describe("⭐⭐ THE THREE NUMBERS — barley carries where wheat struggles", () => {
  it("wheat stops growing at a HIGHER temperature than barley", () => {
    // Two kelvin. That is the whole of the cold story, and it is read by
    // the same min-of-four limiting-factor law both crops already use.
    expect(profile(wheatPlant()).coldStopK as number).toBeGreaterThan(
      profile(barleyPlant()).coldStopK as number,
    );
  });

  it("wheat wilts at nearly twice the moisture barley tolerates", () => {
    expect(profile(wheatPlant()).moistureWiltAt as number).toBeGreaterThan(
      profile(barleyPlant()).moistureWiltAt as number,
    );
  });

  it("wheat takes longer to come", () => {
    const w = profile(wheatPlant()).daysToStage as Record<string, number>;
    const b = profile(barleyPlant()).daysToStage as Record<string, number>;
    expect(w.mature!).toBeGreaterThan(b.mature!);
    expect(w.young!).toBeGreaterThan(b.young!);
  });

  it("⭐ at 279 K barley grows and wheat does NOT — the drive's step 6", () => {
    // The one temperature that separates them, stated as the fact a
    // player standing on the upper bench in a cold week would observe.
    const COLD = 279;
    expect(profile(barleyPlant()).coldStopK as number).toBeLessThan(COLD);
    expect(profile(wheatPlant()).coldStopK as number).toBeGreaterThanOrEqual(
      COLD,
    );
  });

  it("everything else is barley's profile, unchanged", () => {
    // ⚠ The design is three numbers. If a fourth drifts in, the
    // comparison stops being legible and wheat becomes "the better one".
    const w = profile(wheatPlant());
    const b = profile(barleyPlant());
    expect(w.luxHappyAt).toBe(b.luxHappyAt);
    expect(w.luxDarkAt).toBe(b.luxDarkAt);
    expect(w.rootDemand).toEqual(b.rootDemand);
  });
});
