/**
 * check-mass — ⭐ **a thing made of nothing, counted and capped.**
 *
 * Every row whose class reaches `TangibleMixin` is a piece of MATTER: the
 * branch's own docstring says a Thing is *"made of material"*, and half
 * the engine reads it. Mass drives carry capacity and encumbrance
 * (`LoadBearing`), thermal capacity (`Thermal`), the fist and the
 * tailor's girth, the haulage cost surface, and the warehousing metric.
 * Material drives what a thing resists (`materials-response`), whether it
 * burns, whether it rots (`lint:perishable`), what it is worth and how it
 * feels.
 *
 * A row that states **neither** `mass` nor `_materialPath` is matter made
 * of nothing, weighing nothing. ⚠ **And it fails the way everything in
 * this repo fails: closed and silent.** Nothing errors. `getMass()`
 * answers 0 kg, the seed weighs nothing, the encumbrance gauge never
 * moves, the thermal model has no capacity to speak of, and no test
 * anywhere says a word. The base-class narrowing's census found 0 of 24
 * `Seed` rows, 0 of 17 `Stock`, 0 of 15 `SpiritBottle`, 0 of 11
 * `ServingVessel`, 0 of 7 `TpaTerminal` and 0 of 6 `Wand` authoring
 * either — *"a seed weighs 0 kg today."*
 *
 * ## ⭐⭐ Why a CEILING and not zero
 *
 * `docs/lint-family.md`'s census-then-ratchet: the strongest gates in
 * this family began as a burn-down meter. Writing masses for every
 * offending row is CONTENT work, row by row, and it is not this build's;
 * what is this build's is making the number unable to grow. The ceiling
 * may fall and must never rise, and a fall re-pins it. Step 2 is what
 * makes stopping the growth affordable before anyone has time to fix it.
 *
 * ## The exemption, and how it was earned
 *
 * A class that DERIVES one of the two is not a gap. Exactly one does:
 * `Creature.getMass()` (`lib/creature/Creature.ts:549`) seeds from
 * `species → baseMass` when the instance authored none, so a body's mass
 * is honest without a row stating it.
 *
 * ⚠⚠ **The clusters plan named `OrganismMixin` for this exemption and
 * that was wrong** — it derives nothing; `grep getMass lib/species/Organism.ts`
 * is empty, which is the check the plan itself asked for, and it came
 * back negative. The deriver is `Creature`, two subsystems away. The
 * exemption follows the verified deriver, not the plausible one.
 *
 * ⚠ **What it cannot see, stated rather than implied:**
 *
 *  - a RUNTIME `setMass` / `setMaterial` — a craft's output assignment,
 *    a hydrator's computed field. A gate reads authored rows.
 *  - a body's MATERIAL. `Creature` derives mass from the species and does
 *    NOT derive `_materialPath`, so what a body is made of is still
 *    unstated by every creature row in the game. That is the species /
 *    body-plan's question and it is filed, not gated here — gating it
 *    would fail 60 rows for a reason this file is not about.
 *  - whether a stated mass is RIGHT. 0.0001 kg passes. This gate asks
 *    whether anybody said anything at all.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import {
  packSources,
  classFileOf,
  effectiveDoc,
  inheritanceIndex,
  type InheritanceIndex,
} from './pack-roots';

/**
 * ⚠⚠ The ratchet. Measured when this gate landed (the base-class
 * narrowing build). It may FALL — and when it does, re-pin it here in
 * the same commit — and it may never rise.
 */
/**
 * ⭐ **Lowered 242 → 241 by the whiskey build (2026-10-04)**, and the
 * gate is the one that asked: the census FELL and this file refuses a
 * ratchet that does not tighten.
 *
 * What left the set is `/trade/distilling/thing/still`, which authored
 * neither a mass nor a material for the whole life of the pack. It has
 * one now (240 kg of copper and fieldstone) because the whiskey build
 * made it a vessel that holds sixty litres, and a thing that holds sixty
 * litres of anything had better have a weight.
 */
export const MASS_CEILING = 241;

/** The high-water mark: what the count was when the gate landed. */
export const MASS_HIGH_WATER = 242;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const MUD = join(SERVER_ROOT, 'src', 'mud');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/** The mixin that makes a row matter. */
const MATTER_MIXIN = 'TangibleMixin';
/** The one verified deriver — see the header. */
const DERIVES_MASS = 'class Creature';

let _inheritIdx: InheritanceIndex | null = null;
function inheritIdx(): InheritanceIndex {
  return (_inheritIdx ??= inheritanceIndex());
}

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

/**
 * Every shipped template row that declares a class.
 *
 * ⚠ Through `effectiveDoc` — a CHILD row states no `class:` and no
 * `mass:` of its own, so reading the raw field would both skip it and
 * miss a mass its parent states. Both failures read exactly like a pass.
 */
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
        continue; // a malformed row is another gate's finding
      }
      if (!parsed || typeof parsed !== 'object') continue;
      const r = effectiveDoc(
        file,
        parsed as Record<string, unknown>,
        inheritIdx(),
      ) as { class?: unknown; data?: unknown };
      if (typeof r.class !== 'string') continue;
      rows.push({
        path:
          '/' +
          relative(root, file).replace(/\.yaml$/, '').split('\\').join('/'),
        file: relative(REPO_ROOT, file),
        data: (r.data ?? {}) as Record<string, unknown>,
        klass: r.class,
      });
    }
  }
  return rows;
}

/**
 * The source with its comments removed.
 *
 * ⚠⚠ Load-bearing, and `check-perishable` was blind without it: the
 * check below is a substring test, and a file that says *"`XMixin` is
 * deliberately NOT here"* satisfies it by reaching a comment that means
 * the opposite. Same trap, same guard.
 */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Whether a class module's composition reaches `needle` — the declared
 * base chain, followed through `extends` and the import that names each
 * identifier in the clause.
 *
 * Deliberately TEXTUAL, the same trade every gate in this family makes:
 * the alternative is booting the world, and a lint that boots the world
 * is a lint nobody runs.
 *
 * ⚠ Every identifier in the `extends` clause is followed, not the first:
 * `class HayBale extends SelfHeatingMixin(Provision)` resolves the MIXIN
 * if you read only the head, and never the class that carries the field.
 * ⚠ And a PACK names its base by package specifier, so
 * `@saxonberg/server/mud/...` is rewritten before it is resolved —
 * without that, every pack class over a kernel base reads as reaching
 * nothing.
 */
export function reaches(
  classPath: string,
  needle: string,
  sources: ReturnType<typeof packSources>,
  seen = new Set<string>(),
): boolean {
  if (seen.has(classPath)) return false;
  seen.add(classPath);
  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return false;
  const src = stripComments(readFileSync(file, 'utf8'));
  if (src.includes(needle)) return true;

  const ext = /class\s+\w+\s+extends\s+([^{]+)\{/.exec(src);
  if (!ext) return false;

  /*
   * ⚠⚠ **`extends XBase` is the DOMINANT shape in this codebase, and
   * reading only the `extends` clause resolves nothing.** Almost every
   * class in the tree is
   *
   *     const FooBase = AMixin(BMixin(Good));
   *     export default class Foo extends FooBase {}
   *
   * so the clause names a module-local `const`, not an import. Following
   * imports alone found **5 of 684** classes reaching `TangibleMixin`
   * where the composition census finds 203 — a 97 % false-negative rate,
   * and because this gate counts OFFENDERS, every miss is a row that
   * silently passes. That is the fail-OPEN shape: the weakest possible
   * evidence producing the strongest possible claim.
   *
   * So each identifier in the clause is expanded through its local
   * `const` binding first, and every identifier in THAT initializer is
   * followed in turn.
   */
  const names = new Set(ext[1]!.match(/[A-Za-z_$][\w$]*/g) ?? []);
  for (const n of [...names]) {
    const local = new RegExp(
      `(?:const|let|var)\\s+${n}\\s*=\\s*([\\s\\S]*?);`,
    ).exec(src);
    if (!local) continue;
    if (local[1]!.includes(needle)) return true;
    for (const m of local[1]!.match(/[A-Za-z_$][\w$]*/g) ?? []) names.add(m);
  }

  for (const base of names) {
    const imp = new RegExp(
      `import\\s+(?:\\{[^}]*\\b${base}\\b[^}]*\\}|${base})\\s+from\\s+['"]([^'"]+)['"]`,
    ).exec(src);
    if (!imp) continue;
    const spec = imp[1]!;
    const rel = spec.startsWith('@saxonberg/server/mud/')
      ? spec.slice('@saxonberg/server/mud'.length)
      : '/' + relative(MUD, resolve(dirname(file), spec)).split('\\').join('/');
    if (reaches(rel, needle, sources, seen)) return true;
  }
  return false;
}

function main(): void {
  const sources = packSources(CONTENT);
  const rows = templateRows();

  const matter = new Map<string, boolean>();
  const derives = new Map<string, boolean>();
  const offenders: Row[] = [];

  for (const r of rows) {
    const d = r.data;
    const hasMass = typeof d['mass'] === 'number' && (d['mass'] as number) > 0;
    const hasMaterial =
      typeof d['_materialPath'] === 'string' && d['_materialPath'] !== '';
    if (hasMass || hasMaterial) continue;

    let isMatter = matter.get(r.klass);
    if (isMatter === undefined) {
      isMatter = reaches(r.klass, MATTER_MIXIN, sources);
      matter.set(r.klass, isMatter);
    }
    if (!isMatter) continue;

    let derived = derives.get(r.klass);
    if (derived === undefined) {
      derived = reaches(r.klass, DERIVES_MASS, sources);
      derives.set(r.klass, derived);
    }
    if (derived) continue;

    offenders.push(r);
  }

  // Grouped by class: the shape of the gap is per-class, not per-row —
  // 24 `Seed` rows with no mass is one decision nobody made, not 24.
  const byClass = new Map<string, Row[]>();
  for (const o of offenders) {
    const list = byClass.get(o.klass) ?? [];
    list.push(o);
    byClass.set(o.klass, list);
  }
  const ranked = [...byClass.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  console.log(
    `check-mass: ${rows.length} shipped row(s) scanned; ` +
      `${offenders.length} matter row(s) state neither mass nor material ` +
      `across ${byClass.size} class(es). Ceiling ${MASS_CEILING}.`,
  );
  for (const [klass, list] of ranked.slice(0, 10)) {
    console.log(`  ${String(list.length).padStart(4)}  ${klass}`);
  }
  if (ranked.length > 10) {
    console.log(`  … and ${ranked.length - 10} more class(es)`);
  }

  if (offenders.length > MASS_CEILING) {
    console.error(
      `\ncheck-mass: FAIL — ${offenders.length} exceeds the ceiling of ` +
        `${MASS_CEILING}.\n` +
        `A row whose class is TANGIBLE must say what it weighs (\`mass\`) ` +
        `or what it is made of (\`_materialPath\`); matter made of nothing ` +
        `weighs nothing, silently.\n` +
        `⚠ This is a RATCHET: the ceiling may fall, never rise. If you ` +
        `have removed offenders, lower CEILING in this file in the same ` +
        `commit.\n\nThe rows:\n` +
        offenders.map((o) => `  ✗ ${o.file}  (${o.klass})`).join('\n'),
    );
    process.exit(1);
  }
  if (offenders.length < MASS_CEILING) {
    console.error(
      `\ncheck-mass: the count has FALLEN to ${offenders.length} and the ` +
        `ceiling is still ${MASS_CEILING}. Lower it — a ratchet that is not ` +
        `re-pinned stops ratcheting.`,
    );
    process.exit(1);
  }
  console.log('check-mass: at the ceiling. ✔');
}

if (process.argv[1] && /check-mass\.ts$/.test(process.argv[1])) main();
