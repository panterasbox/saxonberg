/**
 * ⭐⭐ `lint:carry-moves` — **moving a thing onto a body is one call:
 * `ContainmentApi.move(item, body)`.**
 *
 * ## The defect
 *
 * ```typescript
 * // BAD — choosing HOW to move by what the destination is
 * const refused = MixinApi.isCarrying(x) ? x.directMove(item) : (ContainmentApi.move(item, x), null);
 * if (MixinApi.isCarrying(x)) x.directMove(item); else ContainmentApi.move(item, x);
 * ```
 *
 * A carrier ROUTES what arrives (size and carrying W8): onto the body, into
 * a bag it carries, else set down where it stands with the line. The owner
 * retired the one way around it, `Carrying.directMove` (2026-11-15): a
 * purchase, a tip, a gift, a store's withdrawal, an untie or a reclaim that
 * the recipient cannot carry lands at their feet — honest, nothing lost.
 * Every handed site had grown the branch; each was a second movement rule
 * chosen by what the destination is.
 *
 * ## What it counts (the TypeScript AST, syntax only)
 *
 * Over every mud module (kernel `src/mud/**` and every pack's `src/**`,
 * `__tests__` excluded):
 *
 *   1. **the retired bypass** — any identifier or member named `directMove`;
 *   2. **a carrier branch that moves onto the carrier** — an `if`, a
 *      ternary or a `&&`/`||` whose condition calls `isCarrying(X)` and
 *      whose arm (the right operand, for `&&`/`||`) calls
 *      `ContainmentApi.move(…, X)` / `forceMove(…, X)` onto the SAME `X`.
 *
 * ⚠ A question is not a move: `isCarrying(x) ? x.wouldSetDown(item) : null`
 * (`get` refusing a pick-up that would only be set back down; a staged
 * body's author diagnostic) and `if (!isCarrying(x)) return …` (a body that
 * does not carry takes nothing) are not counted. A carrier-only question —
 * hands, tiers, gear noise, the wield plan — never moves onto the carrier
 * in its arm, so it is not counted either. `ContainmentLogic`'s own switch
 * hands a refused arrival to `routeArrival`, which is the routing itself.
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): both ceilings are 0 — the
 * sweep (W10i) burned the census to nothing on the day the gate was
 * written (its first run found one site the sweep had missed); the gate
 * holds the tree there.
 */

import { readFileSync } from "fs";
import { relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { CONTENT, MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

/** References to the retired bypass. */
export const DIRECT_MOVE_CEILING = 0;
/** Branches on `isCarrying(X)` whose arm moves onto `X`. */
export const CARRY_BRANCH_CEILING = 0;

export type CarryMoveKind = "direct-move" | "carry-branch";

export interface CarryMoveFinding {
  kind: CarryMoveKind;
  file: string;
  line: number;
  text: string;
}

/** `a`, `(a as T)`, `a!` → `a`'s text; anything else its full text. */
function bare(e: ts.Expression, sf: ts.SourceFile): string {
  let x: ts.Expression = e;
  while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isTypeAssertionExpression(x)) {
    x = x.expression;
  }
  return x.getText(sf);
}

/** The callee's member name (`a.b.c(…)` → `c`), or the identifier. */
function calleeName(call: ts.CallExpression): string | null {
  const c = call.expression;
  if (ts.isPropertyAccessExpression(c)) return c.name.text;
  if (ts.isIdentifier(c)) return c.text;
  return null;
}

/** Every `X` that `node` asks `isCarrying(X)` of (outside nested functions). */
function carriersAsked(node: ts.Node, sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isFunctionLike(n)) return;
    if (ts.isCallExpression(n) && calleeName(n) === "isCarrying" && n.arguments[0]) {
      out.add(bare(n.arguments[0], sf));
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

/** Does `node` call `ContainmentApi.move|forceMove(…, X)` onto one of `carriers`? */
function movesOnto(node: ts.Node, carriers: Set<string>, sf: ts.SourceFile): boolean {
  let hit = false;
  const visit = (n: ts.Node): void => {
    if (hit || ts.isFunctionLike(n)) return;
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const recv = n.expression.expression;
      const name = n.expression.name.text;
      if (ts.isIdentifier(recv) && recv.text === "ContainmentApi" && (name === "move" || name === "forceMove")) {
        const to = n.arguments[1];
        if (to !== undefined && carriers.has(bare(to, sf))) {
          hit = true;
          return;
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return hit;
}

/** Every finding in one module's source. */
export function scanCarryMoves(text: string, file: string): CarryMoveFinding[] {
  const sf = parseTs(file, text);
  const out: CarryMoveFinding[] = [];
  const lineOf = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const push = (kind: CarryMoveKind, n: ts.Node): void => {
    out.push({ kind, file, line: lineOf(n), text: n.getText(sf).split("\n")[0]!.slice(0, 120) });
  };
  const branch = (n: ts.Node, test: ts.Node, arms: Array<ts.Node | undefined>): void => {
    const carriers = carriersAsked(test, sf);
    if (carriers.size === 0) return;
    if (arms.some((a) => a !== undefined && movesOnto(a, carriers, sf))) push("carry-branch", n);
  };
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && n.text === "directMove") push("direct-move", n);
    if (ts.isIfStatement(n)) branch(n, n.expression, [n.thenStatement, n.elseStatement]);
    else if (ts.isConditionalExpression(n)) branch(n, n.condition, [n.whenTrue, n.whenFalse]);
    else if (
      ts.isBinaryExpression(n) &&
      (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        n.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      branch(n, n.left, [n.right]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** The whole corpus: kernel and every pack's `src/`. */
export function collectLiveFindings(contentDir: string = CONTENT, mudDir: string = MUD): CarryMoveFinding[] {
  const out: CarryMoveFinding[] = [];
  for (const { file } of mudSourceFiles(contentDir, mudDir)) {
    const rel = relative(resolve(mudDir, "..", "..", ".."), file);
    out.push(...scanCarryMoves(readFileSync(file, "utf8"), rel));
  }
  return out;
}

function main(): void {
  const all = collectLiveFindings();
  const fmt = (f: CarryMoveFinding): string => `${f.file}:${f.line}  ${f.text}`;
  const direct = all.filter((f) => f.kind === "direct-move");
  const branches = all.filter((f) => f.kind === "carry-branch");
  const okDirect = ratchet(
    "check-carry-moves",
    "directMove references",
    direct.length,
    DIRECT_MOVE_CEILING,
    direct.map(fmt),
    "`Carrying.directMove` is retired (owner, 2026-11-15). Move a thing onto a body with\n" +
      "`ContainmentApi.move(item, body)`: the carrier routes it — onto the body, into a bag,\n" +
      "or set down at its feet with the line.",
  );
  const okBranch = ratchet(
    "check-carry-moves",
    "isCarrying branches that move onto the carrier",
    branches.length,
    CARRY_BRANCH_CEILING,
    branches.map(fmt),
    "Do not choose how to move a thing by whether the destination carries. Call\n" +
      "`ContainmentApi.move(item, body)` for every body; a body that does not carry\n" +
      "(a fish) is refused by asking `isCarrying` alone, with no move in the arm.",
  );
  if (!okDirect || !okBranch) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
