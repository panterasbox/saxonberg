/**
 * The fruit carries its vitamin (nutrition-and-fitness W4 / D17): every
 * citrus row tags `vitamin-c` — the routing tag the body's `vitamin-c`
 * reserve fills — and every produce row authors `nutrientAmounts` in
 * the mg-per-kg convention the bran and flour rows set, so the label
 * (which DERIVES from the parts) has real figures under it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const MATERIAL = join(here, "..", "..", "content", "trade", "farming", "idea", "material");

function data(name: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(join(MATERIAL, `${name}.yaml`), "utf-8")) as {
    data?: Record<string, unknown>;
  };
  return doc.data ?? {};
}

const CITRUS = ["orange", "lemon", "lime", "grapefruit"] as const;
const PRODUCE = [
  ...CITRUS, "cherry", "cranberry", "grape", "olive", "mint", "juniper",
] as const;

describe("produce nutrition", () => {
  it("⭐ every citrus row tags vitamin-c, and the orange restores about a third of a store per portion", () => {
    for (const name of CITRUS) {
      const d = data(name);
      expect(d.nutrients, name).toContain("vitamin-c");
      const amounts = d.nutrientAmounts as Record<string, number>;
      expect(amounts["vitamin-c"], name).toBeGreaterThan(0);
    }
    // 530 mg/kg is 53 mg per 100 g — the real figure.
    expect((data("orange").nutrientAmounts as Record<string, number>)["vitamin-c"]).toBe(530);
  });

  it("every produce row authors amounts in mg per kg (water dominates a fruit)", () => {
    for (const name of PRODUCE) {
      const amounts = data(name).nutrientAmounts as Record<string, number>;
      expect(amounts, name).toBeDefined();
      expect(amounts.water, name).toBeGreaterThan(400_000);
      expect(amounts.water, name).toBeLessThanOrEqual(1_000_000);
    }
  });

  it("an olive is oil, not vitamin C; a juniper berry is neither", () => {
    expect(data("olive").nutrients).not.toContain("vitamin-c");
    expect((data("olive").nutrientAmounts as Record<string, number>).fat).toBeGreaterThan(0);
    expect(data("juniper").nutrients).not.toContain("vitamin-c");
  });
});
