/**
 * check-act-nulls — ⭐ **`null` where a reason belonged** (failure-model D7).
 *
 * An act's answer may be `null` only when it means *nothing to say about
 * this act* (`ActPlan.ts`): the controller asks the next candidate. A `null`
 * that means *refused* hides the reason from every reader. This gate counts
 * every `return null` inside:
 *  (a) a function whose declared return type names `null` AND a type whose
 *      name ends `Refusal`, `Plan`, `Answer`, `Outcome` or `Choices`; or
 *  (b) a method named `resolve<Something>` outside `api/mql/**` whose
 *      declared return type names `null`;
 * unless the function's TSDoc carries `@nothing <why>` — the null is an
 * absence, and says so.
 *
 * Syntactic, so it has false positives; the ceiling absorbs them and
 * `@nothing` clears a real absence.
 *
 *   tsx scripts/check-act-nulls.ts --lint     # CI gate
 *   tsx scripts/check-act-nulls.ts --report   # the roster
 */

import { join, relative, sep } from "path";
import ts from "typescript";
import { MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

const REPO_ROOT = join(MUD, "../../../..");

/** Act nulls — measured 2026-11-18 (failure-model W4). */
export const ACT_NULLS_CEILING = 171;

const ACT_TYPE = /\b\w*(Refusal|Plan|Answer|Outcome|Choices)\b/;

type Fn = ts.FunctionDeclaration | ts.MethodDeclaration | ts.FunctionExpression | ts.ArrowFunction;

function isFn(node: ts.Node): node is Fn {
  return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node);
}

/** Is this function one whose `return null` is counted? */
function inScope(fn: Fn, sf: ts.SourceFile, inMql: boolean): boolean {
  const type = fn.type?.getText(sf) ?? "";
  if (!/\bnull\b/.test(type)) return false;
  if (ACT_TYPE.test(type)) return true;
  const name = fn.name && ts.isIdentifier(fn.name) ? fn.name.text : "";
  return !inMql && ts.isMethodDeclaration(fn) && /^resolve[A-Z]/.test(name);
}

/** Does the function's TSDoc say the null is an absence? */
function saysNothing(fn: Fn, sf: ts.SourceFile): boolean {
  const target = ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) ? fn.parent : fn;
  const ranges = ts.getLeadingCommentRanges(sf.getFullText(), target.getFullStart()) ?? [];
  return ranges.some((r) => /@nothing\b/.test(sf.getFullText().slice(r.pos, r.end)));
}

function census(): string[] {
  const rows: string[] = [];
  for (const { file } of mudSourceFiles()) {
    if (file.includes("__tests__")) continue;
    const inMql = file.includes(`${sep}api${sep}mql${sep}`);
    const sf = parseTs(file);
    const visit = (node: ts.Node, owner: Fn | null): void => {
      const here = isFn(node) ? node : owner;
      if (
        ts.isReturnStatement(node) &&
        node.expression?.kind === ts.SyntaxKind.NullKeyword &&
        here !== null &&
        inScope(here, sf, inMql) &&
        !saysNothing(here, sf)
      ) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        rows.push(`${relative(REPO_ROOT, file)}:${line}`);
      }
      ts.forEachChild(node, (child) => visit(child, here));
    };
    visit(sf, null);
  }
  return rows;
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const rows = census();
  if (mode === "--report") {
    console.log(`${rows.length} act null(s)`);
    for (const r of rows) console.log(`  ${r}`);
    return;
  }
  const ok = ratchet(
    "lint:act-nulls",
    "act nulls",
    rows.length,
    ACT_NULLS_CEILING,
    rows.slice(-40),
    "Answer a refusal with its reason ({ ok: false, reason, facts } — the row words it), " +
      "or, when the null is an absence (nothing to say about this act), mark the function `@nothing <why>`.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && /check-act-nulls\.ts$/.test(process.argv[1])) {
  main();
}
