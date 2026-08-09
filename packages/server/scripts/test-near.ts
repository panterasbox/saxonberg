/**
 * test-near — run the tests that sit NEXT TO what you changed.
 *
 * The fast inner loop. A build cycle was running the full 15-minute
 * suite three or four times to answer questions that mostly did not
 * need it; this answers the mid-build "did my change work?" in
 * seconds, so the full run happens once, before the MR.
 *
 * ## What it selects
 *
 * `git diff --name-only <ref>` plus uncommitted and untracked work,
 * then for each changed file:
 *
 *   - a `*.test.ts` — run it;
 *   - anything else under `packages/server` — run the `__tests__`
 *     directory beside it, which is where this codebase keeps a
 *     module's tests.
 *
 * ## ⚠ It is proximity, not a dependency graph
 *
 * It is called `near`, not `affected`, because it cannot promise the
 * second thing. It will miss:
 *
 *   - a test in another subsystem that covers your change;
 *   - **anything driven by data** — a seed YAML, a content pack, a
 *     template row. Nothing *imports* those, so no file-based tool can
 *     see the dependency, and this codebase is full of them.
 *
 * So this is a loop accelerator and **never a gate**. `pnpm test`
 * before the MR, and CI after. If that distinction ever blurs, the
 * name is the thing to fix, not the docs.
 *
 * ## Why not `vitest --changed`
 *
 * Measured, and it does not work here: it returns all 962 files in
 * every case, including with no changes at all. The likely cause is
 * the worktree layout (`.git` is a file pointing into `../.bare`, not
 * a directory), and vitest's detection appears to fail open. Failing
 * open is the right direction for a test runner, but the flag buys
 * nothing. See docs/testing.md.
 *
 * ## Usage
 *
 *   pnpm test:near                  # vs origin/master
 *   pnpm test:near -- HEAD~3        # vs another ref
 *   pnpm test:near -- --list        # print the selection, run nothing
 */

import { execFileSync, spawnSync } from "child_process";
import { existsSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

import { GYM_TESTS } from "../vitest.config";

const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(SERVER_DIR, "..", "..");

function git(args: string[]): string[] {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const argv = process.argv.slice(2);
const listOnly = argv.includes("--list");
const ref = argv.find((a) => !a.startsWith("-")) ?? "origin/master";

// Committed changes since the ref, plus whatever is still in the
// working tree — mid-build, the uncommitted half is the point.
const changed = new Set<string>([
  ...git(["diff", "--name-only", `${ref}...HEAD`]),
  ...git(["diff", "--name-only", "HEAD"]),
  ...git(["ls-files", "--others", "--exclude-standard"]),
]);

if (changed.size === 0) {
  console.log(`test-near: nothing changed vs ${ref} — nothing to run.`);
  process.exit(0);
}

const targets = new Set<string>();
let skippedOutsideServer = 0;

for (const file of changed) {
  const abs = join(REPO_ROOT, file);
  const rel = relative(SERVER_DIR, abs);
  if (rel.startsWith("..")) {
    skippedOutsideServer++;
    continue; // client, docs, deploy — not this suite's business
  }
  if (file.endsWith(".test.ts")) {
    if (existsSync(abs)) targets.add(rel);
    continue;
  }
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const siblingTests = join(dirname(abs), "__tests__");
  if (existsSync(siblingTests) && statSync(siblingTests).isDirectory()) {
    targets.add(relative(SERVER_DIR, siblingTests));
  }
}

if (targets.size === 0) {
  console.log(
    `test-near: ${changed.size} changed file(s) vs ${ref}, but none has a ` +
      `sibling __tests__ directory in packages/server.`
  );
  console.log("Nothing to run — which is NOT the same as nothing to check.");
  console.log("Run `pnpm test` before opening the MR.");
  process.exit(0);
}

// The gym benches are excluded from the default vitest config, so
// naming one on the command line runs NOTHING. Say so rather than
// letting a changed bench look like a passing one.
const gymHits = [...targets].filter((t) => GYM_TESTS.includes(t));
for (const g of gymHits) targets.delete(g);

// A directory already covers the files under it; listing both is noise.
const dirs = [...targets].filter((t) => !t.endsWith(".ts"));
for (const t of [...targets]) {
  if (t.endsWith(".ts") && dirs.some((d) => t.startsWith(`${d}/`))) {
    targets.delete(t);
  }
}

const selection = [...targets].sort();

if (gymHits.length > 0) {
  console.log(
    `test-near: ${gymHits.length} changed gym bench — run \`pnpm test:gym\`:`
  );
  for (const g of gymHits) console.log(`  ${g}`);
  console.log("");
}

if (selection.length === 0) {
  console.log("test-near: nothing else to run in the default suite.");
  process.exit(0);
}

console.log(
  `test-near: ${selection.length} target(s) from ${changed.size} changed ` +
    `file(s) vs ${ref}` +
    (skippedOutsideServer ? ` (${skippedOutsideServer} outside packages/server)` : "")
);
for (const t of selection) console.log(`  ${t}`);
console.log(
  "\n⚠ Proximity, not a dependency graph — misses cross-subsystem and " +
    "data-driven\n  coverage (seed YAML, content packs). NOT a substitute " +
    "for `pnpm test`.\n"
);

if (listOnly) process.exit(0);

const proc = spawnSync("pnpm", ["exec", "vitest", "run", ...selection], {
  cwd: SERVER_DIR,
  stdio: "inherit",
});
process.exit(proc.status ?? 1);
