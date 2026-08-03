/**
 * apply-lib-to-obj-moves — the one-shot codemod for the lib/→obj/
 * taxonomy migration. Reads `lib-to-obj-moves.ts`; writes the tree.
 *
 *   tsx scripts/apply-lib-to-obj-moves.ts --axis=class [--dry-run] [--report]
 *   tsx scripts/apply-lib-to-obj-moves.ts --axis=path  [--dry-run] [--report]
 *
 * Retired at the pre-merge sweep. It is committed only so the enormous
 * mechanical diff it produces is reviewable against the rules that
 * generated it.
 *
 * ## Why import rewriting is resolve-based, not textual
 *
 * A relative specifier must change when EITHER endpoint moves: the
 * importing file, the imported file, or both. So every specifier is
 * resolved to an absolute target against the importer's OLD directory,
 * mapped through the move table, then re-relativised from the
 * importer's NEW directory.
 *
 * The happy consequence is safety: a relative string that does not
 * resolve to a known .ts file is left completely alone. That is what
 * protects `SourceTreeApi.readYamlResource(import.meta.url, '../x.yaml')`
 * and every other relative path used as data rather than as an import.
 *
 * Never emits a `.js` extension (CLAUDE.md § Import Statement Style).
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, relative, resolve, sep } from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { MOVES, rewrite, rewriteRepoPath, type MoveAxis } from './lib-to-obj-moves';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const MUD = join(SERVER_ROOT, 'src/mud');

const argv = process.argv.slice(2);
const AXIS = (argv.find((a) => a.startsWith('--axis='))?.slice(7) ?? '') as 'class' | 'path';
const DRY = argv.includes('--dry-run');
const REPORT = argv.includes('--report');

if (AXIS !== 'class' && AXIS !== 'path') {
  console.error('usage: --axis=class|path [--dry-run] [--report]');
  process.exit(2);
}

/* ─────────────────────────── fs helpers ─────────────────────────── */

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo']);

function* walk(dir: string, exts: readonly string[]): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p, exts);
    else if (exts.some((x) => e.endsWith(x))) yield p;
  }
}

function git(...args: string[]): void {
  if (DRY) return;
  execFileSync('git', args, { cwd: REPO_ROOT, stdio: 'pipe' });
}

let writes = 0;
function write(path: string, next: string, prev: string): void {
  if (next === prev) return;
  writes++;
  if (!DRY) writeFileSync(path, next);
}

/* ───────────────────────── the class axis ───────────────────────── */

/** absolute old .ts path → absolute new .ts path (sources + their test siblings) */
function buildFileMoves(): Map<string, string> {
  const m = new Map<string, string>();
  for (const rule of MOVES) {
    if (rule.axis !== 'file') continue;
    const from = join(MUD, rule.from.slice(1) + '.ts');
    const to = join(MUD, rule.to.slice(1) + '.ts');
    if (!existsSync(from)) {
      console.error(`  !! source missing: ${rule.from}`);
      continue;
    }
    m.set(from, to);

    // Test siblings travel with their class: __tests__/<Name>.*.test.ts
    const name = rule.from.split('/').pop()!;
    const oldTests = join(dirname(from), '__tests__');
    const newTests = join(dirname(to), '__tests__');
    if (!existsSync(oldTests)) continue;
    for (const f of readdirSync(oldTests)) {
      if (f === `${name}.test.ts` || f.startsWith(`${name}.`)) {
        m.set(join(oldTests, f), join(newTests, f));
      }
    }
  }
  return m;
}

/** Resolve a relative specifier to the .ts file it names, or null. */
function resolveSpec(fromDir: string, spec: string, known: ReadonlySet<string>): string | null {
  const base = resolve(fromDir, spec);
  for (const cand of [base + '.ts', base + '.tsx', join(base, 'index.ts')]) {
    if (known.has(cand)) return cand;
  }
  return null;
}

function toSpecifier(fromDir: string, targetFile: string): string {
  let r = relative(fromDir, targetFile).split(sep).join('/');
  r = r.replace(/\.tsx?$/, '').replace(/\/index$/, '');
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

function runClassAxis(): void {
  const fileMoves = buildFileMoves();
  console.log(`file moves: ${fileMoves.size} (sources + test siblings)`);

  // Every .ts in the repo we might have to touch.
  const tsFiles = [
    ...walk(join(SERVER_ROOT, 'src'), ['.ts']),
    ...walk(join(SERVER_ROOT, 'scripts'), ['.ts']),
    ...walk(join(REPO_ROOT, 'packages/client/src'), ['.ts', '.tsx']),
    ...walk(join(REPO_ROOT, 'e2e'), ['.ts']),
  ];
  const known = new Set(tsFiles);

  // 1. Rewrite relative specifiers, accounting for both endpoints moving.
  let specHits = 0;
  const pending: Array<[string, string]> = []; // [destination path, content]
  for (const file of tsFiles) {
    const oldDir = dirname(file);
    const newFile = fileMoves.get(file) ?? file;
    const newDir = dirname(newFile);
    const src = readFileSync(file, 'utf8');
    const next = src.replace(
      /(['"])(\.\.?\/[^'"\n]*)\1/g,
      (whole, q: string, spec: string) => {
        const target = resolveSpec(oldDir, spec, known);
        if (!target) return whole; // data path, .yaml, or unknown — leave alone
        const newTarget = fileMoves.get(target) ?? target;
        const nextSpec = toSpecifier(newDir, newTarget);
        if (nextSpec === spec) return whole;
        specHits++;
        return `${q}${nextSpec}${q}`;
      }
    );
    if (next !== src || newFile !== file) pending.push([newFile, next]);
  }
  console.log(`import specifiers rewritten: ${specHits}`);

  // 2. Move the files (git mv keeps rename detection alive).
  for (const [from, to] of fileMoves) {
    if (!DRY) mkdirSync(dirname(to), { recursive: true });
    git('mv', relative(REPO_ROOT, from), relative(REPO_ROOT, to));
  }

  // 3. Write the rewritten contents to their final homes.
  for (const [dest, content] of pending) {
    if (!DRY) writeFileSync(dest, content);
  }
  console.log(`files written: ${pending.length}`);

  // 4. Template `class:` values in YAML — file axis AND classref (the splits).
  let yamlHits = 0;
  for (const f of [
    ...walk(join(SERVER_ROOT, 'src/mud'), ['.yaml']),
    ...walk(join(REPO_ROOT, 'packages/content'), ['.yaml']),
    ...walk(join(SERVER_ROOT, 'src/mud/config'), ['.yaml']),
  ]) {
    const src = readFileSync(f, 'utf8');
    const next = src.replace(
      /^(\s*(?:class|classPath):\s*)(\/lib\/\S+)\s*$/gm,
      (whole, head: string, val: string) => {
        const r = rewrite(val, ['file', 'classref']);
        if (!r) return whole;
        yamlHits++;
        return head + r;
      }
    );
    write(f, next, src);
  }
  console.log(`yaml class: values repointed: ${yamlHits}`);

  // 5. Class references embedded in TS: object-literal `class:`,
  //    saveTemplate's 2nd arg, loadClassByPath, and gate strings.
  //    Gate strings take the FILE axis only — a split's base has not
  //    moved, so repointing a gate string would aim it at the wrong class.
  let tsHits = 0;
  for (const file of tsFiles) {
    const path = fileMoves.get(file) ?? file;
    if (!existsSync(path)) continue;
    const src = readFileSync(path, 'utf8');
    let next = src.replace(
      /(\bclass:\s*)(['"])(\/lib\/[^'"]+)\2/g,
      (whole, head: string, q: string, val: string) => {
        const r = rewrite(val, ['file', 'classref']);
        if (!r) return whole;
        tsHits++;
        return `${head}${q}${r}${q}`;
      }
    );
    next = next.replace(
      /(\b(?:loadClassByPath|FromModule|FromController)\(\s*)(['"])(\/lib\/[^'"]+)\2/g,
      (whole, head: string, q: string, val: string) => {
        const r = rewrite(val, ['file']);
        if (!r) return whole;
        tsHits++;
        return `${head}${q}${r}${q}`;
      }
    );
    write(path, next, src);
  }
  console.log(`ts class references repointed: ${tsHits}`);
}

/* ───────────────────────── the path axis ───────────────────────── */

function runPathAxis(): void {
  // 1. Move seed files.
  const seeds = join(MUD, 'seeds/lib');
  let moved = 0;
  if (existsSync(seeds)) {
    for (const f of walk(seeds, ['.yaml'])) {
      const tpl = '/' + relative(join(MUD, 'seeds'), f).replace(/\.yaml$/, '').split(sep).join('/');
      const next = rewrite(tpl, ['path']);
      if (!next) {
        console.error(`  !! uncovered seed path: ${tpl}`);
        continue;
      }
      const dest = join(MUD, 'seeds', next.slice(1) + '.yaml');
      if (!DRY) mkdirSync(dirname(dest), { recursive: true });
      git('mv', relative(REPO_ROOT, f), relative(REPO_ROOT, dest));
      moved++;
    }
  }
  console.log(`seed templates moved: ${moved}`);

  // 2. Move each pack's content/lib tree wholesale.
  const contentRoot = join(REPO_ROOT, 'packages/content');
  for (const pack of readdirSync(contentRoot)) {
    const libDir = join(contentRoot, pack, 'content/lib');
    if (!existsSync(libDir)) continue;
    git('mv', relative(REPO_ROOT, libDir), relative(REPO_ROOT, join(contentRoot, pack, 'content/obj')));
    console.log(`pack content tree moved: ${pack}`);
  }

  // 3. Every remaining template-path literal, everywhere. Values AND
  //    object keys (slotClaims is keyed by body-plan path).
  let hits = 0;
  const files = [
    ...walk(join(SERVER_ROOT, 'src'), ['.ts', '.yaml']),
    ...walk(join(SERVER_ROOT, 'scripts'), ['.ts']),
    ...walk(join(REPO_ROOT, 'packages/content'), ['.ts', '.yaml']),
    ...walk(join(REPO_ROOT, 'packages/client/src'), ['.ts', '.tsx']),
    ...walk(join(REPO_ROOT, 'e2e'), ['.ts']),
    ...walk(join(REPO_ROOT, 'docs'), ['.md']),
    join(REPO_ROOT, 'CLAUDE.md'),
  ].filter((f) => existsSync(f));

  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    // Any /lib/... run bounded by a quote, whitespace, backtick, comma,
    // colon, paren or line end. Matched greedily then trimmed of
    // trailing punctuation that cannot be part of a template path.
    const next = src.replace(/\/lib\/[A-Za-z0-9_\-./Ω]*/g, (m: string) => {
      const trimmed = m.replace(/[.,)]+$/, '');
      const tail = m.slice(trimmed.length);
      const r = rewrite(trimmed, ['path']);
      if (!r) return m;
      hits++;
      return r + tail;
    });
    write(f, next, src);
  }
  console.log(`template-path literals rewritten: ${hits}`);

  // 4. Repo-relative file-path strings (tests reading the seed tree).
  let repoHits = 0;
  for (const f of files) {
    if (f.endsWith('.md')) continue;
    const src = readFileSync(f, 'utf8');
    const next = src.replace(/(['"`])([^'"`\n]*(?:seeds\/lib\/|content\/lib\/)[^'"`\n]*)\1/g,
      (whole, q: string, val: string) => {
        const r = rewriteRepoPath(val);
        if (!r) return whole;
        repoHits++;
        return `${q}${r}${q}`;
      });
    write(f, next, src);
  }
  console.log(`repo path strings rewritten: ${repoHits}`);
}

/* ───────────────────────── residue report ───────────────────────── */

function report(): void {
  const residue = new Map<string, string[]>();
  for (const f of [
    ...walk(join(SERVER_ROOT, 'src'), ['.ts', '.yaml']),
    ...walk(join(REPO_ROOT, 'packages/content'), ['.ts', '.yaml']),
    ...walk(join(REPO_ROOT, 'docs'), ['.md']),
  ]) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\/lib\/[A-Za-z0-9_\-./]*/g)) {
      const v = m[0].replace(/[.,)]+$/, '');
      const resolvesToStayingClass = existsSync(join(MUD, v.slice(1) + '.ts'));
      const key = resolvesToStayingClass ? 'class module (stays in lib/)' : 'unresolved';
      if (!residue.has(key)) residue.set(key, []);
      residue.get(key)!.push(`${relative(REPO_ROOT, f)}: ${v}`);
    }
  }
  for (const [k, v] of residue) {
    const uniq = [...new Set(v)];
    console.log(`\n── residue: ${k} (${uniq.length})`);
    uniq.slice(0, 40).forEach((l) => console.log('   ' + l));
    if (uniq.length > 40) console.log(`   … +${uniq.length - 40} more`);
  }
}

/* ─────────────────────────────── main ─────────────────────────────── */

console.log(`axis=${AXIS}${DRY ? ' (dry run)' : ''}`);
if (AXIS === 'class') runClassAxis();
else runPathAxis();
console.log(`\nfiles changed: ${writes}${DRY ? ' (nothing written)' : ''}`);
if (REPORT) report();
