/**
 * check-content-refs — ⭐ **what the installer cannot see from one pack**
 * (failure-model D6).
 *
 * The installer validates each shipped document as it reads it, one pack at
 * a time, so a row that names a row in ANOTHER pack is checked by nobody
 * until a player meets it at play — where it is a content error. This gate
 * reads every pack at once:
 *
 *  - every recipe's `baseGradeBand` and each input slot's `minGrade` is a
 *    grade band (the list read out of `lib/craft/Grade.ts`, by text);
 *  - every recipe's `outputMaterial` names a material row some pack ships
 *    (`<pack>/content<path>.yaml`);
 *  - every `on <reason>` in a shipped `.msh` script names a reason row some
 *    pack ships (`<root>/reasons/<code>`; a bare code is the platform's).
 *
 * Census, then ratchet: today's count is the ceiling.
 *
 *   tsx scripts/check-content-refs.ts --lint     # CI gate
 *   tsx scripts/check-content-refs.ts --report   # the findings
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { parse as parseYaml } from "yaml";
import { CONTENT, MUD, ratchet } from "./pack-roots";
import { reasonRows } from "./check-reason-rows";

const REPO_ROOT = join(MUD, "../../../..");

/** Content references nothing ships — measured 2026-11-18 (failure-model W3). */
export const CONTENT_REFS_CEILING = 0;

/** The grade bands, read out of `Grade.ts` so the gate cannot drift from it. */
function gradeBands(): Set<string> {
  const src = readFileSync(join(MUD, "lib/craft/Grade.ts"), "utf8");
  const m = /export const GRADE_BANDS = \[([^\]]+)\]/.exec(src);
  if (!m) throw new Error("check-content-refs: could not read GRADE_BANDS out of lib/craft/Grade.ts — fix the parse");
  return new Set([...m[1]!.matchAll(/'([a-z]+)'/g)].map((x) => x[1]!));
}

/** Every file under `dir` with extension `ext`. */
function filesUnder(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p, ext));
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

/** The pack directories (each with a manifest). */
function packs(): string[] {
  return readdirSync(CONTENT)
    .map((p) => join(CONTENT, p))
    .filter((p) => existsSync(join(p, "pack.yaml")));
}

/** Does some pack ship a row at `path`? */
function shipsRow(path: string, packDirs: readonly string[]): boolean {
  return packDirs.some((p) => existsSync(join(p, "content", `${path}.yaml`)));
}

function census(): string[] {
  const bands = gradeBands();
  const packDirs = packs();
  const reasons = reasonRows();
  const findings: string[] = [];
  for (const pack of packDirs) {
    for (const file of filesUnder(join(pack, "content", "recipes"), ".yaml")) {
      const rel = relative(REPO_ROOT, file);
      const data = (parseYaml(readFileSync(file, "utf8")) ?? {}) as Record<string, unknown>;
      const base = data.baseGradeBand;
      if (typeof base === "string" && base !== "" && !bands.has(base)) {
        findings.push(`${rel} — baseGradeBand '${base}' is not a grade band`);
      }
      const slots = Array.isArray(data.inputSlots) ? (data.inputSlots as Array<Record<string, unknown>>) : [];
      slots.forEach((slot, i) => {
        const min = slot?.minGrade;
        if (min !== undefined && min !== "" && !(typeof min === "string" && bands.has(min))) {
          findings.push(`${rel} — inputSlots[${i}].minGrade '${String(min)}' is not a grade band`);
        }
      });
      const out = data.outputMaterial;
      if (typeof out === "string" && out.startsWith("/") && !shipsRow(out, packDirs)) {
        findings.push(`${rel} — outputMaterial ${out}: no pack ships that material`);
      }
    }
    for (const file of filesUnder(join(pack, "content"), ".msh")) {
      const rel = relative(REPO_ROOT, file);
      const source = readFileSync(file, "utf8").replace(/#[^\n]*/g, "");
      for (const m of source.matchAll(/\bon\s+([^{]+)\{/g)) {
        for (const code of m[1]!.split(/[\s,]+/).filter((c) => c !== "" && c !== "*")) {
          const path = code.startsWith("/") ? code : `/platform/reasons/${code}`;
          if (!reasons.has(path)) findings.push(`${rel} — on ${code}: no reason row at ${path}`);
        }
      }
    }
  }
  return findings;
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const findings = census();
  if (mode === "--report") {
    console.log(`${findings.length} content reference(s) nothing ships`);
    for (const f of findings) console.log(`  ${f}`);
    return;
  }
  const ok = ratchet(
    "lint:content-refs",
    "content references nothing ships",
    findings.length,
    CONTENT_REFS_CEILING,
    findings,
    "Fix the row (a band is one of Grade.ts's GRADE_BANDS; a material or a reason is a row some pack ships). " +
      "A forced-through bad row is a content error at play. The ceiling may fall; it may never rise.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && /check-content-refs\.ts$/.test(process.argv[1])) {
  main();
}
