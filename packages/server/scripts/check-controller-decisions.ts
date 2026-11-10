/**
 * ⭐⭐ `lint:controller-decisions` — **the rules of an act live with the
 * act, not in its controller.**
 *
 * The slate's census (controllers-are-io, links 6–7) found controllers
 * holding whole physical models — Smelt's 17 kinetics constants, Mow's hay
 * chemistry, Fell's 27 decision tokens — and **52 duration constants**
 * (`SWEEP_MS`, `BATHE_MS`) deciding how long an act takes from the one
 * layer nothing else can consume. D5: *durations and effort move with the
 * act*. This gate counts what is left to move.
 *
 * **What it counts** (the TypeScript AST), in every controller module
 * (`pack-roots.controllerFiles()`), one token each:
 *
 *   - a `Math.<fn>(…)` call;
 *   - an arithmetic binary expression (`*`, `/`, `%`, `**`, binary `-`;
 *     `+` is excluded because it is mostly string building);
 *   - a threshold — a comparison (`<`, `>`, `<=`, `>=`) with a numeric
 *     literal operand;
 *   - a numeric constant declaration — an UPPER_SNAKE `const` whose
 *     initializer holds a numeric literal (a table counts once);
 *   - an act-shape literal — a `durationMs:` / `durationS:` / `effortW:`
 *     property whose value holds a numeric literal.
 *
 * ⭐ **The duration/effort sub-count** is the last two kinds where the
 * name is a duration (`*_MS`, `*_S`, `*_SECONDS`, `*_MINUTES`, `*_HOURS`)
 * or effort (`*_W`, `EFFORT*`), or the property is an act-shape literal —
 * D5's own population, which W5 drives down; it has its own ceiling.
 *
 * ⚠ A SHAPE census: `Math.floor` on a display count is a token the same
 * as `Math.exp` in a kinetics law. It is the burn-down's candidate list.
 *
 * ⭐ Census, then ratchet: both ceilings are this gate's own count; they
 * may fall, never rise.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { controllerFiles, parseTs, ratchet } from "./pack-roots";

export const CONTROLLER_DECISIONS_CEILING = 1070; // controller-liquidity W7: −60, the multi-act splits and protocols. // controller-liquidity W1+W3: values, durations and refusals moved onto their objects. W6: −3, the cutting answers stopped carrying a verb tag to narrow on, and `fell` stopped cross-cutting. W8: −37, the kernel objects answer their verbs (water, body, fire, hitch, put, read, name, look observes once)
export const DURATION_DECLS_CEILING = 83; // controller-liquidity W7: −16, the paces moved onto the protocols. // W5: harvest, plant, the bath, the pour. W8: −1

export type DecisionKind = "math" | "arithmetic" | "threshold" | "constant" | "act-literal";

export interface Decision {
  kind: DecisionKind;
  /** A duration or effort declaration (the D5 sub-count). */
  duration: boolean;
  line: number;
  text: string;
}

const ARITH = new Set([
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.MinusToken,
]);
const COMPARE = new Set([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
]);
const UPPER_SNAKE = /^[A-Z][A-Z0-9_]*$/;
const DURATION_NAME = /(_MS|_S|_SECONDS|_MINUTES|_HOURS|_W)$|^EFFORT/;
const ACT_PROPS = new Set(["durationMs", "durationS", "effortW"]);

function isNumeric(e: ts.Expression): boolean {
  let x: ts.Expression = e;
  while (ts.isPrefixUnaryExpression(x) || ts.isParenthesizedExpression(x)) {
    x = ts.isParenthesizedExpression(x) ? x.expression : x.operand;
  }
  return ts.isNumericLiteral(x);
}

function holdsNumber(n: ts.Node): boolean {
  if (ts.isNumericLiteral(n)) return true;
  return ts.forEachChild(n, holdsNumber) ?? false;
}

export function decisionsIn(sf: ts.SourceFile): Decision[] {
  const out: Decision[] = [];
  const add = (kind: DecisionKind, n: ts.Node, duration = false): void => {
    out.push({
      kind,
      duration,
      line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
      text: n.getText(sf).replace(/\s+/g, " ").slice(0, 72),
    });
  };
  const visit = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ts.isIdentifier(n.expression.expression) &&
      n.expression.expression.text === "Math"
    ) {
      add("math", n);
    } else if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (ARITH.has(op)) add("arithmetic", n);
      else if (COMPARE.has(op) && (isNumeric(n.left) || isNumeric(n.right))) add("threshold", n);
    } else if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      UPPER_SNAKE.test(n.name.text) &&
      n.initializer &&
      holdsNumber(n.initializer) &&
      ts.isVariableDeclarationList(n.parent) &&
      (n.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      add("constant", n, DURATION_NAME.test(n.name.text));
    } else if (
      ts.isPropertyAssignment(n) &&
      ts.isIdentifier(n.name) &&
      ACT_PROPS.has(n.name.text) &&
      holdsNumber(n.initializer)
    ) {
      add("act-literal", n, true);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function census(): { all: string[]; durations: string[] } {
  const all: string[] = [];
  const durations: string[] = [];
  for (const c of controllerFiles()) {
    for (const d of decisionsIn(parseTs(c.file, readFileSync(c.file, "utf8")))) {
      const row = `${c.rel}:${d.line}  ${d.kind}  ${d.text}`;
      all.push(row);
      if (d.duration) durations.push(row);
    }
  }
  return { all, durations };
}

function main(): void {
  const { all, durations } = census();
  const ok1 = ratchet(
    "check-controller-decisions",
    "decision tokens in controllers",
    all.length,
    CONTROLLER_DECISIONS_CEILING,
    all,
    "⭐ The rule of an act — its arithmetic, thresholds and constants — lives on\n" +
      "  the object that does the act; the controller reads the outcome.",
  );
  const ok2 = ratchet(
    "check-controller-decisions",
    "duration/effort declarations in controllers",
    durations.length,
    DURATION_DECLS_CEILING,
    durations,
    "⭐ D5: how long an act takes and how hard it is are the act's — the\n" +
      "  object's plan carries them (`ActPlan`), never a controller constant.",
  );
  if (!ok1 || !ok2) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
