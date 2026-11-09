/**
 * ⭐ `lint:controller-gates` — **a permission is decided by what it
 * protects, never by the controller.**
 *
 * A gate that lives in a controller protects one door. Every other caller
 * of the same model method — another verb, a brain, a script, a worded
 * replacement controller — walks past it. The permission belongs on the
 * method that does the read or write, taking the actor as an argument
 * (controller-liquidity D9); the controller's copy is then deleted.
 *
 * **What it counts** (every controller module, comments stripped): each
 * call of a permission predicate a controller has been found deciding with —
 *
 *   `AccessApi.can*(…)` · `CompactApi.holdsOffice(…)` · `AppApi.seatFor(…)` ·
 *   `.isAudienceMemberOf(…)` · `.isFulfilling(…)` · `.opensFor(…)` ·
 *   `.considerApplicant(…)` · `.mayMove(…)` · `.mayKeep(…)` · and the
 *   hand-rolled owner test `getOwner() !== … getPlayerId()`.
 *
 * ⚠ The view-level `requires*` validators are NOT counted: a validator is
 * the view's own precondition, declared in the grammar and run by the
 * dispatcher for every caller of that view.
 *
 * ⭐ Census, then ratchet: opened at its own count at controller-liquidity
 * W0 (2026-11-09). W3 moves the confirmed gates (plan Appendix D) onto
 * their models; it may fall, never rise.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { controllerFiles, ratchet, stripComments } from "./pack-roots";

export const CONTROLLER_GATES_CEILING = 44;

/** The permission predicates, each a pattern over comment-stripped source. */
export const GATE_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "AccessApi.can*", re: /\bAccessApi\.can\w*\s*\(/g },
  { name: "CompactApi.holdsOffice", re: /\bCompactApi\.holdsOffice\s*\(/g },
  { name: "AppApi.seatFor", re: /\bAppApi\.seatFor\s*\(/g },
  { name: "isAudienceMemberOf", re: /\.isAudienceMemberOf\s*\(/g },
  { name: "isFulfilling", re: /\.isFulfilling\s*\(/g },
  { name: "opensFor", re: /\.opensFor\s*\(/g },
  { name: "considerApplicant", re: /\.considerApplicant\s*\(/g },
  { name: "mayMove", re: /\.mayMove\s*\(/g },
  { name: "mayKeep", re: /\.mayKeep\s*\(/g },
  { name: "owner-vs-player", re: /getOwner\(\)\s*!==?[^;\n]*getPlayerId\(\)/g },
];

/** The permission calls one controller module makes, as `<line>  <predicate>`. */
export function scanControllerGates(src: string): Array<{ line: number; name: string }> {
  const code = stripComments(src);
  const out: Array<{ line: number; name: string }> = [];
  for (const { name, re } of GATE_PATTERNS) {
    for (const m of code.matchAll(re)) {
      out.push({ line: code.slice(0, m.index).split("\n").length, name });
    }
  }
  return out.sort((a, b) => a.line - b.line);
}

export function census(): string[] {
  const out: string[] = [];
  for (const c of controllerFiles()) {
    for (const f of scanControllerGates(readFileSync(c.file, "utf8"))) {
      out.push(`${c.rel}:${f.line}  ${f.name}`);
    }
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-controller-gates",
    "permissions decided in a controller",
    findings.length,
    CONTROLLER_GATES_CEILING,
    findings,
    "⭐ Move the gate onto the model method that does the read or write,\n" +
      "  taking the actor (`by`) as an argument, and delete the controller's\n" +
      "  copy — every caller then meets it, not only this verb.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
