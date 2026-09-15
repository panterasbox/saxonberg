/**
 * check-person-keys — ⚠⚠ **a PERSON keys on `getIdentityPath()`.**
 *
 * Every player Avatar shares ONE `templatePath`. D17 stamps lineage and
 * identity separately: the class is the lineage, `getIdentityPath()` is
 * who you are. So a durable record that keys a *person* on
 * `getTemplatePath()` does not identify one player — it identifies
 * **every player at once**, and the collapse is invisible to a test
 * suite because fixtures author distinct template paths per avatar.
 *
 * It has cost a shared bank account, a dead labor market (MR !251), and
 * — found by this build's grounding — every mining claim in the game
 * being owned by everybody: `StakeController` passed
 * `{ kind: 'player', templatePath: giver.getTemplatePath() }` into the
 * parcel register, while every kernel site writing that same field
 * (`TitleController`, `TransferController`, `ChattelLogic`,
 * `EmploymentLogic`) passes an identity path. The field's meaning was
 * never in doubt; one pack simply never got the sweep.
 *
 * ⭐ A ratchet at zero, not a census: the one offender was fixed in the
 * commit that added this gate, so the ceiling starts where it ends.
 * (`check-drive-scripts` is the precedent; see docs/lint-family.md
 * § census-then-ratchet for the shape when a backlog does exist.)
 *
 * ⭐⭐ **Deliberately a literal, not a classifier.** It matches one
 * written shape — a `kind: 'player'` owner literal whose `templatePath`
 * is fed by `getTemplatePath()` — and nothing else. A gate that tried
 * to decide in general whether a given `getTemplatePath()` names a
 * person would answer wrongly in both directions and teach nobody
 * anything; docs/lint-family.md § how a census lies is the argument.
 * The broader disease is documented at
 * docs/antipatterns.md § Keying a PERSON on `getTemplatePath()`, and
 * the sweep it implies (the maker's-mark fallbacks) is tracked there.
 *
 * Scans the kernel mudlib and every capability pack's `src/`.
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

export interface PersonKeyFinding {
  file: string;
  line: number;
  text: string;
}

/**
 * The one shape. A `kind:` whose value is the string `player`, followed
 * — within the same object literal, so before the closing brace — by a
 * `templatePath:` fed from `getTemplatePath()`.
 *
 * The two keys may be written in either order and may be separated by
 * newlines, which is how a prettier-wrapped `ParcelApi.subdivide` call
 * actually reads at 80 columns.
 */
const SHAPES: readonly RegExp[] = [
  /kind:\s*['"]player['"][^{}]*?templatePath:\s*[^,{}]*?getTemplatePath\s*\(/gs,
  /templatePath:\s*[^,{}]*?getTemplatePath\s*\([^{}]*?kind:\s*['"]player['"]/gs,
];

/** Source with `//` and block comments blanked, newlines preserved. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Every offending owner literal in one file's source. */
export function scanPersonKeys(source: string, file: string): PersonKeyFinding[] {
  const code = stripComments(source);
  const out: PersonKeyFinding[] = [];
  const seen = new Set<number>();
  for (const shape of SHAPES) {
    shape.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = shape.exec(code))) {
      const line = code.slice(0, m.index).split("\n").length;
      if (seen.has(line)) continue;
      seen.add(line);
      out.push({ file, line, text: m[0].replace(/\s+/g, " ").trim() });
    }
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

/** The live tree's findings — the kernel plus every pack `src/`. */
export function collectLiveFindings(): PersonKeyFinding[] {
  const out: PersonKeyFinding[] = [];
  for (const file of kernelFiles()) {
    out.push(
      ...scanPersonKeys(readFileSync(file, "utf8"), "src/" + relative(SERVER_SRC, file)),
    );
  }
  for (const pack of packSources()) {
    for (const file of packSrcFiles(pack.srcDir)) {
      out.push(
        ...scanPersonKeys(
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
    console.log("check-person-keys: 0 person keys on getTemplatePath() (ceiling 0) ✔");
    process.exit(0);
  }
  console.error(
    `check-person-keys: ${findings.length} person record(s) keyed on ` +
      `getTemplatePath() — the ceiling is 0.\n`,
  );
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.text}`);
  console.error(
    `\nEvery player Avatar shares ONE templatePath, so this keys the record\n` +
      `on EVERY player at once. Use getIdentityPath(), which falls back to\n` +
      `getTemplatePath() for anything with no minted identity and is\n` +
      `therefore safe everywhere.\n\n` +
      `See docs/antipatterns.md § Keying a PERSON on getTemplatePath().`,
  );
  process.exit(EXIT_ON_FINDINGS ? 1 : 0);
}

// Run only when invoked as a script — the unit test imports the pure
// scan (the check-combat-dynamics precedent).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
