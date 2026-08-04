/**
 * Every seeded wiki page's subject must name a **real template**.
 *
 * ⚠ The gap this closes, found by a human looking at the running
 * page: `main:oak` shipped bound to `/obj/material/oak`, which does
 * not exist — the material is `/obj/material/wood/oak`. The flagship
 * demonstration of the live architecture panel rendered an error
 * message where the panel should be, on the one page whose entire job
 * is to show the panel working.
 *
 * Two things made it survivable, and both are worth naming:
 *
 *  - `wiki dangling` reported it correctly the whole time. The
 *    machinery was right; nobody ran it. A report only helps if
 *    something *runs* it, which is what this file is.
 *  - The seed's own comment rationalised the miss ("may not exist on
 *    every deploy, and that is FINE… exercises the honest path"),
 *    which is how a typo acquires a design justification and stops
 *    looking like a typo.
 *
 * Checked against the real template tree on disk — seeds plus every
 * content pack — rather than against a fixture, because a fixture
 * would agree with whatever the seed says. This is the same
 * enumeration `scripts/check-instanceable-placement.ts` performs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const MUD = resolve(HERE, '..');
const SERVER_ROOT = resolve(MUD, '../..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const SEEDS = join(MUD, 'seeds');
const CONTENT = join(REPO_ROOT, 'packages/content');
const SEED_FILE = join(MUD, 'config/wiki-pages.yaml');

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (e.endsWith('.yaml')) yield p;
  }
}

/** Every template path the repo seeds — `seeds/` plus each pack. */
function templatePaths(): Set<string> {
  const out = new Set<string>();
  const add = (root: string, file: string): void => {
    out.add(
      '/' + relative(root, file).replace(/\.yaml$/, '').split('\\').join('/'),
    );
  };
  for (const f of walk(SEEDS)) add(SEEDS, f);
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      const root = join(CONTENT, pack, 'content');
      if (existsSync(root)) for (const f of walk(root)) add(root, f);
    }
  }
  return out;
}

interface SeedEntry {
  page: string;
  subject?: { kind?: string; ref?: string } | null;
}

function seededPages(): SeedEntry[] {
  const doc = YAML.parse(readFileSync(SEED_FILE, 'utf8')) as {
    pages?: SeedEntry[];
  };
  return doc.pages ?? [];
}

describe('seeded wiki subjects', () => {
  it('the seed file parses and ships pages', () => {
    expect(seededPages().length).toBeGreaterThan(0);
  });

  it('⭐ every `template` subject resolves to a real template', () => {
    const known = templatePaths();
    const broken = seededPages()
      .filter((p) => p.subject?.kind === 'template')
      .filter((p) => !known.has(String(p.subject?.ref)))
      .map((p) => `${p.page} → ${p.subject?.ref}`);
    expect(broken).toEqual([]);
  });

  it('⭐ every `<composition of="…">` in a body names a real template', () => {
    // The frontmatter subject and the in-body panel are separate refs
    // and can disagree — the panel is what the reader actually sees.
    const known = templatePaths();
    const broken: string[] = [];
    for (const page of seededPages()) {
      const body = String(
        (page as unknown as { body?: string }).body ?? '',
      );
      for (const m of body.matchAll(/<composition\b[^>]*\bof="([^"]+)"/g)) {
        if (!known.has(m[1]!)) broken.push(`${page.page} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('the enumeration finds the tree at all — the guard is not vacuous', () => {
    // A path bug here would empty `known`, and an empty `known` makes
    // the two assertions above fail loudly rather than pass silently
    // — but only if the enumeration is right, so check a template
    // both halves depend on.
    const known = templatePaths();
    expect(known.size).toBeGreaterThan(100);
    expect(known.has('/obj/material/wood/oak')).toBe(true);
    expect(known.has('/obj/material/oak')).toBe(false);
  });
});
