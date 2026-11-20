/**
 * ⭐ `lint:actor-claims` — **a method that decides on who is acting checks
 * that it was told the truth.**
 *
 * A protective method takes "who is doing this" as a parameter (`by`,
 * `actor`, `reader`, `issuer`) and hands it to a permission predicate.
 * Before the call-security pass nothing checked the parameter: any code
 * could name anybody, and the predicate answered for the person named. The
 * fix is one call, first in the body — `AccessApi.requireActor(by)` — which
 * refuses a claim that is not the engine's answer to *who is acting*
 * (call-security pass D4).
 *
 * **What it counts** (every non-controller, non-brain, non-test source file
 * in the kernel and in every pack's `src/`, read as a syntax tree): a
 * function is
 * **deciding** for parameter `p` when it passes `p` as the ACTOR (the
 * first argument drawn from a parameter) to a permission predicate — {@link ACTOR_PREDICATES}, which is `lint:controller-gates`'
 * vocabulary widened with the predicates the pass's survey found — or to a
 * same-file function that is itself deciding, unchecked, at that position.
 * It is **exempt** when it is itself a predicate: its name is in the
 * vocabulary or is predicate-shaped (`can…`/`may…`), or it declares a `boolean` / `Promise<boolean>` return (a
 * yes/no read asked about a third party is a read; the lie buys only an
 * answer). It is **checked** when its body calls
 * `AccessApi.requireActor(p)`. The count of deciding, non-exempt, unchecked
 * (function, parameter) pairs is the published number.
 *
 * ⭐ Census, then ratchet: opened at its own count at call-security pass W0
 * (2026-11-18); W1–W3 drive it down; W5 flips it to zero.
 *
 * ⚠ **Limit, by construction.** A method that decides by a hand-rolled
 * comparison no predicate names (`ChannelCatalogue.governRefusal`'s owner
 * test) is invisible here; the remedy is to NAME the predicate. The pass's
 * roster table is cross-checked by hand at W5 for exactly this reason.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { controllerFiles, mudSourceFiles, parseTs, ratchet } from "./pack-roots";
import { GATE_PATTERNS } from "./check-controller-gates";

export const ACTOR_CLAIMS_CEILING = 0; // call-security pass: opened at 49 (W0), driven to 0 by W1–W3, held

/**
 * The permission predicates, by method name: the controller-gates
 * vocabulary's bare names plus the pass's survey. `AccessApi.can*` is
 * matched qualified ({@link isPredicateCall}); every other `can…` method
 * (`canTraverse`, `canPlace`) is physics, not permission.
 */
export const ACTOR_PREDICATES: ReadonlySet<string> = new Set([
  // lint:controller-gates' vocabulary, by method name (the one list)
  ...GATE_PATTERNS.map((g) => g.name)
    .filter((n) => /^[\w.]+$/.test(n))
    .map((n) => n.slice(n.lastIndexOf(".") + 1)),
  // the call-security pass's survey
  "canBeNamedBy", "mayLetFor", "keptBy", "mayDisposeOf", "canUnhitch",
  "mayTakeDown", "mayDrive", "ownsGroup", "isAdHocMember", "isAudienceMember",
  "ceilingFor", "isOnShiftFor", "hasProprietor", "canOpen",
]);

/** `AccessApi.can…(…)`, or a call of a vocabulary method by any receiver. */
function isPredicateCall(call: ts.CallExpression): boolean {
  const callee = call.expression;
  if (ts.isPropertyAccessExpression(callee)) {
    const name = callee.name.text;
    if (ACTOR_PREDICATES.has(name)) return true;
    return ts.isIdentifier(callee.expression) && callee.expression.text === "AccessApi" && /^can/.test(name);
  }
  return ts.isIdentifier(callee) && ACTOR_PREDICATES.has(callee.text);
}

/** The predicates asked OF the person: the receiver is the actor. */
const RECEIVER_IS_ACTOR: ReadonlySet<string> = new Set(["isFulfilling", "isOnShiftFor"]);

/** `p.pred(…)` → `p`, when `p` is one of the function's parameters. */
function receiverParam(call: ts.CallExpression, params: ReadonlySet<string>): string | null {
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee) || !ts.isIdentifier(callee.expression)) return null;
  return params.has(callee.expression.text) ? callee.expression.text : null;
}

/**
 * A predicate-shaped NAME: `can…`/`may…` (the vocabulary's own convention).
 * Such a method answers a question (`canTraverse(mover)` returns a guard);
 * the act that consults it is what checks.
 */
const PREDICATE_NAME = /^(can|may)[A-Z]/;

/** The parameter an expression is rooted in: `by`, `by.x`, `by.f()`, `by as T`. */
function rootParam(e: ts.Expression, params: ReadonlySet<string>): string | null {
  let x: ts.Expression = e;
  for (;;) {
    if (ts.isIdentifier(x)) return params.has(x.text) ? x.text : null;
    if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) x = x.expression;
    else if (ts.isCallExpression(x)) x = x.expression;
    else if (ts.isAsExpression(x) || ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x)) x = x.expression;
    else return null;
  }
}

/** `this`, `this.x`, `this as T` — the asking object itself. */
function isThisRooted(e: ts.Expression): boolean {
  let x: ts.Expression = e;
  for (;;) {
    if (x.kind === ts.SyntaxKind.ThisKeyword) return true;
    if (ts.isPropertyAccessExpression(x) || ts.isAsExpression(x) || ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x)) x = x.expression;
    else return false;
  }
}

/**
 * The actor argument: the first, when it is rooted in a parameter
 * (`AccessApi.can(subject, …)`, `canBeNamedBy(by.getIdentityPath(), by)`);
 * past a leading `this` (`cart.canUnhitch(this, by)`), the next
 * parameter-rooted one. A first argument read from the engine (an acting
 * author, a local) means the predicate asks about nobody this function was
 * handed.
 */
function firstParamRooted(call: ts.CallExpression, params: ReadonlySet<string>): string | null {
  const [first, ...rest] = call.arguments;
  if (!first) return null;
  if (!isThisRooted(first)) return rootParam(first, params);
  for (const a of rest) {
    const p = rootParam(a, params);
    if (p) return p;
  }
  return null;
}

/** `AccessApi.requireActor(p)` → `p`. */
function requiredActor(call: ts.CallExpression): string | null {
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "requireActor") return null;
  if (!ts.isIdentifier(callee.expression) || callee.expression.text !== "AccessApi") return null;
  let a: ts.Expression | undefined = call.arguments[0];
  // `requireActor(reader ?? null)`, `requireActor(c.actor as Stuff)` — the
  // parameter the checked actor is drawn from.
  for (;;) {
    if (!a) return null;
    if (ts.isBinaryExpression(a) && a.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) a = a.left;
    else if (ts.isAsExpression(a) || ts.isParenthesizedExpression(a) || ts.isNonNullExpression(a) || ts.isPropertyAccessExpression(a)) a = a.expression;
    else break;
  }
  return ts.isIdentifier(a) ? a.text : null;
}

/** The name a same-file call is addressed to: `f(…)`, `this.f(…)`, `X.f(…)`. */
function localCallee(call: ts.CallExpression): string | null {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return null;
}

interface Fn {
  name: string;
  line: number;
  params: string[];
  exempt: boolean;
  deciding: Set<string>;
  checked: Set<string>;
  /** Same-file calls: callee name → [argument param name | null] per position. */
  calls: Array<{ callee: string; args: Array<string | null> }>;
}

function returnsBoolean(node: ts.SignatureDeclaration): boolean {
  const t = node.type;
  if (!t) return false;
  const text = t.getText().replace(/\s+/g, "");
  return text === "boolean" || text === "Promise<boolean>";
}

function scanFile(file: string, src: string): Fn[] {
  const sf = parseTs(file, src);
  const fns: Fn[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.body && node.name) {
      const name = node.name.getText(sf);
      const params = node.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : ""));
      const fn: Fn = {
        name,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        params,
        exempt: ACTOR_PREDICATES.has(name) || PREDICATE_NAME.test(name) || returnsBoolean(node),
        deciding: new Set(),
        checked: new Set(),
        calls: [],
      };
      const paramSet = new Set(params.filter(Boolean));
      const inner = (n: ts.Node): void => {
        // A nested function is its own scope for parameters, but a closure
        // over this one's parameters still decides for them.
        if (ts.isCallExpression(n)) {
          const req = requiredActor(n);
          if (req && paramSet.has(req)) fn.checked.add(req);
          const args = n.arguments.map((a) => (ts.isIdentifier(a) && paramSet.has(a.text) ? a.text : null));
          if (isPredicateCall(n)) {
            // The ACTOR is the predicate's first argument drawn from one of
            // this function's parameters (`AccessApi.can(subject, …)`,
            // `cart.canUnhitch(this, by)`, `canBeNamedBy(by.getIdentityPath(),
            // by)`) — or, for the few asked OF the person
            // (`who.isOnShiftFor(house)`), its receiver. The rest are what
            // is asked about.
            const actor = RECEIVER_IS_ACTOR.has(localCallee(n) ?? "")
              ? receiverParam(n, paramSet)
              : firstParamRooted(n, paramSet);
            if (actor) fn.deciding.add(actor);
          } else {
            const callee = localCallee(n);
            if (callee && args.some(Boolean)) fn.calls.push({ callee, args });
          }
        }
        ts.forEachChild(n, inner);
      };
      ts.forEachChild(node.body, inner);
      fns.push(fn);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  // Same-file propagation, to a fixpoint: passing `p` to a local function
  // that decides, unchecked, at that position decides for `p` too.
  const byName = new Map<string, Fn[]>();
  for (const f of fns) byName.set(f.name, [...(byName.get(f.name) ?? []), f]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const f of fns) {
      for (const c of f.calls) {
        for (const g of byName.get(c.callee) ?? []) {
          if (g === f) continue;
          c.args.forEach((a, i) => {
            const gp = g.params[i];
            if (!a || !gp) return;
            const gDecidesUnchecked = g.deciding.has(gp) && !g.checked.has(gp) && !g.exempt;
            if (gDecidesUnchecked && !f.deciding.has(a)) {
              f.deciding.add(a);
              changed = true;
            }
          });
        }
      }
    }
  }
  return fns;
}

export interface ActorClaimsCensus {
  /** Deciding, non-exempt, unchecked — the published number. */
  unchecked: string[];
  /** Deciding and checked. */
  checked: string[];
}

export function census(): ActorClaimsCensus {
  const controllers = new Set(controllerFiles().map((c) => c.file));
  const repo = resolve(import.meta.dirname, "..", "..", "..");
  const unchecked: string[] = [];
  const checked: string[] = [];
  for (const { file } of mudSourceFiles()) {
    // A BRAIN (`…/behavior/<verb>.ts`) is not counted: its `host` comes from
    // the framework's BrainContext and the brain runs AS that NPC (D10's
    // `runAsSelf`) — never a caller's claim. Its predicates are reads about
    // others (the doorman judging a mover).
    if (controllers.has(file) || /__tests__|\.test\.ts$|\/behavior\/[a-z][\w-]*\.ts$/.test(file)) continue;
    const rel = file.startsWith(repo) ? file.slice(repo.length + 1) : file;
    for (const fn of scanFile(file, readFileSync(file, "utf8"))) {
      if (fn.exempt) continue;
      for (const p of fn.deciding) {
        const at = `${rel}:${fn.line}  ${fn.name}(${p})`;
        (fn.checked.has(p) ? checked : unchecked).push(at);
      }
    }
  }
  return { unchecked: unchecked.sort(), checked: checked.sort() };
}

function main(): void {
  const { unchecked, checked } = census();
  if (process.argv.includes("--list")) {
    for (const f of unchecked) console.log(`✗ ${f}`);
    for (const f of checked) console.log(`✓ ${f}`);
  }
  const ok = ratchet(
    "check-actor-claims",
    "protective methods that do not check their actor",
    unchecked.length,
    ACTOR_CLAIMS_CEILING,
    unchecked,
    "⭐ Make `AccessApi.requireActor(<the actor param>)` the method's first\n" +
      "  statement — it refuses a claim that is not who is acting, out loud,\n" +
      "  and tells the code's keeper. A yes/no read about a third party is\n" +
      "  exempt when it declares `boolean`.",
  );
  if (ok) console.log(`check-actor-claims: ${checked.length} protective method(s) check their actor.`);
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
