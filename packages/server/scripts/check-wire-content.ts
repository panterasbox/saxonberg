/**
 * check-wire-content — a wire drive names no placeholder content.
 *
 * A drive proves a SYSTEM, whatever the world holds, and must outlive the
 * content it happens to stand in today: the localities are placeholder and
 * will be replaced (owner, 2026-11-20). A drive that logs in at
 * `/world/terminus/…`, banks at Terminus's counter or seats itself on a
 * locality's committee dies with that locality — and consumes it, so the
 * world has to be dropped before the drive can run again. The suite's own
 * scaffold is the test-only `test-fixtures` pack at `/world/testbed`
 * (docs/testing.md § The scaffold); a drive stands there and stages what it
 * consumes.
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): the count of files that
 * name a locality or a firm is gated at {@link WIRE_CONTENT_CEILING} — it may
 * fall, never rise. Build 2 of test-world-lifecycle takes it to zero. A file
 * at zero stays at zero for free: naming a locality in it raises the count.
 *
 * What counts as naming placeholder content: `/world/<x>` for any `<x>` but
 * `testbed`, or `/corpo/<x>`, in the file's CODE — comments are stripped
 * first, because a header explaining where a drive used to stand is not a
 * dependency. ⚠ What the regex cannot see: a login with no `startLocation`
 * lands wherever the world's default is; migrated drives stand in the
 * testbed by `standIn()` and say so (testing.md).
 *
 * A second check, ceiling 0: a test file that carries its own restart —
 * imports the runner's `bootOwnedWorld` / `stopOwnedWorld`, or names the
 * `dev-preflight` — is refused. The harness's `restartWorld()` is the one
 * path (it waits for the shutdown save; the copies killed the world two
 * seconds after asking it to stop).
 *
 * `tsx scripts/check-wire-content.ts [extra-file …]` scans the extra files as
 * if they were drives too (the build's drive uses it to show a new file that
 * names a locality is refused).
 *
 * Self-enrolls: `lint:family` derives its roster from package.json.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const EXIT_ON_FINDINGS = true; // CI-gating

const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");

/**
 * The number of wire files that still name placeholder content. It may fall,
 * never rise. Lower it in the commit that migrates a drive.
 */
// 120 at the census → 110 after build 1's migrations → 112: the master merge
// of 2026-11-21 brought matter-model-overlaps' two pack-mechanism drives,
// written while this gate was not yet on master. They are build 2's class
// (the pack drives) and are on its list; the ceiling takes them once and
// falls from here.
export const WIRE_CONTENT_CEILING = 112;

const PLACEHOLDER = [/\/world\/(?!testbed(?:\/|\b))[a-z]/, /\/corpo\/[a-z]/];

/** The source with comments removed: block comments, whole-line and trailing `//` comments. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .map((line) => line.replace(/\s\/\/\s.*$/, ""))
    .join("\n");
}

/** Does this file's code name placeholder content? Returns the first match, or null. */
export function placeholderIn(source: string): string | null {
  const code = stripComments(source);
  for (const re of PLACEHOLDER) {
    const m = re.exec(code);
    if (m) {
      const from = code.lastIndexOf("\n", m.index) + 1;
      const to = code.indexOf("\n", m.index);
      return code.slice(from, to < 0 ? undefined : to).trim();
    }
  }
  return null;
}

/** Does this test file carry its own restart? Returns why, or null. */
export function restartCopyIn(source: string): string | null {
  const code = stripComments(source);
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*runner\/boot['"]/g)) {
    const names = m[1]!.split(",").map((n) => n.trim().split(/\s+as\s+/)[0]);
    const bad = names.filter((n) => n === "bootOwnedWorld" || n === "stopOwnedWorld");
    if (bad.length > 0) return `imports ${bad.join(", ")} from the runner`;
  }
  if (/dev-preflight/.test(code)) return "names the dev-preflight";
  return null;
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(name)) out.push(p);
  }
}

/** The drive files (the census and the restart check) and the harness (the census only). */
export function wireFiles(): { drives: string[]; harness: string[] } {
  const drives: string[] = [];
  walk(join(REPO_ROOT, "packages", "wire", "tests"), drives);
  const content = join(REPO_ROOT, "packages", "content");
  if (existsSync(content)) {
    for (const pack of readdirSync(content)) walk(join(content, pack, "wire"), drives);
  }
  const harness: string[] = [];
  walk(join(REPO_ROOT, "packages", "wire", "src", "harness"), harness);
  return { drives: drives.sort(), harness: harness.sort() };
}

export interface WireContentCensus {
  /** Files that name placeholder content, with the first offending line. */
  naming: Array<{ file: string; line: string }>;
  /** Test files that carry their own restart. */
  restarts: Array<{ file: string; why: string }>;
}

export function census(extra: string[] = []): WireContentCensus {
  const { drives, harness } = wireFiles();
  const rel = (p: string): string => relative(REPO_ROOT, p);
  const naming: WireContentCensus["naming"] = [];
  const restarts: WireContentCensus["restarts"] = [];
  for (const f of [...drives, ...harness, ...extra]) {
    const src = readFileSync(f, "utf8");
    const line = placeholderIn(src);
    if (line) naming.push({ file: rel(f), line });
    if (!harness.includes(f)) {
      const why = restartCopyIn(src);
      if (why) restarts.push({ file: rel(f), why });
    }
  }
  return { naming, restarts };
}

function main(): void {
  const extra = process.argv.slice(2).map((p) => resolve(p));
  const { naming, restarts } = census(extra);
  let failed = false;

  console.log(
    `check-wire-content: ${naming.length} wire file(s) name placeholder content ` +
      `(ceiling ${WIRE_CONTENT_CEILING}, may only fall)`,
  );
  if (naming.length > WIRE_CONTENT_CEILING) {
    failed = true;
    console.error(
      `\n  ✖ the count ROSE above its ceiling. A drive stands in the scaffold\n` +
        `    (/world/testbed, the test-fixtures pack) and stages what it consumes;\n` +
        `    it names no locality and no firm. See docs/testing.md § The scaffold.\n`,
    );
    for (const n of naming) console.error(`    ${n.file}\n        ${n.line}`);
  } else {
    for (const n of naming) console.log(`    ${n.file}`);
  }

  if (restarts.length > 0) {
    failed = true;
    console.error(`\n  ✖ ${restarts.length} wire file(s) carry their own restart (ceiling 0):`);
    for (const r of restarts) console.error(`    ${r.file} — ${r.why}`);
    console.error(
      `\n    Use the harness's restartWorld() / stopWorld(): they wait for the\n` +
        `    world's shutdown save (WIRE_STOP_GRACE) and report it.`,
    );
  }

  if (failed) process.exit(EXIT_ON_FINDINGS ? 1 : 0);
  if (naming.length < WIRE_CONTENT_CEILING) {
    console.log(
      `\n  ⭐ ${WIRE_CONTENT_CEILING - naming.length} below the ceiling — lower ` +
        `WIRE_CONTENT_CEILING to ${naming.length} to lock it in.`,
    );
  }
  console.log(`check-wire-content: no rise, no restart copies ✔`);
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
