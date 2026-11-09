/**
 * check-material-kinds — ⭐⭐ **a material has exactly the properties it has,
 * and nothing outside the tree depends on what kind it is** (material
 * decomposition, D5).
 *
 * A material's CLASS is its KIND (`Metal`, `Food`, `Wood` —
 * `platform/idea/material/`), and a kind composes the capabilities its
 * members physically share (`CombustionMixin`, `FusionMixin`, … in
 * `lib/material/`). Four arms:
 *
 *   (a) **kind narrowing = 0.** Production code (kernel and every pack's
 *       `src/`, tests excluded) never imports a kind except to `extends` it,
 *       and never names a `/idea/material/<folder>/` PREFIX to sort materials
 *       by where they sit. A consumer asks `MixinApi.has<Capability>(m)`.
 *       The kinds themselves (and a pack's own kind, which extends one) are
 *       the only importers, by construction of the rule.
 *   (b) **orphan key = 0.** Every key a material row authors is a field its
 *       kind declares. The applier reads ONLY declared fields, so an orphan
 *       key is dropped silently — `chemistry:` sat dead on 43 rows that way.
 *   (c) **sentinel = 0.** No row authors a capability field at "not
 *       applicable" (`0`, `false`, `''`, `null`, `[]`, `{}`, `ph: 7`, a toxin
 *       of no amount): a capability a material lacks is ABSENT, not zeroed.
 *       A child row may clear a value its parent authored — that override is
 *       the one place a sentinel means something.
 *   (d) **data gaps ≤ ceiling** — composed-but-unauthored capability fields,
 *       per pack. A kind composes what its members physically HAVE, so an
 *       unauthored field is a gap in the data, not a wrong placement; the
 *       count may fall and never rise (census, then ratchet —
 *       docs/lint-family.md).
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { pathToFileURL } from 'url';
import {
  CONTENT,
  MUD,
  effectiveRow,
  fieldMetaKeys,
  inheritanceIndex,
  mudSourceFiles,
  ratchet,
  stripComments,
} from './pack-roots';

/** Arm (d)'s ceiling: composed capability fields no row has authored yet. */
export const DATA_GAP_CEILING = 6057;

const GATE = 'check-material-kinds';
const LIB = join(MUD, 'lib', 'material');
const KIND_DIR = join(MUD, 'platform', 'idea', 'material');
const ABSTRACT_NODES = ['Mineral', 'Organic', 'Plant', 'Animal'];

/** Every field a capability mixin in `lib/material/` declares, by capability. */
export function capabilityFields(): Map<string, string> {
  const out = new Map<string, string>();
  const BASE = new Set(['Material', ...ABSTRACT_NODES]);
  for (const f of readdirSync(LIB)) {
    if (!f.endsWith('.ts')) continue;
    const name = f.replace(/\.ts$/, '');
    if (BASE.has(name)) continue;
    const src = readFileSync(join(LIB, f), 'utf8');
    if (!new RegExp(`export function ${name}Mixin\\b`).test(src)) continue;
    for (const key of fieldMetaKeys(src)) out.set(key, name);
  }
  return out;
}

function isSentinel(field: string, v: unknown): boolean {
  if (field === 'ph') return v === 7 || v == null;
  if (v === null || v === undefined || v === false || v === '') return true;
  if (typeof v === 'number') return v === 0;
  if (typeof v === 'string') return /^\s*0+(\.0+)?\s*[^\d\s]*\s*$/.test(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    return v.every(
      (e) => e !== null && typeof e === 'object' && !(e as { amount?: number }).amount && !(e as { strength?: number }).strength && ['toxicity', 'tastes', 'smells', 'burning', 'combustionImparts'].includes(field),
    );
  }
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/** Arm (a): imports of a kind used anywhere but an `extends` clause. */
export function kindNarrowing(): string[] {
  const findings: string[] = [];
  const kindIds = new Set(
    existsSync(KIND_DIR) ? readdirSync(KIND_DIR).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, '')) : [],
  );
  for (const n of ABSTRACT_NODES) kindIds.add(n);
  for (const { file } of mudSourceFiles()) {
    if (file.includes('__tests__')) continue;
    if (file.startsWith(KIND_DIR + '/')) continue;
    const src = stripComments(readFileSync(file, 'utf8'));
    const rel = relative(join(MUD, '..', '..', '..'), file);
    for (const m of src.matchAll(/import\s+(?:type\s+)?(?:(\w+)|\{([^}]*)\})\s+from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[3]!;
      const leaf = spec.split('/').pop()!;
      const isKind =
        (/platform\/idea\/material\//.test(spec) && kindIds.has(leaf)) ||
        (/lib\/material\//.test(spec) && ABSTRACT_NODES.includes(leaf)) ||
        (spec.startsWith('./') && file.startsWith(LIB + '/') && ABSTRACT_NODES.includes(leaf));
      if (!isKind) continue;
      const locals = m[1] ? [m[1]] : m[2]!.split(',').map((p) => p.trim().split(/\s+as\s+/).pop()!.replace(/^type\s+/, '')).filter(Boolean);
      const body = src.slice((m.index ?? 0) + m[0].length);
      for (const local of locals) {
        const uses = [...body.matchAll(new RegExp(`\\b${local}\\b`, 'g'))];
        const bad = uses.filter((u) => {
          const before = body.slice(Math.max(0, (u.index ?? 0) - 400), u.index);
          return !/\bextends\s+[\w$(,\s]*$/.test(before);
        });
        if (bad.length > 0) findings.push(`${rel}: uses the kind \`${local}\` outside an extends clause — ask for a capability (MixinApi.has<X>)`);
      }
    }
    for (const m of src.matchAll(/['"`]([^'"`\n]*\/idea\/material\/[\w-]+\/)['"`]/g)) {
      findings.push(`${rel}: sorts materials by folder ('${m[1]}') — a folder is not a capability`);
    }
  }
  return findings;
}

export interface RowFindings {
  orphan: string[];
  sentinel: string[];
  gaps: Map<string, number>;
}

/** Arms (b)–(d) over every material row. */
export function materialRows(): RowFindings {
  const index = inheritanceIndex();
  const fields = capabilityFields();
  const orphan: string[] = [];
  const sentinel: string[] = [];
  const gaps = new Map<string, number>();
  for (const [path, row] of index.rows) {
    if (!path.includes('/idea/material/')) continue;
    if (row.pack === 'kernel') continue;
    const eff = effectiveRow(path, index.rows);
    if (!eff.class) continue;
    const declared = index.rules(eff.class);
    if (declared.size === 0) continue;
    const own = ((row.raw.data ?? {}) as Record<string, unknown>);
    for (const key of Object.keys(own)) {
      if (!declared.has(key)) orphan.push(`${path}: '${key}' is not a field of ${eff.class.split('/').pop()} — the applier drops it`);
    }
    const parentData = eff.chain.length > 0 ? effectiveRow(eff.chain[0]!, index.rows).data : {};
    for (const [key, v] of Object.entries(own)) {
      if (!fields.has(key) || !isSentinel(key, v)) continue;
      if (key in parentData && !isSentinel(key, parentData[key])) continue;
      sentinel.push(`${path}: '${key}' authored as "not applicable" — leave it out; a capability it lacks is absent`);
    }
    let n = 0;
    for (const [key, cap] of fields) {
      if (cap === 'Radioactivity' || cap === 'Muscle') continue;
      if (declared.has(key) && !(key in eff.data)) n++;
    }
    gaps.set(row.pack, (gaps.get(row.pack) ?? 0) + n);
  }
  return { orphan, sentinel, gaps };
}

function main(): void {
  let ok = true;
  const narrowing = kindNarrowing();
  if (narrowing.length > 0) {
    ok = false;
    console.error(`${GATE}: ✗ (a) ${narrowing.length} consumer(s) depend on a KIND:`);
    for (const f of narrowing) console.error(`  ✗ ${f}`);
  } else console.log(`${GATE}: (a) no consumer depends on a kind ✔`);

  const { orphan, sentinel, gaps } = materialRows();
  for (const [arm, list, what] of [
    ['(b)', orphan, 'orphan key(s)'],
    ['(c)', sentinel, '"not applicable" value(s)'],
  ] as const) {
    if (list.length > 0) {
      ok = false;
      console.error(`${GATE}: ✗ ${arm} ${list.length} ${what}:`);
      for (const f of list) console.error(`  ✗ ${f}`);
    } else console.log(`${GATE}: ${arm} 0 ${what} ✔`);
  }

  const total = [...gaps.values()].reduce((a, b) => a + b, 0);
  const perPack = [...gaps].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}: ${n}`);
  if (!ratchet(GATE, '(d) data gaps (composed, unauthored capability fields)', total, DATA_GAP_CEILING, perPack,
    'A kind composes what its members physically have; author the value on the row (each trade owns its rows), never move the capability off the kind.')) ok = false;
  if (process.argv.includes('--gaps')) for (const line of perPack) console.log(`  ${line}`);
  if (!ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
