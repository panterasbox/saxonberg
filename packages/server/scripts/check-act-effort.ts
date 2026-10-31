/**
 * check-act-effort — ⭐ **an act no body can ever do.**
 *
 * An engaged act is charged its whole effort UP FRONT
 * (`ExertingMixin.canExert(effortW, durationS)`): only the excess over the
 * aerobic threshold costs, `(effortW − sustainable) × durationS / J-per-%`,
 * and the act is refused if that would take endurance below the
 * exhaustion floor. So an act whose excess over its WHOLE duration is
 * more than a fresh body's spendable endurance is refused "too tired" for
 * every body, however rested — and nothing says so until somebody plays
 * it. The ceramics drive found two: the brick table at 330 W for eight
 * hours (~576 % of a reserve) and the temper pit at 450 W for twenty
 * minutes (~120 %). Forty-odd controller tests had stayed green.
 *
 * ## What it reads
 *
 * Every object literal in the kernel and the capability packs that names
 * both `effortW` and `durationMs` — the engaged-step shape. Each is
 * evaluated with the TypeScript compiler, statically: numeric literals,
 * `const`s in scope (module or function), arithmetic, `a ? b : c` (the
 * larger branch — the worst case is the one a body must survive), and
 * `dial(key, N)` / `ceramicsDial(key, N)`-style calls by their DEFAULT,
 * which is what a fresh world runs, and a paced step (`this.paceMs(BASE,
 * …)`, `this.paceForGround(BASE, …)`) by its base — the ordinary tool and
 * the reference rock.
 *
 * A site it cannot resolve (`effortW: plan.effortW`, a figure computed
 * from the load) is listed as unchecked and does NOT fail: the gate
 * refuses what it can prove, and says plainly what it cannot see.
 *
 * ## The body
 *
 * A fresh, untrained body: the sustainable rate at its base with no wind,
 * a full endurance reserve (100 %), and the floor below which nothing
 * starts. The three figures are READ from `Exerting.ts`'s dial defaults,
 * so a change there moves the gate rather than silently disagreeing.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import ts from "typescript";
import { MUD, packSources } from "./pack-roots";

const EXERTING = join(MUD, "lib", "exertion", "Exerting.ts");

/** A dial default out of `Exerting.ts`, or a loud failure. */
function exertingDefault(key: string): number {
  const src = readFileSync(EXERTING, "utf8");
  const m = new RegExp(`AppSettingKeys\\.${key},\\s*([0-9_.]+)\\)`).exec(src);
  if (!m) {
    console.error(`check-act-effort: cannot read the ${key} default from ${EXERTING}`);
    process.exit(1);
  }
  return Number(m[1]!.replace(/_/g, ""));
}

const SUSTAINABLE_W = exertingDefault("exertionBaseSustainableW");
const J_PER_PCT = exertingDefault("exertionJoulesPerEndurancePct");
const FLOOR_PCT = exertingDefault("exertionExhaustionFloorPct");
const SPENDABLE_PCT = 100 - FLOOR_PCT;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) out.push(p);
  }
}

/** The `const` initializers visible from `node`, nearest scope first. */
function constIn(node: ts.Node, name: string): ts.Expression | null {
  for (let at: ts.Node | undefined = node; at; at = at.parent) {
    let found: ts.Expression | null = null;
    const visit = (n: ts.Node): void => {
      if (found) return;
      if (
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === name &&
        n.initializer &&
        ts.isVariableDeclarationList(n.parent) &&
        (n.parent.flags & ts.NodeFlags.Const) !== 0
      ) {
        found = n.initializer;
        return;
      }
      // Only this scope's own statements — never descend into a nested
      // function, whose consts are not in scope here.
      if (n !== at && (ts.isFunctionLike(n) || ts.isClassLike(n))) return;
      ts.forEachChild(n, visit);
    };
    if (ts.isBlock(at) || ts.isSourceFile(at) || ts.isFunctionLike(at)) {
      ts.forEachChild(at, visit);
      if (found) return found;
    }
  }
  return null;
}

/** Evaluate statically, or `null` when it cannot be known here. */
function evaluate(e: ts.Expression, depth = 0): number | null {
  if (depth > 12) return null;
  if (ts.isParenthesizedExpression(e)) return evaluate(e.expression, depth + 1);
  if (ts.isNumericLiteral(e)) return Number(e.text.replace(/_/g, ""));
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken) {
    const v = evaluate(e.operand, depth + 1);
    return v === null ? null : -v;
  }
  if (ts.isIdentifier(e)) {
    const init = constIn(e, e.text);
    return init ? evaluate(init, depth + 1) : null;
  }
  if (ts.isConditionalExpression(e)) {
    const a = evaluate(e.whenTrue, depth + 1);
    const b = evaluate(e.whenFalse, depth + 1);
    return a === null || b === null ? null : Math.max(a, b);
  }
  if (ts.isBinaryExpression(e)) {
    const l = evaluate(e.left, depth + 1);
    const r = evaluate(e.right, depth + 1);
    if (l === null || r === null) return null;
    switch (e.operatorToken.kind) {
      case ts.SyntaxKind.AsteriskToken: return l * r;
      case ts.SyntaxKind.PlusToken: return l + r;
      case ts.SyntaxKind.MinusToken: return l - r;
      case ts.SyntaxKind.SlashToken: return r === 0 ? null : l / r;
      default: return null;
    }
  }
  if (ts.isCallExpression(e)) {
    const callee = e.expression.getText();
    // A dial read by its default: `dial(key, N)`, `ceramicsDial(key, N)`.
    if (/[Dd]ial$/.test(callee) && e.arguments.length === 2) {
      return evaluate(e.arguments[1]!, depth + 1);
    }
    // A paced step by its BASE — `this.paceMs(BASE, tool, kinds)`,
    // `this.paceForGround(BASE, hardness)`: the ordinary case (no better
    // tool, the reference rock). A finer tool only shortens it.
    if (/\.pace\w*$/.test(callee) && e.arguments.length >= 1) {
      return evaluate(e.arguments[0]!, depth + 1);
    }
    if (callee === "Math.max" || callee === "Math.min") {
      const vs = e.arguments.map((a) => evaluate(a, depth + 1));
      if (vs.some((v) => v === null)) return null;
      return (callee === "Math.max" ? Math.max : Math.min)(...(vs as number[]));
    }
    if (callee === "Math.round" && e.arguments.length === 1) {
      const v = evaluate(e.arguments[0]!, depth + 1);
      return v === null ? null : Math.round(v);
    }
  }
  return null;
}

function prop(o: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
  for (const p of o.properties) {
    if (ts.isPropertyAssignment(p) && p.name.getText() === name) return p.initializer;
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === name) return p.name;
  }
  return null;
}

interface Site {
  where: string;
  effortW: number | null;
  durationS: number | null;
}

function sitesIn(file: string, root: string): Site[] {
  const text = readFileSync(file, "utf8");
  if (!text.includes("effortW")) return [];
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const out: Site[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isObjectLiteralExpression(n)) {
      const effort = prop(n, "effortW");
      const duration = prop(n, "durationMs");
      if (effort && duration) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
        const ms = evaluate(duration);
        out.push({
          where: `${relative(root, file)}:${line + 1}`,
          effortW: evaluate(effort),
          durationS: ms === null ? null : ms / 1000,
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function main(): void {
  const repo = join(MUD, "..", "..", "..", "..");
  const files: string[] = [];
  walk(MUD, files);
  for (const p of packSources()) walk(p.srcDir, files);

  const sites = files.flatMap((f) => sitesIn(f, repo));
  const impossible: string[] = [];
  const unchecked: string[] = [];
  for (const s of sites) {
    if (s.effortW === null || s.durationS === null) {
      unchecked.push(`${s.where} (${s.effortW === null ? "effort" : ""}${s.effortW === null && s.durationS === null ? "+" : ""}${s.durationS === null ? "duration" : ""})`);
      continue;
    }
    const debitPct = (Math.max(0, s.effortW - SUSTAINABLE_W) * s.durationS) / J_PER_PCT;
    if (debitPct > SPENDABLE_PCT) {
      impossible.push(
        `${s.where} — ${s.effortW} W for ${Math.round(s.durationS)} s needs ` +
          `${Math.round(debitPct)} % of a fresh body's endurance (it has ${SPENDABLE_PCT} % to spend)`,
      );
    }
  }

  if (process.argv.includes("--list")) {
    for (const u of unchecked) console.log(`  unchecked  ${u}`);
  }
  if (impossible.length === 0) {
    console.log(
      `check-act-effort: ${sites.length - unchecked.length} engaged act(s) a fresh body can do; ` +
        `${unchecked.length} computed at run time, unchecked (--list).`,
    );
    return;
  }
  console.error(
    `\n[lint — ERROR] ${impossible.length} engaged act(s) NO body can ever do — ` +
      `refused "too tired" however rested (the whole act is charged up front):`,
  );
  for (const i of impossible) console.error(`  ${i}`);
  console.error(
    `\n  Bring the effort under the ${SUSTAINABLE_W} W sustainable rate (a paced day's ` +
      `work is), or shorten the act. Never lower the floor to suit one act.`,
  );
  process.exit(1);
}

main();
