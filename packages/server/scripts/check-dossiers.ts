/**
 * check-dossiers — ⭐ **assert-vs-derive: what an author says a character
 * should read as, and what the world will actually say.**
 *
 * A dossier states its intent. `asserting: competent` is the author
 * saying what this *should* read as — which is the one property that
 * keeps a dossier from drifting back into a stat sheet, because **a
 * declared value cannot disagree with itself and a seeded history can.**
 * Without this gate the whole design is a longer way of writing numbers
 * down.
 *
 * The failure it exists to catch is silent by construction: the seeder
 * appends evidence until the estimator derives the asserted band, and if
 * no run reaches it (or the Discipline does not exist, or the band is
 * misspelt) the character simply reads as less than the author wrote,
 * with nothing anywhere to say so. Exactly the shape of the five authored
 * dispositions that landed nowhere before `lint:dispositions`.
 *
 * ## Rules
 *
 *   1. ERROR — a dossier with no `archetype:`. ⚠ The stamp is
 *      **unrecoverable later**: `deviation = current derived − archetype
 *      baseline` needs to know which baseline, and unwinding a sum with
 *      no seams is not possible afterwards at any price. It costs one
 *      field now.
 *   2. ERROR — a `competence[].discipline` that resolves to no shipped
 *      Discipline row.
 *   3. ERROR — an `asserting:` outside its vocabulary (the competence
 *      bands, or the standing bands for renown).
 *   4. ⭐⭐ ERROR — **an assertion the estimator cannot derive.**
 *      `Competence.seedRunFor` is run for real, and its fold compared to
 *      the assertion. This is the assert-vs-derive check proper, and it
 *      is possible only because the estimator is a pure function of its
 *      evidence.
 *   5. WARN + RATCHET — a `Cast` row carrying no dossier at all. Census
 *      today's count as the ceiling; it may fall, never rise. ⚠ This is
 *      the reachability failure the plan flagged: *a Cast with no dossier
 *      reads exactly as it does today*, which is the whole problem the
 *      build exists to fix, and it fails by looking normal.
 *
 * ## ⚠ What it deliberately does NOT check: renown
 *
 * Renown's derive is **not** a pure function of its seeds. It reads the
 * value function from AppSettings, emote valences from the Emote
 * documents, and the world clock (decay is real). So an authored
 * `asserting: familiar` cannot be folded at build time the way a
 * competence band can — the very property that makes rule 4 worth
 * having. The renown assertion's **vocabulary** is checked here; its
 * **arithmetic** is checked at seed time by
 * `RenownApi.seedTo`, which searches the live value function and writes
 * nothing at all if it cannot reach the band.
 *
 * Usage:
 *   tsx scripts/check-dossiers.ts            # CI gate
 *   tsx scripts/check-dossiers.ts --report   # the inventory
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Competence } from '../src/mud/lib/advancement/Competence';
import { COMPETENCE_BANDS } from '../src/mud/lib/advancement/CompetenceBand';
import { DEFAULT_BAND_THRESHOLDS } from '../src/mud/lib/standing/Band';
import { composesMixin, packSources } from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/**
 * ⭐ **Census-then-ratchet.** Today's count of dossier-less `Cast` rows
 * is the ceiling; it may fall and never rise. Lower this number when it
 * falls — that is the ratchet, and it is what makes stopping the growth
 * affordable before anyone has time to fill every row in.
 */
const UNDOSSIERED_CAST_CEILING = 33;

const STANDING_BANDS = DEFAULT_BAND_THRESHOLDS.map((t) => t.name);

const SOURCES = packSources();
const rungCache = new Map<string, boolean>();

/**
 * ⚠ The rung is resolved from the class FILE, never by a string suffix.
 * A `endsWith('/Cast')` check silently missed every pack-owned character
 * class (Katie, Walter, the Realtor, the ticket clerk, Gus) — five people
 * the ratchet would have counted as not existing.
 */
const isCast = (classPath: string): boolean =>
  composesMixin(classPath, 'CastMixin', SOURCES, rungCache);

interface Row {
  path: string;
  file: string;
  raw: Record<string, unknown>;
  data: Record<string, unknown>;
}

function contentRows(): Row[] {
  const out: Row[] = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT).sort()) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) {
          walk(abs);
          continue;
        }
        if (!entry.endsWith('.yaml')) continue;
        let parsed: unknown;
        try {
          parsed = YAML.parse(readFileSync(abs, 'utf8'));
        } catch {
          continue;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          continue;
        }
        const raw = parsed as Record<string, unknown>;
        out.push({
          path: '/' + relative(root, abs).replace(/\.yaml$/, ''),
          file: relative(REPO_ROOT, abs),
          raw,
          data: (raw.data ?? {}) as Record<string, unknown>,
        });
      }
    };
    walk(root);
  }
  return out;
}

/** Every shipped Discipline key, from the rows themselves. */
function disciplineKeys(rows: Row[]): Set<string> {
  const out = new Set<string>();
  for (const row of rows) {
    if (row.raw.class !== '/platform/idea/Discipline') continue;
    const key = row.data.key;
    if (typeof key === 'string') out.add(key);
  }
  return out;
}

function main(): void {
  const report = process.argv.includes('--report');
  const rows = contentRows();
  const disciplines = disciplineKeys(rows);
  const failures: string[] = [];
  const warnings: string[] = [];
  let undossieredCast = 0;
  const inventory: string[] = [];

  for (const row of rows) {
    if (!Array.isArray(row.data.behaviors)) continue;
    const cls = typeof row.raw.class === 'string' ? row.raw.class : '';
    // The rung is `lint:identity`'s question; this gate only needs to
    // know a dossier when it sees one, plus which rows are eligible.
    const competence = Array.isArray(row.data.competence)
      ? (row.data.competence as Record<string, unknown>[])
      : [];
    const renown = Array.isArray(row.data.renown)
      ? (row.data.renown as Record<string, unknown>[])
      : [];
    const prologue = Array.isArray(row.data.prologue)
      ? (row.data.prologue as unknown[])
      : [];
    const hasDossier =
      competence.length > 0 || renown.length > 0 || prologue.length > 0;
    const archetype =
      typeof row.data.archetype === 'string' ? row.data.archetype.trim() : '';
    const where = row.file;

    if (hasDossier && !archetype) {
      failures.push(
        `${where}: a dossier with no 'archetype:'. The stamp records WHICH ` +
          `archetype minted these rows, and 'deviation = current derived − ` +
          `archetype baseline' is uncomputable without it. ⚠ It costs one ` +
          `field now and is unrecoverable later — a sum with no seams ` +
          `cannot be unwound afterwards at any price.`,
      );
    }

    for (const claim of competence) {
      const discipline = claim.discipline;
      const asserting = claim.asserting;
      if (typeof discipline !== 'string' || !disciplines.has(discipline)) {
        failures.push(
          `${where}: competence names Discipline ` +
            `${JSON.stringify(discipline)}, which has no row. The seed ` +
            `would be written against a key nothing resolves and read back ` +
            `by nobody.`,
        );
        continue;
      }
      if (
        typeof asserting !== 'string' ||
        !COMPETENCE_BANDS.includes(asserting as never)
      ) {
        failures.push(
          `${where}: competence in '${discipline}' asserts ` +
            `${JSON.stringify(asserting)}, which is not a band ` +
            `(${COMPETENCE_BANDS.join(' · ')}).`,
        );
        continue;
      }
      // ⭐⭐ Rule 4 — the assert-vs-derive proper. The seeder's own ladder
      // is run and its fold compared to the assertion.
      const run = Competence.seedRunFor(asserting as never);
      if (!run) {
        failures.push(
          `${where}: competence in '${discipline}' asserts '${asserting}', ` +
            `and NO run of evidence the seeder can write derives it. The ` +
            `character would read as less than what is written here, ` +
            `silently.`,
        );
        continue;
      }
      const derived = Competence.bandOf(
        Array.from({ length: run.count }, () => ({
          difficulty: run.difficulty,
          outcome: 'success' as const,
          when: null,
        })),
      );
      if (derived !== asserting) {
        failures.push(
          `${where}: competence in '${discipline}' asserts '${asserting}' ` +
            `but the seeded evidence derives '${derived}'.`,
        );
      }
      if (report) {
        inventory.push(
          `  ${row.path} · ${discipline} → ${asserting} ` +
            `(${run.count} × ${run.difficulty})`,
        );
      }
    }

    for (const claim of renown) {
      const asserting = claim.asserting;
      if (
        typeof asserting !== 'string' ||
        !STANDING_BANDS.includes(asserting as never)
      ) {
        failures.push(
          `${where}: renown asserts ${JSON.stringify(asserting)}, which is ` +
            `not a standing band (${STANDING_BANDS.join(' · ')}).`,
        );
      }
      if (claim.scope !== undefined && typeof claim.scope !== 'string') {
        failures.push(
          `${where}: renown 'scope' must be a string (a locality prefix or ` +
            `a group ref) or absent for Compact-wide.`,
        );
      }
    }

    // Rule 5 — the ratchet. A Cast row with no dossier reads exactly as
    // it did before this build, which is the failure mode to watch.
    if (cls && isCast(cls)) {
      if (!hasDossier) {
        undossieredCast++;
        warnings.push(`${where}: a Cast row with no dossier.`);
      }
    }
  }

  if (report) {
    console.log(`Competence assertions (${inventory.length}):`);
    console.log(inventory.sort().join('\n'));
  }
  if (undossieredCast > UNDOSSIERED_CAST_CEILING) {
    failures.push(
      `${undossieredCast} Cast row(s) carry no dossier, above the ceiling ` +
        `of ${UNDOSSIERED_CAST_CEILING}. ⭐ The census may fall, never rise ` +
        `— lower UNDOSSIERED_CAST_CEILING when it does.\n` +
        warnings.map((w) => `      ${w}`).join('\n'),
    );
  }

  if (failures.length) {
    console.error(`\n✖ lint:dossiers — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `✔ lint:dossiers — every asserted band is one the estimator derives, ` +
      `and every dossier names the archetype that minted it.`,
  );
}

main();
