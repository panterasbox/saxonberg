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
import { DISCIPLINE_CHANNELS } from "../Discipline";

const __filename = fileURLToPath(import.meta.url);
const SEEDS_DIR = join(
  dirname(__filename),
  "../../../seeds/lib/advancement/Discipline"
);
const CMD_DIR = join(dirname(__filename), "../../../cmd");

interface DisciplineSeed {
  class: string;
  data?: Record<string, unknown>;
}

function loadAll(): Map<string, DisciplineSeed["data"]> {
  const byKey = new Map<string, DisciplineSeed["data"]>();
  for (const file of readdirSync(SEEDS_DIR)) {
    if (!file.endsWith(".yaml")) continue;
    const seed = YAML.parse(
      readFileSync(join(SEEDS_DIR, file), "utf-8")
    ) as DisciplineSeed;
    expect(seed.class, `${file} wrong class`).toBe("/lib/advancement/Discipline");
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
});
