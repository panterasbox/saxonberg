/**
 * ⭐⭐ `lint:controller-mutations` — **a controller asks the object to act;
 * it does not change the world itself.**
 *
 * The owner's brief (controllers-are-io): *"controllers simply do too
 * much."* A controller that calls `stack.setQuantity(…)`, `soil.addN(…)`,
 * `wound.setSeverity(…)` is carrying the act — the rule of what changes,
 * by how much, in which order — in the one layer no other verb, brain or
 * script can reach. The act belongs on the object (a mixin method that
 * returns an outcome), and the controller reads the outcome and words it.
 *
 * **What it counts** (the TypeScript AST), in every controller module
 * (`pack-roots.controllerFiles()`): each call `<receiver>.<name>(…)` whose
 * name is MUTATOR-shaped (`set*`, `add*`, `remove*`, `record*`, `apply*`,
 * `consume*`, … — the `MUTATOR` prefix list below, an uppercase letter
 * following) or is one of the slate's bare state writers (`soil`,
 * `recordHeat`), where the receiver is a world object — i.e. NOT:
 *
 *   - `this` / `super` (the controller's own surface);
 *   - an `*Api` class (orchestration through the gated facade is the
 *     sanctioned path — `ContainmentApi.move`, `StuffApi.destruct`);
 *   - `context` / `ctx` (the dispatch envelope: `ctx.note`);
 *   - the controller's own CLASS — a name bound to `this.constructor`
 *     (`const words = this.constructor as typeof X`, the static-words
 *     pattern a completion must use, controller-liquidity D12) or a class
 *     declared in the same module. A static word method is the
 *     controller's own surface exactly as `this.<method>` is.
 *
 * ⚠ A SHAPE census (docs/lint-family.md § Four ways a census lies, 1): a
 * mutator-named call on a local scene builder counts the same as one on a
 * Stuff. It is the candidate list the burn-down reads, not a disposition.
 *
 * ⭐ Census, then ratchet: the ceiling is this gate's own count; it may
 * fall, never rise.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { controllerFiles, parseTs, ratchet } from "./pack-roots";

export const CONTROLLER_MUTATIONS_CEILING = 317; // controller-liquidity W3: the shell writes and refusals moved onto their objects

/** Mutator-shaped method names: one of these prefixes, then an uppercase letter. */
const MUTATOR =
  /^(set|add|remove|clear|record|apply|mark|stamp|consume|deposit|withdraw|increment|decrement|reset|grant|revoke|spend|drain|deduct|credit|debit|append|insert|attach|detach|assign|unassign|register|unregister|transfer|split|merge)[A-Z]/;

/** Bare state writers the slate's census named. */
const BARE_WRITERS = new Set(["soil", "recordHeat", "setPathogenLoads"]);

/** Receivers that are not a world object. */
const NOT_WORLD = new Set(["context", "ctx"]);

/** The leftmost identifier of a receiver chain (`a.b().c` → `a`), or the keyword. */
function rootOf(e: ts.Expression): string {
  let x: ts.Expression = e;
  for (;;) {
    if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) x = x.expression;
    else if (ts.isCallExpression(x)) x = x.expression;
    else if (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x)) {
      x = x.expression;
    } else break;
  }
  if (x.kind === ts.SyntaxKind.ThisKeyword) return "this";
  if (x.kind === ts.SyntaxKind.SuperKeyword) return "super";
  return ts.isIdentifier(x) ? x.text : "<expr>";
}

/** The names that stand for the module's own controller class (`this.constructor` bindings, declared classes). */
function ownClassNames(sf: ts.SourceFile): Set<string> {
  const own = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isClassDeclaration(n) && n.name) own.add(n.name.text);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      let x: ts.Expression = n.initializer;
      while (ts.isAsExpression(x) || ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x)) x = x.expression;
      if (
        ts.isPropertyAccessExpression(x) &&
        x.name.text === "constructor" &&
        x.expression.kind === ts.SyntaxKind.ThisKeyword
      ) {
        own.add(n.name.text);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return own;
}

export function mutationsIn(sf: ts.SourceFile): Array<{ call: string; line: number }> {
  const out: Array<{ call: string; line: number }> = [];
  const own = ownClassNames(sf);
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const name = n.expression.name.text;
      if (MUTATOR.test(name) || BARE_WRITERS.has(name)) {
        const root = rootOf(n.expression.expression);
        if (root !== "this" && root !== "super" && !root.endsWith("Api") && !NOT_WORLD.has(root) && !own.has(root)) {
          out.push({
            call: `${root}….${name}(`,
            line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
          });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function census(): string[] {
  const out: string[] = [];
  for (const c of controllerFiles()) {
    for (const m of mutationsIn(parseTs(c.file, readFileSync(c.file, "utf8")))) {
      out.push(`${c.rel}:${m.line}  ${m.call}`);
    }
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-controller-mutations",
    "direct mutator calls on world objects in controllers",
    findings.length,
    CONTROLLER_MUTATIONS_CEILING,
    findings,
    "⭐ Ask the object to act (a mixin method returning an outcome) and word\n" +
      "  the outcome; never change the world from the controller.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
