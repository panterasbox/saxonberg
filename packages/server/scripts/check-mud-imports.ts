/**
 * check-mud-imports — the driver/mudlib import boundary.
 *
 * The rule: **nothing under `src/mud/` imports anything from outside
 * `src/mud/` — Node built-ins included — except the Api layer, which
 * imports and wraps.**
 *
 * This is the classic driver/mudlib split stated for our tree. Mudlib
 * code gets **no ambient capabilities** (no filesystem, no network, no
 * process, no code-eval); it asks the gated Api surface. The rule is the
 * import-graph twin of call-security: call-security governs who may call
 * what at runtime, this governs what a module can reach at all. Together
 * they make the sandbox / wizard code-trust story checkable — authored
 * code that can only import mud modules can only do what the Apis gate.
 *
 * Four tiers:
 *   - **mudlib** (the default — `lib/`, `obj/` outside `obj/api/`, `cmd/`,
 *     `domain/`, …): relative imports resolving inside `src/mud/`, plus
 *     `@saxonberg/types`, plus any `import type`. Nothing else.
 *   - **api** (`mud/api/**`) and **objapi** (`mud/obj/api/**`): the
 *     wrapping tier — additionally may import an enumerated set of Node
 *     built-ins and npm packages, and may reach `backend/`. These two are
 *     the halves of the mandatory `XApi` <-> `XLogic` split: `api/` is the
 *     thin non-HMR forwarding shell, the logic singleton is where the
 *     capability actually gets used. Exempting only `api/` would force the
 *     wrap to forward backwards into logic that could not do the work.
 *   - **test** (`**\/__tests__/**`): unrestricted. Tests are not shipped
 *     mudlib and already reach for white-box seams by design.
 *
 * Type-only imports are exempt everywhere: `import type` is erased at
 * compile time and confers no runtime capability. The rule is about
 * capability, not about vocabulary.
 *
 * Both allowlists are **enumerated, not open** — a new built-in or npm
 * dependency in the Api tier is a deliberate edit here, which is the
 * tripwire that forces the conversation (the same discipline as the
 * export-discipline exception registry). Driver-level dependencies
 * (mongodb / express / ws / passport) are not on the list at any tier:
 * they belong to `backend/`.
 *
 * Dynamic `import()`, `require()` and `createRequire` are checked with the
 * same matrix — a soundness hole there would make the whole rule
 * decorative.
 *
 * Usage:
 *   tsx scripts/check-mud-imports.ts            # CI mode, exits 1 on findings
 *   tsx scripts/check-mud-imports.ts --report   # grouped survey, always exits 0
 *
 * CI-gating. A standalone script, not an ESLint rule, for the same
 * ESLint-8-legacy reason as `check-gate-strings` — and because
 * `no-restricted-imports` cannot express "a relative import that escapes
 * this subtree" without a resolver plugin.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = resolve(join(here, "..", "src"));
const MUD = join(SERVER_SRC, "mud");

const REPORT = process.argv.includes("--report");

/* ------------------------------------------------------------------ */
/* The allowlists                                                      */
/* ------------------------------------------------------------------ */

/** Allowed for every tier, including mudlib: the shared types package. */
const ALWAYS_ALLOWED = new Set(["@saxonberg/types"]);

/**
 * Node built-ins the Api tier may import. Enumerated on purpose — adding
 * one is a deliberate widening of what the mudlib can be given.
 */
const API_BUILTINS = new Set([
  "async_hooks",
  "child_process",
  "crypto",
  "fs",
  "fs/promises",
  "module",
  "os",
  "path",
  "url",
  "vm",
]);

/**
 * npm packages the Api tier may import. Driver-level packages (mongodb,
 * express, ws, passport) are deliberately absent — those live in
 * `backend/`, behind an Api that wraps them.
 */
const API_NPM = new Set([
  "ajv",
  "geoip-lite",
  "liquidjs",
  "nanoid",
  "simple-git",
  "yaml",
]);

/** Directories outside `src/mud/` the Api tier may reach into. */
const API_OUT_OF_TREE_PREFIXES = ["backend/"];

/* ------------------------------------------------------------------ */
/* The exception registry                                              */
/* ------------------------------------------------------------------ */

/**
 * Per-file exceptions: a mudlib-tier file that may import specific
 * modules, each with the reason it is not folded into an Api.
 *
 * Keys are paths relative to `src/mud/`. Every entry is a considered
 * carve-out, not a backlog item to be grown — ask before adding one, the
 * same discipline as the `no-restricted-syntax` export exceptions.
 */
const EXCEPTIONS: Record<string, { modules: string[]; reason: string }> = {
  "lib/persistence/Document.ts": {
    modules: ["backend/PersistenceManager"],
    reason:
      "IS the data layer — the same sanctioned framework boundary that " +
      "check-pm-access.ts already allows PersistenceManager.get() from.",
  },
  "lib/stuff/Template.ts": {
    modules: ["backend/PersistenceManager"],
    reason:
      "IS the data layer — the template primitive, same sanctioned " +
      "framework boundary as lib/persistence/Document.ts.",
  },
  "lib/persistence/EncryptedStringMarshaller.ts": {
    modules: ["crypto"],
    reason:
      "The marshaller's whole job is encrypt-at-rest; `crypto` is pure " +
      "computation (no fs / net / process). Folding it into an Api would " +
      "relocate the import without changing the trust story.",
  },
  "lib/prose/Prose.ts": {
    modules: ["liquidjs"],
    reason:
      "The prose value object IS the compiled-template binding; liquidjs " +
      "is pure computation with file-loading tags deliberately " +
      "unconfigured (see the class doc). ProseApi/ProseLogic forward here.",
  },
  "lib/command/CommandDefinition.ts": {
    modules: ["ajv"],
    reason:
      "Compiles `cmd/command.schema.json` against an authored command " +
      "spec. `ajv` is pure computation (a schema + a value in, a verdict " +
      "out — no fs / net / process), and the schema itself now loads " +
      "through SourceTreeApi. Routing the validation through the gated " +
      "CommandApi instead would put the security stack in front of the " +
      "~120 tests that build a CommandDefinition from inline YAML.",
  },
  "lib/script/EvalScript.ts": {
    modules: ["vm"],
    reason:
      "The sandboxed-eval primitive — `node:vm` IS the capability being " +
      "modeled, and this is the single place it may appear. Reachable " +
      "only behind AccessApi.isWizard (the code-trust axis).",
  },
};

/* ------------------------------------------------------------------ */
/* Scanning                                                            */
/* ------------------------------------------------------------------ */

type Tier = "mudlib" | "api" | "objapi" | "test";

function tierOf(rel: string): Tier {
  if (rel.includes("/__tests__/") || rel.startsWith("__tests__/"))
    return "test";
  if (rel.startsWith("api/")) return "api";
  if (rel.startsWith("obj/api/")) return "objapi";
  return "mudlib";
}

/**
 * Import / re-export bodies contain only identifiers, braces, commas,
 * `as`, `type`, `*` and whitespace — never `;`, backticks, parens or
 * quotes. Constraining the body keeps template literals and comments
 * containing the word `from` out of the match.
 */
const STATIC_IMPORT =
  /^[ \t]*(?:import|export)(?<body>[A-Za-z0-9_$*{},\s]*?)from\s*['"](?<spec>[^'"]+)['"]/gm;
/** `import './side-effect'` — no body, no `from`. */
const SIDE_EFFECT_IMPORT = /^[ \t]*import\s*['"](?<spec>[^'"]+)['"]/gm;
/** `import('x')` / `require('x')` with a literal specifier. */
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]/g;
const REQUIRE_CALL = /(?<![.\w])require\s*\(\s*['"]([^'"]+)['"]/g;
/** `createRequire` — an escape hatch that resolves outside the checker. */
const CREATE_REQUIRE = /\bcreateRequire\s*\(/g;

interface Finding {
  file: string;
  tier: Tier;
  line: number;
  spec: string;
  /** The normalized module key an allowlist is checked against. */
  key: string;
  kind: string;
}

function lineOf(src: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
}

/**
 * Normalize a specifier to the key the allowlists speak:
 *   - a relative path staying inside `src/mud/` -> null (always fine)
 *   - a relative path escaping it -> its path relative to `src/`
 *     (e.g. `backend/PersistenceManager`)
 *   - a bare specifier -> the package/builtin name, `node:` stripped,
 *     scoped packages kept whole (`@saxonberg/types`)
 */
function keyFor(abs: string, spec: string): string | null {
  if (spec.startsWith(".")) {
    const target = resolve(dirname(abs), spec);
    if (target.startsWith(MUD + "/") || target === MUD) return null;
    return relative(SERVER_SRC, target).split("\\").join("/");
  }
  const bare = spec.startsWith("node:") ? spec.slice(5) : spec;
  if (bare.startsWith("@")) return bare.split("/").slice(0, 2).join("/");
  // `fs/promises` keeps its subpath; other packages collapse to the root.
  if (bare.startsWith("fs/")) return bare;
  return bare.split("/")[0]!;
}

function allowed(rel: string, tier: Tier, key: string): boolean {
  if (tier === "test") return true;
  if (ALWAYS_ALLOWED.has(key)) return true;

  const exception = EXCEPTIONS[rel];
  if (exception && exception.modules.includes(key)) return true;

  if (tier === "api" || tier === "objapi") {
    if (API_BUILTINS.has(key)) return true;
    if (API_NPM.has(key)) return true;
    if (API_OUT_OF_TREE_PREFIXES.some((p) => key.startsWith(p))) return true;
  }
  return false;
}

const files: string[] = [];
walk(MUD, files);

const findings: Finding[] = [];

for (const abs of files) {
  const rel = relative(MUD, abs).split("\\").join("/");
  const tier = tierOf(rel);
  const src = readFileSync(abs, "utf8");

  const consider = (
    spec: string,
    index: number,
    kind: string,
    typeOnly: boolean
  ): void => {
    // `import type` is erased at compile time: no runtime capability.
    if (typeOnly) return;
    const key = keyFor(abs, spec);
    if (key === null) return;
    if (allowed(rel, tier, key)) return;
    findings.push({
      file: rel,
      tier,
      line: lineOf(src, index),
      spec,
      key,
      kind,
    });
  };

  for (const m of src.matchAll(STATIC_IMPORT)) {
    const body = m.groups!.body ?? "";
    consider(
      m.groups!.spec!,
      m.index!,
      "import",
      /^\s*type\s/.test(body)
    );
  }
  for (const m of src.matchAll(SIDE_EFFECT_IMPORT))
    consider(m.groups!.spec!, m.index!, "import", false);
  for (const m of src.matchAll(DYNAMIC_IMPORT))
    consider(m[1]!, m.index!, "dynamic import()", false);
  for (const m of src.matchAll(REQUIRE_CALL))
    consider(m[1]!, m.index!, "require()", false);

  // createRequire resolves specifiers this checker cannot see, so it is
  // itself restricted to the tiers that may import freely.
  if (tier === "mudlib") {
    for (const m of src.matchAll(CREATE_REQUIRE)) {
      findings.push({
        file: rel,
        tier,
        line: lineOf(src, m.index!),
        spec: "createRequire(...)",
        key: "createRequire",
        kind: "createRequire",
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

if (REPORT) {
  const byKey = new Map<string, Set<string>>();
  for (const f of findings) {
    if (!byKey.has(f.key)) byKey.set(f.key, new Set());
    byKey.get(f.key)!.add(f.file);
  }
  console.info(
    `check-mud-imports --report: ${findings.length} boundary crossing(s) ` +
      `in ${new Set(findings.map((f) => f.file)).size} file(s) ` +
      `(${files.length} scanned).\n`
  );
  console.info("By module:");
  for (const [key, set] of [...byKey.entries()].sort(
    (a, b) => b[1].size - a[1].size
  ))
    console.info(`  ${String(set.size).padStart(4)} files  ${key}`);
  console.info("\nBy file:");
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }
  for (const [file, fs_] of [...byFile.entries()].sort())
    console.info(
      `  ${file}\n      ${[...new Set(fs_.map((f) => f.key))].join(", ")}`
    );
  process.exit(0);
}

if (findings.length > 0) {
  console.error(
    `check-mud-imports: ${findings.length} import(s) cross the mudlib ` +
      `boundary. Only mud/api/** and mud/obj/api/** may import outside ` +
      `src/mud/ (see docs/architecture.md § The import boundary):`
  );
  for (const f of findings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line
  ))
    console.error(`  ${f.file}:${f.line}  ${f.kind} '${f.spec}'  [${f.key}]`);
  process.exit(1);
}

console.info(
  `check-mud-imports: no imports cross the mudlib boundary ` +
    `(${files.length} files scanned).`
);
