/**
 * check-water-plumbed — ⭐⭐ **a room with a tap in it has a pipe in it**
 * (water-supply D10, AC 1/4).
 *
 * Since the water-supply build a fixture gives water only through a sound
 * `PipeRun` in its room: the supply alone is not water. So the moment that
 * rule landed, every bar, ward, bathhouse and dorm room that props a tap and
 * no run would have gone `unplumbed` — every bar in the realm dry in one
 * missed line. This gate is the census: every location row whose `props:`
 * (its own, and what it inherits by `extends:`) hold a supply-reading
 * `WaterFixture` row must prop a `PipeRun` row too.
 *
 * Exempt, by the fixture's own rule: a `natural` fixture (it IS a source), a
 * fixture `suppliedBy` a named source (a hydrant on a main is its own pipe),
 * and a fixture on a `Street` (a public outlet's pipe is under the street).
 * A ratchet at zero.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

export const WATER_PLUMBED_CEILING = 0;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

interface Row {
  file: string;
  class?: string;
  extends?: string;
  data: Record<string, unknown>;
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.yaml')) out.push(full);
  }
}

/** Every content row, keyed by its template path. */
function rows(): Map<string, Row> {
  const out = new Map<string, Row>();
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT)) {
    const base = join(CONTENT, pack, 'content');
    if (!existsSync(base)) continue;
    const files: string[] = [];
    walk(base, files);
    for (const f of files) {
      let doc: unknown;
      try {
        doc = YAML.parse(readFileSync(f, 'utf8'));
      } catch {
        continue;
      }
      if (!doc || typeof doc !== 'object') continue;
      const d = doc as { class?: string; extends?: string; data?: Record<string, unknown> };
      if (!d.class && !d.extends) continue;
      const path = '/' + relative(base, f).replace(/\\\\/g, '/').replace(/\.yaml$/, '');
      out.set(path, { file: f, class: d.class, extends: d.extends, data: d.data ?? {} });
    }
  }
  return out;
}

function classOf(all: Map<string, Row>, path: string, seen = new Set<string>()): string {
  const r = all.get(path);
  if (!r || seen.has(path)) return '';
  seen.add(path);
  return r.class ?? (r.extends ? classOf(all, r.extends, seen) : '');
}

function field(all: Map<string, Row>, path: string, key: string, seen = new Set<string>()): unknown {
  const r = all.get(path);
  if (!r || seen.has(path)) return undefined;
  seen.add(path);
  if (key in r.data) return r.data[key];
  return r.extends ? field(all, r.extends, key, seen) : undefined;
}

/** A row's props, its own and its parents' (`by-entry` inheritance). */
function propsOf(all: Map<string, Row>, path: string, seen = new Set<string>()): string[] {
  const r = all.get(path);
  if (!r || seen.has(path)) return [];
  seen.add(path);
  const own = Array.isArray(r.data.props)
    ? (r.data.props as unknown[]).map((p) =>
        typeof p === 'string' ? p : String((p as { template?: unknown })?.template ?? ''),
      )
    : [];
  return [...own, ...(r.extends ? propsOf(all, r.extends, seen) : [])];
}

const FIXTURE_CLASSES = new Set(['/platform/thing/WaterFixture', '/platform/thing/Copper']);
const RUN_CLASS = '/platform/thing/PipeRun';
const STREET_CLASS = '/platform/location/Street';

function main(): void {
  const all = rows();
  const findings: string[] = [];
  for (const [path, row] of all) {
    if (!/\/location\//.test(path) && !(row.class ?? '').includes('/location/')) continue;
    if (classOf(all, path) === STREET_CLASS) continue;
    const props = propsOf(all, path);
    const needs = props.filter((p) => {
      if (!FIXTURE_CLASSES.has(classOf(all, p))) return false;
      if (field(all, p, 'natural') === true) return false;
      const by = field(all, p, 'suppliedBy');
      return !(typeof by === 'string' && by !== '');
    });
    if (needs.length === 0) continue;
    if (props.some((p) => classOf(all, p) === RUN_CLASS)) continue;
    findings.push(`${relative(REPO_ROOT, row.file)}: props ${needs.join(', ')} and no pipe run`);
  }
  const n = findings.length;
  // eslint-disable-next-line no-console -- the gate's own report
  console.log(`check-water-plumbed: ${n} room(s) with a tap and no pipe (ceiling ${WATER_PLUMBED_CEILING}).`);
  if (n > WATER_PLUMBED_CEILING) {
    for (const f of findings) console.error(`  ✗ ${f}`);
    console.error(
      'check-water-plumbed: FAIL — a fixture gives water only through a sound PipeRun in its room ' +
        '(water-supply D10). Prop /stuff/thing/fixture/lead-run (a house) or iron-run (a trade or a ' +
        'public building), or mark the fixture natural / suppliedBy if that is what it is.',
    );
    process.exit(1);
  }
}

main();
