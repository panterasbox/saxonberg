/**
 * check-identity-mints — ⭐⭐ **every identity mint names what keys on
 * it.**
 *
 * `StuffApi.clone(row, …, { asIdentityPath })` is the one channel that
 * mints a per-instance identity. The question this gate asks at every
 * such site is the rule from the requirements (9a): *an identity exists
 * iff the NAME is durable* — re-derivable from inputs that outlive the
 * instance, or recorded somewhere durable. Concretely: **what keys on
 * this identity?**
 *
 *   own-record — the instance's own durable record is filed under it
 *   referenced — another durable record names it
 *   lookup     — a read that must resolve to THIS instance performs it
 *   none       — nothing; the mint buys nothing durable
 *
 * ⚠ A mint's own uniqueness probe does **not** qualify, which is why
 * there is no `probe` word in the vocabulary and never will be. The
 * corpse mints an ordinal by asking whether its own candidate identity
 * is free; that is circular, and a mint cannot justify itself.
 *
 * ⭐⭐ **A census, not a shape validator.** A validator over the shapes
 * the tree actually uses would codify thirteen improvisations and hand
 * every one of them a passing grade. The five shapes in use
 * (family-prefixed, row-prefixed, parcel-relative, recorded-uuid,
 * projected) are all legitimate on their own terms — the census
 * QUESTIONS the mint instead, and its unjustified count is meant to go
 * DOWN. See docs/lint-family.md § census-then-ratchet.
 *
 * ⭐ **The marker lives AT THE SITE**, on the `eslint-disable -- reason`
 * precedent, never in a registry here. That is what lets a capability
 * pack mark its own mint without anybody editing a kernel list — the
 * rule a pack must never need a kernel edit. So this script reads
 * sites, and has no table of paths in it.
 *
 * Two outcomes:
 *   - a mint site with **no marker** is an ERROR. A new mint has to
 *     answer the question; silence is the failure this gate exists for.
 *   - a site marked `none` is **unjustified** and counted against a
 *     ceiling that may fall and never rise.
 *
 * Today's ceiling is 2: the anonymous guest (`Login.ts`) and the corpse
 * (`ConditionLogic.ts`). Both are named non-goals of the build that
 * added this gate, and both markers say where the fix lives. ⚠ Reading
 * "unjustified" as "go and fix it" is the mistake to avoid: unminting
 * is per-site work for whoever owns the site.
 *
 * Scans the kernel mudlib and every capability pack's `src/`, the
 * `check-person-keys` scan root. `src/backend/` is outside it (a test
 * seam there mints through the same formula and carries a marker for
 * the reader, uncounted). Standalone script, not an ESLint rule, for
 * the same reason as `check-person-keys`. CI-gating; self-enrols,
 * because `lint:family` derives its roster from `package.json`.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { pathToFileURL } from "url";
import { resolve } from "path";
import { MUD, SERVER_SRC, packSources, packSrcFiles } from "./pack-roots";

const EXIT_ON_FINDINGS = true; // CI-gating

/**
 * The ceiling on UNJUSTIFIED mints. It may fall; it may never rise.
 * Falling it is the point — each entry's marker names its destination.
 */
export const UNJUSTIFIED_CEILING = 2;

/** The closed vocabulary. `probe` is deliberately absent — see header. */
export const KEYED_BY_WORDS = [
  "own-record",
  "referenced",
  "lookup",
  "none",
] as const;

export type KeyedByWord = (typeof KEYED_BY_WORDS)[number];

export interface MintSite {
  file: string;
  line: number;
  /** The marker's word, or null when the site carries no marker. */
  keyedBy: KeyedByWord | null;
  /** Set when a marker was present but its word is not in the vocabulary. */
  badWord?: string;
  /** The prose after the em dash, for the report. */
  reason: string;
}

/** A mint site: `asIdentityPath:` as a property being PASSED. */
const MINT = /\basIdentityPath\s*:/g;

/**
 * The marker, as written in a comment immediately above (or on) the
 * mint. Captured from the RAW source, because the marker *is* a comment
 * and the scan blanks comments to find the mint.
 */
const MARKER = /identity-keyed-by:\s*([a-z-]+)\s*(?:—|--)?\s*([^\n]*)/;

/** How far above a mint a marker may sit and still count as adjacent. */
const MARKER_WINDOW = 14;

/** Source with `//` and block comments blanked, newlines preserved. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Every mint site in one file, with the marker that justifies it. */
export function scanIdentityMints(source: string, file: string): MintSite[] {
  const code = stripComments(source);
  const rawLines = source.split("\n");
  const out: MintSite[] = [];
  MINT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MINT.exec(code))) {
    const line = code.slice(0, m.index).split("\n").length;
    // Look upward from the mint for the nearest marker comment. The
    // window stops at a blank line only when a marker has not been
    // found yet on the immediately preceding lines — a prettier-wrapped
    // call puts several lines between the comment and the property.
    let keyedBy: KeyedByWord | null = null;
    let badWord: string | undefined;
    let reason = "";
    for (let i = line - 1; i >= Math.max(1, line - MARKER_WINDOW); i--) {
      const found = MARKER.exec(rawLines[i - 1] ?? "");
      if (!found) continue;
      const word = found[1] ?? "";
      if ((KEYED_BY_WORDS as readonly string[]).includes(word)) {
        keyedBy = word as KeyedByWord;
      } else {
        badWord = word;
      }
      reason = (found[2] ?? "").trim();
      break;
    }
    out.push({ file, line, keyedBy, ...(badWord ? { badWord } : {}), reason });
  }
  return out.sort((a, b) => a.line - b.line);
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

/** The live tree's mint sites — the kernel plus every pack `src/`. */
export function collectMintSites(): MintSite[] {
  const out: MintSite[] = [];
  for (const file of kernelFiles()) {
    out.push(
      ...scanIdentityMints(
        readFileSync(file, "utf8"),
        "src/" + relative(SERVER_SRC, file),
      ),
    );
  }
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) {
      out.push(
        ...scanIdentityMints(
          readFileSync(file, "utf8"),
          `packages/content/${pack.id}/src/${relative(pack.srcDir, file)}`,
        ),
      );
    }
  }
  return out;
}

function main(): void {
  const sites = collectMintSites();
  const unmarked = sites.filter((s) => s.keyedBy === null && !s.badWord);
  const bad = sites.filter((s) => s.badWord);
  const unjustified = sites.filter((s) => s.keyedBy === "none");

  console.log(`check-identity-mints: ${sites.length} identity mint site(s)`);
  for (const word of KEYED_BY_WORDS) {
    const n = sites.filter((s) => s.keyedBy === word).length;
    console.log(`  ${word.padEnd(11)} ${n}`);
  }

  let failed = false;

  if (bad.length > 0) {
    failed = true;
    console.error(
      `\n${bad.length} mint site(s) use a word outside the closed ` +
        `vocabulary (${KEYED_BY_WORDS.join(" | ")}):\n`,
    );
    for (const s of bad) {
      console.error(`  ${s.file}:${s.line}  identity-keyed-by: ${s.badWord}`);
    }
    console.error(
      `\nThe vocabulary is closed on purpose. In particular there is no\n` +
        `'probe' word: a mint's own uniqueness check cannot justify the\n` +
        `mint it serves.`,
    );
  }

  if (unmarked.length > 0) {
    failed = true;
    console.error(
      `\n${unmarked.length} identity mint site(s) carry no ` +
        `\`identity-keyed-by:\` marker:\n`,
    );
    for (const s of unmarked) console.error(`  ${s.file}:${s.line}`);
    console.error(
      `\nAdd a comment adjacent to the mint saying what keys on the\n` +
        `identity it mints:\n\n` +
        `  // identity-keyed-by: own-record | referenced | lookup | none — <what>\n\n` +
        `A pack marks its own mint; nothing here needs editing.\n` +
        `See docs/subsystems/identity.md § Every mint names what keys on it.`,
    );
  }

  if (unjustified.length > UNJUSTIFIED_CEILING) {
    failed = true;
    console.error(
      `\n${unjustified.length} UNJUSTIFIED mint(s) — the ceiling is ` +
        `${UNJUSTIFIED_CEILING}, and it may only fall:\n`,
    );
    for (const s of unjustified) {
      console.error(`  ${s.file}:${s.line}  ${s.reason}`);
    }
    console.error(
      `\nA mint marked \`none\` buys nothing durable: nothing reads the\n` +
        `instance by that identity, and the name is neither re-derivable\n` +
        `nor recorded. If the instance only needs telling apart within\n` +
        `one life, that is what \`stuffId\` is for; if a player needs to\n` +
        `target one of several, the disambiguation list already ships.`,
    );
  } else if (unjustified.length > 0) {
    console.log(
      `\n  ${unjustified.length} unjustified (ceiling ` +
        `${UNJUSTIFIED_CEILING}, may only fall):`,
    );
    for (const s of unjustified) {
      console.log(`    ${s.file}:${s.line}`);
    }
  }

  if (failed) process.exit(EXIT_ON_FINDINGS ? 1 : 0);
  console.log(`\ncheck-identity-mints: every mint names its reader ✔`);
  process.exit(0);
}

// Run only when invoked as a script — the unit test imports the pure
// scan (the check-person-keys precedent).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
