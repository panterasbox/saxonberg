/**
 * check-pathogens — ⭐ **an authored pathogen must be able to reach a
 * body, and every one of its numbers must be there.**
 *
 * `lint:perishable` exists because *missing enabling data fails CLOSED and
 * SILENT*: a perishable material on a class that cannot rot simply never
 * rots, with nothing anywhere to say so. The second population has the
 * same failure mode and a worse one, because it is **invisible by design**
 * — there is no band, no smell, no reading. A pathogen row that is subtly
 * wrong does not look wrong to anybody, ever: the suite is green, the food
 * is contaminated, and the eater is fine.
 *
 * So this gate reads the roster as data and checks the three ways a row
 * can be quietly inert:
 *
 *   1. **A row under `Condition/pathogen/` that authors no
 *      `pathogenBehavior`.** It warms as a Condition, resolves to a live
 *      Idea, and answers `null` to every question the growth law asks.
 *   2. **A missing or malformed constant.** Every field the law reads is
 *      required, and each is checked for kind and range — an absent
 *      `killK` would make an organism immortal in an oven and a
 *      mistyped `awFloor` would make it grow in salt.
 *   3. ⚠⚠ **An `intoxicate` row whose toxin has no `Condition` row.** This
 *      is the silent one: the population grows, deposits a formed toxin
 *      with a type nothing resolves, `Metabolic.resolveToxinBehavior`
 *      returns null, its caller does `if (!behavior) continue`, and the
 *      poison does *nothing at all*. That is exactly how the material
 *      catalogue's gap shipped, and exactly how `feel` / `taste` shipped
 *      without ever having run.
 *
 * And the converse, because the reach words are a closed set: a
 * `reach: infect` row must NOT author a toxin (it would never be read),
 * and a `reach: intoxicate` row MUST.
 *
 * No exemption list, by design. A pathogen that legitimately breaks one of
 * these rules is a design conversation, not a list edit.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/** Where the roster lives, and where its toxins' own rows must live. */
const PATHOGEN_DIR = 'platform/idea/Condition/pathogen';
const TOXIN_DIR = 'platform/idea/Condition/metabolism';

/** Every constant the growth law reads, with the range it must sit in. */
const REQUIRED_NUMBERS: Record<string, [number, number]> = {
  muMaxPerHour: [0, 100],
  activationEnergy: [0, 500000],
  referenceK: [200, 600],
  minGrowthK: [200, 400],
  killK: [280, 500],
  killRatePerHour: [0, 1000],
  killActivationEnergy: [0, 800000],
  awFloor: [0, 1],
  inoculum: [0, 1],
  infectiousDose: [0, 1],
};

/** Ranges for the optional constants, checked only when present. */
const OPTIONAL_NUMBERS: Record<string, [number, number]> = {
  germinationK: [200, 500],
  killSurvivalFraction: [0, 1],
  inHostPerHour: [0, 100],
  incubationSec: [0, 604800],
};

interface Row {
  key: string;
  file: string;
  data: Record<string, unknown>;
}

function rowsIn(dir: string): Row[] {
  const out: Row[] = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT)) {
    const abs = join(CONTENT, pack, 'content', dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.yaml')) continue;
      const file = join(abs, f);
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf8'));
      } catch {
        continue; // a malformed row is another gate's finding
      }
      if (!parsed || typeof parsed !== 'object') continue;
      const r = parsed as { data?: unknown };
      out.push({
        key: f.replace(/\.yaml$/, ''),
        file: relative(REPO_ROOT, file),
        data: (r.data ?? {}) as Record<string, unknown>,
      });
    }
  }
  return out;
}

function main(): void {
  const pathogens = rowsIn(PATHOGEN_DIR);
  const toxins = new Set(rowsIn(TOXIN_DIR).map((r) => r.key));
  const failures: string[] = [];

  for (const row of pathogens) {
    const where = `${row.file}`;
    const behavior = row.data.pathogenBehavior;
    if (!behavior || typeof behavior !== 'object' || Array.isArray(behavior)) {
      failures.push(
        `${where}: a row under Condition/pathogen/ with no ` +
          `'pathogenBehavior' block — it warms, resolves, and answers null ` +
          `to every question the growth law asks.`,
      );
      continue;
    }
    const b = behavior as Record<string, unknown>;

    const reach = b.reach;
    if (reach !== 'infect' && reach !== 'intoxicate') {
      failures.push(
        `${where}: 'reach' must be 'infect' or 'intoxicate' (got ${JSON.stringify(reach)}).`,
      );
    }

    for (const [field, [lo, hi]] of Object.entries(REQUIRED_NUMBERS)) {
      const v = b[field];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        failures.push(`${where}: '${field}' is required and must be a number.`);
      } else if (v < lo || v > hi) {
        failures.push(`${where}: '${field}' = ${v} is outside [${lo}, ${hi}].`);
      }
    }
    for (const [field, [lo, hi]] of Object.entries(OPTIONAL_NUMBERS)) {
      const v = b[field];
      if (v === undefined) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
        failures.push(
          `${where}: '${field}' = ${JSON.stringify(v)} must be a number in [${lo}, ${hi}].`,
        );
      }
    }

    // The growth window has to BE a window.
    const min = b.minGrowthK;
    const kill = b.killK;
    if (typeof min === 'number' && typeof kill === 'number' && min >= kill) {
      failures.push(
        `${where}: minGrowthK (${min}) is at or above killK (${kill}) — the ` +
          `organism can never grow at any temperature.`,
      );
    }
    const germ = b.germinationK;
    if (typeof germ === 'number' && typeof kill === 'number' && germ > kill) {
      failures.push(
        `${where}: germinationK (${germ}) is above killK (${kill}) — the lag ` +
          `band is inverted.`,
      );
    }

    // ⚠ The channels field exists so the SILENCE is stated. A roster row
    // that names a sense is a design change, and should read as one.
    if (!Array.isArray(b.channels)) {
      failures.push(
        `${where}: 'channels' is required (and ships empty — the absence of ` +
          `a tell is the design, and this field is where it is stated).`,
      );
    } else if (b.channels.length > 0) {
      failures.push(
        `${where}: 'channels' is not empty. A contaminated item must be ` +
          `indistinguishable from a clean one by every sense (requirement ` +
          `D4). If this is a deliberate design change, change the gate too.`,
      );
    }

    // The reach/toxin agreement, and the silent-failure check.
    const toxin = b.toxin as Record<string, unknown> | undefined;
    if (reach === 'intoxicate') {
      if (!toxin || typeof toxin !== 'object') {
        failures.push(
          `${where}: reach 'intoxicate' with no 'toxin' block — it poisons ` +
            `nothing, which is the one thing it exists to do.`,
        );
      } else {
        const type = toxin.type;
        if (typeof type !== 'string' || type.length === 0) {
          failures.push(`${where}: 'toxin.type' must be a Condition key.`);
        } else if (!toxins.has(type)) {
          failures.push(
            `${where}: 'toxin.type' = '${type}' has no Condition row at ` +
              `${TOXIN_DIR}/${type}.yaml. The dose would be deposited, ` +
              `resolve to null, and be skipped — silently.`,
          );
        }
        const scale = toxin.scaleMg;
        if (typeof scale !== 'number' || !(scale > 0)) {
          failures.push(`${where}: 'toxin.scaleMg' must be a positive number.`);
        }
        const labile = toxin.labileAtK;
        if (labile !== undefined && (typeof labile !== 'number' || labile <= 0)) {
          failures.push(`${where}: 'toxin.labileAtK' must be a temperature (K).`);
        }
      }
    } else if (toxin !== undefined) {
      failures.push(
        `${where}: reach 'infect' must not author a 'toxin' — nothing reads ` +
          `it, so the poison would simply never exist.`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\ncheck-pathogens: ${failures.length} problem(s)\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error('');
    process.exit(1);
  }
  console.log(
    `check-pathogens: ${pathogens.length} pathogen row(s) authored and reachable`,
  );
}

main();
