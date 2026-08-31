/**
 * check-template-census — D17's invariant: **`templatePath` always
 * resolves to a content row** (residences wave 1).
 *
 * Three clauses:
 *
 *   (a) The string `asTemplatePath` appears nowhere in the kernel's
 *       `src/` or any pack's `src/` — the channel is RETIRED; minted
 *       instance identity rides `asIdentityPath` (the identity axis).
 *   (b) Every template-path-valued FIELD in every pack's domain rows
 *       resolves to a real row: `populates:` entries (plain and
 *       `{template, onto}`), `exits.<dir>.destination` +
 *       `exits.<dir>.door`, `adornments`, `stockLines[].itemTemplatePath`,
 *       `prices` keys, `roomTemplate`, `holderPath`, `streetPath`,
 *       `corridorTemplate`, `programmePath`, and floorplan `room`
 *       entries. (`class:` / `hydratorClass:` stay
 *       `check-instanceable-placement`'s — shared reader, no duplicate.)
 *   (c) Every `TemplatePaths` constant in `lib/paths.ts` that names a
 *       singleton *Registry/Catalogue* resolves to a pack row (the six
 *       framework registries ride trivial platform-pack rows; a renamed
 *       row must not leave a constant pointing at nothing).
 *
 * No exemption list, by design: a reference that cannot resolve is a
 * content bug, not a candidate for a list.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { packSources, packSrcFiles } from './pack-roots';

const EXIT_ON_FINDINGS = true;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/** Kind dirs the template walk never enters (mirrors `nonTemplateDirs`). */
const NON_TEMPLATE_DIRS = new Set([
  'settings', 'subjects', 'descriptor-banks', 'quantity', 'wiki',
  'emotes', 'recipes', 'name-banks', 'blueprints', 'archetypes', 'msh',
]);

interface Finding { clause: string; file: string; detail: string }
const findings: Finding[] = [];

function* walk(dir: string, ext: string, parent = ''): Generator<string> {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      // A `cmd` dir holds views unless its parent is `idea` (the one
      // walk rule); kind dirs are enumerated, never guessed.
      if (e === 'cmd' && parent !== 'idea') continue;
      if (NON_TEMPLATE_DIRS.has(e) && dir.endsWith('content')) continue;
      yield* walk(p, ext, e);
    } else if (e.endsWith(ext)) yield p;
  }
}

/** Every domain template row shipped by any pack: path -> file. */
function templateRows(): Map<string, string> {
  const rows = new Map<string, string>();
  if (!existsSync(CONTENT)) return rows;
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    for (const f of walk(root, '.yaml')) {
      const path = '/' + relative(root, f).replace(/\.yaml$/, '').split('\\').join('/');
      rows.set(path, f);
    }
  }
  return rows;
}

// ── clause (a): the retired channel ─────────────────────────────────
function checkRetiredChannel(): void {
  const roots = [join(SERVER_ROOT, 'src')];
  for (const p of packSources()) roots.push(p.srcDir);
  for (const root of roots) {
    for (const f of walk(root, '.ts')) {
      const src = readFileSync(f, 'utf8');
      if (f.endsWith('check-template-census.ts')) continue;
      if (src.includes('asTemplatePath')) {
        findings.push({
          clause: 'a', file: f,
          detail: 'names the retired `asTemplatePath` channel — minted identity rides `asIdentityPath`',
        });
      }
    }
  }
}

// ── clause (b): every template-path field resolves ──────────────────
function isPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('/');
}

export function refsOf(data: Record<string, unknown>): Array<{ field: string; path: string }> {
  const out: Array<{ field: string; path: string }> = [];
  const push = (field: string, v: unknown): void => {
    if (isPath(v)) out.push({ field, path: v });
  };
  const populates = data.populates;
  if (Array.isArray(populates)) {
    for (const entry of populates) {
      if (isPath(entry)) push('populates', entry);
      else if (entry && typeof entry === 'object') {
        push('populates.template', (entry as Record<string, unknown>).template);
        push('populates.onto', (entry as Record<string, unknown>).onto);
      }
    }
  }
  const exits = data.exits;
  if (exits && typeof exits === 'object') {
    for (const [dir, spec] of Object.entries(exits as Record<string, unknown>)) {
      if (spec && typeof spec === 'object') {
        push(`exits.${dir}.destination`, (spec as Record<string, unknown>).destination);
        push(`exits.${dir}.door`, (spec as Record<string, unknown>).door);
      }
    }
  }
  const adornments = data.adornments;
  if (Array.isArray(adornments)) for (const a of adornments) push('adornments', a);
  const stockLines = data.stockLines;
  if (Array.isArray(stockLines)) {
    for (const line of stockLines) {
      if (line && typeof line === 'object') {
        push('stockLines.itemTemplatePath', (line as Record<string, unknown>).itemTemplatePath);
      }
    }
  }
  const prices = data.prices;
  if (prices && typeof prices === 'object') {
    for (const key of Object.keys(prices as Record<string, unknown>)) {
      if (key.startsWith('/')) out.push({ field: 'prices', path: key });
    }
  }
  for (const scalar of ['roomTemplate', 'holderPath', 'streetPath', 'corridorTemplate', 'programmePath'] as const) {
    push(scalar, data[scalar]);
  }
  const floorplan = data.floorplan;
  if (Array.isArray(floorplan)) {
    for (const roomSpec of floorplan) {
      if (roomSpec && typeof roomSpec === 'object') {
        push('floorplan.room', (roomSpec as Record<string, unknown>).room);
      }
    }
  }
  return out;
}

function checkFieldRefs(rows: Map<string, string>): number {
  let checked = 0;
  for (const [, file] of rows) {
    let parsed: Record<string, unknown> | null;
    try { parsed = YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown> | null; }
    catch { continue; } // malformed YAML is the installer's error, not this gate's
    const data = parsed?.data;
    if (!data || typeof data !== 'object') continue;
    for (const { field, path } of refsOf(data as Record<string, unknown>)) {
      checked += 1;
      if (!rows.has(path)) {
        findings.push({
          clause: 'b', file,
          detail: `${field}: ${path} resolves to no content row`,
        });
      }
    }
  }
  return checked;
}

// ── clause (c): the singleton constants in lib/paths.ts ─────────────
function checkTemplatePathConstants(rows: Map<string, string>): number {
  const src = readFileSync(join(SERVER_ROOT, 'src/mud/lib/paths.ts'), 'utf8');
  const block = src.match(/export const TemplatePaths = \{([\s\S]*?)\n\} as const/);
  if (!block) {
    findings.push({ clause: 'c', file: 'src/mud/lib/paths.ts', detail: 'TemplatePaths block not found' });
    return 0;
  }
  let checked = 0;
  for (const m of block[1]!.matchAll(/:\s*"(\/[^"]+)"/g)) {
    const path = m[1]!;
    const leaf = path.split('/').pop()!;
    if (!/(Registry|Catalogue)$/.test(leaf)) continue;
    checked += 1;
    if (!rows.has(path)) {
      findings.push({
        clause: 'c', file: 'src/mud/lib/paths.ts',
        detail: `TemplatePaths names singleton '${path}' but no pack ships a row there`,
      });
    }
  }
  return checked;
}

function main(): void {
  const rows = templateRows();
  checkRetiredChannel();
  const fieldRefs = checkFieldRefs(rows);
  const constants = checkTemplatePathConstants(rows);

  if (findings.length > 0) {
    console.error(`\n[check-template-census — ERROR] ${findings.length} finding(s):\n`);
    for (const f of findings) {
      console.error(`  (${f.clause}) ${relative(REPO_ROOT, f.file)}: ${f.detail}`);
    }
    if (EXIT_ON_FINDINGS) process.exit(1);
  } else {
    console.log(
      `check-template-census: every templatePath resolves to a row ` +
        `(${rows.size} rows; ${fieldRefs} field refs, ${constants} singleton constants; ` +
        `asTemplatePath retired).`,
    );
  }
}

if (process.argv[1] && /check-template-census\.ts$/.test(process.argv[1])) main();
