/**
 * The lint family, run as one gate.
 *
 * The roster is DERIVED from `package.json` — every `lint:*` script
 * except this one — so adding a gate makes it run everywhere (CI, the
 * pre-merge sweep, a local check) with no list to remember to edit.
 *
 * That derivation is the point. Before it, 25 gates existed, CI ran 19,
 * CLAUDE.md documented 13 and the /finalize skill named 3; four gates
 * documented as "CI-gating" were in no pipeline at all. Per-gate
 * rationale lives in docs/lint-family.md.
 *
 *   pnpm lint:family            run every gate, report all failures
 *   pnpm lint:family --list     print the roster and exit
 *   pnpm lint:family --bail     stop at the first failure
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(here, '..', 'package.json');
const scripts: Record<string, string> = JSON.parse(
  readFileSync(pkgPath, 'utf8')
).scripts;

const SELF = 'lint:family';
const roster = Object.keys(scripts)
  .filter((s) => s.startsWith('lint:') && s !== SELF)
  .sort();

const list = process.argv.includes('--list');
const bail = process.argv.includes('--bail');

if (list) {
  console.log(`${roster.length} gates:`);
  for (const g of roster) console.log(`  ${g.padEnd(28)} ${scripts[g]}`);
  process.exit(0);
}

console.log(`lint:family — ${roster.length} gates\n`);

const failed: string[] = [];
for (const gate of roster) {
  const started = Date.now();
  const run = spawnSync('pnpm', ['-s', 'run', gate], {
    cwd: resolve(here, '..'),
    encoding: 'utf8',
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const ok = run.status === 0;
  if (!ok) failed.push(gate);
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${gate.padEnd(28)} ${secs}s`);
  if (!ok) {
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`.trimEnd();
    if (out) console.log(out.replace(/^/gm, '        '));
    if (bail) break;
  }
}

if (failed.length) {
  console.log(`\n${failed.length} of ${roster.length} FAILED: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\nall ${roster.length} gates pass`);
