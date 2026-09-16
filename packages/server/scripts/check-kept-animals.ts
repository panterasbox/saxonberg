/**
 * check-kept-animals — ⭐⭐ **the species dials and the class that reads
 * them must agree, in both directions.**
 *
 * The bond is a triangle with three corners and only two of them are in
 * code. A **species row** authors `handlingRange` and `biddability`; an
 * **agent row** names that species and names a class; the **class**
 * composes `BondedMixin` or it does not. Get any pair right and the third
 * can still be wrong — and every way of being wrong fails **closed and
 * silent**, which is the single failure mode this codebase keeps paying
 * for:
 *
 *   - `feel` / `taste` shipped and had never run;
 *   - a row's `commandContributions:` is dead and says nothing;
 *   - a perishable material on an inert class simply never rots;
 *   - 48 agent rows authored `primaryKeyword:` into a void for a year.
 *
 * So both directions are checked, because both have a plausible author:
 *
 * **Direction 1 — a dial nobody can read.** A species authors
 * `biddability` or `handlingRange`, and every agent row naming that
 * species is on a class that never reaches `BondedMixin`. The author
 * declared how tame a thing can get and no instance of it can be tamed at
 * all. ⚠ A species named by NO agent row is fine: that is content on its
 * way, not a defect.
 *
 * **Direction 2 — a bondable animal nobody can ask anything.** A row's
 * class reaches `BondedMixin` and its species authors no `biddability`.
 * `wouldComply` treats an absent dial as *not in this conversation*, so
 * the animal silently refuses every asked act forever, and the refusal is
 * the same sentence a cat gives — indistinguishable from working.
 *
 * ⭐ And direction 2 is why absent is not "average". A default would have
 * made this gate impossible to write: there would be no difference
 * between *undeclared* and *declared middling*, and the build would ship
 * animals nobody could call, looking exactly like animals who chose not
 * to come.
 *
 * Textual, like its siblings (`check-perishable`, `check-identity`) — a
 * lint that boots the world is a lint nobody runs.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { packSources, classFileOf } from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const MUD = join(SERVER_ROOT, 'src', 'mud');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

const REQUIRED_MIXIN = 'BondedMixin';

interface Row {
  path: string;
  file: string;
  data: Record<string, unknown>;
  klass: string;
}

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, ext));
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

function templateRows(): Row[] {
  const rows: Row[] = [];
  if (!existsSync(CONTENT)) return rows;
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    for (const file of walk(root, '.yaml')) {
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf8'));
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== 'object') continue;
      const r = parsed as { class?: unknown; data?: unknown };
      rows.push({
        path:
          '/' + relative(root, file).replace(/\.yaml$/, '').split('\\').join('/'),
        file: relative(REPO_ROOT, file),
        data: (r.data ?? {}) as Record<string, unknown>,
        klass: typeof r.class === 'string' ? r.class : '',
      });
    }
  }
  return rows;
}

/** See `check-perishable` — a comment naming the mixin is not composing it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

function reachesBonded(
  classPath: string,
  sources: ReturnType<typeof packSources>,
  seen = new Set<string>(),
): boolean {
  if (!classPath || seen.has(classPath)) return false;
  seen.add(classPath);
  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return false;
  const src = stripComments(readFileSync(file, 'utf8'));
  if (src.includes(REQUIRED_MIXIN)) return true;
  const ext = /class\s+\w+\s+extends\s+([^{]+)\{/.exec(src);
  if (!ext) return false;

  /*
   * ⚠⚠ **Follow the LOCAL const, not only the extends clause.**
   *
   * The shape this codebase actually recommends is
   *
   *     const FooBase = SomeMixin(Bar);
   *     export default class Foo extends FooBase {}
   *
   * — naming the intermediate stack, because inference through several
   * nested generic mixin factories in one expression collapses to
   * `never` (the `PlantPot` lesson). Reading only the extends clause
   * finds `FooBase`, finds no import for it because it is a local
   * declaration, and concludes the class reaches nothing.
   *
   * That was not hypothetical: it reported ranching's `WorkingAnimal` —
   * which is `HandledMixin(KeptAnimal)` — as unable to bond, on the very
   * commit that gave the collie its bond. So an extends identifier is
   * resolved through a local `const` first, and the identifiers in that
   * initializer are followed instead.
   */
  const names = new Set(ext[1]!.match(/[A-Za-z_$][\w$]*/g) ?? []);
  for (const name of [...names]) {
    const local = new RegExp(
      `const\\s+${name}\\s*=\\s*([^;]+);`,
    ).exec(src);
    if (!local) continue;
    for (const inner of local[1]!.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      names.add(inner);
    }
  }

  for (const base of names) {
    const imp = new RegExp(
      `import\\s+(?:\\{[^}]*\\b${base}\\b[^}]*\\}|${base})\\s+from\\s+['"]([^'"]+)['"]`,
    ).exec(src);
    if (!imp) continue;
    const spec = imp[1]!;
    // A pack imports the kernel by PACKAGE SPECIFIER, never relatively.
    const rel = spec.startsWith('@saxonberg/server/mud/')
      ? '/' + spec.slice('@saxonberg/server/mud/'.length)
      : '/' +
        relative(MUD, resolve(dirname(file), spec)).split('\\').join('/');
    if (reachesBonded(rel, sources, seen)) return true;
  }
  return false;
}

function main(): void {
  const sources = packSources(CONTENT);
  const rows = templateRows();

  // Species rows that declare either dial.
  const dialled = new Map<string, { biddability: boolean; range: boolean }>();
  for (const row of rows) {
    const bid = row.data.biddability !== undefined;
    const range = row.data.handlingRange !== undefined;
    if (bid || range) dialled.set(row.path, { biddability: bid, range });
  }

  // Agent rows, by the species they name.
  const bySpecies = new Map<string, Row[]>();
  for (const row of rows) {
    const sp = row.data._speciesPath;
    if (typeof sp !== 'string') continue;
    const list = bySpecies.get(sp) ?? [];
    list.push(row);
    bySpecies.set(sp, list);
  }

  const bonded = new Map<string, boolean>();
  const isBonded = (klass: string): boolean => {
    if (!bonded.has(klass)) bonded.set(klass, reachesBonded(klass, sources));
    return bonded.get(klass)!;
  };

  const failures: string[] = [];

  // Direction 1 — a dial nobody can read.
  for (const [speciesPath, dials] of dialled) {
    const users = bySpecies.get(speciesPath) ?? [];
    if (!users.length) continue; // content on its way, not a defect
    if (users.some((r) => isBonded(r.klass))) continue;
    const which = [
      dials.biddability ? 'biddability' : '',
      dials.range ? 'handlingRange' : '',
    ]
      .filter(Boolean)
      .join(' + ');
    failures.push(
      `  ${speciesPath} authors ${which}, but no agent row naming it is on a\n` +
        `    class that reaches ${REQUIRED_MIXIN} — the dial can never be read.\n` +
        `    rows: ${users.map((r) => r.file).join(', ')}`,
    );
  }

  /*
   * ⭐⭐ **Direction 3 — a feeding rung no vessel in the game satisfies.**
   *
   * A species naming `hopper` when nothing ships a hopper is an animal
   * that refuses every bowl in the world and starves, silently, with
   * nothing anywhere to say why. It is the same triangle as the other
   * two — a declaration on one side, the thing that answers it on the
   * other — and it is the shape this build kept finding in shipped
   * content: `cadenceMs` the parser did not know, a `behaviors:` block
   * no composed class could hold, `primaryKeyword` authored into a void.
   *
   * ⚠ Only the VESSEL rungs are checked. `hand`, `ground` and `graze`
   * are answered by the world rather than by a row.
   */
  const VESSEL_RUNGS = new Set(['bowl', 'trough', 'hopper']);
  const kindsShipped = new Set<string>();
  for (const row of rows) {
    const kind = row.data.feederKind;
    if (typeof kind === 'string') kindsShipped.add(kind);
  }
  for (const row of rows) {
    const styles = row.data.feedingStyle;
    if (!Array.isArray(styles)) continue;
    const missing = styles.filter(
      (v) => typeof v === 'string' && VESSEL_RUNGS.has(v) && !kindsShipped.has(v),
    );
    if (!missing.length) continue;
    failures.push(
      `  ${row.path} feeds by ${missing.join(' + ')}, but no shipped row\n` +
        `    declares a feeder of that kind — the animal would refuse every\n` +
        `    vessel in the game and starve without a word.\n` +
        `    row: ${row.file}`,
    );
  }

  // Direction 2 — a bondable animal nobody can ask anything.
  for (const [speciesPath, users] of bySpecies) {
    const bondedUsers = users.filter((r) => isBonded(r.klass));
    if (!bondedUsers.length) continue;
    if (dialled.get(speciesPath)?.biddability) continue;
    failures.push(
      `  ${speciesPath} is named by a ${REQUIRED_MIXIN} class but authors no\n` +
        `    biddability — every asked act refuses forever, silently.\n` +
        `    rows: ${bondedUsers.map((r) => r.file).join(', ')}`,
    );
  }

  if (failures.length) {
    console.error(
      `check-kept-animals: ${failures.length} broken triangle(s) ` +
        `between a species' dials and the class that reads them.\n`,
    );
    for (const f of failures) console.error(f + '\n');
    console.error(
      'A species declares how far an animal can be won over; a class\n' +
        'composes BondedMixin to read it. Either both or neither.\n',
    );
    process.exit(1);
  }

  console.log(
    `check-kept-animals: ${dialled.size} species with dials, ` +
      `${[...bonded.values()].filter(Boolean).length} bondable class(es) ✔`,
  );
}

main();
