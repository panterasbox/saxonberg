/**
 * Every shipped garment row is a REAL OBJECT.
 *
 * Before the textiles build, clothing was prose: nine rows authoring a
 * description and a slot claim, contributing exactly zero insulation,
 * weighing nothing to encumbrance, unable to get wet, wear out, be
 * graded, be repaired or be made. This is the test that says that is
 * over — and it is a **content** test, beside the pack whose rows it
 * names, because a kernel test proves the kernel over synthetic
 * fixtures (`lint:test-content`).
 *
 * ⚠ It reads the YAML rather than cloning: a clone needs a live DB, a
 * warmed fabric roster and a hydrator, none of which a pack unit test
 * has. What it asserts is the authoring contract, which is exactly what
 * regresses when somebody adds a tenth row.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, "..", "..", "content", "stuff", "thing");
const CLOTHES = join(CONTENT, "clothes");
const ARMOR = join(CONTENT, "armor");

interface Row {
  file: string;
  class: string;
  data: Record<string, unknown>;
}

function rows(dir: string): Row[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const doc = YAML.parse(readFileSync(join(dir, f), "utf-8")) as {
        class?: string;
        data?: Record<string, unknown>;
      };
      return { file: f, class: doc.class ?? "", data: doc.data ?? {} };
    });
}

const CLOTHING = rows(CLOTHES);
const ARMOUR = rows(ARMOR);
const ALL = [...CLOTHING, ...ARMOUR];

describe("every worn row is a real physical object", () => {
  it("there are nine clothing rows and six armor rows", () => {
    expect(CLOTHING).toHaveLength(9);
    expect(ARMOUR).toHaveLength(6);
  });

  it.each(ALL.map((r) => [r.file, r] as const))(
    "%s carries a material, a form, a grade and a mass",
    (_file, row) => {
      expect(typeof row.data._materialPath).toBe("string");
      expect(String(row.data._materialPath)).toMatch(
        /^\/stuff\/idea\/material\//,
      );
      expect(typeof row.data.constructionForm).toBe("string");
      expect(typeof row.data.gradeBand).toBe("string");
      expect(typeof row.data.mass).toBe("number");
      expect(row.data.mass as number).toBeGreaterThan(0);
    },
  );

  it("⚠ NO row authors `clo` — insulation DERIVES from physics", () => {
    // The one authoring rule the build must not lose. A wool coat is
    // warm because wool conducts at 0.04 W/mK, not because somebody
    // typed a number, and an authored clo would quietly override the
    // whole thermal model.
    for (const row of ALL) {
      expect(row.data).not.toHaveProperty("clo");
    }
  });

  it("⭐ armor is a Garment of the right material and form — no Armor class", () => {
    // Armor-ness is material + construction form, not a class. A steel
    // breastplate and a linen shirt resolve through the same code
    // because the blow asks the material and the form, never the class.
    for (const row of ALL) {
      expect(row.class).toMatch(/\/platform\/thing\/equipment\/(Garment|DisguiseGarment)$/);
    }
    expect(ALL.some((r) => r.class.endsWith("/Armor"))).toBe(false);
  });

  it("every construction form is a kernel covering form or a shipped fabric", () => {
    // The vocabulary has two sources; a typo in either direction throws
    // at hydration, which is a boot failure rather than a silent one.
    const KERNEL = new Set(["plate", "mail", "padded", "quilted", "hide"]);
    const fabricDir = join(
      here, "..", "..", "..", "base-library",
      "content", "stuff", "idea", "fabric",
    );
    const fabrics = new Set(
      readdirSync(fabricDir)
        .filter((f) => f.endsWith(".yaml"))
        .map((f) => f.replace(/\.yaml$/, "")),
    );
    for (const row of ALL) {
      const form = String(row.data.constructionForm);
      expect(KERNEL.has(form) || fabrics.has(form)).toBe(true);
    }
  });

  it("every named material row exists", () => {
    const base = join(
      here, "..", "..", "..", "base-library", "content",
    );
    for (const row of ALL) {
      const rel = String(row.data._materialPath) + ".yaml";
      expect(() => readFileSync(join(base, rel.slice(1)), "utf-8")).not.toThrow();
    }
  });
});

describe("⚠ a material must not assert a CONSTRUCTION", () => {
  it("no fibre row's appearance names a weave", () => {
    // `appearance: thick woven wool` said wool could only ever be
    // woven, which is false — wool is also felted, knitted and fulled,
    // and `woven` is a form a garment carries, not something the
    // substance IS.
    const textiles = join(
      here, "..", "..", "..", "base-library",
      "content", "stuff", "idea", "material", "textile",
    );
    for (const f of readdirSync(textiles).filter((n) => n.endsWith(".yaml"))) {
      const doc = YAML.parse(readFileSync(join(textiles, f), "utf-8")) as {
        data?: { appearance?: string };
      };
      const appearance = doc.data?.appearance ?? "";
      expect(appearance).not.toMatch(/\b(woven|knit|knitted|felted|hessian)\b/);
    }
  });

  it("every fibre is classified cellulose or protein — the dyeing axis", () => {
    // Not decoration: cellulose does not hold metal ions, so a plant
    // fibre needs a tannin pre-mordant where wool takes alum directly.
    // Nothing else in the model distinguishes the two.
    const textiles = join(
      here, "..", "..", "..", "base-library",
      "content", "stuff", "idea", "material", "textile",
    );
    for (const f of readdirSync(textiles).filter((n) => n.endsWith(".yaml"))) {
      const doc = YAML.parse(readFileSync(join(textiles, f), "utf-8")) as {
        data?: { tags?: string[] };
      };
      const tags = doc.data?.tags ?? [];
      if (!tags.includes("fibre")) continue;
      expect(
        tags.includes("cellulose") || tags.includes("protein"),
      ).toBe(true);
    }
  });
});

/**
 * ⭐ The shipped hood is what the arcane interlock actually reads.
 *
 * `attentionFactor` needs **no new field**: it reads `masksIdentity`
 * plus the head-covering stack, both of which the hood row already
 * declares. This is the content half of that promise — the kernel test
 * proves the mechanism, this proves the row feeds it.
 */
describe("the hood needs no new field for the veil interlock", () => {
  const hood = CLOTHING.find((r) => r.file === "hood.yaml")!;

  it("masks identity and claims the HEAD slot", () => {
    expect(hood.data.masksIdentity).toBe(true);
    const claims = hood.data.slotClaims as Record<string, string[]>;
    expect(claims["/stuff/idea/species/BodyPlan/biped"]).toEqual(["head"]);
  });

  it("⚠ its `covers: [face]` is the DISGUISE field, not a slot's", () => {
    // A recurring misreading: `covers` on a `SlotSpec` names body-plan
    // parts, and `face` is not one. This `covers` belongs to
    // `DisguiseBearingMixin` and lives in the row's data alongside
    // `appearsAs` — a different field with the same name.
    expect(hood.data.covers).toEqual(["face"]);
    expect(hood.class).toMatch(/DisguiseGarment$/);
  });
});
