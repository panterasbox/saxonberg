/**
 * ⚠⚠ **Every cut a species names must exist — because the miss is SILENT
 * and reports success.**
 *
 * The kitchen's `butcher` clones each yield line and tolerates a failed
 * clone, which is the right call at runtime (*a missing cut row is a
 * content gap, not a reason to lose the rest of the carcass*) and a trap
 * at authoring time: the act still announces what it got and simply lists
 * one part fewer.
 *
 * It cost exactly that once. The retired stockyard controller's meat line
 * named `/stuff/idea/material/food/stew-meat` — the MATERIAL a cut is made
 * of, not the thing row — so a butchered cow yielded tallow, hide and bone
 * and **no meat**, the one product the act exists for. It went unseen
 * because every drafted head massed zero, so the yield read empty for an
 * unrelated reason.
 *
 * ⭐⭐ **Rewritten by the carcass-chain build, and the rewrite is the
 * point.** The paths used to live in TypeScript, in a module table that
 * was the same for a hen and a bullock. They are in the SPECIES rows now,
 * so this walks the rows — which means a new huntable animal is checked
 * by this test on the day it is authored, with no file here to edit.
 *
 * ⚠ `lint:census` reaches the rows but not the shape: it checks that a
 * path-valued field resolves, and `butcheryYield[].cut` is a path inside a
 * list of objects. The *material, not a thing* half is this file's alone.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKS = join(HERE, '..', '..', '..');
const SPECIES = join(
  HERE,
  '..',
  '..',
  'content',
  'stuff',
  'idea',
  'species',
);

/** Where a `/root/rest` template path's `.yaml` lives, across the packs. */
function rowExists(path: string): boolean {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  for (const pack of readdirSync(PACKS)) {
    const candidate = join(PACKS, pack, 'content', rel);
    try {
      if (statSync(candidate).isFile()) return true;
    } catch {
      // not this pack
    }
  }
  return false;
}

/**
 * ⭐ Every carcass line every body module names (organism-biology D5): what
 * comes off derives from the body, so the rows a carcass opens onto are the
 * modules' `comesOffAs` cuts.
 */
function carcassLines(): { file: string; cut: string }[] {
  const out: { file: string; cut: string }[] = [];
  for (const pack of readdirSync(PACKS)) {
    const dir = join(PACKS, pack, 'content', 'body-modules');
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith('.yaml')) continue;
      const doc = YAML.parse(readFileSync(join(dir, entry), 'utf8')) as { comesOffAs?: { cut: string }[] } | null;
      for (const e of doc?.comesOffAs ?? []) out.push({ file: `${pack}/${entry}`, cut: e.cut });
    }
  }
  return out;
}

describe('the carcass opens onto rows that exist', () => {
  const lines = carcassLines();

  it('finds the modules\' carcass lines', () => {
    expect(lines.length).toBeGreaterThanOrEqual(30);
  });

  it('⭐⭐ every cut every module names resolves to a shipped row', () => {
    expect(lines.filter((l) => !rowExists(l.cut)).map((l) => `${l.file}: ${l.cut}`)).toEqual([]);
  });

  it('⚠ and none of them is a MATERIAL path', () => {
    // A material is what a cut is made OF; cloning one yields an Idea, not
    // a thing you can carry. This is the exact shape of the shipped defect.
    expect(lines.filter((l) => l.cut.includes('/idea/material/')).map((l) => `${l.file}: ${l.cut}`)).toEqual([]);
  });

  it('⭐ no farm species authors a yield list — the field is gone', () => {
    const authored: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith('.yaml')) continue;
        const doc = YAML.parse(readFileSync(full, 'utf8')) as { data?: Record<string, unknown> } | null;
        if (doc?.data && 'butcheryYield' in doc.data) authored.push(full);
      }
    };
    walk(SPECIES);
    expect(authored).toEqual([]);
  });
});
