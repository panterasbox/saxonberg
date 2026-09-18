/**
 * check-doneness — ⭐ **two silent failures the doneness gauge makes
 * possible, gated at CI instead of discovered in a kitchen.**
 *
 * **(a) A cookable working with no ceiling.** `Recipe.maxHeatK` is the heat
 * a working must not exceed; the sentinel `0` means the author stated
 * none, and the default char point applies. That is a reasonable default
 * for a smelt — 1358 K is the point of a smelt — but for FOOD it means the
 * dish can never be ruined by too fierce a fire, which is half of what the
 * gauge exists to model. A recipe that cooks something edible and states
 * no ceiling is not wrong; it is **unfinished**, and unfinished is exactly
 * what a census-then-ratchet gate is for.
 *
 * **(b) A bread row that cannot stale.** Staling is `StalingMixin`'s, on
 * `trade-baking`'s `Loaf`. A loaf authored onto bare `Provision` would
 * spoil (the `FreshnessMixin` path) and never go stale — silently, with
 * nothing anywhere to say so. This is `lint:perishable`'s failure shape
 * one subsystem over, and `lint:perishable` cannot see it: the row DOES
 * reach `FreshnessMixin`, which is precisely why it passes.
 *
 * ⭐⭐ **Census, then ratchet** (docs/lint-family.md). Half (a) lands at
 * today's count as a ceiling it may fall below and never rise above, and
 * W10 drives it to 0 by authoring the ceilings. Half (b) is 0 from the
 * first commit — there is no legacy to burn down, so there is no reason to
 * allow one.
 *
 * Textual, like every gate in this family: the alternative is booting the
 * world, and a lint that boots the world is a lint nobody runs.
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

/**
 * ⭐⭐ **Zero, and the ratchet is closed.** This landed at 17 — the census
 * — and the same build drove it down: every shipped working that cooks
 * something edible now states the heat it must not exceed.
 *
 * It may fall and must never rise. A new cookable recipe that states no
 * ceiling fails here, which is the point: a dish that can never be
 * ruined by too fierce a fire is unfinished, and unfinished is exactly
 * what a census-then-ratchet gate is for.
 */
const UNCEILINGED_RECIPE_CEILING = 0;

/** The mixin a bread row's class must reach (half b). */
const STALING_MIXIN = 'StalingMixin';

/** The Material tag that makes a row bread. */
const BREAD_TAG = 'bread';

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

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Every shipped template row that declares a class. */
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

/** Every shipped recipe document. */
function recipeRows(): { file: string; data: Record<string, unknown> }[] {
  const out: { file: string; data: Record<string, unknown> }[] = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT)) {
    const dir = join(CONTENT, pack, 'content', 'recipes');
    if (!existsSync(dir)) continue;
    for (const file of walk(dir, '.yaml')) {
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf8'));
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== 'object') continue;
      out.push({
        file: relative(REPO_ROOT, file),
        data: parsed as Record<string, unknown>,
      });
    }
  }
  return out;
}

/** Whether a class module's composition reaches `mixin`. */
function reaches(
  classPath: string,
  mixin: string,
  sources: ReturnType<typeof packSources>,
  seen = new Set<string>(),
): boolean {
  if (seen.has(classPath)) return false;
  seen.add(classPath);
  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return false;
  const src = stripComments(readFileSync(file, 'utf8'));
  if (src.includes(mixin)) return true;
  const ext = /class\s+\w+\s+extends\s+([^{]+)\{/.exec(src);
  if (!ext) return false;
  for (const base of ext[1]!.match(/[A-Za-z_$][\w$]*/g) ?? []) {
    const imp = new RegExp(
      `import\\s+(?:\\{[^}]*\\b${base}\\b[^}]*\\}|${base})\\s+from\\s+['"]([^'"]+)['"]`,
    ).exec(src);
    if (!imp) continue;
    const resolved = resolve(dirname(file), imp[1]!);
    const rel = '/' + relative(MUD, resolved).split('\\').join('/');
    if (reaches(rel, mixin, sources, seen)) return true;
  }
  return false;
}

function main(): void {
  const sources = packSources(CONTENT);
  const rows = templateRows();
  const recipes = recipeRows();

  // Which Material rows are edible, and which are bread.
  const edible = new Set<string>();
  const bread = new Set<string>();
  for (const r of rows) {
    if (r.data['edibility'] === true) edible.add(r.path);
    const tags = r.data['tags'];
    const words =
      typeof tags === 'string'
        ? tags.split(/\s+/)
        : Array.isArray(tags)
          ? tags.filter((t): t is string => typeof t === 'string')
          : [];
    if (words.includes(BREAD_TAG)) bread.add(r.path);
  }

  // ── half (a): a cookable working with no ceiling ─────────────────
  const unceilinged: string[] = [];
  for (const { file, data } of recipes) {
    const requires = data['requiresHeatK'];
    if (typeof requires !== 'number' || requires <= 0) continue;
    const app = data['outputApplication'];
    const material = data['outputMaterial'];
    const cooksFood =
      app === 'edible' ||
      (typeof material === 'string' && edible.has(material));
    if (!cooksFood) continue;
    const ceiling = data['maxHeatK'];
    if (typeof ceiling === 'number' && ceiling > 0) continue;
    unceilinged.push(`  · ${file} (requiresHeatK: ${requires}, no maxHeatK)`);
  }

  // ── half (b): a bread row that cannot stale ──────────────────────
  const unstaling: string[] = [];
  const classCache = new Map<string, boolean>();
  for (const r of rows) {
    const mat = r.data['_materialPath'];
    if (typeof mat !== 'string' || !bread.has(mat)) continue;
    let ok = classCache.get(r.klass);
    if (ok === undefined) {
      ok = reaches(r.klass, STALING_MIXIN, sources);
      classCache.set(r.klass, ok);
    }
    if (!ok) {
      unstaling.push(
        `  ✗ ${r.file}\n      is made of ${mat} (bread) but ` +
          `${r.klass} does not compose ${STALING_MIXIN}`,
      );
    }
  }

  console.log(
    `check-doneness: ${recipes.length} recipe(s), ${rows.length} row(s), ` +
      `${edible.size} edible material(s), ${bread.size} bread material(s).`,
  );
  console.log(
    `check-doneness: ${unceilinged.length} cookable working(s) state no ` +
      `maxHeatK (ceiling ${UNCEILINGED_RECIPE_CEILING}).`,
  );

  let failed = false;
  if (unceilinged.length > UNCEILINGED_RECIPE_CEILING) {
    failed = true;
    console.error(
      `\ncheck-doneness: ✗ ${unceilinged.length} unceilinged cookable ` +
        `working(s), above the ceiling of ${UNCEILINGED_RECIPE_CEILING}.\n` +
        `A recipe that cooks food and states no 'maxHeatK' can never be ` +
        `ruined by too fierce a fire.\n` +
        unceilinged.join('\n'),
    );
  } else if (unceilinged.length < UNCEILINGED_RECIPE_CEILING) {
    console.log(
      `check-doneness: ⭐ below the ceiling — lower ` +
        `UNCEILINGED_RECIPE_CEILING to ${unceilinged.length}.`,
    );
  }

  if (unstaling.length > 0) {
    failed = true;
    console.error(
      `\ncheck-doneness: ✗ ${unstaling.length} bread row(s) cannot stale.\n` +
        unstaling.join('\n'),
    );
  }

  if (failed) process.exit(1);
  console.log('check-doneness: ✔');
}

main();
