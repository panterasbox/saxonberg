/**
 * check-completion-this — ⭐⭐ **an engaged step's completion must not call
 * back into its controller.**
 *
 * A controller is one ephemeral clone per execution, and the dispatcher
 * destructs it in a `finally` the moment `execute` returns
 * (`CommandGiver._executeOne`) — while the engagement it started is still
 * pending. A completion that calls `this.<method>` then runs on a destroyed
 * Stuff, and the proxy answers with a **silent no-op**: the step plays its
 * scene and nothing happens.
 *
 * The lesson had been learned three times and written down each time — the
 * mining acts, the smelt, `WorkedActController`'s own header — and the
 * cleanliness drive found it a fourth: over the wire, `wear` had never put
 * anything on (`EquipController`'s completion called `this.put`), and the
 * nutrition-fitness drive had been tolerating the symptom as a finding.
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): every `onComplete:` closure
 * in a controller (kernel and every pack `src/`), comments stripped, that
 * mentions `this.`. The ceiling is today's count; it may fall, never rise.
 * The fix is always the same — resolve what the completion needs BEFORE
 * engaging, or call a module function / a `static`.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { controllerFiles } from "./pack-roots";

/**
 * Pinned at the census (2026-10-17, the cleanliness build): the shipped
 * sites the drive did not reach — equip's several-thing chain, a tap, the
 * ditch, grub, lime, flatten, crack, mow, plough.
 *
 * ⭐ Burned to ZERO by the cover build (2026-10-28): its drive needs
 * `plough` and `grub` to land, and the last seven were the same
 * mechanical fix (a `static` finish).
 */
export const COMPLETION_THIS_CEILING = 0;

export interface CompletionThisFinding {
  file: string;
  line: number;
}

/** The completion-time keys: an act's `onComplete`, a plan's `onRefused`/`onDone`. */
const COMPLETION_KEYS = new Set(["onComplete", "onRefused", "onDone"]);

/** Does `node`'s subtree mention `this` (outside a nested `function`, which rebinds it)? */
function mentionsThis(node: ts.Node): boolean {
  let hit = false;
  const visit = (n: ts.Node): void => {
    if (hit) return;
    if (n.kind === ts.SyntaxKind.ThisKeyword) {
      hit = true;
      return;
    }
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isClassLike(n)) return;
    ts.forEachChild(n, visit);
  };
  visit(node);
  return hit;
}

/** The function a completion's value names, when the file can say. */
function isFn(n: ts.Node | undefined): n is ts.ArrowFunction | ts.FunctionExpression {
  return !!n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n));
}

/**
 * ⭐⭐ The completion-time closures that mention `this` — every FORM
 * (controller-liquidity D12). The inline `onComplete: () => { … }` was the
 * only form the gate saw until 2026-11-09, and three live completions
 * called a destroyed controller through the forms it did not:
 *
 *   - `onComplete: () => …` / `onComplete() { … }` — the inline closure or
 *     method, block or expression body;
 *   - `onComplete: <ident>` and the shorthand `onComplete,` — resolved to
 *     the `const <ident> = (…) => …` (or `function`) in the same file
 *     (`SearchController`, `TeleportController`);
 *   - an `<ident>` that is a PARAMETER of the enclosing method — resolved to
 *     the arrow every caller in the file passes at that position
 *     (`TransfuseController.runOrEngage(…, () => { … })`);
 *   - `onComplete: this.<method>` — a bound reference is `this` by itself.
 *
 * Comments never count (the AST has none in its code nodes).
 */
export function scanCompletionThis(src: string, file: string): CompletionThisFinding[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const lineOf = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  // Every named function value in the file: `const x = () => …`, `function x`.
  const named = new Map<string, ts.Node[]>();
  const remember = (name: string, fn: ts.Node): void => {
    named.set(name, [...(named.get(name) ?? []), fn]);
  };
  // Every call in the file, by the called member's name (`this.m(…)`, `X.m(…)`, `m(…)`).
  const calls = new Map<string, ts.CallExpression[]>();
  const walk = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && isFn(n.initializer)) {
      remember(n.name.text, n.initializer);
    } else if (ts.isFunctionDeclaration(n) && n.name && n.body) {
      remember(n.name.text, n);
    } else if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : ts.isIdentifier(callee)
          ? callee.text
          : null;
      if (name) calls.set(name, [...(calls.get(name) ?? []), n]);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);

  /** The function bodies an identifier at `site` can stand for. */
  const resolveIdent = (ident: string, site: ts.Node): ts.Node[] => {
    // A parameter of the enclosing function → every arrow passed there.
    for (let p: ts.Node | undefined = site.parent; p; p = p.parent) {
      if (ts.isFunctionLike(p)) {
        const idx = p.parameters.findIndex((q) => ts.isIdentifier(q.name) && q.name.text === ident);
        if (idx >= 0) {
          const fnName =
            p.name && (ts.isIdentifier(p.name) || ts.isPrivateIdentifier(p.name)) ? p.name.text : null;
          if (!fnName) return [];
          return (calls.get(fnName) ?? [])
            .map((c) => c.arguments[idx])
            .filter((a): a is ts.Expression => isFn(a));
        }
      }
    }
    return named.get(ident) ?? [];
  };

  const out: CompletionThisFinding[] = [];
  const flag = (n: ts.Node): void => {
    out.push({ file, line: lineOf(n) });
  };
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAssignment(n) && COMPLETION_KEYS.has(n.name.getText(sf))) {
      const v = n.initializer;
      if (isFn(v)) {
        if (mentionsThis(v.body)) flag(n);
      } else if (ts.isIdentifier(v)) {
        if (resolveIdent(v.text, n).some((fn) => mentionsThis(fn))) flag(n);
      } else if (mentionsThis(v)) {
        // `this.finish`, `this.finish.bind(this)`, `() => …` wrapped in a call.
        flag(n);
      }
    } else if (ts.isShorthandPropertyAssignment(n) && COMPLETION_KEYS.has(n.name.text)) {
      if (resolveIdent(n.name.text, n).some((fn) => mentionsThis(fn))) flag(n);
    } else if (ts.isMethodDeclaration(n) && COMPLETION_KEYS.has(n.name.getText(sf)) && ts.isObjectLiteralExpression(n.parent)) {
      if (n.body && mentionsThis(n.body)) flag(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/**
 * Every controller module — `pack-roots.controllerFiles()`, the enumerator
 * the controller gates share (controllers-are-io W0): the kernel's
 * `platform/idea/cmd/**` and `lib/**` bases, every pack's `src/**\/idea/cmd/**`
 * (the domain-local ones included) and `src/lib/**` bases.
 */
export function collectLiveFindings(): CompletionThisFinding[] {
  const out: CompletionThisFinding[] = [];
  for (const c of controllerFiles()) {
    out.push(...scanCompletionThis(readFileSync(c.file, "utf8"), c.rel));
  }
  return out;
}

function main(): void {
  const findings = collectLiveFindings();
  const n = findings.length;
  if (n > COMPLETION_THIS_CEILING) {
    console.error(
      `check-completion-this: ${n} completion(s) call back into their controller — ` +
        `the ceiling is ${COMPLETION_THIS_CEILING}.\n`,
    );
    for (const f of findings) console.error(`  ${f.file}:${f.line}`);
    console.error(
      `\nThe dispatcher destructs the controller when \`execute\` returns; a\n` +
        `completion calling \`this.<method>\` runs on a dead proxy and does\n` +
        `NOTHING, silently. Resolve what it needs before engaging, or call a\n` +
        `module function or a \`static\`.`,
    );
    process.exit(1);
  }
  if (n < COMPLETION_THIS_CEILING) {
    console.error(
      `check-completion-this: the count has FALLEN to ${n} and the ceiling is ` +
        `still ${COMPLETION_THIS_CEILING}. Lower it — a ratchet that is not ` +
        `re-pinned stops ratcheting.`,
    );
    process.exit(1);
  }
  console.log(`check-completion-this: ${n} / ceiling ${COMPLETION_THIS_CEILING} ✔`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
