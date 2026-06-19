/**
 * check-pm-access — the persistence-gating lint.
 *
 * `PersistenceManager` is an ungated process singleton; reaching it via
 * `PersistenceManager.get()` from domain / logic code bypasses the
 * security layer entirely. All non-framework persistence must instead go
 * through the call-security-decorated `PersistApi` (`mud/api/persist.ts`).
 *
 * This script forbids `PersistenceManager.get(` everywhere EXCEPT the
 * sanctioned set:
 *   - the persistence framework — `lib/persistence/**` (Document) and
 *     `lib/stuff/Template.ts` (the template primitive): it *is* the data
 *     layer;
 *   - the backend — `backend/**`: it owns PM's lifecycle (connect / seed /
 *     hooks);
 *   - `api/hot-reload.ts` — the HMR hook-manifest reload (PM lifecycle, not
 *     data);
 *   - the `api/persist.ts` facade itself;
 *   - tests (`**/__tests__/**`).
 *
 * CI-gating (exits 1 on findings). A standalone script, not an ESLint
 * rule, for the same ESLint-8-legacy reason as `check-gate-strings`.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");

const PM_ACCESS = /PersistenceManager\s*\.\s*get\s*\(/;

/** Path prefixes (relative to `src/`) where `PersistenceManager.get()` is allowed. */
const ALLOW_PREFIX = ["backend/", "mud/lib/persistence/"];
/** Exact files where `PersistenceManager.get()` is allowed. */
const ALLOW_EXACT = new Set([
  "mud/lib/stuff/Template.ts",
  "mud/api/persist.ts",
  "mud/api/hot-reload.ts",
]);

function allowed(rel: string): boolean {
  if (rel.includes("/__tests__/")) return true;
  if (ALLOW_EXACT.has(rel)) return true;
  return ALLOW_PREFIX.some((p) => rel.startsWith(p));
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
}

const files: string[] = [];
walk(SERVER_SRC, files);

const findings: { file: string; line: number }[] = [];
for (const file of files) {
  const rel = relative(SERVER_SRC, file).split("\\").join("/");
  if (allowed(rel)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((text, i) => {
    if (PM_ACCESS.test(text)) findings.push({ file: rel, line: i + 1 });
  });
}

if (findings.length > 0) {
  console.error(
    `check-pm-access: ${findings.length} forbidden PersistenceManager.get() ` +
      `call(s) — route through PersistApi (mud/api/persist.ts):`,
  );
  for (const f of findings) console.error(`  ${f.file}:${f.line}`);
  process.exit(1);
}

console.info(
  `check-pm-access: all PersistenceManager.get() access is within the ` +
    `sanctioned boundary (${files.length} files scanned).`,
);
