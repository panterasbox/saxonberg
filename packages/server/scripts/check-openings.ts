/**
 * check-openings — ⭐⭐ **an opening is a judgement about a PERSON, so the
 * criterion must be nameable and the sign must be reachable.**
 *
 * Lens 6's governance limb: when a mechanism judges a person, name the
 * criterion and name the appeal. A hiring criterion is exactly that, so
 * this gate holds five things true across every pack's rows:
 *
 * 1. **The vocabulary is closed.** A `requires` key outside
 *    `{gigs, discipline, band}` is refused — no seat may select on
 *    species, lineage, trait, renown or wealth, and it must not be
 *    possible to add one by typing it in a row. (`Position.fromData`
 *    throws too; this catches it at build time instead of at boot.)
 * 2. **The words resolve.** A `band` outside the competence ladder, or a
 *    `discipline` no shipped `Discipline` row keys, is a criterion
 *    nothing can ever satisfy — a wall wearing a sign's clothes.
 * 3. ⭐ **A house that advertises must be REACHABLE.** The help-wanted
 *    sign is derived from LIVE businesses (walking past a shop may not
 *    stand one up — that would make a look an economic act), so a house
 *    authoring a `headcount` must be a `boot:` entry of its own pack, or
 *    its opening exists and nobody can ever see it.
 * 4. ⭐ **A fulfilling seat's holder must stand somewhere its house
 *    operates.** `isFulfilling` is employer-bounded, so a roster assignee
 *    in a room the business does not list silently stops fulfilling —
 *    exactly the regression the maker-marker retirement could have
 *    shipped.
 * 5. ⭐⭐ **A par line's supplier must be findable.** `restocks` resolves a
 *    supplier by the ROOM its counter stands in, so a house that lists
 *    only its counter fixture is not a supplier at all and the order is
 *    skipped silently — no decline, no log line, no posting. This is the
 *    one that ate the tailor's cloth order and the build's own
 *    more-than-one-supplier acceptance criterion.
 *
 * Plus: `confers:` must never come back (the retired seam), and
 * `fulfills` / `purchases` / `headcount` must be the types they claim.
 *
 * Ceiling 0. Self-enrols: `lint:family` derives its roster from
 * package.json.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import YAML from 'yaml';
import { CONTENT,
  effectiveDoc,
  inheritanceIndex,
  type InheritanceIndex,
} from './pack-roots';
import { COMPETENCE_BANDS } from '../src/mud/lib/advancement/CompetenceBand';
import { POSITION_REQUIREMENT_KEYS } from '../src/mud/lib/employment/Position';

// ⚠ Template inheritance: a CHILD row states no `class:`, so selecting on
// the raw field skips it SILENTLY — which reads exactly like a pass. Every
// row this gate parses goes through `effectiveDoc` first.
let _inheritIdx: InheritanceIndex | null = null;
function inheritIdx(): InheritanceIndex {
  return (_inheritIdx ??= inheritanceIndex());
}


const EXIT_ON_FINDINGS = true; // CI-gating

interface Row {
  file: string;
  pack: string;
  /** The template path this row would install at. */
  path: string;
  doc: Record<string, unknown>;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (e.endsWith('.yaml')) out.push(full);
  }
  return out;
}

const packs = readdirSync(CONTENT).filter((p) =>
  existsSync(join(CONTENT, p, 'pack.yaml')),
);

/** Every Discipline key any pack ships — the vocabulary a `requires` may name. */
const disciplines = new Set<string>();
for (const pack of packs) {
  for (const file of walk(join(CONTENT, pack, 'content'))) {
    if (!file.includes(`${'/'}idea${'/'}Discipline${'/'}`)) continue;
    disciplines.add(file.split('/').pop()!.replace(/\.yaml$/, ''));
  }
}

/** Every row that carries `positions:`, with the template path it installs at. */
const rows: Row[] = [];
/**
 * Where a thing STANDS: `agent path | fixture path → room path`, read off
 * every location row's `cast:` and `props:` lists. That is how content
 * places people and fixtures, so it is how this gate resolves "here".
 */
const roomOf = new Map<string, string>();
/** Per pack, the set of template paths its `boot:` names. */
const bootByPack = new Map<string, Set<string>>();
/**
 * ⭐ The two classes that make a room a place somebody can BUY at. Both
 * compose `ConsignmentShelfMixin` (a `Stock` counter IS a shelf too),
 * and `restocks` finds a supplier by looking for one of them.
 */
const COUNTER_CLASSES = new Set([
  '/trade/shopkeeping/thing/Stock',
  '/trade/shopkeeping/thing/ConsignmentShelf',
]);
/** Every counter row's template path. */
const counters = new Set<string>();
/** Every house's `operatingLocations`, by the path the house installs at. */
const operatingByPath = new Map<string, string[]>();
/** Every row carrying `parLines:` — the houses that order their shortfall. */
const parRows: Row[] = [];

for (const pack of packs) {
  const manifest = YAML.parse(
    readFileSync(join(CONTENT, pack, 'pack.yaml'), 'utf8'),
  ) as { boot?: Array<{ template?: string }> };
  bootByPack.set(
    pack,
    new Set((manifest.boot ?? []).map((b) => b.template ?? '')),
  );
  const contentDir = join(CONTENT, pack, 'content');
  for (const file of walk(contentDir)) {
    let doc: Record<string, unknown>;
    try {
      doc = effectiveDoc(file, (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as Record<string, unknown>, inheritIdx()) as Record<
        string,
        unknown
      >;
    } catch {
      continue; // a malformed row is another gate's finding
    }
    const data = doc.data as Record<string, unknown> | undefined;
    if (!data) continue;
    const here = `/${relative(contentDir, file).replace(/\.yaml$/, '')}`;
    for (const key of ['cast', 'props'] as const) {
      const list = data[key];
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        const path =
          typeof entry === 'string'
            ? entry
            : typeof (entry as { template?: unknown })?.template === 'string'
              ? (entry as { template: string }).template
              : '';
        if (path) roomOf.set(path, here);
      }
    }
    // ⭐ Every counter row, by the path it installs at — a `Stock` or a
    // `ConsignmentShelf` is what makes a room a place you can BUY at.
    if (COUNTER_CLASSES.has(String(doc.class ?? ''))) counters.add(here);
    // Every house that keeps a par sheet, and the operating locations of
    // every house at all — arm 5 needs both sides.
    if (Array.isArray(data.operatingLocations)) {
      operatingByPath.set(here, data.operatingLocations as string[]);
    }
    if (Array.isArray(data.parLines)) {
      parRows.push({
        file: relative(join(CONTENT, '..', '..'), file),
        pack,
        path: here,
        doc,
      });
    }
    if (!Array.isArray(data.positions)) continue;
    rows.push({
      file: relative(join(CONTENT, '..', '..'), file),
      pack,
      path: `/${relative(contentDir, file).replace(/\.yaml$/, '')}`,
      doc,
    });
  }
}

const findings: string[] = [];
const say = (row: Row, msg: string): void => {
  findings.push(`  ${row.file}\n    ${msg}`);
};

for (const row of rows) {
  const data = row.doc.data as Record<string, unknown>;
  const positions = data.positions as Array<Record<string, unknown>>;
  const operating = Array.isArray(data.operatingLocations)
    ? (data.operatingLocations as string[])
    : [];
  const roster = Array.isArray(data.rosterSlots)
    ? (data.rosterSlots as Array<Record<string, unknown>>)
    : [];

  for (const p of positions) {
    const key = String(p.key ?? '(no key)');

    // 0 — the retired seam must not creep back.
    if ('confers' in p) {
      say(
        row,
        `position '${key}' authors \`confers:\` — that seam retired with ` +
          `the trades-and-labor build. What a seat grants is \`fulfills:\` ` +
          `or \`purchases:\`, data on the seat, read off the shift.`,
      );
    }
    if ('purchases' in p && typeof p.purchases !== 'boolean') {
      say(row, `position '${key}': \`purchases\` must be a boolean`);
    }
    // ⭐ `fulfills` names WHICH orders a seat serves, and every entry has
    // to be a discipline something can actually be ordered in — a typo
    // here is a seat that is never picked, silently, forever.
    if ('fulfills' in p && p.fulfills != null) {
      if (typeof p.fulfills === 'boolean') {
        say(
          row,
          `position '${key}': \`fulfills\` is a LIST of disciplines now, ` +
            `not a flag — \`fulfills: [cooking]\`.\n    ⚠ A venue can run ` +
            `two trades off one business (the Hearthworks runs a smith and ` +
            `a cook over both its rooms), so "serves orders here" cannot ` +
            `route an order.`,
        );
      } else if (!Array.isArray(p.fulfills)) {
        say(row, `position '${key}': \`fulfills\` must be a list of disciplines`);
      } else {
        for (const d of p.fulfills as unknown[]) {
          if (typeof d !== 'string' || !disciplines.has(d)) {
            say(
              row,
              `position '${key}': \`fulfills\` names '${String(d)}', which ` +
                `keys no shipped Discipline row — an order in it can never ` +
                `route here`,
            );
          }
        }
      }
    }

    // 1/2 — the criterion vocabulary.
    if ('requires' in p && p.requires != null) {
      const r = p.requires as Record<string, unknown>;
      if (typeof r !== 'object') {
        say(row, `position '${key}': \`requires\` must be a mapping`);
      } else {
        for (const k of Object.keys(r)) {
          if (!(POSITION_REQUIREMENT_KEYS as readonly string[]).includes(k)) {
            say(
              row,
              `position '${key}': '${k}' is not a hiring criterion ` +
                `(expected one of ${POSITION_REQUIREMENT_KEYS.join(', ')}). ` +
                `A seat may ask for work done or competence held — never ` +
                `who somebody is.`,
            );
          }
        }
        if (r.gigs != null && !Number.isInteger(Number(r.gigs))) {
          say(row, `position '${key}': \`requires.gigs\` must be a whole number`);
        }
        if (r.band != null && !COMPETENCE_BANDS.includes(r.band as never)) {
          say(
            row,
            `position '${key}': \`requires.band: ${String(r.band)}\` is not a ` +
              `competence band (${COMPETENCE_BANDS.join(', ')})`,
          );
        }
        if (r.band != null && r.discipline == null) {
          say(
            row,
            `position '${key}': a \`band\` with no \`discipline\` asks nothing`,
          );
        }
        if (r.discipline != null && !disciplines.has(String(r.discipline))) {
          say(
            row,
            `position '${key}': \`requires.discipline: ${String(r.discipline)}\` ` +
              `keys no shipped Discipline row — a criterion nothing can satisfy`,
          );
        }
      }
    }

    // 3 — an advertising house must be reachable.
    if (p.headcount != null) {
      const n = Number(p.headcount);
      if (!Number.isInteger(n) || n < 1) {
        say(row, `position '${key}': \`headcount\` must be a whole number ≥ 1`);
      }
      // ⭐ A waged seat needs somewhere the wage comes FROM. A house with
      // no `banksAt` has no operating account, so `clock off` reaches the
      // pay path and throws — the shift stands, the worker is not paid,
      // and nothing anywhere said the job was unpayable. Found by driving
      // the clock against a test house that authored none.
      if (Number(p.wageRate ?? 0) > 0 && !data.banksAt) {
        say(
          row,
          `position '${key}' advertises a WAGE but this house authors no ` +
            `\`banksAt\`.\n    ⚠ There is no operating account for the wage to ` +
            `come out of: the shift settles into a throw, and the worker is ` +
            `never paid.`,
        );
      }
      const boot = bootByPack.get(row.pack) ?? new Set<string>();
      if (!boot.has(row.path)) {
        say(
          row,
          `position '${key}' advertises (\`headcount: ${String(p.headcount)}\`) but ` +
            `'${row.path}' is not a \`boot:\` entry of pack '${row.pack}'.\n` +
            `    ⭐ The help-wanted sign is derived from LIVE businesses — a ` +
            `\`look\` may not stand a house up, or walking past a shop would be\n` +
            `    an economic act. A house nobody has traded with yet is a house ` +
            `whose opening nobody can see.`,
        );
      }
    }

    // 4 — a fulfilling seat must have premises, and its rostered holders
    // must stand on them.
    if (Array.isArray(p.fulfills) && p.fulfills.length > 0) {
      if (operating.length === 0) {
        say(
          row,
          `position '${key}' fulfils but this house names no ` +
            `\`operatingLocations\`.\n    ⚠ \`isFulfilling\` is ` +
            `employer-bounded — a house with no premises fulfils NOWHERE, ` +
            `silently.`,
        );
        continue;
      }
      // The rooms the house counts as "here": the rooms it names, plus the
      // rooms the fixtures it names stand in.
      const houseRooms = new Set<string>();
      for (const where of operating) {
        houseRooms.add(where);
        const room = roomOf.get(where);
        if (room) houseRooms.add(room);
      }
      for (const slot of roster) {
        const assignee =
          typeof slot.assignee === 'string' ? slot.assignee : '';
        if (slot.positionKey !== p.key || !assignee) continue;
        const stands = roomOf.get(assignee);
        // No placement row found → placed some other way; not this gate's
        // to guess at. Only a KNOWN mismatch is a finding.
        if (!stands || houseRooms.has(stands)) continue;
        say(
          row,
          `position '${key}' fulfils and its roster holds ` +
            `'${assignee}', who stands in '${stands}' — a room this house ` +
            `does not operate.\n    ⚠ They would stand there on shift ` +
            `serving nobody, silently.`,
        );
      }
    }
  }
}

/*
 * ⭐⭐ **Arm 5 — a par line's supplier must be FINDABLE.**
 *
 * The `restocks` beat groups its short lines by supplier and looks the
 * supplier up by the ROOM its counter stands in (`counterRoomOf` walks
 * the supplier's `operatingLocations` for one holding a `Stock` or a
 * `ConsignmentShelf`, because that room is where a hauler goes and buys).
 * A supplier that lists only its counter FIXTURE has no such room — the
 * fixture's own contents are its goods — so the whole bucket is skipped
 * with a `continue` and **no log line is printed at all**.
 *
 * That is what happened to the tailor's cloth order: the general store
 * listed `/world/terminus/general-store/counter` and not the shop floor
 * it stands on, and the realm's second board posting silently never
 * existed. Nothing could see it: the brain declines nothing, the suite
 * asserts rows, and the log prints declines only.
 */
for (const row of parRows) {
  const data = row.doc.data as Record<string, unknown>;
  const lines = data.parLines as Array<Record<string, unknown>>;
  for (const line of lines) {
    const supplier = typeof line.supplier === 'string' ? line.supplier : '';
    if (!supplier) continue;
    const operating = operatingByPath.get(supplier);
    if (!operating) {
      say(
        row,
        `par line '${String(line.category ?? '?')}' names supplier ` +
          `'${supplier}', which is not a row with \`operatingLocations\`.`,
      );
      continue;
    }
    const sells = operating.some((where) =>
      [...counters].some((c) => roomOf.get(c) === where),
    );
    if (sells) continue;
    say(
      row,
      `par line '${String(line.category ?? '?')}' names supplier ` +
        `'${supplier}', whose operating locations hold no ROOM with a ` +
        `counter in it.\n    ⚠ \`restocks\` finds a supplier by the room ` +
        `its counter stands in, so this line is skipped SILENTLY — no ` +
        `decline, no log line, no posting. List the room as well as the ` +
        `fixture.`,
    );
  }
}

if (findings.length === 0) {
  console.log(
    `check-openings: ${rows.length} organization row(s) and ` +
      `${parRows.length} par sheet(s) scanned; every criterion nameable, ` +
      `every advertising house reachable, every supplier findable ✔`,
  );
  process.exit(0);
}

console.error(
  `check-openings: ${findings.length} finding(s) — the ceiling is 0.\n`,
);
for (const f of findings) console.error(f);
console.error(
  `\n⭐ An opening judges a PERSON, so lens 6's governance limb applies:\n` +
    `name the criterion, and name the appeal. Every criterion in the closed\n` +
    `vocabulary is something a player can go and DO.\n\n` +
    `See docs/design-lenses.md § 6 and docs/subsystems/employment.md.`,
);
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
