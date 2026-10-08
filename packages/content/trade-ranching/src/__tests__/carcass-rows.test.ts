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

interface YieldLine {
  cut: string;
  units: number;
  fraction?: number;
  conditioned?: boolean;
}

/** Every species row this pack ships, with its yield lines. */
function speciesRows(): { file: string; yields: YieldLine[] }[] {
  const out: { file: string; yields: YieldLine[] }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      const doc = YAML.parse(readFileSync(full, 'utf8')) as {
        data?: { butcheryYield?: YieldLine[] };
      } | null;
      out.push({
        file: full.slice(SPECIES.length + 1),
        yields: doc?.data?.butcheryYield ?? [],
      });
    }
  };
  walk(SPECIES);
  return out;
}

describe('the carcass opens onto rows that exist', () => {
  const rows = speciesRows();

  it('finds the farm species', () => {
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('⭐⭐ every cut every species names resolves to a shipped row', () => {
    const missing: string[] = [];
    for (const row of rows) {
      for (const line of row.yields) {
        if (!rowExists(line.cut)) missing.push(`${row.file}: ${line.cut}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('⚠ and none of them is a MATERIAL path', () => {
    // A material is what a cut is made OF; cloning one yields an Idea, not
    // a thing you can carry. This is the exact shape of the shipped defect.
    const materials: string[] = [];
    for (const row of rows) {
      for (const line of row.yields) {
        if (line.cut.includes('/idea/material/')) {
          materials.push(`${row.file}: ${line.cut}`);
        }
      }
    }
    expect(materials).toEqual([]);
  });

  it('⭐ a share is a share of live weight, never a percentage', () => {
    // `Species.setButcheryYield` throws on this at runtime; catching it at
    // authoring time is cheaper than catching it in a drive.
    const bad: string[] = [];
    for (const row of rows) {
      for (const line of row.yields) {
        if (line.fraction === undefined) continue;
        if (!(line.fraction > 0 && line.fraction <= 1)) {
          bad.push(`${row.file}: ${line.cut} = ${String(line.fraction)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('⭐ a dressed carcass does not add up to more than the animal', () => {
    // ⚠ The one arithmetic error nothing else would catch: five lines
    // whose shares sum past 1 would dress a 70 kg ewe out at 80 kg of
    // parts. Real carcasses lose a third to blood and gut contents, so the
    // honest ceiling is comfortably under one.
    for (const row of rows) {
      const total = row.yields.reduce((a, l) => a + (l.fraction ?? 0), 0);
      expect(total, `${row.file} sums to ${String(total)}`).toBeLessThan(0.9);
    }
  });

  it('⭐⭐ the hide and the bone do NOT scale with condition', () => {
    // A hide and a skeleton are the size the animal IS, not the shape it
    // is in. A starved ewe has the same bones as a finished one, and this
    // is the row-level statement of that.
    for (const row of rows) {
      for (const line of row.yields) {
        if (!/\/(hide|bone)$/.test(line.cut)) continue;
        expect(
          line.conditioned,
          `${row.file}: ${line.cut} must author conditioned: false`,
        ).toBe(false);
      }
    }
  });

  it('⭐⭐ the working dog authors NO yield, and that is the refusal', () => {
    const dog = rows.find((r) => r.file.includes('familiaris'));
    expect(dog).toBeDefined();
    expect(dog!.yields).toEqual([]);
  });

  it('⭐ a bird is COUNTED, not dressed', () => {
    // Nobody weighs a chicken carcass and takes shares off it. The dressed
    // shape would have a 2.5 kg bird yielding grams of suet and a hide,
    // which is how the old universal fraction table read.
    const hen = rows.find((r) => r.file.includes('gallus'));
    expect(hen).toBeDefined();
    expect(hen!.yields.length).toBeGreaterThan(0);
    for (const line of hen!.yields) {
      expect(line.fraction).toBeUndefined();
    }
  });
});
