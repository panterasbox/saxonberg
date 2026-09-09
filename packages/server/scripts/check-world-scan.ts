/**
 * check-world-scan — **you may not be handed the world.**
 *
 * Two patterns, one rule. `StuffApi.getAllObjects()` is a raw
 * enumeration of the entire object registry; `world:` is the same thing
 * behind nicer syntax.
 *
 * ⚠⚠ **This gate used to point offenders AT the second one.** Its
 * header said the fix for a bespoke `getAllObjects()` loop was
 * `MqlApi.resolveMany('world:[mixin.X]', …)` — so the pattern was not
 * drift, it was the documented house style, and it spread. Inverting the
 * guidance is part of the change that closes the door, not a footnote to
 * it: a gate whose rationale still recommends the thing it forbids gets
 * argued away the first time it is inconvenient.
 *
 * **The sanctioned fix is now the OWNER'S QUESTION.** *Which business
 * operates here*, *who works at this organization*, *which host holds
 * this item*, *what lanes touch this place* — each is asked of whoever
 * owns the answer, and that method is where an index can later go
 * without a caller moving. When the population genuinely is global and
 * selective — every `PersistableMixin`, every `BankMixin` — the read is
 * `MqlApi.resolveWorldIndexed` from a method NAMED in the pair list on
 * `api/mql.ts`, which is index-answerable by construction.
 *
 * A person typing `world:` is refused outright, with one exception: the
 * holder of the Prime Minister's seat, who is told what it cost. See
 * docs/antipatterns.md § Bespoke Object-Search Algorithms and
 * docs/subsystems/mql.md.
 *
 * The sanctioned homes are allowlisted below:
 *   - `api/mql/resolver.ts` — the `world` seed's OWN implementation
 *     (MQL is the mechanism; its internals legitimately enumerate).
 *   - `platform/idea/api/ResidencyLogic.ts` — the residency sweeps deliberately
 *     walk RAW unwrapped proxies so enumeration never counts as a
 *     touch (documented at both loops), which MQL can't express.
 *   - `api/stuff.ts` — where `getAllObjects` is DEFINED.
 *
 * ⭐ The water catalogue used to be a fourth, granted a shape scan
 * because *"a capability pack cannot ship a mixin"*. That stopped being
 * true when a pack gained a `lib/` of its own, so the withdrawers and
 * dischargers now declare themselves and the entry is gone. Whenever an
 * allowlist entry's REASON expires, the entry goes — that is what keeps
 * the list from becoming the place exceptions retire to.
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
];

const CALL = /\bStuffApi\.getAllObjects\s*\(/;

/**
 * The second pattern: a `world:` query, or a YAML/`MqlContext` scope of
 * `world`, written anywhere but the resolver and the owners on the pair
 * list. It is a build-time echo of a runtime refusal — the resolver
 * throws for an ungated caller either way — so that a new one is caught
 * in review rather than at the moment somebody's shop stops working.
 */
const WORLD_QUERY = /["']world:\[/;
const WORLD_SCOPE = /scope:\s*["']world["']/;

/**
 * Files permitted to write a `world:` query or a `world` scope. Every
 * entry is either the mechanism itself or a method NAMED in
 * `RegistryWideReaders` (api/mql.ts) — the two lists move together, and
 * `lint:gates` resolves that one against the source.
 */
const WORLD_QUERY_ALLOWLIST = [
  /\/mud\/api\/mql\.ts$/, // the two gated entries + the pair list
  /\/mud\/api\/mql\/resolver\.ts$/, // the seed's own implementation
  /\/mud\/platform\/idea\/api\/PersistableLogic\.ts$/, // captureAtShutdown
  /\/mud\/platform\/idea\/api\/AttendantLogic\.ts$/, // allPoints
  /\/mud\/platform\/idea\/api\/BankingLogic\.ts$/, // branchOf
  /\/mud\/platform\/idea\/api\/EmploymentLogic\.ts$/, // allBusinesses · employeesOf · findOrganization
  /\/mud\/platform\/idea\/api\/PressLogic\.ts$/, // holdsAnyPublishingPosition
  /\/mud\/lib\/residency\/Census\.ts$/, // takeCensus · spawnNow
  /\/mud\/platform\/idea\/api\/MagicLogic\.ts$/, // decoyNameFor
  /\/mud\/lib\/command\/CommandController\.ts$/, // resolveScreen
  /\/content\/water\/src\/idea\/WatercourseCatalogue\.ts$/, // worldScan
];

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

const worldQueryFindings: Finding[] = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  const rawAllowed = ALLOWLIST.some((re) => re.test(file));
  const queryAllowed = WORLD_QUERY_ALLOWLIST.some((re) => re.test(file));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trimStart().startsWith("*") || line.trimStart().startsWith("//")) {
      continue; // prose about the pattern is not the pattern
    }
    if (!rawAllowed && CALL.test(line)) {
      findings.push({ file, line: i + 1, text: line.trim().slice(0, 100) });
    }
    if (!queryAllowed && (WORLD_QUERY.test(line) || WORLD_SCOPE.test(line))) {
      worldQueryFindings.push({
        file,
        line: i + 1,
        text: line.trim().slice(0, 100),
      });
    }
  }
}

if (worldQueryFindings.length > 0) {
  console.error(
    `check-world-scan: ${worldQueryFindings.length} 'world:' quer${
      worldQueryFindings.length === 1 ? "y" : "ies"
    } outside the owners on the pair list:`
  );
  for (const f of worldQueryFindings) {
    console.error(
      `  ${relative(join(SERVER_SRC, ".."), f.file)}:${f.line}  ${f.text}`
    );
  }
  console.error(
    `\nAsk the owner: 'which business operates here', 'who works at this\n` +
      `organization', 'which host holds this item'. When the population\n` +
      `really is global AND selective, add a (template, method) pair to\n` +
      `RegistryWideReaders in mud/api/mql.ts and read through\n` +
      `MqlApi.resolveWorldIndexed from that method.`
  );
  process.exit(1);
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
  `check-world-scan: no bespoke getAllObjects() scans and no stray ` +
    `'world:' queries (${files.length} files scanned; ${ALLOWLIST.length} ` +
    `raw-enumeration homes, ${WORLD_QUERY_ALLOWLIST.length} query homes).`
);
