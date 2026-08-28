/**
 * check-test-content — which KERNEL tests still reach for shipped
 * content, and is the list only shrinking?
 *
 * ## Why
 *
 * Content is moving out of the kernel into packs (the content-pack
 * program). A kernel test that names a `/world/<locality>` path is a
 * test that will break — or, worse, silently pass over nothing — the
 * day that locality becomes a pack the kernel does not ship. The
 * discipline (content-packs slate A26): a kernel test proves the kernel
 * over synthetic fixtures ("ugly on purpose", under `/test/**`); a test
 * of real content lives beside that content.
 *
 * ## The rule: the list only shrinks
 *
 * Every offender today is listed in `test-content-allowlist.txt`. A
 * listed offender is counted and warned. An offender NOT in the list is
 * an ERROR (exit 1, in every mode) — new coupling is never added
 * quietly. A listed path that no longer offends (or no longer exists)
 * is *stale* and ALSO an error: a stale entry is a shrink somebody
 * forgot to record, and the fix — deleting the line — is the direction
 * we want.
 *
 * ## What counts
 *
 * Test files (vitest's own notion — `TEST_FILE_RE`) under the server
 * source, the server scripts' tests, and the client source, whose text
 * matches `/\/world\/[a-z]/`. `packages/content/**` and `e2e/**` are
 * skipped, and so is `src/mud/world/**` — a test that lives WITH its
 * content is exactly where a content test belongs.
 *
 * ## Usage
 *
 *   pnpm lint:test-content                 # CI gate (warn-only on listed)
 *   tsx scripts/check-test-content.ts      # full report
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(HERE, "..");
const REPO_ROOT = join(SERVER_DIR, "..", "..");
const SCAN_ROOTS = [
  join(SERVER_DIR, "src"),
  join(SERVER_DIR, "scripts", "__tests__"),
  join(REPO_ROOT, "packages", "client", "src"),
];
/**
 * Tests that live WITH their content are not kernel tests — a kernel
 * venue's `mud/world/**` tests, and every content pack's tree, a
 * capability pack's `src/**\/__tests__/` included: a pack test that
 * names `/world/…` is a content test beside its content, exactly where
 * such a test belongs.
 */
const EXEMPT_PREFIXES = [
  "packages/server/src/mud/world/",
  "packages/content/",
  "e2e/",
];
export const ALLOWLIST_FILE = join(HERE, "test-content-allowlist.txt");

/** What vitest considers a test file (the `check-test-bootstrap` rule). */
const TEST_FILE_RE = /\.(test|spec)\.(c|m)?[jt]sx?$/;
/** A shipped-content path: `/world/<locality>…`. */
export const OFFENDER_RE = /\/world\/[a-z]/;

/** Is a repo-relative test path outside the kernel's jurisdiction (a content test beside its content)? */
export function isExemptPath(rel: string): boolean {
  return EXEMPT_PREFIXES.some((p) => rel.startsWith(p));
}

export interface Classified {
  /** Listed offenders — counted, warned. */
  warned: string[];
  /** Offenders NOT in the list — an error. */
  newOffenders: string[];
  /** Listed paths that no longer offend (or no longer exist) — an error. */
  stale: string[];
}

/**
 * The pure decision core: given every scanned test file's text and the
 * allowlist, which files are listed offenders, new offenders, or stale
 * entries. `files` carry repo-relative paths.
 */
export function classify(
  files: ReadonlyArray<{ path: string; text: string }>,
  allow: readonly string[],
): Classified {
  const offenders = new Set(
    files.filter((f) => OFFENDER_RE.test(f.text)).map((f) => f.path),
  );
  const listed = new Set(allow);
  const warned = [...offenders].filter((p) => listed.has(p)).sort();
  const newOffenders = [...offenders].filter((p) => !listed.has(p)).sort();
  const stale = [...listed].filter((p) => !offenders.has(p)).sort();
  return { warned, newOffenders, stale };
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEST_FILE_RE.test(entry)) out.push(full);
  }
  return out;
}

export function readAllowlist(file = ALLOWLIST_FILE): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function scan(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  for (const root of SCAN_ROOTS) {
    for (const full of walk(root)) {
      const rel = relative(REPO_ROOT, full).split("\\").join("/");
      if (isExemptPath(rel)) continue;
      out.push({ path: rel, text: readFileSync(full, "utf8") });
    }
  }
  return out;
}

function main(): void {
  const lint = process.argv.includes("--lint");
  const result = classify(scan(), readAllowlist());
  if (!lint) {
    console.log(`check-test-content: ${result.warned.length} listed kernel test(s) still name shipped content:`);
    for (const p of result.warned) console.log(`  ${p}`);
  } else {
    console.log(
      `check-test-content: ${result.warned.length} listed kernel test(s) still name ` +
        `shipped content (warn-only; the list only shrinks).`,
    );
  }
  let failed = false;
  if (result.newOffenders.length > 0) {
    failed = true;
    console.error(
      `\ncheck-test-content: ${result.newOffenders.length} NEW kernel test(s) name shipped ` +
        `content (/world/<locality>). A kernel test proves the kernel over synthetic ` +
        `fixtures under /test/**; a test of real content lives beside the content ` +
        `(src/mud/world/**). The allowlist only shrinks — do not add to it.`,
    );
    for (const p of result.newOffenders) console.error(`  ✗ ${p}`);
  }
  if (result.stale.length > 0) {
    failed = true;
    console.error(
      `\ncheck-test-content: ${result.stale.length} allowlist entr${result.stale.length === 1 ? "y" : "ies"} ` +
        `no longer offend(s) — stale; remove the line(s) from scripts/test-content-allowlist.txt:`,
    );
    for (const p of result.stale) console.error(`  − ${p}`);
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.includes("check-test-content")) main();
