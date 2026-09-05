/**
 * check-dispositions — ⭐ **an authored personality trait must land.**
 *
 * `BehavedMixin._seedDispositions` seeds a host's authored
 * `dispositions:` into the trait ledger as `claim` evidence. The seeder
 * does not validate the axis key, and neither does the estimator: a row
 * naming an axis that does not exist is written, read back, matched
 * against nothing, and **contributes to no trait position** — silently.
 * The character is simply less of a person than the author wrote, and
 * nothing anywhere says so.
 *
 * Measured before this gate existed: **five authored valences across
 * four rows resolved to no axis** — `greed` (a sign-flipped
 * `generosity`), `gregariousness` (a synonym for `sociability`), and
 * `candor` / `warmth`, which the roster was genuinely short of. Two of
 * those were real vocabulary gaps and were added; two were renames. All
 * four were invisible.
 *
 * ⭐ **This is a move, not an invention.** `lib/npc/tree.ts` already
 * validates `trait:<key>` guard facts against `DISPOSITION_AXES` — at
 * dialogue-authoring time, for one consumer. The vocabulary is the same
 * one; this gate applies it to the **seeding** path, at build time,
 * across every shipped pack, and covers the dialogue guards too so a
 * misspelt guard fact fails the build rather than one tree.
 *
 * ## Rules
 *
 *   1. ERROR — a `disposition:` key that is not in `DISPOSITION_KEYS`.
 *   2. ERROR — a `valence` that is not a finite number in [-100, 100].
 *      A valence outside the band is clamped by the estimator, so an
 *      authored 500 reads exactly as 100 and the author never learns it.
 *   3. ERROR — a dialogue guard `fact: trait:<key>` whose key is not in
 *      `DISPOSITION_KEYS`.
 *
 * No exemption list. A key that ought to exist is a roster edit
 * (`lib/trait/Disposition.ts`), which is a design conversation and reads
 * as one.
 *
 * Usage:
 *   tsx scripts/check-dispositions.ts            # CI gate
 *   tsx scripts/check-dispositions.ts --report   # the inventory
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { DISPOSITION_KEYS } from '../src/mud/lib/trait/Disposition';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

const KEYS = new Set<string>(DISPOSITION_KEYS);

interface Finding {
  file: string;
  message: string;
}

/** Every `*.yaml` under `packages/content/<pack>/content/`. */
function contentFiles(): string[] {
  const out: string[] = [];
  if (!existsSync(CONTENT)) return out;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (entry.endsWith('.yaml')) out.push(abs);
    }
  };
  for (const pack of readdirSync(CONTENT).sort()) {
    const abs = join(CONTENT, pack, 'content');
    if (existsSync(abs) && statSync(abs).isDirectory()) walk(abs);
  }
  return out;
}

/** The nearest hint of which axis an unknown key was reaching for. */
function nearest(key: string): string {
  const lower = key.toLowerCase();
  const hit = DISPOSITION_KEYS.find(
    (k) => k.startsWith(lower.slice(0, 3)) || lower.startsWith(k.slice(0, 3)),
  );
  return hit ? ` (did you mean '${hit}'?)` : '';
}

/**
 * Walk a parsed row, collecting every disposition seed and every
 * dialogue guard fact wherever they sit. The shapes are nested at
 * different depths in different packs, so this is a structural walk
 * rather than a path lookup — a seed the walk cannot see is a seed the
 * gate would silently pass, which is the failure it exists to stop.
 */
function inspect(node: unknown, file: string, found: Finding[], seen: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) inspect(item, file, found, seen);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as Record<string, unknown>;

  if ('disposition' in rec) {
    const key = rec.disposition;
    if (typeof key !== 'string') {
      found.push({ file, message: `a 'disposition' that is not a string: ${JSON.stringify(key)}` });
    } else {
      seen.add(key);
      if (!KEYS.has(key)) {
        found.push({
          file,
          message: `disposition '${key}' resolves to no axis${nearest(key)} — the seed is written and contributes nothing.`,
        });
      }
      const v = rec.valence;
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        found.push({ file, message: `disposition '${key}' has no numeric 'valence'.` });
      } else if (v < -100 || v > 100) {
        found.push({
          file,
          message: `disposition '${key}' valence ${v} is outside [-100, 100] — the estimator clamps it, so the authored number is not the one that lands.`,
        });
      }
    }
  }

  if (typeof rec.fact === 'string' && rec.fact.startsWith('trait:')) {
    const key = rec.fact.slice('trait:'.length);
    seen.add(key);
    if (!KEYS.has(key)) {
      found.push({
        file,
        message: `dialogue guard 'trait:${key}' resolves to no axis${nearest(key)} — the branch can never be taken.`,
      });
    }
  }

  for (const value of Object.values(rec)) inspect(value, file, found, seen);
}

function main(): void {
  const report = process.argv.includes('--report');
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const file of contentFiles()) {
    let parsed: unknown;
    try {
      parsed = YAML.parse(readFileSync(file, 'utf8'));
    } catch {
      continue; // a malformed row is another gate's finding
    }
    inspect(parsed, relative(REPO_ROOT, file), findings, seen);
  }

  if (report) {
    console.log(`Roster: ${DISPOSITION_KEYS.length} axes.`);
    const unused = DISPOSITION_KEYS.filter((k) => !seen.has(k));
    console.log(`Authored: ${[...seen].filter((k) => KEYS.has(k)).sort().join(', ')}`);
    console.log(`Never authored: ${unused.join(', ') || '(none)'}`);
  }

  if (findings.length) {
    console.error(`\n✖ lint:dispositions — ${findings.length} authored trait(s) land nowhere:\n`);
    for (const f of findings) console.error(`  ${f.file}\n    ${f.message}`);
    console.error(
      `\nThe roster lives in packages/server/src/mud/lib/trait/Disposition.ts. ` +
        `Adding an axis is a design change, not a list edit.\n`,
    );
    process.exit(1);
  }
  console.log(`✔ lint:dispositions — every authored disposition resolves to an axis.`);
}

main();
