/**
 * check-floating-promises — ⭐ **a promise thrown away with `void` takes its
 * failure with it** (failure-model D7; the floating half of the
 * silent-write census).
 *
 * Counts every `void <call>` expression statement in the kernel and every
 * pack `src/` (tests excluded) whose promise has no rejection handler: the
 * outermost call is not `.catch(…)`, not a two-argument `.then(…, onRejected)`,
 * and the callee is not `runRootGuarded` (which owns its own failure).
 *
 * ⚠ Out of scope, by construction: a promise dropped with NO `void` (an
 * un-awaited call in statement position). Seeing that needs types; this
 * gate reads syntax only, and a typed lint is a deferred seam.
 *
 *   tsx scripts/check-floating-promises.ts --lint     # CI gate
 *   tsx scripts/check-floating-promises.ts --report   # the roster
 */

import { join, relative } from "path";
import ts from "typescript";
import { MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

const REPO_ROOT = join(MUD, "../../../..");

/** Floating promises — measured 2026-11-18 (failure-model W4). */
export const FLOATING_PROMISES_CEILING = 181; // soak defects (#134): Thermal.onMoved catches its restamp. Was 182 (navigation-server, call-security-performance: +3).

/** Is this call's rejection handled? */
function handled(call: ts.CallExpression): boolean {
  const callee = call.expression;
  if (ts.isPropertyAccessExpression(callee)) {
    const name = callee.name.text;
    if (name === "catch") return true;
    if (name === "then" && call.arguments.length >= 2) return true;
    if (name === "finally" && ts.isCallExpression(callee.expression)) return handled(callee.expression);
    if (name === "runRootGuarded") return true;
  }
  if (ts.isIdentifier(callee) && callee.text === "runRootGuarded") return true;
  return false;
}

function census(): string[] {
  const rows: string[] = [];
  for (const { file } of mudSourceFiles()) {
    if (file.includes("__tests__")) continue;
    const sf = parseTs(file);
    const visit = (node: ts.Node): void => {
      if (ts.isExpressionStatement(node) && ts.isVoidExpression(node.expression)) {
        let operand: ts.Expression = node.expression.expression;
        while (ts.isParenthesizedExpression(operand)) operand = operand.expression;
        if (ts.isCallExpression(operand) && !handled(operand)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          rows.push(`${relative(REPO_ROOT, file)}:${line}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return rows;
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const rows = census();
  if (mode === "--report") {
    console.log(`${rows.length} floating promise(s)`);
    for (const r of rows) console.log(`  ${r}`);
    return;
  }
  const ok = ratchet(
    "lint:floating-promises",
    "floating promises",
    rows.length,
    FLOATING_PROMISES_CEILING,
    rows.slice(-40),
    "Await it, or give it a rejection handler (`.catch(err => CommandApi.reportFailure(err))`), " +
      "or run it under ExecutionContextApi.runRootGuarded. The ceiling may fall; it may never rise.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && /check-floating-promises\.ts$/.test(process.argv[1])) {
  main();
}
