/**
 * Rename-coverage guard (wizard-authority Phase 1).
 *
 * The `developers` / `isDeveloper` axis was renamed to `wizards` /
 * `isWizard`. This test fails if any of the retired symbols survive in
 * `packages/server/src`, so a stray reference (or a future revert of one
 * file) is caught mechanically rather than at runtime.
 *
 * Retired tokens: `isDeveloper`, `requiresDeveloper`, and the quoted
 * group-name literal `'developers'` / `"developers"`.
 *
 * Two files are exempt:
 *   - this guard itself (it names the retired tokens as patterns);
 *   - `obj/AccessRegistry.ts`, whose `seedWizardsGroup` legitimately
 *     references the legacy `'developers'` group name to rename the old
 *     doc forward (the one-time migration — see Phase 4).
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";

const SRC_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const EXEMPT_SUFFIXES = [
  // This guard file.
  join("mud", "__tests__", "wizardRenameCoverage.test.ts"),
  // The migration home — references the legacy group name on purpose.
  join("mud", "platform", "idea", "AccessRegistry.ts"),
  // The migration test — seeds + asserts against the legacy group name
  // to prove the developers→wizards rename-forward carries members over.
  join("mud", "platform", "__tests__", "AccessRegistry.test.ts"),
];

const RETIRED = /\bisDeveloper\b|\brequiresDeveloper\b|['"]developers['"]/;

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
}

describe("wizard-authority rename coverage", () => {
  it("no retired developer-axis symbol survives in packages/server/src", () => {
    const files: string[] = [];
    walk(SRC_ROOT, files);
    const offenders: string[] = [];
    for (const file of files) {
      if (EXEMPT_SUFFIXES.some((s) => file.endsWith(s))) continue;
      const text = readFileSync(file, "utf-8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (RETIRED.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
