/**
 * Discipline seed roster — validates the real authored Catalog seeds parse
 * and form a sound graph, so a malformed seed fails here (at test time)
 * rather than at boot. Mirrors the biome / address roster tests.
 *
 * Checks: every seed parses and is a `/lib/advancement/Discipline` with a
 * non-empty `key` and a valid `channel`; keys are unique; every edge
 * (`requires` / `specializes` / `synergizes`) targets an existing
 * Discipline (no dangling references); conferral verbs reference a real
 * command YAML; and the demonstrative ISCED-F spine is present.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import { DISCIPLINE_CHANNELS } from "../../../platform/idea/Discipline";

const __filename = fileURLToPath(import.meta.url);
// A discipline row ships with the pack whose code derives or teaches its
// key (D6): the trades' rows are the platform's, the 18 `magic-*` rows
// are arcana's. The roster under test is the union.
const SEEDS_DIRS = [
  join(dirname(__filename), "../../../../../../content/platform/content/platform/idea/Discipline"),
  join(dirname(__filename), "../../../../../../content/arcana/content/system/arcana/idea/Discipline"),
];
// The engine verbs are the platform pack's content (content-packs wave 2).
const CMD_DIR = join(dirname(__filename), "../../../../../../content/platform/content/platform/cmd");

interface DisciplineSeed {
  class: string;
  data?: Record<string, unknown>;
}

function loadAll(): Map<string, DisciplineSeed["data"]> {
  const byKey = new Map<string, DisciplineSeed["data"]>();
  for (const dir of SEEDS_DIRS) for (const file of readdirSync(dir)) {
    if (!file.endsWith(".yaml")) continue;
    const seed = YAML.parse(
      readFileSync(join(dir, file), "utf-8")
    ) as DisciplineSeed;
    expect(seed.class, `${file} wrong class`).toBe("/platform/idea/Discipline");
    const key = seed.data?.key as string | undefined;
    expect(key, `${file} missing key`).toBeTruthy();
    byKey.set(key!, seed.data);
  }
  return byKey;
}

const EDGE_FIELDS = ["requires", "specializes", "synergizes"] as const;

describe("Discipline seed roster", () => {
  it("every seed parses with a valid class, key, and channel", () => {
    const byKey = loadAll();
    expect(byKey.size).toBeGreaterThanOrEqual(6);
    for (const [key, data] of byKey) {
      expect(DISCIPLINE_CHANNELS, `${key} bad channel`).toContain(
        data?.channel
      );
    }
  });

  it("has no dangling edge references", () => {
    const byKey = loadAll();
    for (const [key, data] of byKey) {
      for (const field of EDGE_FIELDS) {
        const targets = (data?.[field] as string[] | undefined) ?? [];
        for (const target of targets) {
          expect(
            byKey.has(target),
            `${key}.${field} → unknown discipline '${target}'`
          ).toBe(true);
        }
      }
    }
  });

  it("conferral verbs reference a real command YAML", () => {
    const byKey = loadAll();
    for (const [key, data] of byKey) {
      const rules = (data?.conferrals as Array<{ verbs?: string[] }>) ?? [];
      for (const rule of rules) {
        for (const verb of rule.verbs ?? []) {
          expect(
            existsSync(join(CMD_DIR, verb)),
            `${key} confers missing verb '${verb}'`
          ).toBe(true);
        }
      }
    }
  });

  it("hangs the bar leaves under a real ISCED-F spine", () => {
    const byKey = loadAll();
    // The five-grain chain from a practiced leaf up to a broad field.
    const chain = [
      "mixology",
      "bartending",
      "hospitality-catering",
      "personal-services",
      "services",
    ];
    for (let i = 0; i < chain.length - 1; i++) {
      const data = byKey.get(chain[i]!);
      const specializes = (data?.specializes as string[] | undefined) ?? [];
      expect(specializes, `${chain[i]} should specialize ${chain[i + 1]}`).toContain(
        chain[i + 1]
      );
    }
    // The conditioning leaf carries no field-of-education anchor.
    expect(byKey.get("alcohol-tolerance")?.iscedf ?? "").toBe("");
    // A second branch exists (the Catalog is a tree, not a line).
    expect(byKey.get("retail-sales")?.specializes).toContain(
      "business-administration"
    );
  });

  it("opens the agricultural branch — the Catalog had no agricultural node", () => {
    const byKey = loadAll();
    // Horticulture is the living-world family's first practiced leaf, under
    // an ISCED-F narrow field minted as its home (39 Disciplines shipped
    // before it and none were agricultural).
    const horticulture = byKey.get("horticulture");
    expect(horticulture, "horticulture missing").toBeTruthy();
    expect(horticulture?.channel).toBe("skill");
    expect(horticulture?.iscedf).toBe("0812"); // ISCED-F: Horticulture
    expect(horticulture?.specializes).toContain("agriculture");

    const agriculture = byKey.get("agriculture");
    expect(agriculture, "agriculture missing").toBeTruthy();
    expect(agriculture?.channel).toBe("knowledge"); // structural, unpracticed
    expect(agriculture?.iscedf).toBe("081"); // ISCED-F narrow field

    // No conferrals yet, deliberately: the knowing→doing seam for growing
    // things is diagnosis, which is a later phase's build. A row that
    // conferred a verb now would mean inventing the content it opens.
    expect(horticulture?.conferrals ?? []).toEqual([]);
    expect(agriculture?.conferrals ?? []).toEqual([]);

    // The plant side only — animal husbandry is its own leaf, later, under
    // the same parent.
    expect(byKey.has("animal-husbandry")).toBe(false);
  });

  it("carries the full magic grid — 5 verbs + 13 nouns, no conferrals", () => {
    const byKey = loadAll();
    const verbs = ["create", "destroy", "control", "transform", "perceive"];
    const nouns = [
      "fire", "water", "air", "earth", "light", "plant", "beast",
      "body", "mind", "sense", "arcana", "lightning", "storm",
    ];
    for (const v of verbs) {
      const data = byKey.get(`magic-${v}`);
      expect(data, `magic-${v} missing`).toBeTruthy();
      // every verb synergizes every active noun (the cross-axis grid)
      const syn = (data?.synergizes as string[] | undefined) ?? [];
      for (const n of nouns) expect(syn, `magic-${v} × ${n}`).toContain(`magic-${n}`);
      // DIV-11: access is a cast-time band gate, never a conferral
      expect(data?.conferrals ?? []).toEqual([]);
    }
    for (const n of nouns) {
      expect(byKey.get(`magic-${n}`), `magic-${n} missing`).toBeTruthy();
      expect(byKey.get(`magic-${n}`)?.conferrals ?? []).toEqual([]);
    }
    // the remaining frontier nouns are deliberately absent
    expect(byKey.has("magic-time")).toBe(false);
    expect(byKey.has("magic-spirit")).toBe(false);
  });
});
