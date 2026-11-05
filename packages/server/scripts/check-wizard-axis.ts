/**
 * check-wizard-axis — where does the code still ask "is this person a
 * wizard?", and is that list only shrinking?
 *
 * ## Why
 *
 * The wizard axis is AUTHORING TypeScript (owner, 2026-11-05): writing
 * a `.ts` into the source tree, typing code into `eval`. Running code,
 * reloading it, reading it, naming it from a row, letting a room,
 * setting a dial — none of those is the axis, and each is decided by a
 * SEAT (title, an office) or by nothing. A wizard check anywhere else
 * hands authority to a credential, silently. See access.md § The two
 * account axes and the wizard-axis-cleanup build.
 *
 * ## The rule: the list only shrinks
 *
 * Every file that names the axis — in code OR in prose — is listed in
 * `wizard-axis-allowlist.txt` with its token count and a reason from a
 * closed set:
 *
 *   axis        authoring TypeScript (the one write predicate, `eval`)
 *   subject     the axis is the subject (conferral: `wizard grant`)
 *   definition  the predicate itself, its forwarders, its validators
 *   ux          the client's "offer the authoring panes" flag
 *   prose       a comment / help line that explains the axis
 *   sweep       a site the build in flight removes (the shipped list has none)
 *
 * A file NOT listed is an error. A listed file whose count ROSE is an
 * error. A listed file whose count FELL, or that no longer names the
 * axis (or no longer exists), is STALE and also an error — the fix is
 * to lower or delete the line, which records the shrink.
 *
 * ## What counts
 *
 * Non-test `.ts`/`.yaml` under `packages/server/src` and every pack's
 * `src/` and `content/`; the tokens `isWizard`, `requiresWizard`,
 * `isArchwizard`, `requiresArchwizard` (word-bounded — a comment that
 * says `requiresWizard` counts, so stale prose is rewritten, not
 * carried).
 *
 * ## Usage
 *
 *   pnpm lint:wizard-axis                  # CI gate
 *   tsx scripts/check-wizard-axis.ts       # full report
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(HERE, "..");
const REPO_ROOT = join(SERVER_DIR, "..", "..");
const CONTENT_DIR = join(REPO_ROOT, "packages", "content");
export const ALLOWLIST_FILE = join(HERE, "wizard-axis-allowlist.txt");

/** The axis tokens. Word-bounded so `isWizardly` never counts. */
export const AXIS_RE = /\b(?:isWizard|requiresWizard|isArchwizard|requiresArchwizard)\b/g;
/** The closed set of reasons a file may name the axis. */
export const REASONS = ["axis", "subject", "definition", "ux", "prose", "sweep"] as const;
export type Reason = (typeof REASONS)[number];

const SOURCE_RE = /\.(ts|ya?ml)$/;
const TEST_RE = /(__tests__|\.test\.ts$|\.spec\.ts$)/;

export interface AllowEntry {
  path: string;
  count: number;
  reason: string;
}

export interface Classified {
  /** Listed, count matches. */
  ok: string[];
  /** Files naming the axis that are not listed. */
  unlisted: Array<{ path: string; count: number }>;
  /** Listed files whose count rose. */
  rose: Array<{ path: string; listed: number; count: number }>;
  /** Listed files whose count fell, or that no longer name the axis. */
  stale: Array<{ path: string; listed: number; count: number }>;
  /** Lines whose reason is outside the closed set. */
  badReason: AllowEntry[];
}

/** How many axis tokens a text holds. */
export function countTokens(text: string): number {
  return (text.match(AXIS_RE) ?? []).length;
}

/** The pure decision core. `files` carry repo-relative paths. */
export function classify(
  files: ReadonlyArray<{ path: string; text: string }>,
  allow: readonly AllowEntry[],
): Classified {
  const counts = new Map<string, number>();
  for (const f of files) {
    const n = countTokens(f.text);
    if (n > 0) counts.set(f.path, n);
  }
  const listed = new Map(allow.map((a) => [a.path, a]));
  const out: Classified = { ok: [], unlisted: [], rose: [], stale: [], badReason: [] };
  for (const a of allow) {
    if (!(REASONS as readonly string[]).includes(a.reason)) out.badReason.push(a);
  }
  for (const [path, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    const entry = listed.get(path);
    if (!entry) out.unlisted.push({ path, count });
    else if (count > entry.count) out.rose.push({ path, listed: entry.count, count });
    else if (count < entry.count) out.stale.push({ path, listed: entry.count, count });
    else out.ok.push(path);
  }
  for (const a of allow) {
    if (!counts.has(a.path)) out.stale.push({ path: a.path, listed: a.count, count: 0 });
  }
  return out;
}

/** Parse the allowlist: `<path> <count> <reason>` per line; `#` comments. */
export function parseAllowlist(text: string): AllowEntry[] {
  const out: AllowEntry[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [path, count, reason] = line.split(/\s+/);
    out.push({ path: path ?? "", count: Number(count), reason: reason ?? "" });
  }
  return out;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_RE.test(entry) && !TEST_RE.test(entry)) out.push(full);
  }
  return out;
}

function scanRoots(): string[] {
  const roots = [join(SERVER_DIR, "src")];
  if (existsSync(CONTENT_DIR)) {
    for (const pack of readdirSync(CONTENT_DIR).sort()) {
      for (const sub of ["src", "content"]) roots.push(join(CONTENT_DIR, pack, sub));
    }
  }
  return roots;
}

function scan(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  for (const root of scanRoots()) {
    for (const full of walk(root)) {
      const rel = relative(REPO_ROOT, full).split("\\").join("/");
      out.push({ path: rel, text: readFileSync(full, "utf8") });
    }
  }
  return out;
}

function main(): void {
  const lint = process.argv.includes("--lint");
  const allow = existsSync(ALLOWLIST_FILE) ? parseAllowlist(readFileSync(ALLOWLIST_FILE, "utf8")) : [];
  const r = classify(scan(), allow);
  console.log(`check-wizard-axis: ${r.ok.length} listed file(s) name the wizard axis (the list only shrinks).`);
  if (!lint) for (const p of r.ok) console.log(`  ${p}`);
  let failed = false;
  if (r.unlisted.length > 0) {
    failed = true;
    console.error(
      `\ncheck-wizard-axis: ${r.unlisted.length} NEW file(s) name the wizard axis. The axis is ` +
        `AUTHORING TypeScript only; anything else is decided by a seat (title, an office) or by ` +
        `nothing. Ask AccessApi.sourceWriteRefusal for a source write; never add an isWizard check.`,
    );
    for (const u of r.unlisted) console.error(`  ✗ ${u.path} (${u.count})`);
  }
  if (r.rose.length > 0) {
    failed = true;
    console.error(`\ncheck-wizard-axis: ${r.rose.length} listed file(s) gained an axis site:`);
    for (const u of r.rose) console.error(`  ✗ ${u.path} (${u.listed} → ${u.count})`);
  }
  if (r.stale.length > 0) {
    failed = true;
    console.error(
      `\ncheck-wizard-axis: ${r.stale.length} allowlist line(s) are stale — lower or delete them in ` +
        `scripts/wizard-axis-allowlist.txt:`,
    );
    for (const u of r.stale) console.error(`  − ${u.path} (${u.listed} → ${u.count})`);
  }
  if (r.badReason.length > 0) {
    failed = true;
    console.error(`\ncheck-wizard-axis: reasons must be one of ${REASONS.join(" · ")}:`);
    for (const a of r.badReason) console.error(`  ✗ ${a.path} "${a.reason}"`);
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.includes("check-wizard-axis")) main();
