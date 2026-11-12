/**
 * ⚠⚠ **Dyeing is TWO chemistries, not one** — and the shipped rows are
 * where that lives, so this is where it is asserted.
 *
 * A uniform 3 × 4 grid would have taught that every dye works one way.
 * What ships is **two mordant dyes × four mordants, plus woad as the
 * deliberate exception** — eight outcomes plus one, rather than a false
 * twelve.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import "@saxonberg/server/test-bootstrap";
import { existsSync } from "fs";
import DyestuffCatalogue from "../idea/DyestuffCatalogue";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";

const here = dirname(fileURLToPath(import.meta.url));
const DYEING = join(here, "..", "..", "content", "trade", "dyeing");

interface ShadeAvatar {
  mordant: string;
  colour: string;
  fastness: number;
}
interface DyestuffRow {
  key: string;
  material: string;
  chemistry: "mordant" | "vat";
  shades: ShadeAvatar[];
}

function dyestuffs(): DyestuffRow[] {
  // The `dyestuff` DOCUMENTS (load-on-use W3): `content/dyestuffs/`.
  const dir = join(DYEING, "..", "..", "dyestuffs");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const data = YAML.parse(readFileSync(join(dir, f), "utf-8")) as DyestuffRow & { class?: string };
      expect(data.class).toBeUndefined();
      return { ...data, key: f.replace(/\.yaml$/, "") };
    });
}

function mordantKeys(): string[] {
  const dir = join(DYEING, "idea", "material");
  // ⚠ The rows TAGGED `mordant`: the folder also holds the alum liquor
  // the alum is crystallized out of (ceramics W8), which is not a mordant.
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .filter((f) => {
      const doc = YAML.parse(readFileSync(join(dir, f), "utf-8")) as { data?: { tags?: string[] } };
      return (doc.data?.tags ?? []).includes("mordant");
    })
    .map((f) => f.replace(/\.yaml$/, ""));
}

describe("two chemistries, and the rows say which", () => {
  it("ships THREE mordant dyes and ONE vat dye", () => {
    // ⭐ Kermes (silk W4) is the third mordant dye — two farming rows and
    // this pack's one, and no code: a fourth dyestuff costs rows.
    const rows = dyestuffs();
    expect(rows.filter((d) => d.chemistry === "mordant").map((d) => d.key).sort())
      .toEqual(["kermes", "madder", "weld"]);
    expect(rows.filter((d) => d.chemistry === "vat").map((d) => d.key))
      .toEqual(["woad"]);
  });

  it("⭐ four outcomes per mordant dye plus one, not a false grid", () => {
    const rows = dyestuffs();
    const mordant = rows.filter((d) => d.chemistry === "mordant");
    // Four mordants each — alum, iron, tannin, and NONE (the failure).
    for (const d of mordant) {
      expect(d.shades.map((s) => s.mordant).sort()).toEqual([
        "",
        "alum",
        "iron",
        "tannin",
      ]);
    }
    expect(mordant.length * 4).toBe(12);
    // …and woad's single shade, keyed to the empty mordant.
    const woad = rows.find((d) => d.chemistry === "vat")!;
    expect(woad.shades).toHaveLength(1);
    expect(woad.shades[0]!.mordant).toBe("");
  });

  it("⚠⚠ a mordant on WOAD resolves to nothing — the DATA refuses it", () => {
    // The refusal falls out of the shade table rather than a special
    // case in the verb: `shadeFor('alum')` on a vat dye returns null,
    // and the controller reports what the chemistry already decided.
    const woad = dyestuffs().find((d) => d.chemistry === "vat")!;
    for (const m of ["alum", "iron", "tannin"]) {
      expect(woad.shades.find((s) => s.mordant === m)).toBeUndefined();
    }
  });

  it("⚠⚠ NO mordant is the FAILURE — fastness ≈ 0, it washes straight out", () => {
    // The missing failure mode every competence answer needs to be
    // visible against. Real, and nearly free.
    for (const d of dyestuffs().filter((x) => x.chemistry === "mordant")) {
      const none = d.shades.find((s) => s.mordant === "")!;
      expect(none.fastness).toBeLessThan(0.1);
      for (const m of ["alum", "iron", "tannin"]) {
        expect(d.shades.find((s) => s.mordant === m)!.fastness).toBeGreaterThan(
          none.fastness * 10,
        );
      }
    }
  });

  it("⭐ IRON SADDENS and ALUM brightens — the same dyestuff, two cloths", () => {
    // One of those facts that reads like a discovered secret the first
    // time somebody uses it on purpose.
    const madder = dyestuffs().find((d) => d.key === "madder")!;
    expect(madder.shades.find((s) => s.mordant === "alum")!.colour).toMatch(/red/);
    expect(madder.shades.find((s) => s.mordant === "iron")!.colour).toMatch(/maroon/);
    const weld = dyestuffs().find((d) => d.key === "weld")!;
    expect(weld.shades.find((s) => s.mordant === "alum")!.colour).toMatch(/yellow/);
    expect(weld.shades.find((s) => s.mordant === "iron")!.colour).toMatch(/olive/);
  });

  it("⭐⭐ TANNIN ships, because on linen it is the workhorse", () => {
    // Cellulose does not hold metal ions. Every mordant dye must offer
    // a tannin route or a plant fibre cannot be dyed at all — which is
    // exactly why linen was worn undyed and wool was the coloured
    // cloth, and why this trade is harder now and easier when wool
    // arrives.
    // The iron mordant's material is copperas (iron(II) sulfate, a salt) —
    // the dyer still says "iron" (MordantController maps the word).
    expect(mordantKeys().sort()).toEqual(["alum", "copperas", "tannin"]);
    for (const d of dyestuffs().filter((x) => x.chemistry === "mordant")) {
      expect(d.shades.find((s) => s.mordant === "tannin")).toBeDefined();
    }
  });

  it("⚠ every dyestuff names a MATERIAL, never a crop", () => {
    // The chain's second entry point. Madder-the-plant is farming's;
    // madder-the-dyestuff is what the bath consumes, and where it came
    // from — a bed or a retort — is upstream. ⭐ That is the seam a
    // synthetic alizarin walks through.
    for (const d of dyestuffs()) {
      expect(d.material).toMatch(/\/idea\/material\//);
      expect(d.material).not.toMatch(/\/thing\//);
    }
  });

  it("the vat dye is the FASTEST, and that is why blue was worth it", () => {
    const woad = dyestuffs().find((d) => d.chemistry === "vat")!;
    const best = Math.max(
      ...dyestuffs()
        .filter((d) => d.chemistry === "mordant")
        .flatMap((d) => d.shades.map((s) => s.fastness)),
    );
    expect(woad.shades[0]!.fastness).toBeGreaterThan(best);
  });
});

describe("⭐ a dyestuff document is checked before merge (load-on-use W3)", () => {
  // The installer cannot reach a pack's catalogue to validate a dyestuff,
  // so the shipped documents are parsed here — and the material each one
  // dyes with must be a row some pack ships, or `dye` finds nothing.
  it("every shipped dyestuff parses, and names a material row a pack ships", () => {
    const catalogue = makeStuff(() => new DyestuffCatalogue());
    const packs = join(here, "..", "..", "..");
    for (const d of dyestuffs()) {
      const path = `/trade/dyeing/dyestuffs/${d.key}`;
      const parsed = catalogue.parse(d as unknown as Record<string, unknown>, path);
      expect(parsed.getKey()).toBe(d.key);
      const shipped = readdirSync(packs).some((pack) =>
        existsSync(join(packs, pack, "content", `${d.material}.yaml`)),
      );
      expect(shipped, `${path} names ${d.material}`).toBe(true);
    }
  });

  it("a malformed dyestuff is refused, naming what is wrong", () => {
    const catalogue = makeStuff(() => new DyestuffCatalogue());
    expect(() => catalogue.parse({ material: "madder", chemistry: "mordant", shades: [] }, "/t/dyestuffs/x"))
      .toThrow(/material 'madder'/);
    expect(() => catalogue.parse({ material: "/m", chemistry: "boil", shades: [] }, "/t/dyestuffs/x"))
      .toThrow(/chemistry 'boil'/);
  });
});
