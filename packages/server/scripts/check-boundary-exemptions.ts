/**
 * check-boundary-exemptions — the sandbox boundary's **method sets**,
 * checked by the build.
 *
 * ⭐⭐ **This script used to have a second job, and losing it is the
 * point.** `SecurityApi` granted four kinds of boundary exemption:
 * three expressed as CLASSES (`_registerBoundaryExemptBase(Species)`,
 * …) and therefore typechecked for free — rename the class and the
 * build breaks — and a fourth expressed as a set of **template-path
 * strings**, which nothing could typecheck. Invariant 1 here existed
 * solely to watch that fourth kind: *every exempt path resolves to a
 * real seed row*, because a renamed singleton would silently change the
 * security surface.
 *
 * ⛔ **The fourth kind is gone** (2026-10-06). Those twenty-seven paths
 * and the twelve `_registerBoundaryExemptBase` calls are now one
 * declaration on each class — `static boundaryRole`, see
 * `mud/lib/security/BoundaryRole.ts` — so the drift this script watched
 * for is **unrepresentable**: a rename moves the declaration with the
 * class, exactly as it always did for the three class-shaped kinds.
 * `lint:boundary-roles` owns that side now (totality, the `commons`
 * ceiling, and *no central list may come back*).
 *
 * ⭐ And this script's own header had already named the right answer
 * while describing the wrong shape as acceptable: *"coupled to a path
 * **as a string**"* is the defect `check-gate-strings` exists for, and
 * the class-shaped kinds were already immune. The fix was to make the
 * fourth kind look like the other three.
 *
 * ## What remains, and it is still load-bearing
 *
 * **The symmetric and inbound-only method sets are disjoint.** A method
 * in both would be symmetric in practice (the symmetric check runs
 * first and short-circuits), silently undoing the direction rule that
 * keeps in-circle content from calling mutating transport hooks on
 * field bodies. Those two sets are still method NAMES, so nothing but
 * this script watches them.
 *
 * Deliberately NOT checked, here or in `lint:boundary-roles`: whether
 * an exemption is *justified*. That is a human judgement made at
 * review — and the judgement is now recorded beside the class it is
 * about, with a census ratchet forcing the conversation when the count
 * grows.
 */


import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const EXIT_ON_FINDINGS = true;

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, '..', 'src');
const SECURITY_TS = join(SERVER_SRC, 'mud', 'api', 'security.ts');
/**
 * Pull the string entries out of one `new Set([...])` initializer.
 * Comment lines are dropped first — the prose in these lists is dense
 * with apostrophes and would otherwise parse as entries.
 */
function readSetEntries(source: string, memberName: string): string[] {
  const start = source.indexOf(memberName);
  if (start === -1) {
    throw new Error(
      `check-boundary-exemptions: ${memberName} not found in security.ts — ` +
        `renamed? This script is the only thing watching it.`
    );
  }
  const rest = source.slice(start);
  const end = rest.indexOf(']);');
  if (end === -1) {
    throw new Error(
      `check-boundary-exemptions: could not find the end of ${memberName}`
    );
  }
  const body = rest
    .slice(0, end)
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
}

const source = readFileSync(SECURITY_TS, 'utf8');
const findings: string[] = [];

/* ── the one invariant: symmetric and inbound-only sets stay disjoint ── */

const symmetric = new Set(readSetEntries(source, '#BOUNDARY_EXEMPT_METHODS'));
const inbound = readSetEntries(source, '#INBOUND_TRANSPORT_METHODS');

for (const method of inbound) {
  if (symmetric.has(method)) {
    findings.push(
      `'${method}' is in BOTH the symmetric and inbound-only method sets. ` +
        `The symmetric check runs first, so the direction rule is silently ` +
        `off for it — in-circle content could call it on a field body.`
    );
  }
}

/* ── report ── */

if (findings.length > 0) {
  console.error(
    `\n[check-boundary-exemptions] ${findings.length} finding(s):\n`
  );
  for (const f of findings) console.error(`  - ${f}`);
  console.error('');
  if (EXIT_ON_FINDINGS) process.exit(1);
} else {
  console.info(
    `check-boundary-exemptions: symmetric (${symmetric.size}) and ` +
      `inbound-only (${inbound.length}) method sets are disjoint. ` +
      `Class-level exemption is declared, not enumerated — see ` +
      `lint:boundary-roles.`
  );
}
