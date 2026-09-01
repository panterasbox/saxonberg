/**
 * check-instanceable-placement — the "nothing instances /lib/" gate.
 *
 * The taxonomy this enforces:
 *
 *   /platform/<branch>/ holds anything INSTANCEABLE — anything a
 *   template's `class:` resolves to, including classes that are further
 *   specialized — keyed by the Stuff branch it descends from
 *   (thing · idea · agent · location).
 *   /lib/  holds substrate that is ONLY EVER INHERITED: abstract roots,
 *   mixins, value objects, and framework attachments.
 *
 * Ten invariants:
 *
 *   1. No template's `class:` resolves under `/lib/`.       (the headline)
 *   2. No template PATH lives under `/lib/`.
 *   3. Every `class:` resolves to a real module + export.
 *   4. Every `hydratorClass:` resolves to a real template row.
 *   5. No redundant `hydratorClass:` — declared with no `data` to apply.
 *   6. No orphaned `data:` — a data block with no `hydratorClass`,
 *      whose every key is therefore silently discarded.
 *   7. Under `/platform/`, `/stuff/` and `/trade/<industry>/`, an
 *      instanceable template (one naming a `class:`) sits under a BRANCH
 *      segment — `thing`, `idea`, `agent` or `location` — the path
 *      pattern `<root>/<branch>/…` (content packs wave 4a). Document
 *      kinds (`recipes/`, a tree's `cmd/` views) are never walked here.
 *      A capability pack's own root (`/arcana/`) is a rooted tree too.
 *   8. A capability pack's `src/` has the kernel's taxonomy and nothing
 *      else: no `lib/`, and every module under a branch directory — or
 *      under `behavior/`, the Brain category's home inside a pack
 *      (mirroring the kernel's `lib/behavior/`; libations 1g), where a
 *      module must have the brain shape: its sole export is `brain`, a
 *      named class-expression. A `class:` under a pack namespace
 *      resolves into that pack's `src/` (invariant 3, through the same
 *      table `StuffApi.resolveClassFile` reads — `scripts/pack-roots.ts`).
 *   9. Every curated blueprint's `classPath:` resolves (blueprints carry
 *      no `class:`, so invariant 3 never sees them).
 *  10. No template row carries the RETIRED `populates:` key (split into
 *      `props:`/`cast:` 2026-09-01) — the Hydrator silently discards a
 *      data key with no applier, so a surviving row quietly stops being
 *      furnished. Fails with the conversion rule in hand.
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
import { packSources, classFileOf, packSrcFiles, type PackSource } from './pack-roots';

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

/**
 * Does `classPath` name a real module with a matching or default export?
 * A path under a capability pack's namespace resolves into that pack's
 * `src/` (never the kernel); everything else is the kernel tree's.
 */
function classResolves(classPath: string, sources: readonly PackSource[]): boolean {
  const file = classFileOf(classPath, sources, MUD);
  if (!existsSync(file)) return false;
  const name = classPath.split('/').pop()!;
  const src = readFileSync(file, 'utf8');
  return (
    src.includes('export default') ||
    new RegExp(`export\\s+(?:abstract\\s+)?class\\s+${name}\\b`).test(src) ||
    new RegExp(`export\\s+\\{[^}]*\\b${name}\\b`).test(src)
  );
}

/**
 * Invariant 7, the pure decision: an instanceable template under
 * `/trade/<industry>/` must sit under that industry's `obj/` or
 * `command/` segment. Exported for the test beside this script.
 */
export const BRANCHES = ['thing', 'idea', 'agent', 'location'] as const;
export function tradePlacementOk(
  path: string,
  hasClass: boolean,
  packRoots: readonly string[] = [],
): boolean {
  if (!hasClass) return true;
  // The rooted trees: the platform, the commons, each industry — and
  // every capability pack's own root (`/arcana`), which follows the
  // same `<root>/<branch>/` pattern.
  const roots = ['/platform', '/stuff', ...packRoots.filter((r) => !/^\/(?:platform|stuff|trade|world)(?:\/|$)/.test(r))];
  const escaped = roots.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`^(?:${escaped.join('|')}|/trade/[^/]+)/([^/]+)/`);
  const rooted = new RegExp(`^(?:${escaped.join('|')}|/trade/[^/]+)/`).test(path);
  if (!rooted) return true;
  const m = re.exec(path);
  return !!m && (BRANCHES as readonly string[]).includes(m[1]!);
}

/**
 * Invariant 8, the pure decision: a capability pack's `src/` has the
 * kernel's taxonomy and nothing else — no `lib/` (substrate it needs is
 * the kernel's, or a class it ships under a branch), and no module
 * outside a branch directory (`thing/`, `idea/`, `agent/`, `location/`)
 * or the pack's `behavior/` (a brain — one file per brain, flat).
 * `rel` is `src/`-relative with forward slashes; tests are not modules.
 */
export function packSrcPlacementOk(rel: string): boolean {
  const parts = rel.split('/');
  if (parts.includes('__tests__')) return true;
  const top = parts[0];
  if (top === 'lib') return false;
  if (parts.length < 2) return false;
  if (top === 'behavior') return parts.length === 2;
  return (BRANCHES as readonly string[]).includes(top!);
}

/**
 * Invariant 8's brain half, the pure decision: a module under a pack's
 * `behavior/` has the Brain category's shape — its ONLY export is
 * `brain`, and it is a named class-expression (`export const brain =
 * class {`), which is what the HMR registry retains and what
 * `StuffApi.resolveExport(path, 'brain')` finds. Type-only exports are
 * erased and do not count.
 */
export function packBrainShapeOk(source: string): boolean {
  const exports = [...source.matchAll(/^export\s+(?!type\b|interface\b)(?:const|let|var|function|class|default|\{)\s*([A-Za-z_$][\w$]*)?/gm)];
  if (exports.length !== 1) return false;
  return /^export\s+const\s+brain\s*=\s*class\b/m.test(source);
}

function main(): void {
  const findings: Finding[] = [];
  const templates = templateFiles();
  const knownPaths = new Set(templates.map((t) => t.path));
  const sources = packSources();
  const packRoots = sources.flatMap((p) => p.roots);

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
    if (cls && !cls.startsWith('/lib/') && !classResolves(cls, sources)) {
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
    // 9 — a curated blueprint's `classPath` must resolve, exactly as a
    // template's `class` must. Blueprints carry no `class:`, so every
    // check above skipped them — and three shipped rows (coin,
    // payment-card, campfire) sat pointing at `/stuff/thing/…` when the
    // classes are at `/platform/thing/…`. The Studio dropped them at
    // boot with a warning nobody was reading, so the curated entry for
    // each was simply absent. A dead pointer in shipped content is the
    // build's job, not a boot log's.
    const classPath = typeof t.classPath === 'string' ? t.classPath : null;
    if (classPath && !classResolves(classPath, sources)) {
      findings.push({
        invariant: 9,
        file,
        detail: `classPath: ${classPath} resolves to no module + export`,
      });
    }
    // 10 — the RETIRED `populates:` key (2026-09-01: split into
    // `props:` + `cast:`). The Hydrator silently discards a data key
    // with no applier, so a surviving row quietly stops being
    // furnished — no conflict, no error, just a bare room (the exact
    // silent-vanish failure invariant 6 exists for). Machine-decidable
    // conversion: an entry whose target row has `behaviors:` is cast;
    // everything else is props.
    if (
      (data && typeof data === 'object' && 'populates' in (data as object)) ||
      'populates' in t
    ) {
      findings.push({
        invariant: 10,
        file,
        detail:
          `carries retired \`populates:\` — split into \`props:\` ` +
          `(write-back content) and \`cast:\` (Behaved troupe); the ` +
          `Hydrator discards the old key silently`,
      });
    }
    // 7 — the obj/ segment rule inside an industry's subtree
    if (!tradePlacementOk(path, cls !== null, packRoots)) {
      findings.push({ invariant: 7, file, detail: `${path} names a class but its second segment is not a branch (thing|idea|agent|location)` });
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

  // 8 — a capability pack's src/ has the kernel's taxonomy: no lib/, and
  // every module under a branch directory.
  for (const pack of sources) {
    if (existsSync(join(pack.srcDir, 'lib'))) {
      findings.push({ invariant: 8, file: join(pack.srcDir, 'lib'), detail: `pack ${pack.id} ships src/lib/ — substrate a pack needs is the kernel's, or a class under a branch` });
    }
    for (const f of packSrcFiles(pack.srcDir)) {
      const rel = relative(pack.srcDir, f).split('\\').join('/');
      if (!packSrcPlacementOk(rel)) {
        findings.push({ invariant: 8, file: f, detail: `pack ${pack.id}: src/${rel} is outside a branch directory (thing|idea|agent|location) or behavior/` });
      } else if (rel.startsWith('behavior/') && !packBrainShapeOk(readFileSync(f, 'utf8'))) {
        findings.push({ invariant: 8, file: f, detail: `pack ${pack.id}: src/${rel} is not brain-shaped (sole export \`brain\`, a named class-expression)` });
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
    7: 'instanceable template not under a branch segment (thing|idea|agent|location)',
    8: 'a capability pack src/ outside the taxonomy (lib/, a module not under a branch or behavior/, or a behavior/ module not brain-shaped)',
    9: 'classPath: does not resolve (a curated blueprint pointing at nothing)',
    10: 'retired `populates:` key (split into props:/cast: 2026-09-01) — the Hydrator discards it silently',
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

if (process.argv[1] && /check-instanceable-placement\.ts$/.test(process.argv[1])) main();
