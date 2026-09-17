/**
 * check-capabilities — ⭐ **a capability kind is minted by a CONSUMER,
 * never by an instrument.**
 *
 * ## The vocabulary, and why it is open
 *
 * A capability (`digging`, `anvil`, `shaker`) is the third axis of what
 * a thing is: a mixin says what it IS, `commandContributions` says what
 * it AFFORDS, and `capabilities:` on a tool row says what it OFFERS — a
 * role in somebody else's work. It is the only one of the three that is
 * ROW data, which is the whole point: a realm's bespoke bone saw writes
 * `capabilities: [cutting]` and the tailor's `cut` finds it, with no
 * class and no kernel list edit (the libations rule).
 *
 * So the kernel keeps no list, and this gate keeps none either. What it
 * keeps is the CONTRACT the open vocabulary rests on: a kind exists
 * because something CONSUMES it — a recipe slot (`toolCapabilities:`),
 * a view's instrument arg (`[capability.X]`), or a controller's read
 * (`hasCapability('X')`). An instrument declaring a kind nothing
 * consumes is an inert tag; a recipe requiring a kind nothing declares
 * is a dish nobody can ever make, and that one fails silently — the
 * data link of the four reachability links.
 *
 * ## The two directions
 *
 *   1. **required-never-declared** — a recipe or a verb wants a kind no
 *      row and no class offers. Ceiling **0**, and it stays 0: this is
 *      the dead-recipe defect, and it is invisible in play.
 *   2. **declared-never-consumed** — a row offers a kind nothing asks
 *      for. ⭐⭐ Census, then ratchet (docs/lint-family.md): the count
 *      below is what shipped the day this landed; it may fall, never
 *      rise. Each is either a verb that was never written or a tag that
 *      should come off.
 *
 * ⭐ The listing this prints is also the CATALOGUE — the derived one,
 * kind → who consumes it → who declares it — which is how an author
 * finds out that `cutting` already exists before minting `slicing`.
 * `--list` prints it and exits.
 *
 * ## What counts, precisely
 *
 * Declarers: `capabilities:` on any content row (bare string or
 * `{ kind }`), and a literal `capabilities = […]` / `setCapabilities([…])`
 * in non-test source — a pack's class may stamp its own (`Tap.ts`).
 *
 * Consumers: `toolCapabilities:` on any row; `[capability.X]` anywhere in
 * a view; and in non-test source `hasCapability(X)`,
 * `capabilityRate(X)`, `capabilityControl(X)`, `bestInstrument(_, X)`,
 * a `paceMs(_, _, [X…])` list, and `capability.X` inside a string — where
 * X is a literal or an identifier a `const X = '…'` in the same file
 * resolves. Tests are neither: a fixture minting `blender` proves the
 * mixin, not the vocabulary.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const MUD = join(SERVER_ROOT, 'src', 'mud');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/**
 * ⭐⭐ Census, then ratchet. Declared kinds nothing consumes, the day this
 * gate landed. Each one names a verb nobody has written yet or a tag
 * that should come off the row; either way the number only falls.
 */
const DECLARED_NEVER_CONSUMED_CEILING = 4;

/** A recipe or verb wanting a kind no instrument offers: a dead dish. */
const REQUIRED_NEVER_DECLARED_CEILING = 0;

type Sites = Map<string, Set<string>>;

function add(m: Sites, kind: string, site: string): void {
  const k = kind.toLowerCase();
  if (!m.has(k)) m.set(k, new Set());
  m.get(k)!.add(site);
}

function walk(dir: string, ext: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, ext, out);
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return relative(REPO_ROOT, file).split('\\').join('/');
}

/** Every `capabilities:` and `toolCapabilities:` list in a YAML tree. */
function scanYaml(doc: unknown, site: string, declared: Sites, consumed: Sites): void {
  if (!doc || typeof doc !== 'object') return;
  const o = doc as Record<string, unknown>;
  if (Array.isArray(o['capabilities'])) {
    for (const c of o['capabilities']) {
      const kind = typeof c === 'string' ? c : (c as { kind?: string })?.kind;
      if (kind) add(declared, kind, site);
    }
  }
  if (Array.isArray(o['toolCapabilities'])) {
    for (const c of o['toolCapabilities']) {
      const kind = typeof c === 'string' ? c : (c as { kind?: string })?.kind;
      if (kind) add(consumed, kind, site);
    }
  }
  for (const v of Object.values(o)) if (v && typeof v === 'object') scanYaml(v, site, declared, consumed);
}

const ATOM = /\[capability\.([a-z][a-z0-9-]*)/gi;
const ATOM_IN_STRING = /capability\.([a-z][a-z0-9-]*)/gi;
const LITERAL_LIST = /capabilities\s*=\s*\[([^\]]*)\]|setCapabilities\(\s*\[([^\]]*)\]/g;
const READ_CALL = /\b(?:hasCapability|capabilityRate|capabilityControl)\(\s*([^)]+?)\s*\)/g;
const BEST_CALL = /\bbestInstrument\(\s*[^,]+,\s*([^)]+?)\s*\)/g;
const PACE_CALL = /\bpaceMs\([^[]*\[([^\]]*)\]/g;
const CONST_STR = /\bconst\s+([A-Z_][A-Z0-9_]*)\s*=\s*['"]([a-z][a-z0-9-]*)['"]/g;

/** The kind a call argument names — a literal, or a same-file constant. */
function kindOf(arg: string, consts: Map<string, string>): string | null {
  const lit = /^['"]([a-z][a-z0-9-]*)['"]$/.exec(arg.trim());
  if (lit) return lit[1]!;
  const id = /^([A-Z_][A-Z0-9_]*)$/.exec(arg.trim());
  if (id) return consts.get(id[1]!) ?? null;
  return null;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

function scanSource(file: string, declared: Sites, consumed: Sites): void {
  const src = stripComments(readFileSync(file, 'utf8'));
  const site = rel(file);
  const consts = new Map<string, string>();
  for (const m of src.matchAll(CONST_STR)) consts.set(m[1]!, m[2]!);

  for (const m of src.matchAll(LITERAL_LIST)) {
    const body = m[1] ?? m[2] ?? '';
    for (const s of body.matchAll(/['"]([a-z][a-z0-9-]*)['"]/g)) add(declared, s[1]!, site);
    for (const s of body.matchAll(/kind:\s*['"]([a-z][a-z0-9-]*)['"]/g)) add(declared, s[1]!, site);
  }
  for (const m of src.matchAll(READ_CALL)) {
    const k = kindOf(m[1]!, consts);
    if (k) add(consumed, k, site);
  }
  for (const m of src.matchAll(BEST_CALL)) {
    const k = kindOf(m[1]!, consts);
    if (k) add(consumed, k, site);
  }
  for (const m of src.matchAll(PACE_CALL)) {
    for (const s of m[1]!.matchAll(/['"]([a-z][a-z0-9-]*)['"]/g)) add(consumed, s[1]!, site);
    for (const s of m[1]!.matchAll(/\b([A-Z_][A-Z0-9_]*)\b/g)) {
      const k = consts.get(s[1]!);
      if (k) add(consumed, k, site);
    }
  }
  for (const m of src.matchAll(ATOM_IN_STRING)) add(consumed, m[1]!, site);
}

function packOf(site: string): string {
  const m = /^packages\/content\/([^/]+)\//.exec(site);
  return m ? m[1]! : 'kernel';
}

function main(): void {
  const listOnly = process.argv.includes('--list');
  const declared: Sites = new Map();
  const consumed: Sites = new Map();

  // Content: rows declare, recipes require, views name atoms.
  for (const file of walk(CONTENT, '.yaml')) {
    const site = rel(file);
    let doc: unknown;
    try {
      doc = YAML.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    scanYaml(doc, site, declared, consumed);
    for (const m of readFileSync(file, 'utf8').matchAll(ATOM)) add(consumed, m[1]!, site);
  }
  // Source: the kernel's and every pack's, tests excluded.
  const sources = walk(MUD, '.ts');
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) sources.push(...walk(join(CONTENT, pack, 'src'), '.ts'));
  }
  for (const file of sources) {
    if (file.includes('__tests__') || file.endsWith('.test.ts')) continue;
    scanSource(file, declared, consumed);
  }

  const kinds = [...new Set([...declared.keys(), ...consumed.keys()])].sort();
  const requiredNeverDeclared = kinds.filter((k) => consumed.has(k) && !declared.has(k));
  const declaredNeverConsumed = kinds.filter((k) => declared.has(k) && !consumed.has(k));

  if (listOnly) {
    console.log(`capabilities — ${kinds.length} kind(s)\n`);
    for (const k of kinds) {
      const d = [...new Set([...(declared.get(k) ?? [])].map(packOf))].sort();
      const c = [...new Set([...(consumed.get(k) ?? [])].map(packOf))].sort();
      console.log(
        `  ${k.padEnd(16)} offered by ${d.length ? d.join(', ') : '— nothing'}` +
          `\n  ${''.padEnd(16)} wanted by  ${c.length ? c.join(', ') : '— nothing'}`,
      );
    }
    return;
  }

  console.log(
    `check-capabilities: ${kinds.length} kind(s); ${declared.size} declared, ` +
      `${consumed.size} consumed; ${requiredNeverDeclared.length} required-never-declared ` +
      `(ceiling ${REQUIRED_NEVER_DECLARED_CEILING}), ${declaredNeverConsumed.length} ` +
      `declared-never-consumed (ceiling ${DECLARED_NEVER_CONSUMED_CEILING}).`,
  );

  let failed = false;
  if (requiredNeverDeclared.length > REQUIRED_NEVER_DECLARED_CEILING) {
    failed = true;
    console.error(
      `\ncheck-capabilities: ✗ ${requiredNeverDeclared.length} kind(s) are REQUIRED and ` +
        `nothing offers them — a recipe or verb nobody can ever satisfy:\n` +
        requiredNeverDeclared
          .map((k) => `  ✗ ${k}\n      wanted by: ${[...consumed.get(k)!].join(', ')}`)
          .join('\n'),
    );
  }
  if (declaredNeverConsumed.length > DECLARED_NEVER_CONSUMED_CEILING) {
    failed = true;
    console.error(
      `\ncheck-capabilities: ✗ ${declaredNeverConsumed.length} kind(s) are OFFERED and ` +
        `nothing wants them, above the ceiling of ${DECLARED_NEVER_CONSUMED_CEILING}.\n` +
        `⭐ A kind is minted by a CONSUMER — write the recipe slot or the ` +
        `view's \`[capability.X]\` arg, or take the tag off the row:\n` +
        declaredNeverConsumed
          .map((k) => `  ✗ ${k}\n      offered by: ${[...declared.get(k)!].join(', ')}`)
          .join('\n'),
    );
  }
  if (failed) process.exit(1);

  if (declaredNeverConsumed.length < DECLARED_NEVER_CONSUMED_CEILING) {
    console.log(
      `check-capabilities: ⭐ below the ceiling — lower ` +
        `DECLARED_NEVER_CONSUMED_CEILING to ${declaredNeverConsumed.length}.`,
    );
  }
  if (declaredNeverConsumed.length > 0) {
    console.log(
      `check-capabilities: ${declaredNeverConsumed.length} offered-and-unwanted at the ceiling: ` +
        declaredNeverConsumed.join(', '),
    );
  }
  console.log('check-capabilities: ✔');
}

main();
