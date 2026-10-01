/**
 * check-reconcile-chains — ⭐⭐ the ratchet for the resolve-on-read
 * correctness fix (cold-storage build).
 *
 * > A `reconcile*()` that reads a stepped driver's CURRENT value and bills
 * > the whole elapsed gap at it **guessed** — and the guess depended on
 * > when you looked.
 *
 * The law (`uncertainty.md § The second abstraction law`): reconcile-on-
 * read is exact only when the driver's trajectory is reconstructible. A
 * gauge that sampled `getTemperature()` / `hostTemperatureK` /
 * `getOwnTemperatureK` / `lastAmbientK` once and spread it over the gap is
 * the failure a fridge's power cut exposes. The fix: integrate over the
 * publisher's `temperatureTrajectory(...)` instead
 * (`lib/Trajectory.ts`).
 *
 * ## What counts
 *
 * A method whose name starts `reconcile`, declared in the kernel's `lib/`
 * or `platform/` or any pack's `src/`, whose body references one of the
 * **sampling tokens** below AND carries neither a `temperatureTrajectory`
 * read nor a `@samples` marker (the TSDoc block tag that says *this gauge
 * samples on purpose, and here is why*).
 *
 * ```
 *   getTemperature(        hostTemperatureK       getOwnTemperatureK
 * ```
 *
 * ⚠ Scoped to a thing's OWN temperature read, deliberately. A reconcile
 * that reads its own reserves, a constant rate, or an exact integral (the
 * burner's fuel, soil's rainfall) is not sampling a stepped DEPENDENCY and
 * is out of scope — matching the ADD-2 census table in the plan.
 *
 * A reconcile that integrates a trajectory, or declares `@samples`, is
 * clean. The publishers (`reconcileThermal`, `reconcileEnvelope`) read
 * their driver AS a trajectory and are clean by that test.
 *
 * ## Census, then ratchet
 *
 * The count is the ceiling. It may fall and may never rise — W1 sets it to
 * today's census; W2 drives it to 0 as each gauge migrates to the
 * trajectory. (`docs/lint-family.md § census-then-ratchet`.)
 *
 * Usage:
 *   tsx scripts/check-reconcile-chains.ts --lint     # CI gate
 *   tsx scripts/check-reconcile-chains.ts --report   # the roster
 */

import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { MUD, packSources, packSrcFiles } from './pack-roots';

const REPO_ROOT = join(MUD, '../../../..');

/**
 * ⭐ **The ceiling. It may fall; it may never rise.**
 *
 * W1's census was 8; W2 migrated Freshness, Contamination, Maturing and
 * ThermalDose to integrate `temperatureTrajectory`, marked Staling
 * `@samples` (justified by its τ-ratio), and the rest never integrated a
 * stepped temperature at all — so the ratchet is now **0**. A new
 * `reconcile*` that samples a stepped temperature over its gap fails.
 */
export const RECONCILE_CHAINS_CEILING = 0;

const SAMPLING_TOKENS = [
  'getTemperature(',
  'hostTemperatureK',
  'getOwnTemperatureK',
];

/** A clean reconcile reads the trajectory, or declares it samples. */
const CLEAN_TOKENS = ['temperatureTrajectory', '@samples'];

/**
 * A reconcile only counts if it actually integrates the temperature OVER
 * a gap — an instantaneous threshold read (a phase check at the current
 * temperature) is not a sampled integral and is out of scope.
 */
const INTEGRATION_TOKENS = ['elapsed', '.advance(', 'integrate', 'killOver'];

export interface ReconcileRow {
  file: string;
  method: string;
}

/**
 * Every `reconcile*` method body in a source file, brace-matched so a
 * nested block contributes to its own extent only. Returns the method
 * name plus the lines from its JSDoc (if any, immediately above) through
 * its closing brace — so a `@samples` marker on the doc is seen.
 */
function reconcileMethods(source: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const decl = /^\s*(?:public\s+|protected\s+|private\s+)?(?:async\s+)?(reconcile[A-Z]\w*)\s*\(/gm;
  for (const m of source.matchAll(decl)) {
    const name = m[1]!;
    const open = source.indexOf('{', m.index! + m[0].length);
    if (open === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = open; i < source.length; i++) {
      const c = source[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    // Include ONLY the JSDoc immediately above the method (nothing but
    // whitespace between its `*/` and the declaration) so a `@samples`
    // marker is in scope — without swallowing a preceding sibling method's
    // body, which would import its `getTemperature()` as a false positive.
    const before = source.slice(0, m.index).replace(/\s*$/, '');
    let docPrefix = '';
    if (before.endsWith('*/')) {
      const docStart = before.lastIndexOf('/**');
      if (docStart !== -1) docPrefix = source.slice(docStart, m.index);
    }
    out.push({ name, body: docPrefix + source.slice(open, end + 1) });
  }
  return out;
}

function sourceFiles(): string[] {
  const files = [
    ...packSrcFiles(join(MUD, 'lib')),
    ...packSrcFiles(join(MUD, 'platform')),
  ];
  for (const pack of packSources()) files.push(...packSrcFiles(pack.srcDir));
  return files.filter((f) => f.endsWith('.ts') && !f.includes('__tests__'));
}

function census(): ReconcileRow[] {
  const rows: ReconcileRow[] = [];
  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const { name, body } of reconcileMethods(source)) {
      const samples = SAMPLING_TOKENS.some((t) => body.includes(t));
      if (!samples) continue;
      const integrates = INTEGRATION_TOKENS.some((t) => body.includes(t));
      if (!integrates) continue;
      const clean = CLEAN_TOKENS.some((t) => body.includes(t));
      if (clean) continue;
      rows.push({ file: relative(REPO_ROOT, file), method: name });
    }
  }
  // Dedup by (file, method) — a method matched through both its doc-prefix
  // window and a sibling declaration counts once.
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = `${r.file}|${r.method}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.file.localeCompare(b.file) || a.method.localeCompare(b.method));
  return unique;
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--lint';
  const rows = census();

  if (mode === '--report') {
    console.log(`${rows.length} reconcile method(s) still sampling a stepped temperature\n`);
    for (const r of rows) console.log(`  ${r.method.padEnd(26)} ${r.file}`);
    return;
  }

  if (rows.length > RECONCILE_CHAINS_CEILING) {
    console.error(
      `\n✖ lint:reconcile-chains — ${rows.length} reconcile method(s) ` +
        `sample a stepped temperature over their gap; the ceiling is ` +
        `${RECONCILE_CHAINS_CEILING}.\n\n` +
        `  Integrate the publisher's temperatureTrajectory(stamp, now) ` +
        `instead of sampling the endpoint (lib/Trajectory.ts), or — if the ` +
        `sampling is justified (a τ far shorter than the gap, no stepped ` +
        `state to reconstruct) — add a \`@samples <reason>\` marker. The ` +
        `ceiling may fall; it may never rise.\n`,
    );
    for (const r of rows) console.error(`  ${r.method.padEnd(26)} ${r.file}`);
    process.exit(1);
  }

  console.log(
    `✔ lint:reconcile-chains — ${rows.length} sampling reconcile(s) ` +
      `(ceiling ${RECONCILE_CHAINS_CEILING}).`,
  );
}

if (process.argv[1] && /check-reconcile-chains\.ts$/.test(process.argv[1])) {
  main();
}
