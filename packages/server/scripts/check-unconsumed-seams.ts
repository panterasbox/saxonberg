/**
 * check-unconsumed-seams — the declared-but-unread census, and the
 * ratchet that stops the next one.
 *
 * ⭐⭐ **The finding this exists to hold.** The consequence build began
 * from a slate whose central complaint was that *conditions don't do
 * anything*. The cause turned out to be structural rather than a missing
 * feature: the `Condition` Idea has shipped `signature`, `resolution` and
 * `contagion` since it was written — persistent, authorable,
 * spoiler-levelled, with public accessors and a place in every row's
 * YAML — and **no code anywhere reads any of them.** Twenty-three rows
 * author `signature: []` because there is nothing else to author.
 *
 * ⚠⚠ **And the trap has been sprung once already, with a comment proving
 * it.** `ProgressionSpec` was in exactly the same state; the build that
 * found it wrote *"was authored by three rows, and was read by
 * nothing… This is the arm that fills it"* — and added a seventh arm to
 * `reconcileConditions` rather than asking why the field had no reader.
 * A gate that had been counting would have made that a two-line diff to
 * argue about instead of an unremarked commit.
 *
 * ## The two classes counted
 *
 * 1. **An unread authored field** — a key in `static fieldMeta` on a data
 *    Idea under `platform/idea/**` (excluding `cmd/` and `api/`, which
 *    are controllers and logic singletons rather than authored data),
 *    where no file outside the declaring one reads it: no
 *    `get<Field>(` call, no `.<field>` property access, anywhere in the
 *    kernel or in any pack `src/`. **A write is not a consumer** — the
 *    Hydrator writes every persistent field by reflection, and a YAML row
 *    authoring a value is the *supply* side. What makes a seam real is
 *    somebody reading it.
 *
 * 2. **An un-overridden extension hook** — a method carrying the `@hook`
 *    TSDoc tag (the marker that says *the framework invokes this, you
 *    implement it*) with no override anywhere: no other non-test file in
 *    the kernel or any pack declares a method of that name.
 *
 * ⚠ **Neither class is a bug on its own.** A hook shipped one wave ahead
 * of its first consumer is good sequencing, and this gate is a **ceiling,
 * not a zero-gate**: the count may fall and may never rise. What it
 * refuses is the *accumulation* — the drift where the surface grows
 * faster than the engine that honours it, so that an author writes a row
 * that says what they want and the world silently ignores it.
 *
 * `KNOWN_EXTENSION_ONLY` starts **empty on purpose**, so the first
 * allowlisting is a visible diff somebody has to defend (the
 * `KNOWN_PARALLEL_STORES` precedent in `check-condition-arms.ts`).
 *
 * Usage:
 *   tsx scripts/check-unconsumed-seams.ts            # gate (CI)
 *   tsx scripts/check-unconsumed-seams.ts --advisory # count only
 *   tsx scripts/check-unconsumed-seams.ts --list     # show every seam
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import ts from "typescript";
import { MUD, packSources } from "./pack-roots";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..");

/**
 * ⭐ The ceiling. Measured 2026-09-09 on `design/consequence`, before the
 * consequence build wires any of the seams it found. **It may fall; it
 * may never rise.**
 *
 * The consequence build drives it down at W3 (`onDefeated` /
 * `onDefeatedFoe` gain default bodies) and W13 (`contagion` gains a
 * reader in `analyze patient`).
 *
 * ⭐⭐ **What the first census found, and it is worth stating plainly:
 * SEVENTEEN of the twenty-one are combat.** `Combatant` (7),
 * `CombatReactive` (6) and `CombatVenue` (3) are the three `@hook`
 * surfaces `docs/subsystems/combat-hooks.md` calls "the wizard-facing
 * combat extension grammar" — and **not one of them is composed by
 * anything that ships**, in the kernel or in any of the 43 packs. The
 * grammar is complete, documented, and spoken by nobody. That is the
 * same shape as `signature`/`resolution`/`contagion`, at four times the
 * size, and it is why this gate counts hooks as well as fields.
 */
const SEAM_CEILING = 19;

/**
 * Seams that are deliberately extension-only: shipped for an author or a
 * pack to implement, with no kernel consumer expected, ever.
 *
 * ⚠ **Empty on purpose.** Every entry here is a claim that a declared
 * surface is *meant* to have no reader — which is exactly the claim the
 * `ProgressionSpec` comment made informally and got wrong. Adding one
 * should cost a paragraph in the MR.
 */
const KNOWN_EXTENSION_ONLY: readonly string[] = [];

export interface Seam {
  kind: "field" | "hook";
  file: string;
  line: number;
  owner: string;
  name: string;
}

/* ────────────────────────── the corpus ────────────────────────── */

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (e === "__tests__" || e === "node_modules" || e === "dist") continue;
      walk(p, out);
    } else if (e.endsWith(".ts") && !e.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Every non-test TypeScript file the consumer search may read: the whole
 * kernel mudlib plus every capability pack's `src/`. A pack is as
 * legitimate a consumer as the kernel — that is the whole point of a
 * pack — so a seam read only by `trade-mining` is consumed.
 */
export function consumerCorpus(): string[] {
  const files = walk(MUD);
  for (const p of packSources()) files.push(...walk(p.srcDir));
  return files;
}

/**
 * A data Idea, for class (1): under `platform/idea/`, not a controller
 * (`idea/cmd/`) and not a logic singleton (`idea/api/`).
 */
function isDataIdeaFile(file: string): boolean {
  const rel = file.split("src/mud/")[1] ?? "";
  if (!rel.startsWith("platform/idea/")) return false;
  if (rel.startsWith("platform/idea/cmd/")) return false;
  if (rel.startsWith("platform/idea/api/")) return false;
  return true;
}

/* ─────────────────── class (1): authored fields ─────────────────── */

/** The `static fieldMeta` keys declared in one file, with their lines. */
export function fieldMetaKeysIn(
  file: string,
  src: string,
): Array<{ owner: string; name: string; line: number }> {
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const out: Array<{ owner: string; name: string; line: number }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.name.text === "fieldMeta" &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      let owner = "<anonymous>";
      let n: ts.Node | undefined = node.parent;
      while (n) {
        if (
          (ts.isClassDeclaration(n) || ts.isClassExpression(n)) &&
          n.name &&
          ts.isIdentifier(n.name)
        ) {
          owner = n.name.text;
          break;
        }
        n = n.parent;
      }
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const key = ts.isIdentifier(prop.name)
          ? prop.name.text
          : ts.isStringLiteral(prop.name)
            ? prop.name.text
            : null;
        if (!key) continue;
        out.push({
          owner,
          name: key,
          line: sf.getLineAndCharacterOfPosition(prop.getStart()).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * The field's **read surface**: every method in the declaring file whose
 * body reads `this.<field>` (an assignment does not count).
 *
 * ⭐ Derived rather than guessed. `get<Field>` is only one of the shapes a
 * reader takes — the boolean convention puts the getter in the predicate
 * form (`respires` is read by `isRespiring()`), and a `protected _foo` is
 * read by `getFoo()`. Both were false positives in the first cut of this
 * gate; deriving the surface from the bodies handles every naming
 * convention the repo has, present and future.
 */
export function readSurfaceOf(
  field: string,
  src: string,
  file = "x.ts",
): string[] {
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  // `this.foo` not followed by a lone `=` — i.e. a read, not a write.
  const reads = new RegExp(`this\\.${field}\\b(?!\\s*=[^=])`);
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isMethodDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.body &&
      reads.test(node.body.getText())
    ) {
      names.add(node.name.text);
    }
    if (
      ts.isGetAccessorDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name)
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return [...names];
}

/**
 * Does any file other than `declaringFile` READ this field?
 *
 * Reading is a `.field` property access or a call to one of the field's
 * read-surface methods (above). A `set<Field>(` is deliberately NOT a
 * read: the Hydrator sets every persistent field by name, and a row
 * authoring a value is the supply side of the seam, not its consumer.
 */
export function fieldIsRead(
  name: string,
  declaringFile: string,
  corpus: Map<string, string>,
  surface: string[] = [],
): boolean {
  const access = new RegExp(`\\.${name}\\b`);
  const readers = surface.length
    ? new RegExp(`\\.(?:${surface.join("|")})\\s*\\(`)
    : null;
  for (const [file, src] of corpus) {
    if (file === declaringFile) continue;
    if (access.test(src)) return true;
    if (readers && readers.test(src)) return true;
  }
  return false;
}

/* ──────────────────── class (2): @hook methods ──────────────────── */

/**
 * ⭐ A hook is only counted if it is a **terminal**: a declaration with no
 * body at all (an interface contract awaiting an implementor) or one
 * whose body is empty or returns a bare constant (`{}`, `return true`,
 * `return 0` — the "compose via super" no-op the repo writes by
 * convention).
 *
 * ⚠ This is what separates the two shapes `@hook` marks, and getting it
 * wrong makes the gate noise. `Combatant.onDefeated` is a no-op terminal
 * that nothing composes — dead surface, the finding. `Detailed.applyDetails`
 * is a Hydrator applier with a real body, invoked by name through
 * reflection: it has no textual caller and no override, and it is
 * perfectly alive. Body-shape tells them apart where "zero overrides"
 * alone cannot.
 */
function isTerminalBody(node: ts.MethodDeclaration | ts.MethodSignature): boolean {
  if (ts.isMethodSignature(node)) return true; // a contract, no body
  if (!node.body) return true;
  const stmts = node.body.statements;
  if (stmts.length === 0) return true;
  if (stmts.length > 1) return false;
  const only = stmts[0];
  if (!only || !ts.isReturnStatement(only)) return false;
  const e = only.expression;
  if (!e) return true;
  return (
    e.kind === ts.SyntaxKind.TrueKeyword ||
    e.kind === ts.SyntaxKind.FalseKeyword ||
    e.kind === ts.SyntaxKind.NullKeyword ||
    ts.isNumericLiteral(e) ||
    ts.isStringLiteral(e) ||
    (ts.isIdentifier(e) && e.text === "undefined")
  );
}

/** Method names carrying an `@hook` TSDoc tag in one file. */
export function hookMethodsIn(
  file: string,
  src: string,
): Array<{ owner: string; name: string; line: number }> {
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const out: Array<{ owner: string; name: string; line: number }> = [];
  const seen = new Set<string>();
  /**
   * ⚠ Names implemented for real IN THIS FILE. The repo's mixin shape
   * declares the `@hook` on the interface at the top of the file and
   * implements it in the mixin class below — `Detailed.applyDetails`,
   * `Exitable.applyExits`, `SelfHeating.baledMoisture`. Those signatures
   * are contracts with a live implementation one screen down, not dead
   * surface, and skipping the declaring file (right for an override) is
   * exactly wrong for them.
   */
  const implementedHere = new Set<string>();
  const collectImpls = (node: ts.Node): void => {
    if (
      ts.isMethodDeclaration(node) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      !isTerminalBody(node)
    ) {
      implementedHere.add(node.name.text);
    }
    ts.forEachChild(node, collectImpls);
  };
  collectImpls(sf);
  const visit = (node: ts.Node): void => {
    if (
      (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) &&
      node.name &&
      ts.isIdentifier(node.name)
    ) {
      // The doc comment sits in the leading trivia of the declaration.
      const full = node.getFullText();
      const lead = full.slice(0, full.length - node.getText().length);
      if (
        /@hook\b/.test(lead) &&
        isTerminalBody(node) &&
        !implementedHere.has(node.name.text)
      ) {
        const name = node.name.text;
        if (!seen.has(name)) {
          seen.add(name);
          let owner = "<anonymous>";
          let n: ts.Node | undefined = node.parent;
          while (n) {
            if (
              (ts.isClassDeclaration(n) ||
                ts.isClassExpression(n) ||
                ts.isInterfaceDeclaration(n)) &&
              n.name &&
              ts.isIdentifier(n.name)
            ) {
              owner = n.name.text;
              break;
            }
            n = n.parent;
          }
          out.push({
            owner,
            name,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * Does any file other than `declaringFile` DECLARE a method of this name?
 *
 * An override is a declaration, not a call — `super.onDestruct()` inside
 * the declaring file proves nothing. The shape matched is a method head
 * at the start of a line (`  onDestruct(`, `  public async onDestruct(`),
 * which is what a class body override looks like and which a call site
 * (`x.onDestruct(`) is not.
 */
export function hookIsOverridden(
  name: string,
  declaringFile: string,
  corpus: Map<string, string>,
): boolean {
  const decl = new RegExp(
    `^\\s*(?:public\\s+|protected\\s+|override\\s+|async\\s+|static\\s+)*${name}\\s*(?:<[^>]*>)?\\s*\\(`,
    "m",
  );
  for (const [file, src] of corpus) {
    if (file === declaringFile) continue;
    if (decl.test(src)) return true;
  }
  return false;
}

/* ──────────────────────────── the census ──────────────────────────── */

/** The whole census. Pure over the corpus — exported for the test. */
export function unconsumedIn(corpus: Map<string, string>): Seam[] {
  const seams: Seam[] = [];
  for (const [file, src] of corpus) {
    if (isDataIdeaFile(file) && /static\s+fieldMeta/.test(src)) {
      for (const f of fieldMetaKeysIn(file, src)) {
        if (KNOWN_EXTENSION_ONLY.includes(`${f.owner}.${f.name}`)) continue;
        if (!fieldIsRead(f.name, file, corpus, readSurfaceOf(f.name, src, file))) {
          seams.push({ kind: "field", file, line: f.line, ...f });
        }
      }
    }
    if (/@hook\b/.test(src)) {
      for (const h of hookMethodsIn(file, src)) {
        if (KNOWN_EXTENSION_ONLY.includes(`${h.owner}.${h.name}`)) continue;
        if (!hookIsOverridden(h.name, file, corpus)) {
          seams.push({ kind: "hook", file, line: h.line, ...h });
        }
      }
    }
  }
  return seams;
}

// ---- main (guarded so the test may import the pure halves) ----
const invokedDirectly =
  process.argv[1] !== undefined &&
  process.argv[1].endsWith("check-unconsumed-seams.ts");

if (invokedDirectly) {
  const advisory = process.argv.includes("--advisory");
  const list = process.argv.includes("--list");

  const corpus = new Map<string, string>();
  for (const f of consumerCorpus()) corpus.set(f, readFileSync(f, "utf8"));

  const all = unconsumedIn(corpus);
  const rel = (f: string): string => relative(REPO, f);

  if (list || advisory) {
    console.log(`\nunconsumed seams — ${all.length} found\n`);
    for (const kind of ["field", "hook"] as const) {
      const of = all.filter((s) => s.kind === kind);
      console.log(
        `  ${kind === "field" ? "declared-and-unread FIELDS" : "un-overridden HOOKS"}: ${of.length}`,
      );
      const byFile = new Map<string, Seam[]>();
      for (const s of of) {
        const k = rel(s.file);
        byFile.set(k, [...(byFile.get(k) ?? []), s]);
      }
      for (const [f, ss] of [...byFile].sort()) {
        console.log(`    ${f}`);
        for (const s of ss) {
          console.log(
            `      ${String(s.line).padStart(5)}  ${s.owner}.${s.name}`,
          );
        }
      }
      console.log("");
    }
    console.log(
      `  allowlisted extension-only: ${KNOWN_EXTENSION_ONLY.length}\n`,
    );
  }

  if (advisory) process.exit(0);

  if (all.length > SEAM_CEILING) {
    console.error(
      `\n✖ unconsumed-seam census ROSE: ${all.length} > ceiling ${SEAM_CEILING}\n\n` +
        `  A declared surface was added with nothing to read it — an\n` +
        `  authored field the engine ignores, or a hook nothing composes.\n` +
        `  That is how \`signature\`, \`resolution\` and \`contagion\` shipped\n` +
        `  dead for three builds. See docs/lint-family.md § lint:unconsumed-seams.\n\n` +
        `  Wire it, or (rarely) add it to KNOWN_EXTENSION_ONLY in this file\n` +
        `  with a reason — a visible diff, on purpose.\n`,
    );
    for (const s of all) {
      console.error(`    ${rel(s.file)}:${s.line}  ${s.owner}.${s.name}`);
    }
    process.exit(1);
  }

  if (all.length < SEAM_CEILING) {
    console.log(
      `\n✔ unconsumed seams: ${all.length} (ceiling ${SEAM_CEILING}) — ` +
        `the ratchet can fall to ${all.length}; lower SEAM_CEILING in ` +
        `scripts/check-unconsumed-seams.ts.\n`,
    );
    process.exit(0);
  }

  console.log(`✔ unconsumed seams: ${all.length} / ceiling ${SEAM_CEILING}`);
}
