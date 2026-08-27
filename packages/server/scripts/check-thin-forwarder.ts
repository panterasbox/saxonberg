/**
 * check-thin-forwarder — the "don't wrap an object method in an Api"
 * lint.
 *
 * An `Api` / `*Logic` method whose ENTIRE body forwards one of its own
 * parameters' methods adds no orchestration, no security value, no
 * cross-object logic — the caller should call the object directly with
 * its own local `MixinApi.isX` narrowing. See docs/antipatterns.md §
 * Thin Api Wrappers over Object Methods.
 *
 * Flags a method under `api/**` or `obj/api/**` whose body is exactly:
 *   - `return <param>.method(...)`                       (bare forward)
 *   - `if (<cond>) return <trivial>; return <param>.method(...)`
 *                                        (narrow-then-forward-else-default)
 * where `<param>` is one of the method's own parameters, and `<trivial>`
 * is a no-information default (`null` / `undefined` / `[]` / `false` /
 * `true` / `0` / `''`).
 *
 * NOT flagged (by construction):
 *   - The sanctioned facade forward `return logic().m(...)` — `logic()`
 *     is a call, not a parameter.
 *   - A method with a substantive non-forward arm (e.g. a schema-default
 *     fallback) — its body isn't a pure forward.
 *   - `this.x()` / registry (`reg.x()`) forwards — the target isn't a
 *     parameter (the no-logic-registry-tier case is a finalize-checklist
 *     judgment call, not a mechanical lint).
 *
 * Standalone script (the `check-gate-strings` precedent — ESLint 8
 * legacy config can't load a local rule without `--rulesdir`). CI-gating.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const API_ROOTS = [join(SERVER_SRC, "mud", "api"), join(SERVER_SRC, "mud", "platform", "idea", "api")];

/**
 * Sanctioned thin-forward exceptions — a method that genuinely must
 * live on the Api despite reading like a forward (a stable public
 * rename over an internal name, a documented seam). Keep to
 * `file#method` and add a one-line reason in review.
 */
const ALLOWLIST = new Set<string>([
  // (empty — populate as real exceptions are adjudicated)
]);

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
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

const TRIVIAL_KEYWORDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
]);

/** A no-information default value (the guard arm of a narrow-then-forward). */
function isTrivial(expr: ts.Expression | undefined): boolean {
  if (!expr) return true; // bare `return;`
  if (TRIVIAL_KEYWORDS.has(expr.kind)) return true;
  if (ts.isIdentifier(expr) && expr.text === "undefined") return true;
  if (ts.isArrayLiteralExpression(expr) && expr.elements.length === 0)
    return true;
  if (ts.isObjectLiteralExpression(expr) && expr.properties.length === 0)
    return true;
  if (ts.isNumericLiteral(expr) && expr.text === "0") return true;
  if (ts.isStringLiteral(expr) && expr.text === "") return true;
  return false;
}

/**
 * If `stmt` is `return <ident>.method(<args>)` where `<ident>` is a
 * parameter and every `<arg>` is a bare parameter identifier (pass-
 * through, no transform / added args), return the forwarded identifier
 * text; else null. The pass-through check is what excludes an Api
 * method that ADDS behavior via its args (e.g. `forceCommand` →
 * `giver.executeCommand(text, {...opts, forced:true})`) and helpers
 * that transform (`slots.map(s => …)`, `text.replace(re, rep)`).
 */
function forwardTarget(
  stmt: ts.Statement,
  params: ReadonlySet<string>
): string | null {
  if (!ts.isReturnStatement(stmt) || !stmt.expression) return null;
  let expr: ts.Expression = stmt.expression;
  // Unwrap a trailing `as T` / parens / non-null (`x!`) around the call.
  while (
    ts.isAsExpression(expr) ||
    ts.isParenthesizedExpression(expr) ||
    ts.isNonNullExpression(expr)
  ) {
    expr = expr.expression;
  }
  if (!ts.isCallExpression(expr)) return null;
  const callee = expr.expression;
  if (!ts.isPropertyAccessExpression(callee)) return null;
  // The receiver must be a bare parameter identifier (optionally
  // `param!` / `(param)`). NOT `logic()`, `this`, `reg`, `X.y`.
  let recv: ts.Expression = callee.expression;
  while (ts.isParenthesizedExpression(recv) || ts.isNonNullExpression(recv)) {
    recv = recv.expression;
  }
  if (!ts.isIdentifier(recv)) return null;
  if (!params.has(recv.text)) return null;
  // Pass-through args only: every argument is a bare identifier that is
  // itself a parameter (a subset/reorder of the method's params is
  // fine; anything computed is a transform → not a pure forward).
  for (const arg of expr.arguments) {
    if (!ts.isIdentifier(arg) || !params.has(arg.text)) return null;
  }
  return recv.text;
}

interface Finding {
  file: string;
  line: number;
  cls: string;
  method: string;
  target: string;
}

const files: string[] = [];
for (const root of API_ROOTS) walk(root, files);

const findings: Finding[] = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    ts.ScriptKind.TS
  );

  const visit = (node: ts.Node): void => {
    // Only PUBLIC methods of an `*Api` / `*Logic` class — the Api
    // surface. Module-private free functions and `private` helpers are
    // internal plumbing, not the "wrap an object method in an Api"
    // antipattern.
    const isPublicApiMethod =
      ts.isMethodDeclaration(node) &&
      node.parent &&
      ts.isClassDeclaration(node.parent) &&
      !!node.parent.name &&
      /(?:Api|Logic)$/.test(node.parent.name.text) &&
      !node.modifiers?.some(
        (m) =>
          m.kind === ts.SyntaxKind.PrivateKeyword ||
          m.kind === ts.SyntaxKind.ProtectedKeyword
      );
    if (isPublicApiMethod && node.body && ts.isBlock(node.body)) {
      const params = new Set<string>();
      for (const p of node.parameters) {
        if (ts.isIdentifier(p.name)) params.add(p.name.text);
      }
      const stmts = node.body.statements;
      let target: string | null = null;

      if (stmts.length === 1) {
        target = forwardTarget(stmts[0]!, params);
      } else if (stmts.length === 2) {
        // narrow-then-forward-else-default:
        // stmt0 = `if (<cond>) return <trivial>;`  (no else)
        const guard = stmts[0]!;
        if (
          ts.isIfStatement(guard) &&
          !guard.elseStatement &&
          ts.isReturnStatement(guard.thenStatement) &&
          isTrivial(
            (guard.thenStatement as ts.ReturnStatement).expression
          )
        ) {
          target = forwardTarget(stmts[1]!, params);
        } else if (
          ts.isIfStatement(guard) &&
          !guard.elseStatement &&
          ts.isBlock(guard.thenStatement) &&
          guard.thenStatement.statements.length === 1 &&
          ts.isReturnStatement(guard.thenStatement.statements[0]!) &&
          isTrivial(
            (guard.thenStatement.statements[0] as ts.ReturnStatement).expression
          )
        ) {
          target = forwardTarget(stmts[1]!, params);
        }
      }

      if (target !== null) {
        const cls =
          ts.isMethodDeclaration(node) &&
          node.parent &&
          ts.isClassDeclaration(node.parent) &&
          node.parent.name
            ? node.parent.name.text
            : "<fn>";
        const method =
          node.name && ts.isIdentifier(node.name) ? node.name.text : "<anon>";
        const key = `${relative(SERVER_SRC, file)}#${method}`;
        if (!ALLOWLIST.has(key)) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          findings.push({ file, line: line + 1, cls, method, target });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (findings.length > 0) {
  console.error(
    `check-thin-forwarder: ${findings.length} Api/Logic method${
      findings.length === 1 ? "" : "s"
    } that only forward a parameter's method (call the object directly ` +
      `with local narrowing — see docs/antipatterns.md § Thin Api ` +
      `Wrappers over Object Methods):`
  );
  for (const f of findings) {
    console.error(
      `  ${relative(join(SERVER_SRC, ".."), f.file)}:${f.line}  ` +
        `${f.cls}.${f.method}() → ${f.target}.…()`
    );
  }
  process.exit(1);
}

console.log(
  `check-thin-forwarder: no parameter-forwarding Api/Logic methods ` +
    `(${files.length} api/ files scanned).`
);
