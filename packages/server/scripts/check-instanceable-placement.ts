/**
 * check-instanceable-placement — the "nothing instances /lib/" gate.
 *
 * The taxonomy this enforces:
 *
 *   /obj/ holds anything INSTANCEABLE — anything a template's `class:`
 *   resolves to, including classes that are further specialized.
 *   /lib/  holds substrate that is ONLY EVER INHERITED: abstract roots,
 *   mixins, value objects, and framework attachments.
 *
 * Six invariants:
 *
 *   1. No template's `class:` resolves under `/lib/`.       (the headline)
 *   2. No template PATH lives under `/lib/`.
 *   3. Every `class:` resolves to a real module + export.
 *   4. Every `hydratorClass:` resolves to a real template row.
 *   5. No redundant `hydratorClass:` — declared with no `data` to apply.
 *   6. No orphaned `data:` — a data block with no `hydratorClass`,
 *      whose every key is therefore silently discarded.
 *
 * Invariants 5 and 6 are the `hydratorClass` pair, and 6 is the one that
 * matters: `StuffApi.clone` step 5 runs NO hydration when the field is
 * absent, so authored content vanishes without a word. Both need a real
 * YAML parse — `data: {}` inline versus block form is exactly what
 * defeats a grep, and is how the pre-existing default-floor defect
 * survived.
 *
 * Note that `class:` is a MODULE path and `hydratorClass:` is a TEMPLATE
 * path, despite looking alike (`api/stuff.ts` resolves the latter via
 * `singleton()`). They are checked against different universes.
 *
 * **No exemption list, by design.** A class that legitimately lives in
 * `lib/` is simply never named by a template. If something appears to
 * need an exemption, that is a design conversation, not a list edit.
 *
 * Implemented as a standalone script rather than an ESLint rule for the
 * reason documented on `check-gate-strings`: the repo is on ESLint 8
 * legacy config, where a local rule needs `--rulesdir` and every editor
 * or ad-hoc `eslint` invocation without it errors.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

/** CI-failing. The invariant is enforced by the build, not by review. */
const EXIT_ON_FINDINGS = true;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const MUD = join(SERVER_ROOT, 'src/mud');
const SEEDS = join(MUD, 'seeds');
const CONTENT = join(REPO_ROOT, 'packages/content');

interface Finding {
  invariant: number;
  file: string;
  detail: string;
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

function* walk(dir: string, ext: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p, ext);
    else if (e.endsWith(ext)) yield p;
  }
}

/** Every template file in the repo, with the template path it seeds. */
function templateFiles(): Array<{ file: string; path: string }> {
  const out: Array<{ file: string; path: string }> = [];
  for (const f of walk(SEEDS, '.yaml')) {
    out.push({ file: f, path: '/' + relative(SEEDS, f).replace(/\.yaml$/, '').split('\\').join('/') });
  }
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      const root = join(CONTENT, pack, 'content');
      if (!existsSync(root)) continue;
      for (const f of walk(root, '.yaml')) {
        out.push({ file: f, path: '/' + relative(root, f).replace(/\.yaml$/, '').split('\\').join('/') });
      }
    }
  }
  return out;
}

/** Does `classPath` name a real module with a matching or default export? */
function classResolves(classPath: string): boolean {
  const file = join(MUD, classPath.slice(1) + '.ts');
  if (!existsSync(file)) return false;
  const name = classPath.split('/').pop()!;
  const src = readFileSync(file, 'utf8');
  return (
    src.includes('export default') ||
    new RegExp(`export\\s+(?:abstract\\s+)?class\\s+${name}\\b`).test(src) ||
    new RegExp(`export\\s+\\{[^}]*\\b${name}\\b`).test(src)
  );
}

function main(): void {
  const findings: Finding[] = [];
  const templates = templateFiles();
  const knownPaths = new Set(templates.map((t) => t.path));

  for (const { file, path } of templates) {
    let doc: unknown;
    try {
      doc = YAML.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      findings.push({ invariant: 3, file, detail: `unparseable YAML: ${String(e)}` });
      continue;
    }
    if (!doc || typeof doc !== 'object') continue;
    const t = doc as Record<string, unknown>;
    const cls = typeof t.class === 'string' ? t.class : null;
    const hyd = typeof t.hydratorClass === 'string' ? t.hydratorClass : null;
    const data = t.data;
    const hasData = !!data && typeof data === 'object' && Object.keys(data).length > 0;

    // 1 — the headline
    if (cls?.startsWith('/lib/')) {
      findings.push({ invariant: 1, file, detail: `class: ${cls} — /lib/ is substrate; nothing instances it` });
    }
    // 2 — template paths
    if (path.startsWith('/lib/')) {
      findings.push({ invariant: 2, file, detail: `template path ${path} is under /lib/` });
    }
    // 3 — class resolves
    if (cls && !cls.startsWith('/lib/') && !classResolves(cls)) {
      findings.push({ invariant: 3, file, detail: `class: ${cls} resolves to no module + export` });
    }
    // 4 — hydratorClass is a TEMPLATE path, so check it against template rows
    if (hyd && !knownPaths.has(hyd)) {
      findings.push({ invariant: 4, file, detail: `hydratorClass: ${hyd} names no template row` });
    }
    // 5 — redundant declaration
    if (hyd && !hasData) {
      findings.push({ invariant: 5, file, detail: `hydratorClass: ${hyd} with no data to apply` });
    }
    // 6 — orphaned data (the dangerous one)
    if (!hyd && hasData) {
      findings.push({
        invariant: 6,
        file,
        detail: `data has ${Object.keys(data as object).length} key(s) but no hydratorClass — every one is silently discarded`,
      });
    }
  }

  // 2 (structural) — the trees themselves must be gone
  if (existsSync(join(SEEDS, 'lib'))) {
    findings.push({ invariant: 2, file: join(SEEDS, 'lib'), detail: 'seeds/lib/ still exists' });
  }
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      const libDir = join(CONTENT, pack, 'content/lib');
      if (existsSync(libDir)) {
        findings.push({ invariant: 2, file: libDir, detail: `pack ${pack} still has content/lib/` });
      }
    }
  }

  // 1 (TS) — templates authored in code. Only the two syntactic forms
  // that actually name a class; a broad /lib/ scan would false-positive
  // on gate strings and on brain module paths.
  for (const f of [...walk(join(SERVER_ROOT, 'src'), '.ts')]) {
    const src = readFileSync(f, 'utf8');
    for (const re of [
      /\bclass:\s*['"](\/lib\/[^'"]+)['"]/g,
      /\bsaveTemplate\(\s*[^,]+,\s*['"](\/lib\/[^'"]+)['"]/g,
    ]) {
      for (const m of src.matchAll(re)) {
        findings.push({ invariant: 1, file: f, detail: `authors a template with class: ${m[1]}` });
      }
    }
  }

  if (findings.length === 0) {
    console.log(
      `check-instanceable-placement: nothing instances /lib/ ` +
        `(${templates.length} templates scanned).`
    );
    return;
  }

  const byInvariant = new Map<number, Finding[]>();
  for (const f of findings) {
    if (!byInvariant.has(f.invariant)) byInvariant.set(f.invariant, []);
    byInvariant.get(f.invariant)!.push(f);
  }
  const LABEL: Record<number, string> = {
    1: 'template names a /lib/ class',
    2: 'template path under /lib/',
    3: 'class: does not resolve',
    4: 'hydratorClass: names no template row',
    5: 'redundant hydratorClass (no data to apply)',
    6: 'orphaned data (no hydratorClass — silently discarded)',
  };
  console.warn(
    `\n[check-instanceable-placement — ${EXIT_ON_FINDINGS ? 'ERROR' : 'WARN'}] ` +
      `${findings.length} finding(s):`
  );
  for (const [inv, list] of [...byInvariant].sort((a, b) => a[0] - b[0])) {
    console.warn(`\n  ── invariant ${inv}: ${LABEL[inv]} (${list.length})`);
    for (const f of list.slice(0, 25)) {
      console.warn(`     ${relative(REPO_ROOT, f.file)}: ${f.detail}`);
    }
    if (list.length > 25) console.warn(`     … +${list.length - 25} more`);
  }
  if (EXIT_ON_FINDINGS) process.exit(1);
}

main();
