/**
 * ⭐ `lint:multi-act` — **a controller performs one act.**
 *
 * A controller that decides WHICH act the player meant is doing the
 * grammar's job (controller-liquidity D13, the remedy ladder): the view can
 * say it — a subcommand with its own controller, an option, a disjoint
 * shape — or the object can, behind one protocol. What is left in the
 * controller is one act's input and output.
 *
 * **What it counts** (the TypeScript AST, every controller module —
 * `pack-roots.controllerFiles()`): one finding per controller module that
 * shows any of three shapes, each named in the finding:
 *
 *   (a) `subcommand` — a `switch (model.subcommand)`, or a comparison of
 *       `model.subcommand` with a string literal;
 *   (b) `arg-word` — a dispatch on a positional's typed WORD: a `switch`
 *       on `model.<arg>` (or `model.<arg>.raw`) with string-literal cases,
 *       or `model.<arg>[.raw] ===/!== '<literal>'`;
 *   (c) `target-kind` — two or more `if` arms that each test the same
 *       bound thing with `MixinApi.isX(t)` / `t instanceof X` and then call
 *       a DIFFERENT mutator on it (a method whose name is not a read —
 *       `get`/`is`/`has`/`can`/`describe`/… are input) — one controller,
 *       several acts, picked by what the target turns out to be.
 *
 * `model` is the name of `execute`'s first parameter (and `model` itself,
 * which every helper that receives it uses). A base (`*ControllerBase.ts`)
 * is counted like any controller — the split family's switch moves out of
 * the base too.
 *
 * ⭐ Census, then ratchet: opened at this classifier's count at
 * controller-liquidity W0 (2026-11-09). The survey's 75 multi-act
 * controllers is a different (reading) classifier's number; this one is a
 * syntax census and says so. It may fall, never rise.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { controllerFiles, parseTs, ratchet } from "./pack-roots";

export const MULTI_ACT_CEILING = 9; // controller-liquidity W9: −2, smelt and quench ask the piece. // controller-liquidity W11: −7 (saw, fell, sew, tan, scutch, spin, weave answer one plan each). // controller-liquidity W12: −1 (glass crack). // controller-liquidity W10: −3 (butcher, mill, slaughter). // controller-liquidity W7: −16, the kernel multi-act controllers split (W7a/b/c). // controller-liquidity W8: −1

export type MultiActShape = "subcommand" | "arg-word" | "target-kind";

/** The model-field name a `model.<x>` / `model.<x>.raw` / `model.<x>?.raw` expression reads, if any. */
function modelField(e: ts.Expression, models: ReadonlySet<string>): string | null {
  let x: ts.Expression = e;
  while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x)) x = x.expression;
  if (!ts.isPropertyAccessExpression(x)) return null;
  // `model.<arg>.raw`
  if (x.name.text === "raw" && ts.isPropertyAccessExpression(x.expression)) {
    const inner = x.expression;
    if (ts.isIdentifier(inner.expression) && models.has(inner.expression.text)) return inner.name.text;
    return null;
  }
  if (ts.isIdentifier(x.expression) && models.has(x.expression.text)) return x.name.text;
  return null;
}

const isStringLit = (e: ts.Expression): boolean =>
  ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e);

/** The tested identifier of a `MixinApi.isX(t)` / `t instanceof X` condition, if that is what it is. */
function testedKind(cond: ts.Expression): string | null {
  let c = cond;
  while (ts.isParenthesizedExpression(c)) c = c.expression;
  if (ts.isBinaryExpression(c) && c.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return testedKind(c.left) ?? testedKind(c.right);
  }
  if (ts.isBinaryExpression(c) && c.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
    return ts.isIdentifier(c.left) ? c.left.text : null;
  }
  if (
    ts.isCallExpression(c) &&
    ts.isPropertyAccessExpression(c.expression) &&
    ts.isIdentifier(c.expression.expression) &&
    c.expression.expression.text === "MixinApi" &&
    /^is[A-Z]/.test(c.expression.name.text)
  ) {
    const a = c.arguments[0];
    return a && ts.isIdentifier(a) ? a.text : null;
  }
  return null;
}

/**
 * A READ by its name — `getX`, `isX`, `hasX`, `canX`, `describeX`, … — is
 * not an act; two arms that read different things off one target are one
 * act's input, not two acts.
 */
const READ_NAME = /^(?:get|is|has|can|describe|find|lookup|peek|to|list|count|accepts|fits)(?:[A-Z]|$)/;

/** The first world-MUTATOR called on `ident` inside `body` (`ident.m(…)`, not a read), if any. */
function firstCallOn(body: ts.Node, ident: string): string | null {
  let found: string | null = null;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ts.isIdentifier(n.expression.expression) &&
      n.expression.expression.text === ident &&
      !READ_NAME.test(n.expression.name.text)
    ) {
      found = n.expression.name.text;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(body);
  return found;
}

/** The multi-act shapes one controller module shows (deduplicated, in a fixed order). */
export function multiActShapes(sf: ts.SourceFile): MultiActShape[] {
  const models = new Set<string>(["model"]);
  const findExecute = (n: ts.Node): void => {
    if (ts.isMethodDeclaration(n) && n.name.getText(sf) === "execute") {
      const p = n.parameters[0];
      if (p && ts.isIdentifier(p.name)) models.add(p.name.text);
    }
    ts.forEachChild(n, findExecute);
  };
  findExecute(sf);

  const shapes = new Set<MultiActShape>();
  // (c): per function body, the tested identifier → the distinct methods its arms call.
  const armsByFn = new Map<ts.Node, Map<string, Set<string>>>();
  const enclosingFn = (n: ts.Node): ts.Node => {
    for (let p: ts.Node | undefined = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p;
    return sf;
  };

  const visit = (n: ts.Node): void => {
    if (ts.isSwitchStatement(n)) {
      const f = modelField(n.expression, models);
      if (f === "subcommand") shapes.add("subcommand");
      else if (f && n.caseBlock.clauses.some((c) => ts.isCaseClause(c) && isStringLit(c.expression))) {
        shapes.add("arg-word");
      }
    } else if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken
      ) {
        const pairs: Array<[ts.Expression, ts.Expression]> = [
          [n.left, n.right],
          [n.right, n.left],
        ];
        for (const [side, other] of pairs) {
          const f = modelField(side, models);
          if (f && isStringLit(other)) shapes.add(f === "subcommand" ? "subcommand" : "arg-word");
        }
      }
    } else if (ts.isIfStatement(n)) {
      const t = testedKind(n.expression);
      if (t) {
        const m = firstCallOn(n.thenStatement, t);
        if (m) {
          const fn = enclosingFn(n);
          const byIdent = armsByFn.get(fn) ?? new Map<string, Set<string>>();
          const set = byIdent.get(t) ?? new Set<string>();
          set.add(m);
          byIdent.set(t, set);
          armsByFn.set(fn, byIdent);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  for (const byIdent of armsByFn.values()) {
    for (const methods of byIdent.values()) if (methods.size >= 2) shapes.add("target-kind");
  }
  const order: MultiActShape[] = ["subcommand", "arg-word", "target-kind"];
  return order.filter((s) => shapes.has(s));
}

export function census(): string[] {
  const out: string[] = [];
  for (const c of controllerFiles()) {
    const shapes = multiActShapes(parseTs(c.file, readFileSync(c.file, "utf8")));
    if (shapes.length > 0) out.push(`${c.rel}  ${shapes.join(" · ")}`);
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-multi-act",
    `multi-act controllers among ${controllerFiles().length} controller module(s)`,
    findings.length,
    MULTI_ACT_CEILING,
    findings,
    "⭐ A controller performs one act. Climb the remedy ladder\n" +
      "  (controller-liquidity D13): one protocol on the object (rung 1), an\n" +
      "  option (2), a subcommand with its own controller (3), a disjoint\n" +
      "  shape (4) — a new word only when 1–4 have all failed, said why.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
