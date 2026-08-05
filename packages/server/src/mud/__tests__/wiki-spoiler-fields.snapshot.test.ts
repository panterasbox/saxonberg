/**
 * ⭐ **The enumerating audit** — every field a `<composition>` panel can
 * surface, with its declared reveal level.
 *
 * Acceptance criterion **28**, and it is not optional.
 *
 * ## Why this file exists
 *
 * The reveal model **fails open**: an untagged field is level 0. That
 * decision is deliberate (default-spoiler would empty every panel until
 * several hundred mundane fields were tagged, and would train authors
 * to tag reflexively rather than thoughtfully), but it has a real cost
 * that is not being papered over: **a newly-added spoilery field is
 * visible until somebody tags it.**
 *
 * This is covered the way the sandbox boundary exemptions are —
 * **by enumeration, not inference.** The snapshot below lists every
 * field, so adding one shows up as a diff a reviewer has to look at,
 * rather than as a leak in production that nobody notices.
 *
 * ## How to read a failure
 *
 * A diff here does **not** mean something broke. It means the set of
 * fields the wiki can surface has changed, and somebody has to answer
 * one question about each new line:
 *
 *   > *Is this a spoiler?*
 *
 * Density and hardness are not. A species' resistances are. A hazard's
 * trigger is. A creature's weakness is. If the answer is yes, add
 * `spoiler: <1|2|3>` to that field's `fieldMeta` entry and re-run.
 * If no, update the snapshot.
 *
 * Reviewing the diff IS the control. Skipping it and blessing the
 * snapshot is the one way this file stops working.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MUD_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Every `.ts` file under `dir`, recursively, tests excluded. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      sourceFiles(full, out);
      continue;
    }
    if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

/**
 * Blank out comments and leave everything else where it was — every
 * comment character becomes a space, so byte offsets (and therefore
 * `braceBody`) stay valid.
 *
 * ⚠ Not cosmetic. The owner label comes from "the nearest `class` or
 * `const` above", matched by regex against raw source, and
 * `Material.ts` contains the ordinary English phrase *"See class
 * header for…"* in a doc comment — so every material field was filed
 * under `header.density`, `header.toxicity`, naming nothing. The
 * reviewer's question is *is `Material.density` a spoiler*, and a
 * label that answers "header" cannot be reviewed.
 *
 * It also stops a commented-OUT `static fieldMeta` being harvested as
 * though it were live.
 */
function blankComments(src: string): string {
  const out = src.split('');
  type Mode = 'code' | 'line' | 'block' | "'" | '"' | '`';
  let mode: Mode = 'code';
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const d = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        mode = 'line';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        out[i] = ' ';
        out[i + 1] = ' ';
        mode = 'block';
        i += 2;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') mode = c;
      i += 1;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') mode = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && d === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        mode = 'code';
        i += 2;
        continue;
      }
      if (c !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }
    // Inside a string: only the matching quote (unescaped) ends it.
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === mode) mode = 'code';
    i += 1;
  }
  return out.join('');
}

/**
 * Harvest `static fieldMeta = { … }` declarations by source scan.
 *
 * A source scan rather than runtime introspection, on purpose: the
 * panel can surface a field on ANY class a template names, and
 * enumerating those at runtime would mean importing the whole world —
 * which is slow, order-dependent, and would quietly miss a class whose
 * import happened to fail. The text is the truth about what is
 * declared, and what is declared is what the panel reads.
 *
 * Returns `owner.field → level`, level 0 for anything untagged.
 */
function harvestFieldLevels(): Record<string, string> {
  const levels: Record<string, string> = {};
  const CLASS_RE = /(?:class|const)\s+(\w+)/g;
  const META_RE = /static\s+fieldMeta\s*:?[^=]*=\s*\{/g;

  for (const file of sourceFiles(MUD_ROOT)) {
    const src = blankComments(readFileSync(file, 'utf8'));
    META_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = META_RE.exec(src)) !== null) {
      // The owner is the nearest class/const declaration above.
      const before = src.slice(0, m.index);
      CLASS_RE.lastIndex = 0;
      let owner = '(anonymous)';
      let c: RegExpExecArray | null;
      while ((c = CLASS_RE.exec(before)) !== null) owner = c[1]!;

      const body = braceBody(src, m.index + m[0].length - 1);
      for (const [field, level] of entriesOf(body)) {
        levels[`${owner}.${field}`] = level;
      }
    }
  }
  return levels;
}

/** The text between a `{` at `open` and its matching `}`. */
function braceBody(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return '';
}

/** `field: { … spoiler: N … }` pairs inside one fieldMeta body. */
function entriesOf(body: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const ENTRY = /(\w+)\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = ENTRY.exec(body)) !== null) {
    const inner = braceBody(body, m.index + m[0].length - 1);
    // Only a TOP-LEVEL entry is a field; a nested object is not.
    if (/^\s*\w+\s*:\s*\{/.test(inner) && !/persistent|spoiler|ref\s*:/.test(inner)) {
      continue;
    }
    const spoiler = /\bspoiler\s*:\s*(\d)/.exec(inner);
    const level = spoiler ? Number(spoiler[1]) : 0;
    // ⚠ The NAME's level is audited too. A field can now reveal its
    // existence at a lower level than its value (`spoilerName`), which
    // is deliberate for schema-vs-measurement — and is exactly the
    // kind of quiet loosening this file exists to put in front of a
    // reviewer. Rendered only when it DIFFERS, so splitting a field
    // shows as a diff while every unsplit field's line stays put.
    const named = /\bspoilerName\s*:\s*(\d)/.exec(inner);
    const nameLevel = named ? Math.min(Number(named[1]), level) : level;
    out.push([m[1]!, nameLevel === level ? `${level}` : `${level} (name ${nameLevel})`]);
  }
  return out;
}

describe('⭐ the composition panel’s surfaceable fields (28)', () => {
  const levels = harvestFieldLevels();

  it('harvests a non-trivial corpus — the audit is actually looking', () => {
    // A scan that silently found nothing would pass every assertion
    // below while auditing nothing at all.
    expect(Object.keys(levels).length).toBeGreaterThan(200);
  });

  it('SNAPSHOT: every declared field, with its reveal level', () => {
    // ⚠ A diff here is a REVIEW ITEM, not a breakage. For each new
    // line, answer: is this a spoiler? If yes, add `spoiler: <n>` to
    // its fieldMeta entry. If no, update the snapshot. Skipping the
    // question is the one way this stops working.
    const lines = Object.keys(levels)
      .sort()
      .map((key) => `${key} = ${levels[key]}`);
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('SNAPSHOT: the fields deliberately declared as spoilers', () => {
    // The short list, kept separately because it is the one a reviewer
    // can actually read — and because it going EMPTY is a signal in
    // itself (somebody dropped a tag).
    const tagged = Object.keys(levels)
      .filter((k) => !(levels[k] ?? '0').startsWith('0'))
      .sort()
      .map((k) => `${k} = ${levels[k]}`);
    expect(tagged.join('\n')).toMatchSnapshot();
  });

  it('every declared level is inside the 0–3 vocabulary', () => {
    for (const [key, level] of Object.entries(levels)) {
      for (const n of level.match(/\d/g) ?? []) {
        expect(Number(n), `${key} declares an out-of-range level`).toBeGreaterThanOrEqual(0);
        expect(Number(n), `${key} declares an out-of-range level`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('⚠ a name level never exceeds its value level', () => {
    // A name more secret than the thing it names is incoherent — it
    // renders as a value in a row with no label. `ofFieldName` clamps
    // it; this asserts nothing in the corpus relies on the clamp.
    for (const [key, level] of Object.entries(levels)) {
      const m = /^(\d) \(name (\d)\)$/.exec(level);
      if (!m) continue;
      expect(Number(m[2]), `${key} names above its value`).toBeLessThan(
        Number(m[1]),
      );
    }
  });
});
