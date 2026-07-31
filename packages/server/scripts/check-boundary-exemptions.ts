/**
 * check-boundary-exemptions — the sandbox boundary's exemption lists,
 * checked the way the base-class list already is: by the build.
 *
 * `SecurityApi` grants four kinds of boundary exemption. Three are
 * expressed as CLASSES (`_registerBoundaryExemptBase(Species)`, …) and
 * are therefore typechecked for free: rename or move the class and the
 * build breaks. The fourth is a set of **template-path strings**, and
 * nothing checks it — rename a singleton and the security surface
 * silently changes, with the old entry left pointing at nothing and the
 * new singleton quietly un-exempt. That is the one drift the lint
 * family exists to catch (cf. `check-gate-strings`, same problem shape:
 * a security decision coupled to a path *as a string*).
 *
 * Two invariants:
 *
 *   1. **Every exempt template path resolves to a real seed row.**
 *      `/obj/HelpCatalogue` ⇒ `src/mud/seeds/obj/HelpCatalogue.yaml`.
 *      An exemption naming a path nothing seeds is either a typo or a
 *      leftover, and both are security-relevant.
 *
 *   2. **The symmetric and inbound-only method sets are disjoint.** A
 *      method appearing in both would be symmetric in practice (the
 *      symmetric check runs first and short-circuits), silently undoing
 *      the direction rule that keeps in-circle content from calling
 *      mutating transport hooks on field bodies.
 *
 * Deliberately NOT checked: whether an exemption is *justified*. That
 * is a human judgement made at review, which is the whole argument for
 * keeping these as short readable lists rather than deriving them —
 * the list is the audit surface. This script only guarantees that what
 * the list says is what the runtime does.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const EXIT_ON_FINDINGS = true;

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, '..', 'src');
const SECURITY_TS = join(SERVER_SRC, 'mud', 'api', 'security.ts');
const SEEDS = join(SERVER_SRC, 'mud', 'seeds');

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

/* ── 1. every exempt template path is a real seed row ── */

const paths = readSetEntries(source, '#BOUNDARY_EXEMPT_TEMPLATE_PATHS').filter(
  (p) => p.startsWith('/')
);

if (paths.length === 0) {
  findings.push(
    'BOUNDARY_EXEMPT_TEMPLATE_PATHS parsed as empty — the parser is ' +
      'broken, not the list (fail closed rather than pass vacuously).'
  );
}

for (const path of paths) {
  const seed = join(SEEDS, `${path}.yaml`);
  if (!existsSync(seed)) {
    findings.push(
      `boundary-exempt path '${path}' has no seed row ` +
        `(expected ${seed.replace(SERVER_SRC, 'src')}). Renamed singleton, ` +
        `or a stale exemption pointing at nothing.`
    );
  }
}

/* ── 2. symmetric and inbound-only method sets stay disjoint ── */

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
    `check-boundary-exemptions: ${paths.length} exempt path(s) resolve to ` +
      `seed rows; symmetric (${symmetric.size}) and inbound-only ` +
      `(${inbound.length}) method sets are disjoint.`
  );
}
