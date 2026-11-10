/**
 * ⭐ `lint:controller-functions` — **a controller hides no module-level
 * functions.**
 *
 * A controller is input and output (controllers-are-io): it reads the
 * bound args, asks the object, and words the outcome. A free function at
 * the top of a controller module is the hidden shape the module-category
 * doctrine bans everywhere else (CLAUDE.md § Module Categories — *no free
 * helper functions*): logic that no other verb can consume, no shadow can
 * see, and no gate can find. The slate's census found the worst holding a
 * whole physical model this way (Smelt 22, Assay 12).
 *
 * **What it counts** (the TypeScript AST): in every controller module
 * (`pack-roots.controllerFiles()` — kernel, packs, domain-local, bases),
 * each top-level `function` declaration and each top-level `const`/`let`
 * bound to an arrow function or a function expression.
 *
 * ⭐ Census, then ratchet: the ceiling is this gate's own count; it may
 * fall, never rise. The fix is the object (a method on the mixin that owns
 * the act), or an Api static when the behavior belongs to no one instance.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { controllerFiles, parseTs, ratchet } from "./pack-roots";

export const CONTROLLER_FUNCTIONS_CEILING = 63; // controller-liquidity W14: −1, the hone duration is the edge's (`Keen.honeDurationMs`). // controller-liquidity W9: −54, the metal chain's module helpers became object methods. // controller-liquidity W13: −1, MaintainController's `kept` became a protected static. // controller-liquidity W11: −42 (the wood-and-fiber completions became object plans or protected statics). // controller-liquidity W12: −12 (the drilling completions, the glass helpers, the journey and fishing helpers). // controller-liquidity W10: −9 (the mill's completion, round helpers). // controller-liquidity W7: −34. // controller-liquidity W1+W3: values and refusals moved onto their objects. W8: −13, module helpers became protected statics or object methods

/** The names of the module-level functions in one controller module. */
export function moduleFunctions(sf: ts.SourceFile): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st)) {
      out.push({ name: st.name?.text ?? "<default>", line: at(st) });
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const init = d.initializer;
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          out.push({ name: d.name.getText(sf), line: at(d) });
        }
      }
    }
  }
  return out;
}

export function census(): string[] {
  const out: string[] = [];
  for (const c of controllerFiles()) {
    for (const f of moduleFunctions(parseTs(c.file, readFileSync(c.file, "utf8")))) {
      out.push(`${c.rel}:${f.line}  ${f.name}`);
    }
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-controller-functions",
    `module-level functions in ${controllerFiles().length} controller module(s)`,
    findings.length,
    CONTROLLER_FUNCTIONS_CEILING,
    findings,
    "⭐ A controller is input and output. Move the logic onto the object that\n" +
      "  owns the act (a mixin method), or an Api static when it belongs to no\n" +
      "  one instance — never a free function a controller hides.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
