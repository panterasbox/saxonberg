/**
 * check-identity — ⭐ **the world must agree with the prose, and nothing
 * an author wrote may be silently ignored.**
 *
 * A character is either **somebody** or **a role somebody fills**. The
 * shipped content has been marking which all along without being asked
 * to: of 39 written characters, 26 carry a proper name, and the rest
 * split on the article — *a* sentry, *a* sellsword, *a* hewer on tutwork,
 * against *the* collier, *the* smelterman, *the* storekeeper. The
 * `Cast` / `Extra` rungs make the engine say the same thing, and this
 * gate is what keeps the two from drifting apart.
 *
 * Every rule here guards a failure that is **closed and silent**:
 *
 *   1. **A proper `name:` on an `Extra`.** The prose says somebody, the
 *      class says nobody, and the player sees whichever surface they
 *      happened to hit. There is no error today; there is just a
 *      character who is a person in one place and a role in another.
 *   2. **A definite-article `shortDescription` on an `Extra`** (*"the
 *      collier"*), or an **indefinite one on a nameless `Cast`** (*"a
 *      sentry"*). Same drift, spelled the other way — and the article IS
 *      the signal, because it is the one a player actually reads.
 *   3. **A `Cast` row instantiated twice.** `CastMixin` composes
 *      `SingletonMixin`, so the second clone THROWS at standup — a boot
 *      failure rather than a lint one, which is worse for the person who
 *      has to debug it. Caught here, where the fix is obvious.
 *   4. ⭐⭐ **A sentient `Extra` that answers to nobody** — D7b, and the
 *      one that is really about the world rather than the code. The
 *      crime rule is the terms-free `!consented && sentient`, so if
 *      hurting something is a crime, the victim must be *someone*:
 *      either `Cast`, or institutionally answerable.
 *
 *      The shipped watchpost sentry is exactly this case, and its own
 *      header documents the behaviour at risk — *"a player who ambushes
 *      the sentry under lethal terms gets the imposed-terms crime
 *      marker."* It has no name, no employer, and stands on untitled
 *      ground, so it resolves to nothing and its crimes name nobody. It
 *      works today only because there is exactly ONE sentry, so the
 *      shared row *is* an individual — the accident this whole build
 *      exists to stop relying on.
 *
 *      ⚠ **The fix is authoring the watch, never weakening the rule.**
 *      The gate narrows the question from *"why did my crime vanish"* to
 *      **"who fields this picket?"** — which an author can answer, and
 *      the answer improves the world instead of silencing an error. A
 *      wolf is fine forever: not sentient, no institution, and nobody is
 *      to blame for a wolf.
 *
 *   5. **A dossier on an `Extra`.** A role has no history — that is what
 *      being a role means. Written history on one is content that can
 *      never be read back.
 *
 * ## How the rung is resolved
 *
 * From the class file, not from a list: a row's `class:` is resolved to
 * its source through `classFileOf` (the same longest-prefix rule
 * `StuffApi.resolveClassFile` uses), and its `extends` expression is
 * walked through its own imports until `CastMixin` turns up or the chain
 * ends. So `Crafter = CastMixin(MakerMixin(NPC))` is Cast without this
 * file knowing what a Crafter is, and a new combination is covered the
 * day it is written.
 *
 * Usage:
 *   tsx scripts/check-identity.ts            # CI gate
 *   tsx scripts/check-identity.ts --report   # the roster, by rung
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { composesMixin, packSources } from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

const SOURCES = packSources();

/* ─────────────────────────── content walk ─────────────────────────── */

interface Row {
  /** The content path this row installs at (`/world/lounge/agent/dave`). */
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
          continue; // a malformed row is another gate's finding
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

/* ─────────────────────────── rung resolution ─────────────────────── */

const rungCache = new Map<string, boolean>();

/**
 * Whether a class composes `mixin`. ⭐ Resolved from the class FILE, not
 * from a list — see `composesMixin`, which `lint:dossiers` shares.
 */
const composes = (classPath: string, mixin: string): boolean =>
  composesMixin(classPath, mixin, SOURCES, rungCache);

const isCastClass = (classPath: string): boolean =>
  composes(classPath, 'CastMixin');

/* ─────────────────────────── sentience ────────────────────────────── */

/**
 * Whether a species path resolves sentient. Walks the path upward like
 * the runtime clade chain does, so a species that inherits the flag from
 * an ancestor row still reads as sentient here.
 */
function isSentientSpecies(speciesPath: string, rows: Map<string, Row>): boolean {
  let path: string | null = speciesPath;
  while (path && path.length > 1) {
    const row = rows.get(path);
    if (row && row.data.sentient === true) return true;
    if (row && row.data.sentient === false) return false;
    path = path.slice(0, path.lastIndexOf('/'));
  }
  return false;
}

/* ─────────────────────────── the gate ─────────────────────────────── */

/** Every path a content row INSTANTIATES (a list item, never a `key:` ref). */
function instantiations(rows: Row[]): Map<string, string[]> {
  const counts = new Map<string, string[]>();
  const visit = (node: unknown, file: string): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        // ⚠ The honest discriminator is the LIST ITEM. `- /…/agent/x`
        // instantiates; `key: /…/agent/x` (a roster assignee, a business
        // reference) merely refers, and counting those made an earlier
        // census read three characters as duplicated.
        if (typeof item === 'string' && item.startsWith('/')) {
          const at = counts.get(item) ?? [];
          at.push(file);
          counts.set(item, at);
        } else {
          visit(item, file);
        }
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const value of Object.values(node as Record<string, unknown>)) {
      visit(value, file);
    }
  };
  for (const row of rows) visit(row.raw, row.file);
  return counts;
}

/**
 * Every character path a **Business** roster assigns — the static form of
 * the institution chain's tier 2.
 *
 * ⚠⚠ **Business, not Organization, and the difference is load-bearing.**
 * The roster tick enumerates `mixin.BusinessMixin` and nothing else, so a
 * plain `Organization`'s `rosterSlots:` materializes NO `Employment`
 * record and `getActiveEmployment()` never sees it. Crediting one here
 * would make this gate pass while the runtime resolve returned `null` —
 * a gate that ships broken and silently passes, which is the exact
 * failure class it exists to prevent.
 *
 * ⭐ So a role fielded by a body that does not trade (a watch) states its
 * `institution:` outright — tier 1 — and the gate is what makes sure it
 * does.
 */
function businessRosterAssignees(rows: Row[]): Set<string> {
  const out = new Set<string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const rec = node as Record<string, unknown>;
    if (typeof rec.assignee === 'string') out.add(rec.assignee);
    for (const value of Object.values(rec)) visit(value);
  };
  for (const row of rows) {
    const cls = typeof row.raw.class === 'string' ? row.raw.class : null;
    if (!cls || !composes(cls, 'BusinessMixin')) continue;
    visit(row.raw);
  }
  return out;
}

const DEFINITE = /^the\s+/i;
const INDEFINITE = /^an?\s+/i;

function main(): void {
  const report = process.argv.includes('--report');
  const rows = contentRows();
  const byPath = new Map(rows.map((r) => [r.path, r]));
  const counts = instantiations(rows);
  const assignees = businessRosterAssignees(rows);
  const failures: string[] = [];
  const roster: string[] = [];

  for (const row of rows) {
    // A character is a row with a brain. ⚠ Census by BRAIN, never by
    // path: an earlier count used `*/agent/*` as a proxy for a kind and
    // swept in a corpse, a hog carcass and a key ring while MISSING
    // Odile, whose row is `terminus/registry/clerk.yaml`.
    if (!Array.isArray(row.data.behaviors)) continue;
    const classPath = typeof row.raw.class === 'string' ? row.raw.class : null;
    if (!classPath) continue;

    const cast = isCastClass(classPath);
    const name = typeof row.data.name === 'string' ? row.data.name.trim() : '';
    const short =
      typeof row.data.shortDescription === 'string'
        ? row.data.shortDescription.trim().replace(/^["']|["']$/g, '')
        : '';
    const species =
      typeof row.data._speciesPath === 'string' ? row.data._speciesPath : '';
    const sentient = species ? isSentientSpecies(species, byPath) : false;
    const where = row.file;

    if (report) {
      roster.push(
        `  ${cast ? 'Cast ' : 'Extra'}  ${sentient ? 'sentient' : '        '}  ` +
          `${(name || short).padEnd(34)} ${row.path}`,
      );
    }

    // 1 — a proper name on a role.
    if (!cast && name) {
      failures.push(
        `${where}: an Extra with a proper name ('${name}'). The prose says ` +
          `somebody and the class says nobody — pick one. If they are a ` +
          `person, the row's class is the Cast rung.`,
      );
    }
    // 2 — the article, which is the signal a player actually reads.
    if (!cast && DEFINITE.test(short)) {
      failures.push(
        `${where}: an Extra whose shortDescription reads as an individual ` +
          `('${short}'). "the collier" is one person; "a hewer on tutwork" ` +
          `is a role. Move it to the Cast rung or reword it.`,
      );
    }
    if (cast && !name && INDEFINITE.test(short)) {
      failures.push(
        `${where}: a Cast row with no name whose shortDescription reads as ` +
          `a role ('${short}'). Give them a name, say "the ...", or drop ` +
          `them to the Extra rung.`,
      );
    }
    // 3 — one live instance per Cast row.
    const instantiated = counts.get(row.path) ?? [];
    if (cast && instantiated.length > 1) {
      failures.push(
        `${where}: a Cast row instantiated ${instantiated.length} times ` +
          `(${instantiated.join(', ')}). CastMixin composes SingletonMixin, ` +
          `so the second clone THROWS at standup — there is only one of ` +
          `this person.`,
      );
    }
    // 4 — D7b: a sentient role must answer to somebody.
    const institution =
      typeof row.data.institution === 'string' && row.data.institution.trim()
        ? row.data.institution.trim()
        : null;
    if (!cast && sentient && !institution && !assignees.has(row.path)) {
      failures.push(
        `${where}: a SENTIENT Extra that answers to nobody. Hurting it is a ` +
          `crime (the terms-free !consented && sentient rule), so the ` +
          `victim has to be someone — and it is not a person, so the party ` +
          `that fields it is the only attribution it has. Author an ` +
          `'institution:', or put it on a BUSINESS roster (only a Business ` +
          `roster materializes an Employment record, so only that one ` +
          `resolves at runtime). ⚠ The fix is authoring the institution, ` +
          `never dropping the rule: a crime against nobody is a crime that ` +
          `vanishes.`,
      );
    }
    // 5 — a role has no history.
    for (const key of ['prologue', 'competence', 'circumstance', 'renown']) {
      if (!cast && row.data[key] !== undefined) {
        failures.push(
          `${where}: an Extra carrying '${key}'. A role has no history — ` +
            `that is what being a role means — so this can never be read ` +
            `back.`,
        );
      }
    }
  }

  if (report) {
    console.log(`${roster.length} characters:\n${roster.sort().join('\n')}`);
  }
  if (failures.length) {
    console.error(`\n✖ lint:identity — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `✔ lint:identity — every character's rung agrees with its prose, ` +
      `every Cast row is instanced once, and every sentient role answers ` +
      `to somebody.`,
  );
}

main();
