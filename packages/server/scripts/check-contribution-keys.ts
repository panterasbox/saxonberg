/**
 * check-contribution-keys — ⭐ **a `commandContributions` key that names no
 * view is a verb nobody can say.**
 *
 * A class's `static commandContributions` lists command VIEWS by their
 * content-relative key (`platform/cmd/perception/look.yaml`,
 * `trade/mining/cmd/mining/assay.yaml`,
 * `world/terminus/university-avenue/cmd/tally.yaml`). The dispatcher looks
 * each key up in the installed command views; a key with no view behind it
 * is dropped without a word, so the thing simply stops answering to the
 * verb — green in a unit test that reads the declaration, dead in play.
 *
 * ⚠ Why a gate (controllers-are-io, 2026-11): the build's audit found
 * `scrub.yaml` keys still declared after the view was retired with one
 * view, one word — nothing failed, because nothing asked whether the key
 * resolves. This asks, over the kernel tree and every capability pack's
 * `src/`, against every view under every pack's `content/` (the kernel's
 * platform pack, the trades, the systems and the domain-local localities —
 * {@link commandViews} is the one walk).
 *
 * Only string literals inside the static's object are keys; a spread
 * (`...(Timber.commandContributions.peers ?? [])`) is another class's
 * declaration and is checked where it is written.
 *
 * ⭐ Census-then-ratchet: the dangling population is gated at
 * {@link CEILING}; it may fall, never rise.
 */

import { readFileSync } from "fs";
import { join, relative } from "path";
import { CONTENT, MUD, commandViews, mudSourceFiles, ratchet } from "./pack-roots";

/**
 * Dangling keys — ⭐ **zero** at the census (2026-11-07): the audit had
 * already deleted the retired `scrub.yaml` keys. A new one is a verb
 * nobody can say; author the view or delete the key.
 */
export const CEILING = 0;

/** One key a declaration names. */
export interface ContributionKey {
  file: string;
  /** 1-based line of the key. */
  line: number;
  /** The bucket it was listed under (`peers`, …), or `?`. */
  bucket: string;
  key: string;
}

/** The bracket-matched text from `open` (an index of `{` or `[`), strings skipped. */
function matched(source: string, open: number): string {
  const pairs: Record<string, string> = { "[": "]", "{": "}", "(": ")" };
  const stack: string[] = [];
  for (let i = open; i < source.length; i++) {
    const c = source[i]!;
    if (c === "'" || c === '"' || c === "`") {
      const q = c;
      i++;
      while (i < source.length && source[i] !== q) {
        if (source[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]!);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/**
 * Every key in every `static commandContributions` object in one source.
 * Pure over the text, so the test hands it fixtures.
 */
export function contributionKeysIn(
  file: string,
  raw: string,
  unresolved?: ContributionKey[],
): ContributionKey[] {
  // Comments masked to spaces, offsets kept: a doc comment that SHOWS a
  // declaration is not one.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, pre: string) => pre + " ".repeat(m.length - pre.length));
  const out: ContributionKey[] = [];
  const re = /static\s+(?:override\s+)?(?:readonly\s+)?commandContributions\s*(?::[^=]+)?=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const brace = source.indexOf("{", m.index + m[0].length - 1);
    // `= Other.commandContributions as …` — an alias, not a declaration.
    if (brace < 0 || source.slice(m.index + m[0].length, brace).trim().length > 0) continue;
    const body = matched(source, brace);
    const buckets = /\b(self|environment|inventory|peers)\s*:\s*(\[|[A-Za-z_$][\w$]*)/g;
    let b: RegExpExecArray | null;
    while ((b = buckets.exec(body))) {
      const bucket = b[1]!;
      if (b[2] !== "[") {
        // `peers: LIFT` — a module const in this file, read where it is declared.
        listed(source, b[2]!, file, bucket, brace + b.index, out, unresolved);
        continue;
      }
      const listAt = b.index + b[0].length - 1;
      const list = matched(body, listAt);
      literals(source, list, brace + listAt, file, bucket, out);
      for (const s of list.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)\s*[,\]]/g)) {
        listed(source, s[1]!, file, bucket, brace + listAt + s.index!, out, unresolved);
      }
    }
  }
  return out;
}

/** The quoted keys in `list` (which starts at `offset` in `source`). */
function literals(
  source: string,
  list: string,
  offset: number,
  file: string,
  bucket: string,
  out: ContributionKey[],
): void {
  for (const k of list.matchAll(/(['"])([^'"\n]+)\1/g)) {
    const line = source.slice(0, offset + k.index!).split("\n").length;
    out.push({ file, line, bucket, key: k[2]! });
  }
}

/**
 * The keys of a list held in a same-file `const NAME = [ … ]`. A name not
 * declared in the file (an import) is reported as UNRESOLVED — the gate
 * cannot see it, and an unseen key is the failure it exists for.
 */
function listed(
  source: string,
  name: string,
  file: string,
  bucket: string,
  at: number,
  out: ContributionKey[],
  unresolved: ContributionKey[] | undefined,
): void {
  const decl = new RegExp(`\\bconst\\s+${name.replace(/\$/g, "\\$")}\\s*(?::[^=]+)?=\\s*\\[`).exec(source);
  if (!decl) {
    const line = source.slice(0, at).split("\n").length;
    unresolved?.push({ file, line, bucket, key: name });
    return;
  }
  const listAt = decl.index + decl[0].length - 1;
  literals(source, matched(source, listAt), listAt, file, bucket, out);
}

/** The keys naming no view, given the set of view keys. Pure. */
export function danglingKeys(
  keys: readonly ContributionKey[],
  views: ReadonlySet<string>,
): ContributionKey[] {
  return keys.filter((k) => !views.has(k.key));
}

/** The census over a content tree and a kernel mud tree. */
export function census(
  contentDir: string = CONTENT,
  mudDir: string = MUD,
): {
  keys: ContributionKey[];
  dangling: ContributionKey[];
  unresolved: ContributionKey[];
  views: number;
} {
  const views = new Set(commandViews(contentDir).map((v) => v.rel));
  const keys: ContributionKey[] = [];
  const unresolved: ContributionKey[] = [];
  for (const { file } of mudSourceFiles(contentDir, mudDir)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("commandContributions")) continue;
    keys.push(...contributionKeysIn(file, text, unresolved));
  }
  return { keys, dangling: danglingKeys(keys, views), unresolved, views: views.size };
}

function main(): void {
  const { keys, dangling, unresolved, views } = census();
  const where = (f: string): string => relative(join(MUD, "..", "..", ".."), f);
  const findings = [
    ...dangling.map((d) => `${where(d.file)}:${d.line} — ${d.bucket}: '${d.key}' names no view`),
    ...unresolved.map((d) => `${where(d.file)}:${d.line} — ${d.bucket}: \`${d.key}\` is not a list declared in this file (the gate cannot read it)`),
  ];
  if (process.argv.includes("--list")) for (const f of findings) console.error(`  ⚠ ${f}`);
  const ok = ratchet(
    "check-contribution-keys",
    `dangling or unreadable contribution keys (of ${keys.length} keys over ${views} views)`,
    dangling.length + unresolved.length,
    CEILING,
    findings,
    "A key the dispatcher cannot find is a verb nobody can say: author the view, or delete the key.",
  );
  if (!ok) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-contribution-keys.ts")) {
  main();
}
