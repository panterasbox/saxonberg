/**
 * check-menu-staff — ⭐⭐ **can the house make what the house offers?**
 *
 * A menu is a promise. Nothing anywhere checked that the people rostered
 * behind it can keep it, and the failure is silent in the most expensive
 * way available: a patron orders, the verb finds a maker, the maker turns
 * out not to know the drink, and *the only place that could have said so
 * was the content tree six months earlier.*
 *
 * So this gate derives, over rows alone, what the agent-coordination
 * build derives at runtime: for every offered recipe, is there somebody
 * on this house's roster holding a seat that fulfils the recipe's
 * Discipline, whose **authored dossier** licenses work of that
 * difficulty?
 *
 * ⭐ The derivation is the shipped one, not a parallel guess:
 * `Competence.seedRunFor(band)` is the same function the dossier seeder
 * runs, and the rule is the same rule the gate at `order` applies — a
 * seeded band licenses recipes up to the difficulty its evidence is made
 * of. That is why this can be a build-time gate at all.
 *
 * ## Rules
 *
 *   1. ⭐ CENSUS + RATCHET — every (menu, recipe) pair no rostered
 *      seat-holder can make. `MENU_STAFF_SHORTFALL_CEILING` is today's
 *      count; it may fall, never rise.
 *      ⚠⚠ **It is not expected to reach 0.** Dave's Bar offers one `hard`
 *      cocktail (the mojito) and nobody on the rail can make it — and
 *      *that is the finding, not a defect to tune away*. A bar offering a
 *      drink none of its staff can mix is a standing vacancy for a
 *      skilled mixologist, which is the whole mechanism. The gate's job
 *      is to keep saying so, not to go quiet.
 *   2. ERROR — a recipe row whose `difficulty` is outside `DIFFICULTIES`.
 *      Eighteen rows shipped saying `moderate` or `simple` and were
 *      credited as `easy`, silently.
 *   3. ERROR — a `call:` outside `CALL_POLICIES` (a house's authored rule
 *      for who among the able is called). WARN until the field ships.
 *   4. ERROR — a house with a `fulfills` seat and no `call:`. With no
 *      rule the resolver declines rather than picking the first member,
 *      so the house simply never serves anybody. WARN until the field
 *      ships.
 *
 * Usage:
 *   tsx scripts/check-menu-staff.ts            # CI gate
 *   tsx scripts/check-menu-staff.ts --report   # who can make what
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Competence } from '../src/mud/lib/advancement/Competence';
import { COMPETENCE_BANDS } from '../src/mud/lib/advancement/CompetenceBand';
import { DIFFICULTIES } from '../src/mud/lib/advancement/ActSignature';
import { effectiveDoc, inheritanceIndex, type InheritanceIndex } from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/**
 * ⭐ **Census-then-ratchet**, and ⚠ **not a burn-down to zero.** See rule 1:
 * the residue is the realm's standing vacancies, and they are content the
 * build means to keep.
 *
 * ⭐ Ratcheted 11 → 3 once `lint:dossiers` rule 6 went in: eight of the
 * eleven turned out to be the same authoring omission read from the other
 * side — a hand seated to a trade with no claim in it, or a claim too low
 * for the only difficulty its own board offers. A yard that cannot run its
 * own still is a defect; the three that remain are not:
 *
 *   · `fine-roast` (cooking · hard) — the Hearthworks has no expert cook,
 *     and an opening for one is the point.
 *   · `leather-jerkin` (tailoring · hard) — no seat there fulfils tailoring
 *     at all; the smithy offers it and means to hire for it.
 *   · `mojito` (mixology · hard) — ruled deliberately unmakeable: the bar
 *     offers a drink nobody on the rail can mix, which is what makes the
 *     refusal that names a criterion worth reading.
 */
export const MENU_STAFF_SHORTFALL_CEILING = 3;

/**
 * ⚠ A fact about the past: the shortfall the day the gate landed. Never
 * edit it down.
 */
export const MENU_STAFF_HIGH_WATER = 11;

/**
 * The call policies a house may author. ⚠ Mirrors
 * `lib/employment/CallPolicy.ts`'s `CALL_POLICIES`; until that ships, the
 * `call:` arms are WARN (`CALL_FIELD_SHIPPED = false`) so the gate can
 * census the realm before the field exists.
 */
const CALL_POLICIES = ['regulars', 'rota'];
const CALL_FIELD_SHIPPED = true;

let _inheritIdx: InheritanceIndex | null = null;
function inheritIdx(): InheritanceIndex {
  return (_inheritIdx ??= inheritanceIndex());
}

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
        const raw = effectiveDoc(
          abs,
          parsed as Record<string, unknown>,
          inheritIdx(),
        );
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

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

interface RecipeFacts {
  id: string;
  discipline: string;
  difficulty: string;
  file: string;
}

/** Every rostered seat-holder, with the seat's grants and their dossier. */
interface Holder {
  assignee: string;
  positionKey: string;
  fulfills: string[];
  bands: Map<string, string>;
}

interface House {
  row: Row;
  locations: string[];
  holders: Holder[];
  hasFulfillingSeat: boolean;
}

/**
 * ⭐ The shipped rule, applied to an authored band: a seeded history is
 * made of work at one difficulty, and it licenses nothing harder. This is
 * the same arithmetic the runtime gate at `order` runs, which is the only
 * reason a promise about people can be checked at build time at all.
 */
export function licenses(band: string, difficulty: string): boolean {
  if (!COMPETENCE_BANDS.includes(band as never)) return false;
  const run = Competence.seedRunFor(band as never);
  if (!run || run.count <= 0) return false;
  return (
    DIFFICULTIES.indexOf(difficulty as never) <=
    DIFFICULTIES.indexOf(run.difficulty as never)
  );
}

/** `d` plus every discipline it specializes, transitively. */
export function ancestryOf(
  d: string,
  parents: ReadonlyMap<string, readonly string[]>,
): Set<string> {
  const out = new Set<string>();
  const walk = (k: string): void => {
    if (out.has(k)) return;
    out.add(k);
    for (const p of parents.get(k) ?? []) walk(p);
  };
  walk(d);
  return out;
}

function main(): void {
  const report = process.argv.includes('--report');
  const rows = contentRows();
  const failures: string[] = [];
  const warnings: string[] = [];

  // ── the three indexes the derivation needs ───────────────────────────
  const recipes = new Map<string, RecipeFacts>();
  /** discipline key → the keys it specializes (its parents). */
  const parents = new Map<string, string[]>();
  const byPath = new Map<string, Row>();
  /** a propped/cast thing's path → the location rows that place it. */
  const placedIn = new Map<string, string[]>();

  for (const row of rows) {
    byPath.set(row.path, row);
    if (typeof row.raw.recipeId === 'string') {
      const id = row.raw.recipeId;
      const difficulty =
        typeof row.raw.difficulty === 'string' ? row.raw.difficulty : '';
      if (difficulty && !DIFFICULTIES.includes(difficulty as never)) {
        failures.push(
          `${row.file}: recipe '${id}' has difficulty '${difficulty}', which ` +
            `is not a difficulty (${DIFFICULTIES.join(' · ')}). The craft ` +
            `ledger credits an unrecognized word as 'easy', silently.`,
        );
      }
      recipes.set(id, {
        id,
        discipline:
          typeof row.raw.discipline === 'string' ? row.raw.discipline : '',
        difficulty,
        file: row.file,
      });
    }
    if (row.raw.class === '/platform/idea/Discipline') {
      const key = row.data.key;
      if (typeof key === 'string') {
        parents.set(key, strList(row.data.specializes));
      }
    }
    for (const prop of [...strList(row.data.props), ...strList(row.data.cast)]) {
      placedIn.set(prop, [...(placedIn.get(prop) ?? []), row.path]);
    }
  }

  // ── the houses ───────────────────────────────────────────────────────
  const houses: House[] = [];
  for (const row of rows) {
    const positions = Array.isArray(row.data.positions)
      ? (row.data.positions as Record<string, unknown>[])
      : [];
    if (!positions.length) continue;
    const seatGrants = new Map<string, string[]>();
    for (const p of positions) {
      if (!p || typeof p !== 'object') continue;
      const key = typeof p.key === 'string' ? p.key : '';
      if (!key) continue;
      seatGrants.set(key, strList(p.fulfills));
    }
    const hasFulfillingSeat = [...seatGrants.values()].some((f) => f.length > 0);

    // Rules 3 + 4 — the house's authored rule for who it calls.
    const call = typeof row.data.call === 'string' ? row.data.call.trim() : '';
    if (call && !CALL_POLICIES.includes(call)) {
      const msg =
        `${row.file}: call: '${call}' is not a call policy ` +
        `(${CALL_POLICIES.join(' · ')}).`;
      (CALL_FIELD_SHIPPED ? failures : warnings).push(msg);
    }
    if (hasFulfillingSeat && !call) {
      const msg =
        `${row.file}: a house with a 'fulfills' seat and no 'call:'. With ` +
        `no rule the resolver declines rather than picking the first ` +
        `member, so this house serves nobody.`;
      (CALL_FIELD_SHIPPED ? failures : warnings).push(msg);
    }

    const holders: Holder[] = [];
    const slots = Array.isArray(row.data.rosterSlots)
      ? (row.data.rosterSlots as Record<string, unknown>[])
      : [];
    for (const slot of slots) {
      if (!slot || typeof slot !== 'object') continue;
      const assignee = typeof slot.assignee === 'string' ? slot.assignee : '';
      const positionKey =
        typeof slot.positionKey === 'string' ? slot.positionKey : '';
      if (!assignee || !positionKey) continue;
      const person = byPath.get(assignee);
      const bands = new Map<string, string>();
      const competence = Array.isArray(person?.data.competence)
        ? (person!.data.competence as Record<string, unknown>[])
        : [];
      for (const c of competence) {
        if (!c || typeof c !== 'object') continue;
        if (typeof c.discipline === 'string' && typeof c.asserting === 'string') {
          bands.set(c.discipline, c.asserting);
        }
      }
      holders.push({
        assignee,
        positionKey,
        fulfills: seatGrants.get(positionKey) ?? [],
        bands,
      });
    }
    houses.push({
      row,
      locations: strList(row.data.operatingLocations),
      holders,
      hasFulfillingSeat,
    });
  }

  // ── the menus ────────────────────────────────────────────────────────
  let shortfall = 0;
  const inventory: string[] = [];
  const unhoused: string[] = [];

  for (const row of rows) {
    const offered = strList(row.data.offeredRecipes);
    if (!offered.length) continue;
    const places = placedIn.get(row.path) ?? [];
    const house = houses.find((h) =>
      h.locations.some((loc) => places.includes(loc)),
    );
    if (!house) {
      // ⚠ Not a failure: a menu row may be an archetype's, propped by a
      // parent row this reader resolves through `extends:` but whose
      // house is minted at runtime. Reported, never gated.
      unhoused.push(`${row.file}: no house found for this menu.`);
      continue;
    }
    for (const id of offered) {
      const recipe = recipes.get(id);
      if (!recipe) {
        failures.push(
          `${row.file}: offers '${id}', which is no shipped recipe. The ` +
            `line is unorderable and nothing says so.`,
        );
        continue;
      }
      // No discipline or no ladder placement ⇒ ungated by design (the
      // serving rows: a pint is poured, not mixed).
      if (!recipe.discipline || !recipe.difficulty) {
        if (report) inventory.push(`  ${id} — ungated (no discipline/difficulty)`);
        continue;
      }
      const wants = ancestryOf(recipe.discipline, parents);
      const able = house.holders.filter(
        (h) =>
          h.fulfills.some((f) => wants.has(f)) &&
          licenses(h.bands.get(recipe.discipline) ?? '', recipe.difficulty),
      );
      if (!able.length) {
        shortfall++;
        const seated = house.holders.filter((h) =>
          h.fulfills.some((f) => wants.has(f)),
        );
        warnings.push(
          `${row.file}: nobody on ${house.row.path} can make '${id}' ` +
            `(${recipe.discipline} · ${recipe.difficulty}). ` +
            (seated.length
              ? `Seated to: ${seated
                  .map(
                    (h) =>
                      `${h.assignee.split('/').pop()} ` +
                      `(${h.bands.get(recipe.discipline) ?? 'no claim'})`,
                  )
                  .join(', ')}.`
              : `No seat here fulfils ${recipe.discipline}.`),
        );
      } else if (report) {
        inventory.push(
          `  ${id} (${recipe.discipline} · ${recipe.difficulty}) → ` +
            able.map((h) => h.assignee.split('/').pop()).join(', '),
        );
      }
    }
  }

  if (report) {
    console.log(
      `${houses.length} house(s) with positions · ${recipes.size} recipe(s) ` +
        `· shortfall ${shortfall}\n`,
    );
    console.log('Makeable:');
    console.log(inventory.sort().join('\n'));
    if (unhoused.length) {
      console.log(`\nMenus with no resolvable house (${unhoused.length}):`);
      for (const u of unhoused) console.log(`  ${u}`);
    }
    console.log('');
  }

  if (warnings.length) {
    console.warn(`\n⚠ lint:menu-staff — ${warnings.length} finding(s):\n`);
    for (const w of warnings) console.warn(`  ${w}\n`);
  }

  if (shortfall > MENU_STAFF_SHORTFALL_CEILING) {
    failures.push(
      `${shortfall} offered line(s) nobody rostered can make, above the ` +
        `ceiling of ${MENU_STAFF_SHORTFALL_CEILING}. ⭐ The census may ` +
        `fall, never rise.`,
    );
  }

  if (failures.length) {
    console.error(`\n✖ lint:menu-staff — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `✔ lint:menu-staff — ${shortfall} offered line(s) nobody can make, at ` +
      `or under the ceiling of ${MENU_STAFF_SHORTFALL_CEILING}.`,
  );
}

if (process.argv[1] && /check-menu-staff\.ts$/.test(process.argv[1])) main();
