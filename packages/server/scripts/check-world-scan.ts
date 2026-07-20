/**
 * check-world-scan — the "MQL is how you search" lint.
 *
 * `StuffApi.getAllObjects()` is a raw enumeration of the entire object
 * registry. Runtime Stuff search should go through MQL instead
 * (`MqlApi.resolveMany('world:[mixin.X]', …)` — the code-only system
 * mode for engine sweeps, `reachable`/`person` for actor-anchored
 * scans), so bespoke `getAllObjects()` filter-loops don't proliferate.
 * See docs/antipatterns.md § Bespoke Object-Search Algorithms and
 * docs/subsystems/mql.md.
 *
 * The three sanctioned homes are allowlisted below:
 *   - `api/mql/resolver.ts` — the `world` seed's OWN implementation
 *     (MQL is the mechanism; its internals legitimately enumerate).
 *   - `obj/api/ResidencyLogic.ts` — the residency sweeps deliberately
 *     walk RAW unwrapped proxies so enumeration never counts as a
 *     touch (documented at both loops), which MQL can't express.
 *   - `api/stuff.ts` — where `getAllObjects` is DEFINED.
 *
 * Standalone script, not an ESLint rule, for the same reason as
 * `check-gate-strings` (ESLint 8 legacy config can't load a local rule
 * without `--rulesdir`). CI-gating.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const MUD_ROOT = join(SERVER_SRC, "mud");

/**
 * Files permitted to call `getAllObjects()`. Adding a file here is a
 * deliberate edit with a one-line reason in review — keep it short.
 */
const ALLOWLIST = [
  /\/mud\/api\/stuff\.ts$/, // the definition
  /\/mud\/api\/mql\/resolver\.ts$/, // the `world` seed implementation
  /\/mud\/obj\/api\/ResidencyLogic\.ts$/, // raw-proxy sweeps (documented)
];

const CALL = /\bStuffApi\.getAllObjects\s*\(/;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) {
      out.push(full);
    }
  }
}

const files: string[] = [];
walk(MUD_ROOT, files);

interface Finding {
  file: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];

for (const file of files) {
  if (ALLOWLIST.some((re) => re.test(file))) continue;
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (CALL.test(line)) {
      findings.push({ file, line: i + 1, text: line.trim().slice(0, 100) });
    }
  }
}

if (findings.length > 0) {
  console.error(
    `check-world-scan: ${findings.length} bespoke ` +
      `StuffApi.getAllObjects() call${findings.length === 1 ? "" : "s"} ` +
      `outside the sanctioned homes (use MQL — see ` +
      `docs/antipatterns.md § Bespoke Object-Search Algorithms):`
  );
  for (const f of findings) {
    console.error(
      `  ${relative(join(SERVER_SRC, ".."), f.file)}:${f.line}  ${f.text}`
    );
  }
  process.exit(1);
}

console.log(
  `check-world-scan: no bespoke getAllObjects() scans ` +
    `(${files.length} files scanned; 3 sanctioned homes allowlisted).`
);
