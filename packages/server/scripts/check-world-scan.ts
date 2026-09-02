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
 * The sanctioned homes are allowlisted below:
 *   - `api/mql/resolver.ts` — the `world` seed's OWN implementation
 *     (MQL is the mechanism; its internals legitimately enumerate).
 *   - `platform/idea/api/ResidencyLogic.ts` — the residency sweeps deliberately
 *     walk RAW unwrapped proxies so enumeration never counts as a
 *     touch (documented at both loops), which MQL can't express.
 *   - `api/stuff.ts` — where `getAllObjects` is DEFINED.
 *   - `water/src/idea/WatercourseCatalogue.ts` — the one walk that
 *     finds every withdrawal and every outfall on the realm's rivers.
 *     MQL selects by MIXIN and a capability pack cannot ship one (its
 *     module categories are branches, controllers and tests); its
 *     `class.X` filter matches by class NAME and three unrelated things
 *     in this codebase are called `Conduit`. A shape scan is the honest
 *     mechanism available to a pack.
 *
 * ⚠ **It walks capability packs' `src/` as well as the kernel tree.**
 * It did not until the watershed build put a scan in one and nothing
 * said a word — the rule is about the codebase, not about one
 * directory, and a gate that cannot see half the code is worse than it
 * looks.
 *
 * Standalone script, not an ESLint rule, for the same reason as
 * `check-gate-strings` (ESLint 8 legacy config can't load a local rule
 * without `--rulesdir`). CI-gating.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import { packSources } from "./pack-roots";

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
  /\/mud\/platform\/idea\/api\/ResidencyLogic\.ts$/, // raw-proxy sweeps (documented)
  // A pack cannot ship a mixin, so it cannot be selected by MQL; the
  // shape scan is documented at its call site. See the header.
  /\/content\/water\/src\/idea\/WatercourseCatalogue\.ts$/,
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
// Every capability pack's own `src/` is code by the same rules — a
// pack class searching the world is exactly the thing this gate is
// about, and it was invisible here until it was not.
for (const pack of packSources()) walk(pack.srcDir, files);

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
    `(${files.length} files scanned; ${ALLOWLIST.length} sanctioned ` +
      `homes allowlisted).`
);
