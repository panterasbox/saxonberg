/**
 * check-binder-models — ⭐⭐ **the gate on tests that skip the binder.**
 *
 * > A controller test builds its model **by hand** and calls
 * > `controller.execute(model, ctx)` directly. Nothing runs the binder.
 * > So the day a view DECLARES an object-typed arg, every such test still
 * > compiles, still passes its own assertions, and the controller reads
 * > `model.thing` as `undefined` in production.
 *
 * ## Why this exists, precisely
 *
 * The 2026-09 statics sweep moved a series of verbs from *hunting for
 * their object in the controller* to *declaring it in the view* — the
 * right change, and each one broke the suites that hand-build the model.
 * It was caught six times during the build and **missed once**: `consign`
 * gained a `shelf` arg, and `farms`, `cellars` and `restocks` shipped
 * broken for several commits because the earlier checks had only looked
 * at *controller* suites and a BRAIN suite dispatches the same way.
 *
 * ⚠ A note in a slate did not prevent that, and the slate retires. This
 * is the same finding as a number that moves.
 *
 * ## What counts as a violation
 *
 * A test file constructs `new XController()` and passes an **object
 * literal** to `.execute(…)` that omits an arg the binder would ALWAYS
 * have populated — that is:
 *
 *   - `required: true`, or
 *   - ⭐ optional **with a `default:`**, which is the shape that bites.
 *     `consign`'s `shelf` and `ship`'s `desk` are both optional; both are
 *     defaulted through MQL, so the binder fills them on every dispatch
 *     and a hand-built model never does.
 *
 * An optional arg with **no** default is legitimately absent — a test may
 * be exercising exactly that path — and is not counted.
 *
 * ## Census, then ratchet
 *
 * The count is the ceiling. ⭐ The point is not to drive it to zero: it
 * is that **declaring a new object arg raises the census**, so the gate
 * fails in the same commit that declares it and the tests get fixed
 * there rather than three commits later.
 *
 * ## Usage
 *
 *   pnpm lint:binder-models            the roster
 *   pnpm lint:binder-models --lint     CI gate
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { dirname, join, relative, basename } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import ts from "typescript";
import { packSources, packSrcFiles } from "./pack-roots";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "..");
const REPO = join(SERVER, "..", "..");
const MUD = join(SERVER, "src", "mud");
const CONTENT = join(SERVER, "..", "content");

/** ⚠ Today's count. It may fall and may never rise — see the header. */
export const BINDER_MODEL_CEILING = 0;

interface Violation {
  file: string;
  line: number;
  controller: string;
  missing: string[];
}

/** Every `cmd/` view directory (a `cmd` under `idea` is the controller mirror). */
function cmdDirs(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (!statSync(full).isDirectory()) continue;
    if (e === "cmd") {
      if (dir.split(/[\\/]/).pop() !== "idea") out.push(full);
      continue;
    }
    cmdDirs(full, out);
  }
  return out;
}

function yamlFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yamlFiles(full, out);
    else if (e.endsWith(".yaml")) out.push(full);
  }
  return out;
}

interface ArgSpec {
  name?: string;
  type?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Controller class name → the arg names the binder ALWAYS populates.
 *
 * ⚠ Unioned across every view naming that controller. Several views
 * share one controller by design (`docs/antipatterns.md` § an arg
 * alternation deletes a check), and a union over-reports rather than
 * under-reports — which is the right direction for a ratchet whose job
 * is to MOVE when somebody declares a new arg.
 */
export function boundArgsByController(): Map<string, Set<string>> {
  const roots = [
    join(MUD, "world"),
    ...(existsSync(CONTENT)
      ? readdirSync(CONTENT).flatMap((p) => cmdDirs(join(CONTENT, p, "content")))
      : []),
  ];
  const out = new Map<string, Set<string>>();
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const file of yamlFiles(root)) {
      let view: Record<string, unknown>;
      try {
        view = parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;
      } catch {
        continue;
      }
      const controller = view?.controller;
      if (typeof controller !== "string") continue;
      const cls = basename(controller);
      const always = out.get(cls) ?? new Set<string>();
      const scan = (args: unknown): void => {
        if (!Array.isArray(args)) return;
        for (const a of args as ArgSpec[]) {
          if (!a?.name) continue;
          if (a.type !== "object" && a.type !== "objects") continue;
          // The two shapes the binder always fills.
          if (a.required === true || a.default !== undefined) always.add(a.name);
        }
      };
      scan(view.args);
      for (const sub of Object.values(
        (view.subcommands as Record<string, { args?: unknown }>) ?? {},
      )) {
        scan(sub?.args);
      }
      out.set(cls, always);
    }
  }
  return out;
}

/** Test files across the kernel and every pack. */
function testFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) {
        if (e === "node_modules") continue;
        walk(full);
      } else if (e.endsWith(".test.ts")) out.push(full);
    }
  };
  walk(MUD);
  for (const p of packSources()) {
    for (const f of packSrcFiles(p.srcDir)) void f;
    walk(p.srcDir);
  }
  return [...new Set(out)];
}

export function scanTest(
  file: string,
  source: string,
  bound: Map<string, Set<string>>,
): Violation[] {
  if (!/new\s+[A-Z]\w*Controller\s*\(/.test(source)) return [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out: Violation[] = [];

  const visit = (node: ts.Node): void => {
    // `…execute(<object literal>, …)`
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.getText(sf) === "execute" &&
      node.arguments.length > 0
    ) {
      const model = node.arguments[0];
      if (model && ts.isObjectLiteralExpression(model)) {
        // Which controller does this call belong to? The nearest
        // `new XController()` inside the same call expression, else the
        // file's only one.
        const text = node.expression.getText(sf);
        let cls = /new\s+([A-Z]\w*Controller)\s*\(/.exec(text)?.[1];
        if (!cls) {
          const all = [...source.matchAll(/new\s+([A-Z]\w*Controller)\s*\(/g)].map(
            (m) => m[1] as string,
          );
          const uniq = [...new Set(all)];
          if (uniq.length === 1) cls = uniq[0];
        }
        const always = cls ? bound.get(cls) : undefined;
        if (cls && always && always.size > 0) {
          const keys = new Set(
            model.properties
              .map((p) => (p.name ? p.name.getText(sf).replace(/['"]/g, "") : ""))
              .filter(Boolean),
          );
          // A spread could carry anything — do not guess.
          const spread = model.properties.some((p) => ts.isSpreadAssignment(p));
          const missing = spread ? [] : [...always].filter((a) => !keys.has(a));
          if (missing.length > 0) {
            out.push({
              file: relative(REPO, file),
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              controller: cls,
              missing,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return out;
}

export function findings(): Violation[] {
  const bound = boundArgsByController();
  return testFiles().flatMap((f) => scanTest(f, readFileSync(f, "utf8"), bound));
}

function main(): void {
  const lint = process.argv.includes("--lint");
  const v = findings();

  if (!lint || v.length > BINDER_MODEL_CEILING) {
    for (const x of v) {
      console.log(
        `  ${x.file.replace("packages/", "")}:${x.line}\n` +
          `      ${x.controller} — model omits ${x.missing.map((m) => `\`${m}\``).join(", ")}, ` +
          `which the view always binds`,
      );
    }
  }
  if (v.length > BINDER_MODEL_CEILING) {
    console.error(
      `\n✖ check-binder-models: ${v.length} hand-built model(s) omit an arg the ` +
        `binder always populates (ceiling ${BINDER_MODEL_CEILING}).\n` +
        `  ⭐ If you just DECLARED an object arg in a view, this is the gate ` +
        `telling you the tests that\n     build that controller's model by hand ` +
        `have not been given it. Add it to each model.\n`,
    );
    if (lint) process.exit(1);
    return;
  }
  console.log(
    `✔ check-binder-models — every hand-built controller model carries the args ` +
      `its view always binds (ceiling ${BINDER_MODEL_CEILING}).`,
  );
}

if (process.argv[1] && /check-binder-models\.ts$/.test(process.argv[1])) main();
