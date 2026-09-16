/**
 * check-get-or-create — ⭐ **`StuffApi.singleton` IS the get-or-create.**
 *
 * Its first act is an index read on `byTemplatePath`: if an instance for
 * the path is resident it returns that instance, and it clones only on a
 * miss. So a `findByTemplatePath` guard in front of a `singleton` call
 * on the SAME path is the identical lookup written twice —
 *
 * ```ts
 * const resident = StuffApi.findByTemplatePath<T>(path);   // bucket read
 * if (resident) return resident;
 * return StuffApi.singleton<T>(path);                      // …same bucket read
 * ```
 *
 * — and the whole thing collapses to `return StuffApi.singleton<T>(path)`.
 *
 * ⚠⚠ **It is not merely redundant, which is why it is worth a gate.**
 * Both helpers throw when the bucket holds more than one instance, so in
 * the shape above the pre-check's throw escapes while a `try` around the
 * `singleton` call catches only the second one. The duplicate-row fault
 * — the one a reader most needs to see — takes the path that is NOT
 * handled, and the tolerable case takes the path that is.
 *
 * ⭐ **Where it came from, because the spread is the lesson.** One site
 * wrote it believing the sync hit was an optimisation `singleton` did
 * not do ("the cheap synchronous hit covers every read after the first"
 * — `Working.resolveDeposit`, since corrected). It was then copied into
 * nine more across five packs, each new site citing the last as
 * precedent. Nothing was wrong enough to fail a test, so nothing stopped
 * it; a mistaken comment is the most portable thing in a codebase.
 *
 * ⭐ A ratchet at zero, not a census: all ten were swept in the commit
 * that added this gate (`check-drive-scripts` is the precedent).
 *
 * ⚠ **What this gate does NOT flag**, deliberately: a *memoized* sync
 * accessor beside an async ensure. `findByTemplatePath` is synchronous
 * and `singleton` is not, so a class that needs a sync read (a
 * `describeFor`, a render path) legitimately keeps both — those are two
 * functions serving two call shapes, not one lookup written twice. The
 * gate matches the sequential in-one-function form only.
 *
 * Standalone script, not an ESLint rule, for the same reason as
 * `check-gate-strings` (ESLint 8 legacy config cannot load a local rule
 * without `--rulesdir`). CI-gating; self-enrols, because `lint:family`
 * derives its roster from `package.json`.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";
import { pathToFileURL } from "url";
import { MUD, SERVER_SRC, packSources, packSrcFiles } from "./pack-roots";

const EXIT_ON_FINDINGS = true; // CI-gating

export interface GetOrCreateFinding {
  file: string;
  line: number;
  path: string;
}

/**
 * The shape, and it is deliberately narrow: bind the resident lookup to
 * a local, return **that local and nothing else**, then `singleton` the
 * SAME path expression close behind.
 *
 * ⭐⭐ **Both back-references earn their place.** The path one keeps a
 * pre-check on a DIFFERENT path out (a different question entirely). The
 * variable one keeps the legitimate **memoized** shape out —
 *
 * ```ts
 * const found = StuffApi.findByTemplatePath<T>(P);
 * if (found) { catalogueRef = found; return found; }   // ← assigns first
 * ```
 *
 * — where the lookup is doing real cache-invalidation work (*the live
 * registered instance supersedes my cached one*) that `singleton` cannot
 * do on the caller's behalf. Eight of those exist in the kernel and none
 * is a defect. The antipattern is the form whose `if` body is exactly
 * `return <thatvar>;`, because then the branch adds nothing at all.
 */
const SHAPE =
  /const\s+(\w+)\s*=\s*[\s\S]{0,40}?findByTemplatePath<[^>]*>\(\s*([A-Za-z0-9_.$\[\]'"/-]+)\s*\)\s*;?\s*if\s*\(\s*\1\s*\)\s*return\s+\1\s*;[\s\S]{0,240}?singleton<[^>]*>\(\s*\2\s*\)/g;

/** Source with `//` and block comments blanked, newlines preserved. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Every offending pre-check in one file's source. */
export function scanGetOrCreate(source: string, file: string): GetOrCreateFinding[] {
  const code = stripComments(source);
  const out: GetOrCreateFinding[] = [];
  SHAPE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SHAPE.exec(code))) {
    out.push({
      file,
      line: code.slice(0, m.index).split("\n").length,
      path: m[2] ?? "",
    });
  }
  return out;
}

/** Every `.ts` module under the kernel mudlib, `__tests__` excluded. */
function kernelFiles(dir: string = MUD): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...kernelFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** The live tree's findings — the kernel plus every pack `src/`. */
export function collectLiveFindings(): GetOrCreateFinding[] {
  const out: GetOrCreateFinding[] = [];
  for (const file of kernelFiles()) {
    out.push(
      ...scanGetOrCreate(readFileSync(file, "utf8"), "src/" + relative(SERVER_SRC, file)),
    );
  }
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) {
      out.push(
        ...scanGetOrCreate(
          readFileSync(file, "utf8"),
          `packages/content/${pack.id}/src/${relative(pack.srcDir, file)}`,
        ),
      );
    }
  }
  return out;
}

function main(): void {
  const findings = collectLiveFindings();
  if (findings.length === 0) {
    console.log(
      "check-get-or-create: 0 resident pre-check(s) in front of singleton() (ceiling 0) ✔",
    );
    return;
  }
  console.error(
    `check-get-or-create: ${findings.length} redundant resident pre-check(s) ` +
      `in front of StuffApi.singleton() — the ceiling is 0.\n`,
  );
  for (const f of findings) console.error(`  ${f.file}:${f.line}  path=${f.path}`);
  console.error(
    `\n\`StuffApi.singleton(path)\` IS the get-or-create: it reads the same\n` +
      `byTemplatePath bucket first and clones only on a miss. Collapse the\n` +
      `pre-check:\n\n` +
      `    return StuffApi.singleton<T>(path);\n\n` +
      `⚠ And if you catch around it, do not catch SILENTLY — both helpers\n` +
      `throw on a duplicate row, and a bare \`return null\` turns that fault\n` +
      `into whatever "nothing here" means to the caller.\n\n` +
      `See docs/antipatterns.md § A resident pre-check in front of singleton().`,
  );
  if (EXIT_ON_FINDINGS) process.exit(1);
}

// Run only when invoked as a script — the unit test imports the pure
// scan (the check-combat-dynamics precedent).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
