/**
 * check-on-create — ⭐ **the census of what happens when a thing is born.**
 *
 * `Stuff.onCreate()` is the one hook the clone pipeline runs on every
 * object after it is registered (it was `postRegister()` on an opt-in
 * `PostRegistrationMixin` until 2026-10-01; the mixin retired with the
 * hydration build and the hook is a terminal on `Stuff` now, exactly like
 * `onDestruct`). Because it is the only async seam at birth, it became the
 * place every kind of work went — and the hydration requirements' finding
 * is that the work it carries is **four different limbs** wearing one name:
 *
 *   1. **structural completion** — the object is not finished until this
 *      runs (a Location mints its floor, a Boundary mints its anchors, a
 *      vessel mints its two exits). Legitimate, and it stays.
 *   2. **roster warming** — a catalogue/registry singleton rebuilds its
 *      index from a collection. Legitimate, and it stays: 20-odd
 *      `*Catalogue` classes implement exactly one hook each and nothing
 *      else.
 *   3. **state loading** — reading back what the world remembered about
 *      *this instance*. ⛔ This limb is what the hydration build takes
 *      away: it belongs to a `hydrationSource` on the mixin that owns the
 *      state, driven by the clone pipeline whether or not a record exists.
 *   4. **seeding** — writing an authored history into a ledger once. ⛔
 *      This limb belongs to a `seed: true` field and a `seed<Field>`
 *      applier, run as the template applier's third phase.
 *
 * ⭐ **Census, then ratchet** (`docs/lint-family.md`). Two counts against
 * two ceilings: every implementation, and the subset whose body looks like
 * limb 3. Each may fall, never rise. Limbs 3 and 4 are driven to zero by
 * later builds; limbs 1 and 2 are why the implementation ceiling does not
 * go to zero and should not.
 *
 * ⚠ The predicate is a REGEX over the body, so it is a smoke alarm, not a
 * proof — a warming catalogue trips it (that is limb 2, and it is fine).
 * Its job is to make the number visible and to refuse a NEW one.
 *
 * Usage:
 *   tsx scripts/check-on-create.ts            # CI gate
 *   tsx scripts/check-on-create.ts --report   # the inventory, by file
 */

import { readFileSync } from "fs";
import { relative } from "path";
import { MUD, packSources, packSrcFiles } from "./pack-roots";

/**
 * ⭐ **The implementation ceiling.** Every `onCreate` method declaration in
 * the kernel and every pack `src/`, excluding `Stuff`'s own terminal (a
 * destruct census would exclude `onDestruct`'s the same way). It may fall,
 * never rise — a class that wants birth-time work has to make room, or
 * (much more likely) the work belongs on one of the two declarative seams
 * the hydration build added.
 */
export const ON_CREATE_CEILING = 81;

/**
 * ⭐⭐ **The loading ceiling** — the subset of those bodies that look like
 * limb 3. This is the number the hydration build drives down, and the one
 * worth reading: a fall here is state that moved onto a declared source.
 */
export const ON_CREATE_LOADING_CEILING = 34;

/**
 * ⚠ A fact about the past: the census the day the gate landed. Never edit
 * it down — lowering this instead of the ceiling is how a ratchet quietly
 * stops being one.
 */
export const CENSUS_AT_LANDING = { implementations: 82, loading: 38 };

/**
 * ⚠ **An instrument correction, recorded so the ratchet stays honest.**
 * The loading count read 38 at landing and 37 after `Cast` left; adding
 * {@link stripComments} dropped it to **34** without any code moving.
 * Three hooks were in the state-loading set on the strength of their
 * PROSE alone. That is a measurement fix, not progress — the ceiling
 * follows the better instrument, and this note is why the number jumped
 * by more than the wave that was running.
 */
export const INSTRUMENT_NOTE_2026_10_01 = 'stripComments: 37 → 34';

/**
 * Limb 3's smoke alarm. A body that reads a collection, resolves a
 * singleton, warms a roster or says the word "hydrate"/"restore"/"load" is
 * loading state from somewhere. ⚠ Deliberately generous: a false positive
 * is a catalogue warm (limb 2), which costs a line of explanation; a false
 * negative is the thing the gate exists to notice.
 */
export const LOADING_PREDICATE =
  /\.find\(|findByScope|hydrate|rebuildIndex|warm\(|restore|load|singleton\(/;

/** One `onCreate` method declaration, with its body. */
export interface OnCreateSite {
  /** Repo-relative file. */
  file: string;
  /** 1-indexed line of the declaration. */
  line: number;
  /** Does the body trip `LOADING_PREDICATE`? */
  loading: boolean;
}

/**
 * A METHOD DECLARATION, never a call and never a docstring mention. The
 * slate's first census script got this wrong in the other direction — it
 * scanned from any mention of the name to the next closing brace, so every
 * Api facade that merely *described* the hook counted.
 */
const DECL =
  /^\s*(?:public\s+|protected\s+|private\s+)?(?:override\s+)?(?:async\s+)?onCreate\s*\(/;

/** Lines that are prose, not code. */
function isComment(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith("*") || t.startsWith("//") || t.startsWith("/*");
}

/**
 * Strip comments from a body before the predicate reads it.
 *
 * ⚠⚠ Added 2026-10-01 because the gate caught the build's own PROSE. The
 * species warm was moved off `Bonded.onCreate` onto the read path, and
 * the comment left in its place — explaining that the dials live on a
 * *lazily loaded* `Species` row — kept the hook in the state-loading set
 * all by itself. A census that counts the word "load" in an explanation
 * of why there is no longer any loading is measuring the wrong thing,
 * and would have silently refused to ratchet for the rest of the build.
 */
export function stripComments(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Extract the brace-matched body beginning at or after `from`. */
function bodyFrom(src: string, from: number): string {
  const open = src.indexOf("{", from);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/** Every declaration site across the kernel and the packs. */
export function census(repoRoot: string): OnCreateSite[] {
  const files: string[] = [...packSrcFiles(MUD)];
  for (const s of packSources()) files.push(...packSrcFiles(s.srcDir));

  const sites: OnCreateSite[] = [];
  for (const file of files) {
    if (!file.endsWith(".ts") || file.includes("__tests__")) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("onCreate")) continue;
    // ⚠ `Stuff`'s own terminal is the thing every other site chains TO.
    const isStuff = file.endsWith(`${"/"}lib/stuff/Stuff.ts`);
    const lines = src.split("\n");
    let cursor = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      cursor += line.length + 1;
      if (isComment(line) || !DECL.test(line)) continue;
      if (isStuff) continue;
      const body = bodyFrom(src, cursor - line.length - 1);
      sites.push({
        file: relative(repoRoot, file),
        line: i + 1,
        loading: LOADING_PREDICATE.test(stripComments(body)),
      });
    }
  }
  sites.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
  return sites;
}

// ───────────────────────────── the gate ─────────────────────────────

function main(): void {
  const repoRoot = new URL("../../..", import.meta.url).pathname.replace(
    /\/$/,
    ""
  );
  const report = process.argv.includes("--report");
  const sites = census(repoRoot);
  const loading = sites.filter((s) => s.loading);

  if (report) {
    for (const s of sites) {
      console.log(`${s.loading ? "LOAD" : "    "}  ${s.file}:${s.line}`);
    }
    console.log("");
  }

  console.log(
    `check-on-create: ${sites.length} onCreate implementations ` +
      `(ceiling ${ON_CREATE_CEILING}), ${loading.length} of them ` +
      `state-loading (ceiling ${ON_CREATE_LOADING_CEILING}).`
  );

  const failures: string[] = [];
  if (sites.length > ON_CREATE_CEILING) {
    failures.push(
      `onCreate implementations ${sites.length} exceeds the ceiling ` +
        `${ON_CREATE_CEILING}. The hook is the one async seam at birth and ` +
        `it collects work that belongs elsewhere: state the world ` +
        `remembered goes on a \`hydrationSource\` ` +
        `(docs/subsystems/persistence.md); an authored history goes on a ` +
        `\`seed: true\` field with a \`seed<Field>\` applier ` +
        `(docs/subsystems/templates.md). If this really is structural ` +
        `completion or a roster warm, lower something else first — the ` +
        `ceiling may fall, never rise.`
    );
  }
  if (loading.length > ON_CREATE_LOADING_CEILING) {
    failures.push(
      `state-loading onCreate bodies ${loading.length} exceeds the ceiling ` +
        `${ON_CREATE_LOADING_CEILING}:\n` +
        loading.slice(0, 20).map((s) => `    ${s.file}:${s.line}`).join("\n")
    );
  }

  if (failures.length > 0) {
    console.error("\n✖ lint:on-create — " + failures.length + " finding(s):\n");
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && /check-on-create\.ts$/.test(process.argv[1])) main();
