/**
 * check-reason-rows — ⭐⭐ **every refusal has words, and the old way of
 * wording one only falls** (failure-model D7).
 *
 * A reason is a `reason` document — `<pack root>/reasons/<code>` — that
 * declares its facts and words them (`lib/command/Reason.ts`). The compiler
 * used to be the census of *every reason has words* (an exhaustive wording
 * `switch` per controller); a migrated controller has no switch, so this
 * gate is that census now.
 *
 * **Hard, at zero:**
 *  - a literal code in `new Refusal('…'` (or a `new Unavailable`) that no
 *    pack ships a row for;
 *  - a literal fact key in that call's facts the row does not declare.
 *
 * **Ratchets (census, then ceiling):**
 *  - (i) distinct `reason: '<code>'` literals in the kernel and every pack
 *    `src/` with no row — the unrowed codes, burned down one row at a time;
 *  - (ii) legacy wordings — `kind: 'controller-rejected'` literals plus
 *    worded `refuse(context, topic, line, reason…)` calls: a controller
 *    still writing its own refusal sentence.
 *
 * A bare code is the platform's (`locked` → `/platform/reasons/locked`), a
 * path any pack's — the rule `ReasonCatalogue.pathOf` applies.
 *
 *   tsx scripts/check-reason-rows.ts --lint     # CI gate
 *   tsx scripts/check-reason-rows.ts --report   # the rosters
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import ts from "typescript";
import { parse as parseYaml } from "yaml";
import { CONTENT, MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

const REPO_ROOT = join(MUD, "../../../..");

/** (i) Distinct `reason:` literals with no row — measured 2026-11-18 (failure-model W4). */
export const UNROWED_CODES_CEILING = 966;
/** (ii) Legacy wordings — `controller-rejected` literals + worded `refuse(…)` calls. Measured 2026-11-18. */
export const LEGACY_WORDINGS_CEILING = 580;

/** Every shipped reason row, by path → its declared fact names. */
export function reasonRows(contentDir: string = CONTENT): Map<string, Set<string>> {
  const rows = new Map<string, Set<string>>();
  for (const pack of readdirSync(contentDir)) {
    const manifest = join(contentDir, pack, "pack.yaml");
    if (!existsSync(manifest)) continue;
    const root = /^root:\s*(\S+)/m.exec(readFileSync(manifest, "utf8"))?.[1];
    const dir = join(contentDir, pack, "content", "reasons");
    if (!root || !existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".yaml")) continue;
      const data = (parseYaml(readFileSync(join(dir, file), "utf8")) ?? {}) as { facts?: Record<string, unknown> };
      const prefix = root === "/" ? "" : root;
      rows.set(`${prefix}/reasons/${file.slice(0, -5)}`, new Set(Object.keys(data.facts ?? {})));
    }
  }
  return rows;
}

/** The row a code names — the `shape:` rule. */
function pathOf(code: string): string {
  return code.startsWith("/") ? code : `/platform/reasons/${code}`;
}

interface Census {
  hard: string[];
  unrowed: Map<string, string[]>;
  legacy: string[];
}

function census(): Census {
  const rows = reasonRows();
  const hard: string[] = [];
  const unrowed = new Map<string, string[]>();
  const legacy: string[] = [];
  for (const { file } of mudSourceFiles()) {
    if (file.includes("__tests__")) continue;
    const sf = parseTs(file);
    const at = (node: ts.Node): string =>
      `${relative(REPO_ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
    const visit = (node: ts.Node): void => {
      // new Refusal('code', { facts }) / new Unavailable(…)
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
        const cls = node.expression.text;
        if (cls === "Unavailable" && !rows.has(pathOf("unavailable"))) hard.push(`${at(node)} — no row for 'unavailable'`);
        if (cls === "Refusal") {
          const first = node.arguments?.[0];
          if (first && ts.isStringLiteralLike(first)) {
            const path = pathOf(first.text);
            const facts = rows.get(path);
            if (!facts) hard.push(`${at(node)} — new Refusal('${first.text}'): no row at ${path}`);
            const second = node.arguments?.[1];
            if (facts && second && ts.isObjectLiteralExpression(second)) {
              for (const p of second.properties) {
                const name = p.name && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) ? p.name.text : null;
                if (name !== null && !facts.has(name)) {
                  hard.push(`${at(p)} — new Refusal('${first.text}'): fact '${name}' is not declared by its row`);
                }
              }
            }
          }
        }
      }
      // reason: '<code>' — (i)
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "reason" &&
        ts.isStringLiteralLike(node.initializer)
      ) {
        const code = node.initializer.text;
        if (code !== "" && !rows.has(pathOf(code))) {
          const list = unrowed.get(code) ?? [];
          list.push(at(node));
          unrowed.set(code, list);
        }
      }
      // kind: 'controller-rejected' — (ii)
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "kind" &&
        ts.isStringLiteralLike(node.initializer) &&
        node.initializer.text === "controller-rejected"
      ) {
        legacy.push(`${at(node)} — controller-rejected`);
      }
      // this.refuse(context, topic, line, reason…) — the worded form — (ii)
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "refuse" &&
        node.arguments.length >= 4
      ) {
        legacy.push(`${at(node)} — worded refuse(…)`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { hard, unrowed, legacy };
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const { hard, unrowed, legacy } = census();
  if (mode === "--report") {
    console.log(`hard findings: ${hard.length}`);
    for (const h of hard) console.log(`  ${h}`);
    console.log(`\n(i) unrowed codes: ${unrowed.size}`);
    for (const [code, sites] of [...unrowed].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(sites.length).padStart(4)}  ${code}`);
    }
    console.log(`\n(ii) legacy wordings: ${legacy.length}`);
    return;
  }
  let ok = true;
  if (hard.length > 0) {
    console.error(`lint:reason-rows: ✗ ${hard.length} refusal(s) with no row or an undeclared fact:\n`);
    for (const h of hard) console.error(`  ✗ ${h}`);
    console.error(
      `\nShip the row — <pack>/content/reasons/<code>.yaml with its facts and its says — ` +
        `or name the code its row already has (a pack's code is its row's full path).`,
    );
    ok = false;
  }
  const advice =
    "Give the code a row (content/reasons/<code>.yaml) and pass the refusal on with the " +
    "wordless this.refuse(context, answer) — the row words it. The ceiling may fall; it may never rise.";
  ok = ratchet("lint:reason-rows", "unrowed reason codes", unrowed.size, UNROWED_CODES_CEILING,
    [...unrowed.keys()], advice) && ok;
  ok = ratchet("lint:reason-rows", "legacy refusal wordings", legacy.length, LEGACY_WORDINGS_CEILING,
    legacy.slice(0, 40), advice) && ok;
  if (!ok) process.exit(1);
}

if (process.argv[1] && /check-reason-rows\.ts$/.test(process.argv[1])) {
  main();
}
