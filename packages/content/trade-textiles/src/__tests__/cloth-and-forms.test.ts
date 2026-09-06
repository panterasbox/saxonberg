/**
 * ⭐⭐ Dye lots, and the pack's own fabric forms.
 *
 * Two claims are under test and both are load-bearing:
 *
 * 1. **A pack can add a construction form with no kernel edit** — the
 *    whole point of `Construction`'s second source, demonstrated by
 *    this pack's own `/trade/textiles/idea/fabric/*` rows.
 * 2. **Two bolts from different dye lots do not merge**, which is the
 *    real-world dye-lot problem falling out of a predicate — and which
 *    makes a dyer's repeatability visible *in the inventory*, with no
 *    gauge and no number.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import ClothBolt from "../thing/ClothBolt";
import { Construction } from "@saxonberg/server/mud/lib/material/Construction";
import { Grade } from "@saxonberg/server/mud/lib/craft/Grade";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, "..", "..", "content", "trade", "textiles");

const MADDER = "/trade/farming/idea/material/madder";
const WELD = "/trade/farming/idea/material/weld";

/** The pack's own fabric rows, registered exactly as the catalogue does. */
function registerPackFabrics(): string[] {
  const dir = join(CONTENT, "idea", "fabric");
  const keys: string[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".yaml"))) {
    const doc = YAML.parse(readFileSync(join(dir, f), "utf-8")) as {
      class?: string;
      data: {
        key: string;
        layerBand: number;
        loft: number;
        weaveDensity: number;
        drape: number;
      };
    };
    expect(doc.class).toBe("/platform/idea/material/Fabric");
    Construction.registerFabric(doc.data);
    keys.push(doc.data.key);
  }
  // Plus the commons' `woven`, which this pack's bolts default to.
  Construction.registerFabric({
    key: "woven",
    layerBand: 0,
    loft: 0.1,
    weaveDensity: 0.75,
    drape: 0.6,
  });
  return keys;
}

let seq = 0;

function bolt(opts: {
  form?: string;
  band?: string;
  dye?: Array<{ dyestuff: string; mordant: string; strength: number }>;
}): ClothBolt {
  const b = makeStuff(() => new ClothBolt());
  // ⚠ Same row: `canMergeWith`'s FIRST question is template identity,
  // and two clones of one row is what a real pair of bolts is — see
  // `pair` below, which stamps both at one path.
  b.setConstructionForm(opts.form ?? "woven");
  b.setGrade(Grade.of(opts.band ?? "fair"));
  if (opts.dye) b.setDyeStack(opts.dye.map((a) => ({ ...a })));
  return b;
}

/** Both bolts must sit at the same template path to be comparable. */
function pair(
  a: Parameters<typeof bolt>[0],
  b: Parameters<typeof bolt>[0],
): [ClothBolt, ClothBolt] {
  const path = `/trade/textiles/thing/bolt-test-${seq++}`;
  const left = bolt(a);
  const right = bolt(b);
  stamp(left, path);
  stamp(right, path);
  return [left, right];
}

function stamp(s: Stuff, path: string): void {
  stampTemplatePathForTest(s, path);
}

describe("⭐ a PACK adds construction forms with no kernel edit", () => {
  beforeEach(() => Construction.clearFabrics());
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it("this pack's own fabric rows join the vocabulary", () => {
    // The kernel's covering vocabulary knows nothing about sackcloth.
    expect(Construction.isForm("sackcloth")).toBe(false);
    const keys = registerPackFabrics();
    expect(keys).toContain("sackcloth");
    expect(keys).toContain("fine-woven");
    for (const key of keys) {
      expect(Construction.isForm(key)).toBe(true);
      expect(Construction.of(key).getDomain()).toBe("covering");
      // ⚠ And it changes NOTHING about combat: every textile form
      // shares one kernel resist profile. Content chooses the weave;
      // the kernel decides that cloth resists poorly.
      expect(Construction.of(key).responseFor("edge")).toBe("poor");
      expect(Construction.of(key).doesNothing()).toBe(false);
    }
  });

  it("⭐ the three cloths are one continuum, ordered by weave density", () => {
    registerPackFabrics();
    const density = (k: string): number =>
      Construction.of(k).getFabric()!.weaveDensity;
    expect(density("sackcloth")).toBeLessThan(density("woven"));
    expect(density("woven")).toBeLessThan(density("fine-woven"));
    // …and they share a band, so wear order decides between them.
    const band = (k: string): number => Construction.of(k).getLayerDepth();
    expect(band("sackcloth")).toBe(band("fine-woven"));
  });
});

describe("⭐⭐ two bolts from different dye lots do not merge", () => {
  beforeEach(() => {
    Construction.clearFabrics();
    registerPackFabrics();
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it("identical bolts stack", () => {
    const [a, b] = pair({}, {});
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(true);
  });

  it("⚠ a different GRADE is a different pile", () => {
    // The band came all the way from the field's worst stretch.
    const [a, b] = pair({ band: "fine" }, { band: "fair" });
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
  });

  it("⚠ a different WEAVE is a different cloth, however alike folded", () => {
    const [a, b] = pair({ form: "woven" }, { form: "fine-woven" });
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
  });

  it("⭐⭐⭐ the DYE LOT — same dyestuff, different strength, two piles", () => {
    /*
     * This is the whole finding. A master dyer hits the same strength
     * twice and their stock consolidates into clean bolts; a novice
     * misses by a little every time and their stock fragments into a
     * dozen almost-matching piles.
     *
     * Competence becomes visible IN THE INVENTORY — no gauge, no
     * number, no readout — and nobody designed it. It is what
     * `canMergeWith` does when it meets an application stack.
     */
    const [master1, master2] = pair(
      { dye: [{ dyestuff: MADDER, mordant: "alum", strength: 0.8 }] },
      { dye: [{ dyestuff: MADDER, mordant: "alum", strength: 0.8 }] },
    );
    expect(master1.canMergeWith(master2 as unknown as Stuff)).toBe(true);

    const [novice1, novice2] = pair(
      { dye: [{ dyestuff: MADDER, mordant: "alum", strength: 0.8 }] },
      { dye: [{ dyestuff: MADDER, mordant: "alum", strength: 0.74 }] },
    );
    expect(novice1.canMergeWith(novice2 as unknown as Stuff)).toBe(false);
  });

  it("⚠ a different MORDANT is a different colour entirely", () => {
    // Iron saddens where alum brightens — same dyestuff, two cloths.
    const [a, b] = pair(
      { dye: [{ dyestuff: MADDER, mordant: "alum", strength: 0.8 }] },
      { dye: [{ dyestuff: MADDER, mordant: "iron", strength: 0.8 }] },
    );
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
  });

  it("⭐ overdyeing order matters — blue over yellow is not yellow over blue", () => {
    const [a, b] = pair(
      {
        dye: [
          { dyestuff: WELD, mordant: "alum", strength: 0.7 },
          { dyestuff: MADDER, mordant: "alum", strength: 0.5 },
        ],
      },
      {
        dye: [
          { dyestuff: MADDER, mordant: "alum", strength: 0.5 },
          { dyestuff: WELD, mordant: "alum", strength: 0.7 },
        ],
      },
    );
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
  });

  it("an undyed bolt never merges with a dyed one", () => {
    const [a, b] = pair(
      {},
      { dye: [{ dyestuff: MADDER, mordant: "alum", strength: 0.8 }] },
    );
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
  });
});
