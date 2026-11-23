/**
 * check-silent-catch — ⭐ **a catch that says nothing is a refusal nobody
 * hears** (failure-model D7; the catch half of the silent-write census).
 *
 * Counts every `catch` clause in the kernel and every pack `src/` (tests
 * excluded) whose block does none of:
 *  - `throw` (rethrow, or throw something truer);
 *  - report it — `reportFailure`, `DiagnosticApi.record`, `.refuse(`;
 *  - answer a refusal — an `ok: false` or a `Refusal`;
 *  - say why it may be silent — a `@quiet <why>` comment in the block (a
 *    deliberate skip: *generator already complete*, *best-effort push*).
 *
 * Census, then ratchet: today's count is the ceiling; it may fall and may
 * never rise.
 *
 *   tsx scripts/check-silent-catch.ts --lint     # CI gate
 *   tsx scripts/check-silent-catch.ts --report   # the roster
 */

import { join, relative } from "path";
import ts from "typescript";
import { MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

const REPO_ROOT = join(MUD, "../../../..");

/** Silent catches — measured 2026-11-18 (failure-model W4). */
export const SILENT_CATCH_CEILING = 1016; // naming overhaul master merge: master (matter-model-overlaps) at 1017, less B3a's −1 deleted online-provider resolve. matter-model-overlaps pre-merge audit: −2, re-pinned — the Ship and Building `bareWearPerDay` cold-cache readers went to the one default on `Faced`. matter-model-overlaps W4: −1. W3: −2. master merge (navigation-server, call-security-performance): +6. failure-model drive: −1. Was 1017 at W4.

/** What makes a catch block speak. */
const SPEAKS = [
  /\bthrow\b/,
  /\breportFailure\(/,
  /DiagnosticApi\.record\(/,
  /\.refuse\(/,
  /\bok:\s*false\b/,
  /\bRefusal\b/,
  /@quiet\b/,
];

function census(): string[] {
  const rows: string[] = [];
  for (const { file } of mudSourceFiles()) {
    if (file.includes("__tests__")) continue;
    const sf = parseTs(file);
    const text = sf.getFullText();
    const visit = (node: ts.Node): void => {
      if (ts.isCatchClause(node)) {
        const body = text.slice(node.block.getFullStart(), node.block.getEnd());
        if (!SPEAKS.some((re) => re.test(body))) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          rows.push(`${relative(REPO_ROOT, file)}:${line}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return rows;
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const rows = census();
  if (mode === "--report") {
    console.log(`${rows.length} silent catch(es)`);
    for (const r of rows) console.log(`  ${r}`);
    return;
  }
  const ok = ratchet(
    "lint:silent-catch",
    "silent catches",
    rows.length,
    SILENT_CATCH_CEILING,
    rows.slice(-40),
    "Rethrow it, report it (CommandApi.reportFailure / DiagnosticApi.record), answer a refusal, " +
      "or — if silence is right — say why in a `// @quiet <why>` comment in the block.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && /check-silent-catch\.ts$/.test(process.argv[1])) {
  main();
}
