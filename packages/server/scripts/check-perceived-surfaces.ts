/**
 * ⭐ `lint:perceived-surfaces` — **every surface that shows a viewer a list
 * of things it never asked whether the viewer perceives** (size-and-carrying
 * W0, D23's gate).
 *
 * D23 (W3) makes perceiving the act's job, not MQL's (*MQL names, acts
 * observe*): a list that reaches a person — bound to a verb's argument,
 * prompted over, written into a scene or a card, or handed back as a
 * script value — passes through `PerceptionApi.perceived(` (or the
 * subject-bound `perceives(`) on the way. This gate counts the surfaces
 * that do not, so W3's sweep has a number to drive down and nothing new
 * can join the list while it does.
 *
 * ## ⚠ What counts, stated exactly (syntax only)
 *
 * A **unit** is a named function or method (nested arrows fold into the
 * function that holds them), or a subscribable field's `read` body (an
 * object-literal `read` with at least two parameters — `(stuff, viewer)`).
 * A unit is a **surface** when it has both:
 *
 *   (a) a **source** — `MqlApi.resolveOne(` / `MqlApi.resolveMany(` (unless
 *       its options say `commandGiver: null`: system mode emits to nobody),
 *       or `.getContents(` / `.getDeepContents(` / `.getAllOccupants(` /
 *       `.wornStack(` / `.getPlaced(`;
 *   (b) a **sink** — `promptMqlObject(` / `promptMqlMany(`,
 *       `MessageApi.scene(` / `.toSelf(`, `CardApi.open(`, `onEnvelope(`,
 *       `projectStuffInto(`; or, in the binder and the script interpreter
 *       (`CommandLogic.ts`, `lib/command/**`, `lib/script/**`), a `return`
 *       with a value — the bound argument or the script `Value` IS the
 *       result; or the unit is a subscribable `read` (the wire is its sink).
 *
 * It is **unperceived** when no `perceived(` / `perceives(` call appears in
 * the unit. ⚠ The check is the whole unit, not the stretch between (a)
 * and (b) — lenient by design, so a surface that perceives SOMETHING is not
 * counted; W3 tightens the per-list question where it ports.
 *
 * **Roots**: every controller module (`pack-roots.controllerFiles()` —
 * kernel, packs, domain-local, the bases), `lib/command/**`,
 * `platform/idea/api/CommandLogic.ts`, `lib/script/**`,
 * `platform/idea/CardRegistry.ts`, `platform/idea/MqlSubscriptionRegistry.ts`,
 * and every subscribable `read` body under the kernel's `lib/**` and every
 * pack's `src/lib/**`. Brains and logic singletons outside those roots
 * emit to nobody and are excluded by (b), never by an allowlist.
 *
 * Census, then ratchet: the ceiling is today's count; it may fall, never
 * rise (`docs/lint-family.md`).
 *
 * Usage:
 *   tsx scripts/check-perceived-surfaces.ts            # CI gate
 *   tsx scripts/check-perceived-surfaces.ts --report   # the roster
 */

import { existsSync, readFileSync } from "fs";
import { join, relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { MUD, controllerFiles, packSources, packSrcFiles, parseTs, ratchet } from "./pack-roots";

/**
 * ⭐ **The ceiling.** W0 census (2026-11-11): 32 — 14 controller units, 7 in the
 * binder (`CommandLogic`), 8 in `lib/command/**` (`CommandController`,
 * `CommandGiver`, three validators), `Expression.evaluate`, `Container`'s
 * `contents` read, `MqlSubscriptionRegistry.handleQuery`. It may fall; it
 * may never rise.
 */
export const PERCEIVED_SURFACES_CEILING = 32;

const SOURCE_METHODS = new Set(["getContents", "getDeepContents", "getAllOccupants", "wornStack", "getPlaced"]);
const SINK_CALLS = new Set(["promptMqlObject", "promptMqlMany", "onEnvelope", "projectStuffInto"]);

export interface Unit {
  name: string;
  line: number;
  node: ts.Node;
  /** A subscribable `read` body — the wire is its sink. */
  isRead: boolean;
}

function calleeName(call: ts.CallExpression): string | null {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

function calleeText(call: ts.CallExpression, sf: ts.SourceFile): string {
  return call.expression.getText(sf);
}

/** Is `n` an object-literal `read` with ≥2 parameters (a subscribable body)? */
function readBody(n: ts.Node): ts.FunctionLikeDeclaration | null {
  if (ts.isPropertyAssignment(n) && n.name.getText() === "read") {
    const f = n.initializer;
    if ((ts.isArrowFunction(f) || ts.isFunctionExpression(f)) && f.parameters.length >= 2) return f;
  }
  if (ts.isMethodDeclaration(n) && n.name.getText() === "read" && ts.isObjectLiteralExpression(n.parent)) {
    return n.parameters.length >= 2 ? n : null;
  }
  return null;
}

function holdsClass(n: ts.Node): boolean {
  let hit = false;
  const walk = (c: ts.Node): void => {
    if (hit) return;
    if (ts.isClassExpression(c) || ts.isClassDeclaration(c)) hit = true;
    else ts.forEachChild(c, walk);
  };
  ts.forEachChild(n, walk);
  return hit;
}

/**
 * The units of one module: every named function/method (outermost owner of
 * its nested arrows) and every subscribable `read` body. `readsOnly` keeps
 * only the latter (the `lib/**` root).
 */
export function unitsOf(sf: ts.SourceFile, readsOnly = false): Unit[] {
  const out: Unit[] = [];
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const walk = (n: ts.Node, inUnit: boolean): void => {
    const rb = readBody(n);
    if (rb) {
      out.push({ name: "read", line: at(n), node: rb, isRead: true });
      return;
    }
    const named =
      (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isGetAccessor(n)) && n.name && n.body;
    const arrowConst =
      ts.isVariableDeclaration(n) &&
      !inUnit &&
      n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer));
    // A mixin factory (`function FooMixin(Base) { return class … }`) is a
    // container of methods, not a unit: its methods are.
    const factory = (named || arrowConst) && holdsClass(n);
    if (!readsOnly && !inUnit && (named || arrowConst) && !factory) {
      const name = (n as ts.NamedDeclaration).name!.getText(sf);
      out.push({ name, line: at(n), node: n, isRead: false });
      ts.forEachChild(n, (c) => walk(c, true));
      return;
    }
    ts.forEachChild(n, (c) => walk(c, inUnit));
  };
  walk(sf, false);
  return out;
}

/** Classify one unit: is it a surface, and does it perceive? */
export function judgeUnit(
  u: Unit,
  sf: ts.SourceFile,
  returnIsSink: boolean,
): { surface: boolean; perceives: boolean } {
  let source = false;
  let sink = u.isRead;
  let perceives = false;
  const walk = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const name = calleeName(n);
      const text = calleeText(n, sf);
      if (text === "MqlApi.resolveOne" || text === "MqlApi.resolveMany") {
        const opts = n.arguments[1]?.getText(sf) ?? "";
        if (!/commandGiver\s*:\s*null/.test(opts)) source = true;
      } else if (name && SOURCE_METHODS.has(name) && ts.isPropertyAccessExpression(n.expression)) {
        source = true;
      }
      if (name === "perceived" || name === "perceives") perceives = true;
      if (name && SINK_CALLS.has(name)) sink = true;
      if (text === "MessageApi.scene" || text === "CardApi.open" || name === "toSelf") sink = true;
    }
    if (returnIsSink && ts.isReturnStatement(n) && n.expression) sink = true;
    ts.forEachChild(n, walk);
  };
  walk(u.node);
  return { surface: source && sink, perceives };
}

/** `{file, rel, readsOnly, returnIsSink}` for every root module. */
function roots(): Array<{ file: string; rel: string; readsOnly: boolean; returnIsSink: boolean }> {
  const repo = join(MUD, "..", "..", "..", "..");
  const out = new Map<string, { file: string; rel: string; readsOnly: boolean; returnIsSink: boolean }>();
  const add = (file: string, readsOnly: boolean, returnIsSink: boolean): void => {
    if (!file.endsWith(".ts") || file.includes("__tests__")) return;
    const prev = out.get(file);
    if (prev) {
      // A full root beats a reads-only one; a binder root keeps its return sink.
      prev.readsOnly = prev.readsOnly && readsOnly;
      prev.returnIsSink = prev.returnIsSink || returnIsSink;
      return;
    }
    out.set(file, { file, rel: relative(repo, file), readsOnly, returnIsSink });
  };
  for (const c of controllerFiles()) add(c.file, false, false);
  for (const f of packSrcFiles(join(MUD, "lib", "command"))) add(f, false, true);
  for (const f of packSrcFiles(join(MUD, "lib", "script"))) add(f, false, true);
  for (const leaf of ["api/CommandLogic.ts"]) add(join(MUD, "platform", "idea", leaf), false, true);
  for (const leaf of ["CardRegistry.ts", "MqlSubscriptionRegistry.ts"]) {
    const f = join(MUD, "platform", "idea", leaf);
    if (existsSync(f)) add(f, false, false);
  }
  for (const f of packSrcFiles(join(MUD, "lib"))) add(f, true, false);
  for (const pack of packSources()) {
    const lib = join(pack.srcDir, "lib");
    if (existsSync(lib)) for (const f of packSrcFiles(lib)) add(f, true, false);
  }
  return [...out.values()].sort((a, b) => a.rel.localeCompare(b.rel));
}

/** Every unperceived surface, as `rel:line  name`. */
export function census(): string[] {
  const findings: string[] = [];
  for (const r of roots()) {
    const text = readFileSync(r.file, "utf8");
    const sf = parseTs(r.file, text);
    for (const u of unitsOf(sf, r.readsOnly)) {
      const { surface, perceives } = judgeUnit(u, sf, r.returnIsSink);
      if (surface && !perceives) findings.push(`${r.rel}:${u.line}  ${u.name}`);
    }
  }
  return findings;
}

function main(): void {
  const findings = census();
  if (process.argv.includes("--report")) {
    for (const f of findings) console.log(f);
    console.log(`\n${findings.length} unperceived surface(s); ceiling ${PERCEIVED_SURFACES_CEILING}.`);
    return;
  }
  const ok = ratchet(
    "check-perceived-surfaces",
    "surfaces that show a viewer an unperceived list",
    findings.length,
    PERCEIVED_SURFACES_CEILING,
    findings,
    "⭐ MQL names, acts observe (D23). Pass the list through\n" +
      "  `PerceptionApi.perceived(viewer, list)` (or `perceives(viewer, x)`)\n" +
      "  before it is bound, prompted over, or written to a viewer.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
