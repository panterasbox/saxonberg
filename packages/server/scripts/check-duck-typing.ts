/**
 * ⭐⭐ `lint:duck-typing` — **a target's capability is a predicate, never
 * a probe.**
 *
 * ## The defect
 *
 * ```typescript
 * // BAD — asking an object whether it happens to have a method
 * if (typeof target.getHandling === "function") target.getHandling();
 * if ("organization" in thing) …
 * thing.beforeRestore?.();
 * ```
 *
 * A probe answers *"does this object carry a member spelled X"*, which is
 * not the question the code means (*"is this a kind of thing that does
 * Y"*). The predicate (`MixinApi.isX`, a protocol mixin) is the question,
 * threads the type, and is the one place the answer can change. A probe is
 * invisible to every reader of the composition — and when nothing defines
 * the name at all, it is dead code that reads as live.
 *
 * ## What it counts (the TypeScript AST, syntax only)
 *
 * Over every mud module (kernel `src/mud/**` and every pack's `src/**`,
 * `__tests__` excluded), three shapes, each on a property of a receiver:
 *
 *   1. `typeof <x>.<name> === "function"` (or `!==`, `==`, `!=`, either
 *      side) — a **method probe**;
 *   2. `<x>.<name>?.(…)` — an optional call, also a **method probe**;
 *   3. `"<name>" in <x>` — a **member probe**.
 *
 * ⚠ The thenable idiom (`typeof x.then === "function"`, and `catch`) and
 * V8's stack-frame `getFileName` are NOT counted: they are the language's
 * and the runtime's own protocols, with no predicate to replace them
 * (controllers-are-io D7a allowlists the thenable).
 *
 * ## ⭐ The hard sub-count — a probe on a name NOBODY defines
 *
 * A method probe whose name no class member and no object-literal member
 * anywhere in the corpus declares (interface/type members do not count —
 * a shape is not an implementation). Each is a branch that can never be
 * taken. The W0 census, read off the AST (seven sites, six names):
 * `setHandling` (apiculture `Colony`), `grazingDemandPerGameDay` (farming
 * `Tract`), `getFixedInPlace` (mining `AssayController`), `getVentilated`
 * (mining `Working`), and `onConnectionDetached` ×2 / `onLinkRestored`
 * (`ConnectionLogic` — declared optional on the `HasInteractive`
 * interface, implemented by nobody). ⚠ The plan's heuristic list named
 * `beforeRestore` as the fifth; it is DEFINED — `MineWarren` passes it as
 * an options callback — so the probe is honest and not counted. Its
 * ceiling falls to 0 at W3 (each wired or deleted).
 *
 * ⭐ Census, then ratchet (docs/lint-family.md): both ceilings are this
 * gate's own measured count; they may fall, never rise. ⚠ This is a
 * SHAPE census — a probe on a JS builtin (`process.send?.()`) counts the
 * same as one on a Stuff; it is a candidate list, not a disposition.
 */

import { readFileSync } from "fs";
import { relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { CONTENT, MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

/** All probes (method + member), kernel and packs. */
export const DUCK_PROBE_CEILING = 536; // controller-liquidity W3: −2, shape probes became declared protocol methods (e.g. `canHitch` on Haulable, D9). finalize self-review: −5 (the pump asks `isSwitchable`; three survey reads call `getZone()` on the Stuff they hold). W3b: the supply, generator and name-rule probes became `MixinApi.isPowered` / `isWaterPowered` / `NameTakingMixin`. (W8: −4, the plat book and the deed desk are named by the pack that owns them.) Green after W2/W4/W6: −1.
/** Method probes on a name nobody in the corpus defines. */
export const UNDEFINED_PROBE_CEILING = 0;

/**
 * Probe names that are protocols of the language or the runtime, not of
 * the model: the thenable pair (`then`, `catch`) and V8's `CallSite`
 * (`getFileName`, read off a stack frame by `ModuleApi`).
 */
const LANGUAGE_PROTOCOLS = new Set(["then", "catch", "getFileName"]);

export type ProbeKind = "typeof" | "optional-call" | "in";

export interface Probe {
  kind: ProbeKind;
  name: string;
  file: string;
  line: number;
}

function propName(node: ts.Expression): string | null {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return node.argumentExpression.text;
  }
  return null;
}

/** The probes in one module, and the member names it defines. */
export function scanModule(
  sf: ts.SourceFile,
  file: string,
): { probes: Probe[]; defines: Set<string> } {
  const probes: Probe[] = [];
  const defines = new Set<string>();
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken
      ) {
        for (const [a, b] of [
          [n.left, n.right],
          [n.right, n.left],
        ] as const) {
          if (ts.isTypeOfExpression(a) && ts.isStringLiteralLike(b) && b.text === "function") {
            const name = propName(a.expression);
            if (name && !LANGUAGE_PROTOCOLS.has(name)) {
              probes.push({ kind: "typeof", name, file, line: at(n) });
            }
          }
        }
      } else if (op === ts.SyntaxKind.InKeyword && ts.isStringLiteralLike(n.left)) {
        probes.push({ kind: "in", name: n.left.text, file, line: at(n) });
      }
    } else if (ts.isCallExpression(n) && n.questionDotToken) {
      const name = propName(n.expression);
      if (name && !LANGUAGE_PROTOCOLS.has(name)) {
        probes.push({ kind: "optional-call", name, file, line: at(n) });
      }
    }
    if (
      (ts.isMethodDeclaration(n) ||
        ts.isPropertyDeclaration(n) ||
        ts.isGetAccessorDeclaration(n) ||
        ts.isSetAccessorDeclaration(n) ||
        ts.isPropertyAssignment(n)) &&
      n.name &&
      (ts.isIdentifier(n.name) || ts.isStringLiteralLike(n.name) || ts.isPrivateIdentifier(n.name))
    ) {
      defines.add(n.name.text);
    } else if (ts.isShorthandPropertyAssignment(n)) {
      defines.add(n.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { probes, defines };
}

export interface DuckReport {
  probes: Probe[];
  /** Method probes (typeof / optional-call) on a name nobody defines. */
  undefinedProbes: Probe[];
}

export function census(contentDir: string = CONTENT, mudDir: string = MUD): DuckReport {
  const probes: Probe[] = [];
  const defines = new Set<string>();
  const repo = resolve(mudDir, "..", "..", "..", "..");
  for (const { file } of mudSourceFiles(contentDir, mudDir)) {
    const r = scanModule(parseTs(file, readFileSync(file, "utf8")), relative(repo, file));
    probes.push(...r.probes);
    for (const d of r.defines) defines.add(d);
  }
  const undefinedProbes = probes.filter((p) => p.kind !== "in" && !defines.has(p.name));
  return { probes, undefinedProbes };
}

function main(): void {
  const r = census();
  const fmt = (p: Probe): string => `${p.file}:${p.line}  ${p.kind} ${p.name}`;
  const ok1 = ratchet(
    "check-duck-typing",
    "duck probes (typeof-function / ?.() / 'x' in)",
    r.probes.length,
    DUCK_PROBE_CEILING,
    r.probes.map(fmt),
    "⭐ Ask the predicate (`MixinApi.isX`, a protocol mixin), never whether the\n" +
      "  object happens to carry a member spelled X.",
  );
  const ok2 = ratchet(
    "check-duck-typing",
    "method probes on a name NOBODY defines",
    r.undefinedProbes.length,
    UNDEFINED_PROBE_CEILING,
    r.undefinedProbes.map(fmt),
    "⚠ No class or object literal in the tree defines these names, so the\n" +
      "  branch can never be taken: wire the method, or delete the probe.",
  );
  if (!ok1 || !ok2) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
