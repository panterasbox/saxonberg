/**
 * The tailoring trade's two claims, asserted where they live.
 *
 * 1. **`cut` is optimisation under waste** — a pattern is a 2D solution
 *    to a 3D problem and cloth is expensive, so `--tight` and
 *    `--generous` are a real trade against a future you cannot see.
 * 2. **The book carries no clock**, because staleness is body-change.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import MeasureBook from "../thing/MeasureBook";
import CutPieces from "../thing/CutPieces";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";

const here = dirname(fileURLToPath(import.meta.url));
const TAILORING = join(here, "..", "..", "content", "trade", "tailoring");

function row(kind: string, name: string): Record<string, unknown> {
  const doc = YAML.parse(
    readFileSync(join(TAILORING, kind, `${name}.yaml`), "utf-8"),
  ) as { class?: string; data?: Record<string, unknown> };
  return { __class: doc.class, ...(doc.data ?? {}) };
}

describe("⭐⭐ the measurement book", () => {
  afterEach(() => StuffApi.clearAll());

  it("remembers a subject, and one subject is one row", () => {
    const book = makeStuff(() => new MeasureBook());
    book.record({
      subject: "s1",
      name: "Alice",
      bodyPlan: "/stuff/idea/species/BodyPlan/biped",
      statureM: 1.75,
      girthIndex: 6.32,
    });
    book.record({
      subject: "s1",
      name: "Alice",
      bodyPlan: "/stuff/idea/species/BodyPlan/biped",
      statureM: 1.75,
      girthIndex: 6.6,
    });
    expect(book.getEntries()).toHaveLength(1);
    expect(book.entryFor("s1")!.girthIndex).toBe(6.6);
  });

  it("⭐⭐ staleness is BODY-CHANGE — and the book carries NO clock", () => {
    // Whether an entry is still YOU is answerable from the numbers
    // alone, so there is no timestamp and no decay function. A stable
    // body keeps a good entry forever; a changed one wants
    // re-measuring, which is a reason to come in.
    const book = makeStuff(() => new MeasureBook());
    book.record({
      subject: "s1",
      name: "Alice",
      bodyPlan: "/stuff/idea/species/BodyPlan/biped",
      statureM: 1.75,
      girthIndex: 6.0,
    });
    expect(book.stalenessFor("s1", 6.0)).toBe(0);
    expect(book.stalenessFor("s1", 6.6)).toBeCloseTo(0.1, 6);
    expect(book.stalenessFor("nobody", 6.0)).toBeNull();

    // ⚠ Structural: no field on an entry is a time.
    const entry = book.entryFor("s1")!;
    expect(Object.keys(entry).sort()).toEqual([
      "bodyPlan",
      "girthIndex",
      "name",
      "statureM",
      "subject",
    ]);
  });

  it("⚠ the shipped row carries no timestamp field either", () => {
    const book = row("thing", "measure-book");
    expect(book.entries).toEqual([]);
    expect(JSON.stringify(book)).not.toMatch(/stamp|timestamp|recordedAt/i);
  });

  it("refuses a malformed entry", () => {
    const book = makeStuff(() => new MeasureBook());
    expect(() =>
      book.setEntries([
        { subject: "", name: "x", bodyPlan: "b", statureM: 1, girthIndex: 1 },
      ]),
    ).toThrow(RangeError);
    expect(() =>
      book.setEntries([
        { subject: "s", name: "x", bodyPlan: "b", statureM: 0, girthIndex: 1 },
      ]),
    ).toThrow(RangeError);
  });
});

describe("⭐ cut is optimisation under waste", () => {
  afterEach(() => StuffApi.clearAll());

  it("⚠⚠ a tight cut leaves NO seam allowance, and nothing makes cloth", () => {
    // Conservation is what caps `alter`: letting a coat out needs more
    // cloth, and the only cloth there is is what the cut folded in.
    // ⭐ Magic hits the identical wall — a spell cannot conjure matter,
    // so a working might alter faster and never further.
    const pieces = makeStuff(() => new CutPieces());
    expect(pieces.getSeamAllowance()).toBe(0);
    pieces.setSeamAllowance(2);
    expect(pieces.getSeamAllowance()).toBe(2);
    expect(() => pieces.setSeamAllowance(-1)).toThrow(RangeError);
  });

  it("⭐ the pieces are Wearable BEFORE they are wearable — the stamp travels", () => {
    // Carrying `cutTo` on the pieces is what makes "cut for a body" a
    // fact about the CLOTH rather than about the finished coat, which
    // is what lets a tailor cut today and sew tomorrow.
    const pieces = makeStuff(() => new CutPieces());
    pieces.setCutTo("/stuff/idea/species/BodyPlan/biped", 1.75, 6.32);
    expect(pieces.getCutTo()).toEqual({
      bodyPlanPath: "/stuff/idea/species/BodyPlan/biped",
      statureM: 1.75,
      girthIndex: 6.32,
    });
  });
});

describe("the shipped garments", () => {
  it("⚠ NO garment row authors `clo`", () => {
    for (const f of readdirSync(join(TAILORING, "thing"))) {
      if (!f.endsWith(".yaml")) continue;
      const r = row("thing", f.replace(/\.yaml$/, ""));
      expect(r).not.toHaveProperty("clo");
    }
  });

  it("⭐ the APRON is the exposure-channel rule, with nothing authored", () => {
    // Nobody wrote "this is an apron". It is cheap, coarse, outermost
    // and wide — and apron-ness emerges from those four facts.
    const apron = row("thing", "apron");
    expect(apron.constructionForm).toBe("sackcloth");
    const claims = apron.slotClaims as Record<string, string[]>;
    // Wide: it covers more than the shirt underneath it.
    expect(claims["/stuff/idea/species/BodyPlan/biped"]!.length).toBeGreaterThan(1);
    // ⚠ And nothing anywhere says "apron" to the engine.
    expect(JSON.stringify(apron)).not.toMatch(/isApron|apronness|role:/i);
  });

  it("⚠ the jerkin left trade-smithing and its hide still has no producer", () => {
    // Moving it is the requirement; producing hide is Stage C's. ⚠⚠ Do
    // not invent a hide faucet — closing the gap with a spawn is the
    // quiet dishonesty the conservation rule exists to prevent.
    const recipe = YAML.parse(
      readFileSync(join(TAILORING, "..", "..", "recipes", "leather-jerkin.yaml"), "utf-8"),
    ) as { discipline: string; inputSlots: Array<{ category: string }> };
    expect(recipe.discipline).toBe("tailoring");
    expect(recipe.inputSlots[0]!.category).toBe("hide");
  });
});

describe("⭐⭐ the instrument affords the verb, never the furniture", () => {
  /*
   * The build's other trades already worked this way — `spin` comes
   * from `SpinningTool` (a drop spindle OR a wheel), `weave` from
   * `Loom` (a hand loom OR a broad loom) — and tailoring was the one
   * place three verbs hung off a room fixture. That made `cut`
   * impossible outside a shop and, worse, split affordance from
   * capability: a player holding a sewing kit in a field was offered no
   * `sew`, and a player standing at the shipped sewing MACHINE was
   * offered none either.
   */
  it("`cut` is afforded by the CUTTING TOOL, and both rungs are rows over it", () => {
    const shears = row("thing", "shears");
    const table = row("thing", "cutting-table");
    expect(shears.__class).toBe("/trade/tailoring/thing/CuttingTool");
    expect(table.__class).toBe("/trade/tailoring/thing/CuttingTool");
  });

  it("⭐ the two rungs differ ONLY in rate and control — a variant is seed data", () => {
    const caps = (r: Record<string, unknown>): Record<string, unknown> =>
      (r.capabilities as Record<string, unknown>[])[0]!;
    const shears = caps(row("thing", "shears"));
    const table = caps(row("thing", "cutting-table"));
    expect(shears.kind).toBe("cutting");
    expect(table.kind).toBe("cutting");
    // Portable and bad; fixed and good. The whole ladder in four values.
    expect(shears.rate).toBe(1);
    expect(shears.control).toBe("coarse");
    expect(table.rate).toBe(2);
    expect(table.control).toBe("fine");
  });

  it("`sew`/`alter` are afforded by a NEEDLE, which also mends", () => {
    const kit = row("thing", "needle-case");
    expect(kit.__class).toBe("/trade/tailoring/thing/SewingTool");
    // The `mending` kind is what `sew` resolves to pace the step, so the
    // general store's kit and machine still speed a tailor up without
    // either pack pointing at the other.
    const cap = (kit.capabilities as Record<string, unknown>[])[0]!;
    expect(cap.kind).toBe("mending");
  });

  it("⚠⚠ the tailor's own shop can still sew — the needle is IN it", () => {
    /*
     * The regression this exists for: taking `sew` off the cutting
     * table removes it from every room that has only a table. The shop
     * is the first casualty and the least likely to be noticed, because
     * the verb simply stops being offered rather than failing.
     */
    const shop = YAML.parse(
      readFileSync(join(TAILORING, "location", "shop.yaml"), "utf-8"),
    ) as { data?: { props?: string[] } };
    const props = shop.data?.props ?? [];
    expect(props).toContain("/trade/tailoring/thing/needle-case");
    expect(props).toContain("/trade/tailoring/thing/cutting-table");
  });

  it("⚠ nothing in the shop answers to `shears` twice", () => {
    // The table used to carry `shears` as a keyword. With a real pair of
    // shears in the same room that is how `get shears` picks up a 60kg
    // bench.
    const table = row("thing", "cutting-table");
    expect(table.keywords as string[]).not.toContain("shears");
    expect(row("thing", "shears").keywords as string[]).toContain("shears");
  });
});
