/**
 * check-perishable — ⭐ **every row made of matter that can rot must be a
 * class that can rot.**
 *
 * Perishability is a property of the **Material**, not the class: the same
 * class is an anvil or a cut of stew meat depending on its
 * `_materialPath`, which is the codebase's own *"the distinction is the
 * material, not a flag"* rule (`isEdibleMatter`). Read too far, that
 * argues for composing `FreshnessMixin` as wide as possible — and it did:
 * first onto `ThingBase` (all 152 `Thing` classes), then onto `Prop` (the
 * deliberately-empty generic `Thing`). Both put five spoilage methods on
 * the documented author surface of a rock, a lantern and a pair of socks,
 * against the governing `callable == visible == cared-about` invariant.
 *
 * ⭐ The answer was that a food class already existed — `Provision`, "the
 * one class in the library of which that is true by name" — and four rows
 * were on the wrong one. The mixin is composed there, and only there.
 *
 * ⚠ **This gate is what buys the narrowing.** Composing only where food
 * lives risks the worst failure this codebase knows: a perishable material
 * authored onto a class that does not compose the mixin would simply never
 * rot — silently, with nothing anywhere to say so. That is the same shape
 * as `eat` shipping with no affordance and `feel`/`taste` never having
 * run: **missing enabling data fails CLOSED and SILENT.** Here it fails at
 * CI instead.
 *
 * The check: for every shipped template row carrying a `_materialPath`
 * that resolves to a Material row tabulating a non-zero
 * `spoilActivationEnergy`, the row's `class:` must resolve to a module
 * whose composition reaches `FreshnessMixin`.
 *
 * ⚠ **What it cannot see, stated rather than implied:** a RUNTIME
 * `setMaterial(perishable)` onto a non-`Fresh` host. A gate reads authored
 * rows; it cannot read a craft's output assignment. The gap is narrow —
 * the craft paths flow material onto outputs of known classes — but it is
 * real, and it is the price of the narrowing.
 *
 * No exemption list, by design: a row that legitimately holds perishable
 * matter on an inert class is a design conversation, not a list edit.
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

/** The mixin a perishable row's class must reach. */
const REQUIRED_MIXIN = 'FreshnessMixin';

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
        continue; // a malformed row is another gate's finding
      }
      if (!parsed || typeof parsed !== 'object') continue;
      const r = parsed as { class?: unknown; data?: unknown };
      if (typeof r.class !== 'string') continue;
      rows.push({
        path:
          '/' + relative(root, file).replace(/\.yaml$/, '').split('\\').join('/'),
        file: relative(REPO_ROOT, file),
        data: (r.data ?? {}) as Record<string, unknown>,
        klass: r.class,
      });
    }
  }
  return rows;
}

/**
 * Whether a class module's composition reaches `FreshnessMixin` — the
 * declared base chain, followed through `extends` and the import that
 * names the base.
 *
 * Deliberately TEXTUAL: the alternative is importing the runtime and
 * reading `MixinApi.hasMixin`, and a lint that boots the world is a lint
 * nobody runs. The same trade every other gate in this family makes.
 */
function reachesFreshness(
  classPath: string,
  sources: ReturnType<typeof packSources>,
  seen = new Set<string>(),
): boolean {
  if (seen.has(classPath)) return false;
  seen.add(classPath);
  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return false;
  const src = readFileSync(file, 'utf8');
  if (src.includes(REQUIRED_MIXIN)) return true;
  // Follow the one base class this module extends, wherever it lives.
  const ext = /class\s+\w+\s+extends\s+(\w+)/.exec(src);
  if (!ext) return false;
  const base = ext[1]!;
  const imp = new RegExp(
    `import\\s+(?:\\{[^}]*\\b${base}\\b[^}]*\\}|${base})\\s+from\\s+['"]([^'"]+)['"]`,
  ).exec(src);
  if (!imp) return false;
  const resolved = resolve(dirname(file), imp[1]!);
  const rel = '/' + relative(MUD, resolved).split('\\').join('/');
  return reachesFreshness(rel, sources, seen);
}

function main(): void {
  const sources = packSources(CONTENT);
  const rows = templateRows();

  // Which Material rows can actually rot.
  const perishable = new Set<string>();
  for (const r of rows) {
    const ea = r.data['spoilActivationEnergy'];
    if (typeof ea === 'number' && ea > 0) perishable.add(r.path);
  }

  const findings: string[] = [];
  const classCache = new Map<string, boolean>();
  for (const r of rows) {
    const mat = r.data['_materialPath'];
    if (typeof mat !== 'string' || !perishable.has(mat)) continue;
    let ok = classCache.get(r.klass);
    if (ok === undefined) {
      ok = reachesFreshness(r.klass, sources);
      classCache.set(r.klass, ok);
    }
    if (!ok) {
      findings.push(
        `  ✗ ${r.file}\n      is made of ${mat} (which rots) but ` +
          `${r.klass} does not compose ${REQUIRED_MIXIN}`,
      );
    }
  }

  console.log(
    `check-perishable: ${perishable.size} perishable material(s); ` +
      `${rows.length} shipped row(s) scanned.`,
  );
  if (findings.length === 0) {
    console.log('check-perishable: every perishable row can rot. ✔');
    return;
  }
  console.error(
    `\ncheck-perishable: ${findings.length} row(s) made of matter that ` +
      `rots, on a class that cannot:\n\n${findings.join('\n')}\n\n` +
      `  ⚠ Compose ${REQUIRED_MIXIN} on the class, or give the row a ` +
      `material that does not rot. A perishable material on an inert\n` +
      `  class does not throw — it silently never spoils, which is the ` +
      `failure mode this gate exists to make loud.\n`,
  );
  process.exit(1);
}

main();
