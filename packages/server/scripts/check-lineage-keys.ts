/**
 * ⚠⚠ `lint:lineage-keys` — **a person is keyed on `getIdentityPath()`,
 * whatever the field is called.**
 *
 * `lint:person-keys` matches one literal shape — a `kind: 'player'` owner
 * whose `templatePath` is fed from `getTemplatePath()` — and is held at
 * zero. The disease is wider: every player Avatar shares ONE template path
 * (lineage), so a maker, a holder, a channel member or a title receiver
 * keyed on it is EVERY player at once (CLAUDE.md § Keying a PERSON on
 * `getTemplatePath()`). The controller survey confirmed a dozen such sites
 * under other names (controller-liquidity D11).
 *
 * **What it counts** (the TypeScript AST, the kernel mudlib and every
 * pack's `src/`, tests excluded): a `getTemplatePath()` call
 *
 *   - initializing or assigned to a property, variable or parameter-default
 *     whose NAME is a person-word — `holder · maker · owner · member ·
 *     party · receiver · recipient · by · author · keeper` as the whole name
 *     or its first or last camelCase word (`makerPath`, `memberKey`,
 *     `receiverPath`, `ownerTemplatePath`);
 *   - compared (`===`/`!==`) with such a name (or a `get<Word>()` call).
 *
 * The legitimate structural reads — a warren's structure owner is the
 * STRUCTURE, a singleton organization's template path IS its identity, a
 * kind comparison — are exempted below, each with its reason. A new
 * exemption is a reviewed act, not a reflex.
 *
 * ⭐ Census, then ratchet: opened at its own count at controller-liquidity
 * W0 (2026-11-09); W3 switches the confirmed sites. It may fall, never rise.
 */

import { readFileSync } from "fs";
import { relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

export const LINEAGE_KEYS_CEILING = 0;

const PERSON_WORDS = new Set([
  "holder",
  "maker",
  "owner",
  "member",
  "party",
  "receiver",
  "recipient",
  "by",
  "author",
  "keeper",
]);

/**
 * ⭐ The exempt structural reads: `<file suffix>` + the person-word name the
 * finding was made under, each with why the template path IS the key there.
 */
export const LINEAGE_KEY_EXEMPTIONS: ReadonlyArray<{
  file: string;
  name: string;
  /** When set, only a template path read off THIS expression is exempt. */
  subject?: string;
  why: string;
}> = [
  {
    file: "lib/location/FloorplanWarren.ts",
    name: "owner",
    why: "the plan's owner is the STRUCTURE whose row carries the floorplan — a lineage, by design",
  },
  {
    file: "platform/idea/ShipWarren.ts",
    name: "owner",
    why: "a ship of a kind shares its kind's plan; the owner of a plan is the kind",
  },
  {
    file: "residence/src/idea/LotGateExit.ts",
    name: "holderPath",
    why: "the holder is the PlatWarren (a minted singleton whose template path is its identity), not a person",
  },
  {
    file: "platform/idea/api/ContractLogic.ts",
    name: "party",
    why: "a business party: a singleton organization's template path IS its identity",
  },
  {
    file: "platform/idea/api/DocumentLogic.ts",
    name: "owner",
    subject: "publisher",
    why: "a release's owner is the publisher organization, whose template path IS its identity",
  },
  {
    file: "platform/idea/api/DocumentLogic.ts",
    name: "owner",
    subject: "business",
    why: "a business document's owner is the Business, whose template path IS its identity",
  },
  {
    file: "api/security.ts",
    name: "receiverPath",
    why: "a diagnostic label for the denied call's receiver, never a key",
  },
];

/** The camelCase words of a name, lowercased. */
function words(name: string): string[] {
  return name
    .replace(/^_+/, "")
    .split(/(?=[A-Z])|_/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 0);
}

/** Is `name` a person-word name (the whole name, or its first or last word)? */
export function isPersonName(name: string): boolean {
  const w = words(name);
  if (w.length === 0) return false;
  return PERSON_WORDS.has(w[0]!) || PERSON_WORDS.has(w[w.length - 1]!);
}

/**
 * Is the expression's VALUE a template path — a zero-argument
 * `getTemplatePath()` call, through `??`/`||`, a conditional, `await`,
 * parens and casts? A template path passed INTO a call (`ParcelApi.ownerOf(
 * zone.getTemplatePath())`) is a lookup key, not the value; and an
 * identity-first fallback (`getIdentityPath() ?? getTemplatePath()`) is the
 * sanctioned form — `getIdentityPath()` already falls back, but the long
 * form is not wrong.
 */
function callsTemplatePath(e: ts.Node): string | null {
  const spine: ts.Node[] = [];
  const collect = (n: ts.Node): void => {
    let x = n;
    while (
      ts.isParenthesizedExpression(x) ||
      ts.isNonNullExpression(x) ||
      ts.isAsExpression(x) ||
      ts.isAwaitExpression(x)
    ) {
      x = x.expression;
    }
    if (
      ts.isBinaryExpression(x) &&
      (x.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
        x.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      collect(x.left);
      collect(x.right);
    } else if (ts.isConditionalExpression(x)) {
      collect(x.whenTrue);
      collect(x.whenFalse);
    } else {
      spine.push(x);
    }
  };
  collect(e);
  const named = (n: ts.Node, method: string): boolean =>
    ts.isCallExpression(n) &&
    n.arguments.length === 0 &&
    ts.isPropertyAccessExpression(n.expression) &&
    n.expression.name.text === method;
  if (spine.some((n) => named(n, "getIdentityPath"))) return null;
  const call = spine.find((n) => named(n, "getTemplatePath")) as ts.CallExpression | undefined;
  return call ? (call.expression as ts.PropertyAccessExpression).expression.getText() : null;
}

/** The person-word name an expression reads (`x`, `a.x`, `a.getX()`), if it is one. */
function personNameOf(e: ts.Expression): string | null {
  let x = e;
  while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x)) x = x.expression;
  if (ts.isIdentifier(x)) return isPersonName(x.text) ? x.text : null;
  if (ts.isPropertyAccessExpression(x)) return isPersonName(x.name.text) ? x.name.text : null;
  if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.arguments.length === 0) {
    const m = /^get([A-Z]\w*)$/.exec(x.expression.name.text);
    if (m && isPersonName(m[1]!)) return x.expression.name.text;
  }
  return null;
}

export interface LineageKeyFinding {
  line: number;
  /** The person-word name the template path was keyed under. */
  name: string;
  /** What `getTemplatePath()` was called on (`maker`, `business`, `this`). */
  subject: string;
}

/** The lineage-keyed person sites in one module. */
export function scanLineageKeys(sf: ts.SourceFile): LineageKeyFinding[] {
  const out: LineageKeyFinding[] = [];
  const lineOf = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAssignment(n) && n.initializer && !ts.isFunctionLike(n.initializer)) {
      const name = n.name.getText(sf).replace(/^["']|["']$/g, "");
      const subject = isPersonName(name) ? callsTemplatePath(n.initializer) : null;
      if (subject !== null) out.push({ line: lineOf(n), name, subject });
    } else if (
      (ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isPropertyDeclaration(n)) &&
      n.initializer &&
      ts.isIdentifier(n.name)
    ) {
      const subject = isPersonName(n.name.text) ? callsTemplatePath(n.initializer) : null;
      if (subject !== null) out.push({ line: lineOf(n), name: n.name.text, subject });
    } else if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsToken) {
        const name = personNameOf(n.left);
        const subject = name ? callsTemplatePath(n.right) : null;
        if (name && subject !== null) out.push({ line: lineOf(n), name, subject });
      } else if (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken
      ) {
        const l = personNameOf(n.left);
        const r = personNameOf(n.right);
        const ls = l ? callsTemplatePath(n.right) : null;
        const rs = r ? callsTemplatePath(n.left) : null;
        if (l && ls !== null) out.push({ line: lineOf(n), name: l, subject: ls });
        else if (r && rs !== null) out.push({ line: lineOf(n), name: r, subject: rs });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

export function census(): string[] {
  const out: string[] = [];
  const repo = resolve(MUD, "..", "..", "..", "..");
  for (const { file } of mudSourceFiles()) {
    if (/\/__tests__\//.test(file) || !file.endsWith(".ts")) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("getTemplatePath")) continue;
    const rel = relative(repo, file);
    for (const f of scanLineageKeys(parseTs(file, src))) {
      const exempt = LINEAGE_KEY_EXEMPTIONS.some(
        (x) => rel.endsWith(x.file) && x.name === f.name && (x.subject === undefined || x.subject === f.subject),
      );
      if (exempt) continue;
      out.push(`${rel}:${f.line}  ${f.name} ← ${f.subject}.getTemplatePath()`);
    }
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-lineage-keys",
    "persons keyed on lineage",
    findings.length,
    LINEAGE_KEYS_CEILING,
    findings,
    "⚠⚠ Every player shares one template path. Key a PERSON on\n" +
      "  `getIdentityPath()` (it falls back to the template path for anything\n" +
      "  with no minted identity, so the switch is always safe). A structural\n" +
      "  read that genuinely keys on lineage is exempted in this script, with\n" +
      "  its reason.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
