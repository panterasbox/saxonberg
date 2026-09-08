/**
 * check-condition-arms — the condition-mechanism census, and the ratchet
 * that stops a ninth.
 *
 * ⭐⭐ **The finding this exists to hold.** `VitalsMixin.reconcileConditions`
 * is one method containing SEVEN arms, each added by a different build,
 * each discriminated by *which optional field happens to be set on the
 * record* — traumas · shocks · sustained · decayingMagic · infections ·
 * progressing · dyings. Plus a mechanism that keeps its state OUTSIDE the
 * condition collection entirely (`Metabolic.reconcileToxinConditions`
 * iterates `toxinBurdens` and mirrors a band into the condition's
 * `stage`), which is why `progressAffliction` has to explicitly skip rows
 * carrying a `toxinBehavior` — two mechanisms owning one field.
 *
 * ⚠⚠ **The trap has already been sprung once, with a comment proving it.**
 * The `progressing` arm's own docstring records that `ProgressionSpec`
 * "was authored by three rows, and was read by nothing… This is the arm
 * that fills it." Somebody found a declared-and-unread field and ADDED AN
 * ARM. `signature`, `resolution` and `contagion` are three more such
 * fields, and the consequence build wires them — so this gate ships
 * BEFORE that work, not after it.
 *
 * **The rule the count enforces:** a condition's PROGRESSION LAW (decay ·
 * logistic · stage · integrate · countdown · burden) and its EFFECT on
 * the body are independent. A new condition kind needs a law plus a
 * `signature`, never a new arm. The census may FALL; it may never RISE.
 *
 * ## What counts as an arm
 *
 * 1. **A bound arm** — a `const x = <conditions>.filter(<discriminator>)`
 *    whose result is iterated by a `for…of` in the same function,
 *    **and which advances state over time**: either the enclosing method
 *    is a `reconcile*` (the codebase's own name for this machinery) or
 *    the consuming loop body references a game-time cursor.
 *    A discriminator is a `kind ===` test or an optional-field presence
 *    test (`!== undefined` / `!== null`).
 * 2. **An inline arm** — a `for (const c of <conditions>)` whose body
 *    references a game-time cursor (`elapsed` / `tickedAt` / `nowS`),
 *    i.e. it advances state over elapsed time without binding a subset.
 *
 * ⚠ **The progression test is what makes this a census of MECHANISMS
 * rather than of loops.** Without it the gate counts `MagicLogic.execRelieve`
 * (the dispel filter) and `AssessController.execute` (the readout) — both
 * genuinely discriminate and iterate, and neither advances anything. A
 * plain lookup (`findAffliction`), a read, a dispel selection, or a bulk
 * clear is NOT an arm. Those are queries and are deliberately unbounded.
 *
 * `KNOWN_PARALLEL_STORES` is enumerated HERE so adding one is a visible
 * diff (the `lint:boundary` / `lint:object-verbs` precedent).
 *
 * Usage:
 *   tsx scripts/check-condition-arms.ts            # gate (CI)
 *   tsx scripts/check-condition-arms.ts --advisory # count only
 *   tsx scripts/check-condition-arms.ts --list     # show every arm
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const MUD_ROOT = join(SERVER_SRC, "mud");
const CONTENT_ROOT = join(here, "..", "..", "content");

/**
 * ⭐ The ceiling. Measured 2026-09-08 on `design/consequence`, before any
 * consequence-build work. **It may fall; it may never rise.**
 *
 * Driving it down is the consequence build's W3: each arm migrates onto
 * (progression law × `signature`) and the number drops. When it reaches
 * the floor this becomes a zero-gate like `lint:object-verbs`.
 */
const ARM_CEILING = 7;

/**
 * Mechanisms that advance a condition's state from a store OUTSIDE the
 * condition collection, and mirror the result in. Not detectable by the
 * arm rule (they never touch `getConditions()` to progress), so they are
 * enumerated — a new entry is a deliberate, reviewable diff.
 *
 * ⚠ Each of these is a second owner of a field the condition record also
 * owns, which is the collision `progressAffliction` works around today.
 */
const KNOWN_PARALLEL_STORES: readonly string[] = [
  // toxins: iterates `toxinBurdens`, derives a band, writes `stage`.
  "lib/metabolism/Metabolic.ts#reconcileToxinConditions",
];

/** Time cursors that mark a loop as advancing state, not reading it. */
const TIME_CURSORS = /\b(elapsed|elapsedSec|tickedAt|nowS|deltaS)\b/;

/** A predicate that narrows by record shape rather than by identity. */
const DISCRIMINATOR = /\bkind\s*===|!==\s*undefined|!==\s*null/;

interface Arm {
  file: string;
  line: number;
  fn: string;
  name: string;
  kind: "bound" | "inline";
}

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

/** True iff `node` reads the condition collection. */
function isConditionSource(node: ts.Node): boolean {
  const t = node.getText();
  return (
    /\bthis\.conditions\b/.test(t) ||
    /\.getConditions\(\)/.test(t) ||
    /\bthis\.conditions\b/.test(t)
  );
}

/** Enclosing function/method name for reporting. */
function enclosingName(node: ts.Node): string {
  let n: ts.Node | undefined = node;
  while (n) {
    if (
      (ts.isMethodDeclaration(n) ||
        ts.isFunctionDeclaration(n) ||
        ts.isPropertyDeclaration(n)) &&
      n.name &&
      ts.isIdentifier(n.name)
    ) {
      return n.name.text;
    }
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
      // a `const scan = (…) => {}` style helper
      const init = n.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        return n.name.text;
      }
    }
    n = n.parent;
  }
  return "<top-level>";
}

/** Collect the arms in one source file. Pure — exported for the test. */
export function armsIn(file: string, src: string): Arm[] {
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const arms: Arm[] = [];
  // Pass 1 — bound subsets: `const x = <conditions>.filter(<discriminator>)`
  const bound = new Map<string, { line: number; fn: string }>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isPropertyAccessExpression(node.initializer.expression) &&
      node.initializer.expression.name.text === "filter" &&
      isConditionSource(node.initializer.expression.expression)
    ) {
      const pred = node.initializer.arguments[0];
      if (pred && DISCRIMINATOR.test(pred.getText())) {
        bound.set(node.name.text, {
          line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          fn: enclosingName(node),
        });
      }
    }
    // Pass 2 — iteration
    if (ts.isForOfStatement(node)) {
      const srcExpr = node.expression.getText().replace(/^\[\.\.\.|\]$/g, "");
      const line =
        sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const hit = bound.get(srcExpr.trim());
      // ⚠ A bound subset is only an ARM if it advances state over time.
      // The enclosing `reconcile*` name is the codebase's own marker for
      // that machinery; the time cursor catches anything else.
      const progresses =
        hit !== undefined &&
        (/^reconcile/.test(hit.fn) ||
          TIME_CURSORS.test(node.statement.getText()));
      if (hit && progresses) {
        arms.push({
          file,
          line: hit.line,
          fn: hit.fn,
          name: srcExpr.trim(),
          kind: "bound",
        });
        bound.delete(srcExpr.trim());
      } else if (hit) {
        // a discriminated selection that does not progress — a query.
        bound.delete(srcExpr.trim());
      } else if (
        isConditionSource(node.expression) &&
        TIME_CURSORS.test(node.statement.getText())
      ) {
        arms.push({
          file,
          line,
          fn: enclosingName(node),
          name: srcExpr.trim().slice(0, 40),
          kind: "inline",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return arms;
}

// ---- main (guarded so the test may import `armsIn` side-effect-free) ----
const invokedDirectly =
  process.argv[1] !== undefined &&
  process.argv[1].endsWith("check-condition-arms.ts");

const advisory = process.argv.includes("--advisory");
const list = process.argv.includes("--list");

const files = invokedDirectly
  ? [...walk(MUD_ROOT), ...walk(CONTENT_ROOT)]
  : [];
const all: Arm[] = [];
for (const f of files) {
  // ⭐ Pre-filter before parsing. Building a full AST with parent pointers
  // for 1,300 files costs minutes; only ~30 mention the condition
  // collection at all, and a file that never names it cannot hold an arm.
  const src = readFileSync(f, "utf8");
  if (!/\.conditions\b|getConditions\(\)/.test(src)) continue;
  all.push(...armsIn(f, src));
}
if (!invokedDirectly) {
  // imported for the test — do not run the census or exit the process.
} else {

const rel = (f: string) => relative(join(here, "..", ".."), f);

if (list || advisory) {
  console.log(`\ncondition arms — ${all.length} found\n`);
  const byFile = new Map<string, Arm[]>();
  for (const a of all) {
    const k = rel(a.file);
    byFile.set(k, [...(byFile.get(k) ?? []), a]);
  }
  for (const [f, as] of [...byFile].sort()) {
    console.log(`  ${f}`);
    for (const a of as) {
      console.log(
        `    ${String(a.line).padStart(5)}  ${a.fn}() → ${a.name}  [${a.kind}]`,
      );
    }
  }
  console.log(`\nparallel stores (enumerated): ${KNOWN_PARALLEL_STORES.length}`);
  for (const p of KNOWN_PARALLEL_STORES) console.log(`    ${p}`);
  console.log(
    `\n  total mechanisms = ${all.length} arms + ${KNOWN_PARALLEL_STORES.length} parallel = ${all.length + KNOWN_PARALLEL_STORES.length}\n`,
  );
}

if (advisory) process.exit(0);

if (all.length > ARM_CEILING) {
  console.error(
    `\n✖ condition-arm census ROSE: ${all.length} > ceiling ${ARM_CEILING}\n\n` +
      `  A new discriminated arm was added to the condition machinery.\n` +
      `  The shape a new condition kind needs is a PROGRESSION LAW plus a\n` +
      `  \`signature\` — not a new arm. See\n` +
      `  docs/slates/builds/consequence-slate.md § Finding 0.\n\n` +
      `  If an arm was genuinely unavoidable, lower it elsewhere first or\n` +
      `  raise ARM_CEILING in this file as a deliberate, reviewable diff.\n`,
  );
  for (const a of all) {
    console.error(`    ${rel(a.file)}:${a.line}  ${a.fn}() → ${a.name}`);
  }
  process.exit(1);
}

if (all.length < ARM_CEILING) {
  console.log(
    `\n✔ condition arms: ${all.length} (ceiling ${ARM_CEILING}) — ` +
      `the ratchet can fall to ${all.length}; lower ARM_CEILING in ` +
      `scripts/check-condition-arms.ts.\n`,
  );
  process.exit(0);
}

console.log(`✔ condition arms: ${all.length} / ceiling ${ARM_CEILING}`);
}
