/**
 * check-water-plumbed — ⭐⭐ **a premises' pipe word names a real pipe, and
 * nobody props one by hand** (water-supply; rewritten at review, 2026-11-06).
 *
 * A tap implies its pipe: the room stands up the run its PREMISES' `pipe:`
 * word names (`/stuff/thing/fixture/<word>-run`, on the title claim in a
 * pack's `pack.yaml`, inherited up the claim chain) the first time a fixture
 * needs it, and the default word (`plumbing.defaultRun`) when nothing up the
 * chain says. So no room authors anything. This gate keeps that true, three
 * ways:
 *
 *   1. every claim's `pipe:` is a word whose run row exists;
 *   2. the default word in the platform settings names a run row too;
 *   3. ⭐ no room props a PRE-LAID run (`/stuff/thing/fixture/*-run`) — the
 *      pattern this replaced, where every room with a tap had to carry a pipe
 *      object and a gate forced it on sixteen rooms. A plumber's job (a run
 *      with a bill, laid with `fit`, under `/trade/plumbing/`) is not that and
 *      stays allowed. A ratchet at zero.
 *
 * A misspelled word fails HERE, at the content check — never as a room that
 * quietly reads unplumbed.
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

const RUN_CLASS = '/platform/thing/PipeRun';
const RUN_ROW = (word: string): string => `/stuff/thing/fixture/${word}-run`;
const PRELAID = /^\/stuff\/thing\/fixture\/[a-z0-9-]+-run$/;

/** The shipped default word, read from the platform pack's settings. */
function defaultRunWord(): string | null {
  const f = join(CONTENT, 'platform/content/settings/water.yaml');
  if (!existsSync(f)) return null;
  const doc = YAML.parse(readFileSync(f, 'utf8')) as { settings?: { key?: string; value?: unknown }[] };
  const row = (doc?.settings ?? []).find((r) => r?.key === 'plumbing.defaultRun');
  return typeof row?.value === 'string' ? row.value : null;
}

function main(): void {
  const all = rows();
  const findings: string[] = [];
  const isRun = (path: string): boolean => classOf(all, path) === RUN_CLASS;
  for (const pack of readdirSync(CONTENT)) {
    const manifest = join(CONTENT, pack, 'pack.yaml');
    if (!existsSync(manifest)) continue;
    const doc = YAML.parse(readFileSync(manifest, 'utf8')) as {
      requires?: { title?: { extent?: string; pipe?: unknown }[] };
    } | null;
    for (const t of doc?.requires?.title ?? []) {
      if (t?.pipe === undefined) continue;
      if (typeof t.pipe !== 'string' || !isRun(RUN_ROW(t.pipe))) {
        findings.push(`${relative(REPO_ROOT, manifest)}: ${t.extent ?? '?'} pipe: ${JSON.stringify(t.pipe)} names no run (${RUN_ROW(String(t.pipe))})`);
      }
    }
  }
  for (const [path, row] of all) {
    if (!/\/location\//.test(path) && !(row.class ?? '').includes('/location/')) continue;
    for (const p of propsOf(all, path)) {
      if (PRELAID.test(p) && isRun(p)) {
        findings.push(`${relative(REPO_ROOT, row.file)}: props the pre-laid run ${p} — a tap implies its pipe; give its premises' claim \`pipe: <word>\` instead`);
      }
    }
  }
  const def = defaultRunWord();
  if (def === null || !isRun(RUN_ROW(def))) {
    findings.push(`platform settings: plumbing.defaultRun (${JSON.stringify(def)}) names no run row`);
  }
  const n = findings.length;
  // eslint-disable-next-line no-console -- the gate's own report
  console.log(`check-water-plumbed: ${n} plumbing finding(s) (ceiling ${WATER_PLUMBED_CEILING}).`);
  if (n > WATER_PLUMBED_CEILING) {
    for (const f of findings) console.error(`  ✗ ${f}`);
    console.error(
      'check-water-plumbed: FAIL — a premises says its pipe with one word on its title claim ' +
        '(`pipe: lead`) or nothing at all (the default); the word must name ' +
        '/stuff/thing/fixture/<word>-run, and no room props a pre-laid run by hand.',
    );
    process.exit(1);
  }
}

main();
