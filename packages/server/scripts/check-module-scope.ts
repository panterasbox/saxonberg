/**
 * check-module-scope — the no-module-scope-statements lint.
 *
 * Module scope in `src/mud/**` may only DECLARE: imports/exports,
 * classes, functions, interfaces, type aliases, enums, `declare module`
 * augmentations, and `const`/`let` variable declarations (initializers
 * included — pure value construction is a declaration). It must not
 * contain free-standing executable statements — bare calls, loops,
 * conditionals, assignments, mutations of other modules' state. All
 * cross-module initialization happens through runtime lifecycles
 * instead: `BootstrapManager.installFrameworkWiring` (the boot seam),
 * `postRegister` (instance lifecycle), capture-at-start (the
 * scheduler's dispatch index), the `ModuleApi.stamp` module lifecycle
 * (Api-facade decoration), or lazy first-use initializers.
 *
 * Rationale + the sanctioned patterns: docs/architecture.md § Module
 * scope declares; lifecycles initialize. This is the tripwire that
 * keeps the 2026-07 antipattern sweep true.
 *
 * Implemented as a standalone script (the `check-gate-strings`
 * precedent — ESLint 8 legacy config can't load a local rule without
 * `--rulesdir`). Uses the TypeScript parser, so it sees real
 * statements, not regex approximations.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const MUD_ROOT = join(SERVER_SRC, "mud");

/**
 * Statement kinds that are declarations — allowed at module scope.
 * Everything else (ExpressionStatement, IfStatement, ForStatement,
 * ...) is a violation.
 */
const DECLARATION_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.ImportEqualsDeclaration,
  ts.SyntaxKind.ExportDeclaration,
  ts.SyntaxKind.ExportAssignment,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration, // `declare module '...'` augmentations
  ts.SyntaxKind.VariableStatement,
]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (
      full.endsWith(".ts") &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".d.ts")
    ) {
      out.push(full);
    }
  }
}

const files: string[] = [];
walk(MUD_ROOT, files);

interface Finding {
  file: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ false,
    ts.ScriptKind.TS
  );
  for (const stmt of sf.statements) {
    if (DECLARATION_KINDS.has(stmt.kind)) continue;
    // A lone string-literal expression statement is a directive
    // ('use strict') — allowed.
    if (
      ts.isExpressionStatement(stmt) &&
      ts.isStringLiteral(stmt.expression)
    ) {
      continue;
    }
    const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart(sf));
    const text = source
      .slice(stmt.getStart(sf), stmt.getEnd())
      .split("\n")[0]!
      .slice(0, 100);
    findings.push({ file, line: line + 1, text });
  }
}

if (findings.length > 0) {
  console.error(
    `check-module-scope: ${findings.length} free-standing module-scope ` +
      `statement${findings.length === 1 ? "" : "s"} in src/mud (module ` +
      `scope declares; lifecycles initialize — see docs/architecture.md):`
  );
  for (const f of findings) {
    console.error(
      `  ${relative(join(SERVER_SRC, ".."), f.file)}:${f.line}  ${f.text}`
    );
  }
  process.exit(1);
}

console.log(
  `check-module-scope: no free-standing module-scope statements ` +
    `(${files.length} files scanned).`
);
