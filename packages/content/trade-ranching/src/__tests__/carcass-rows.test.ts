/**
 * ⚠⚠ **Every row the butchery names must exist — because the miss is
 * SILENT and reports success.**
 *
 * `ButcherController.mint` swallows a failed clone on purpose (*"a
 * missing cut row is a content gap, not a reason to lose the rest of the
 * carcass"*), which is the right call at runtime and a trap at authoring
 * time: the act still announces *"nothing is wasted"* and simply lists
 * one part fewer.
 *
 * It cost exactly that. The meat line named
 * `/stuff/idea/material/food/stew-meat` — the MATERIAL the cut is made
 * of, not the thing row — so a butchered cow yielded tallow, hide and
 * bone and **no meat**, the one product the act exists for. It went
 * unseen because every drafted head massed zero (no `adultMass` on the
 * species, no `baseMass` on `quadruped`), so the yield read empty for an
 * unrelated reason.
 *
 * ⚠ `lint:census` cannot reach this: it walks path-valued fields in
 * shipped ROWS, and these paths live in TypeScript.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTROLLER = join(
  HERE,
  '..',
  'idea',
  'cmd',
  'ranching',
  'ButcherController.ts',
);
const PACKS = join(HERE, '..', '..', '..');

/** Where a `/root/rest` template path's `.yaml` lives, across the packs. */
function rowExists(path: string): boolean {
  const rel = `${path.replace(/^\//, '')}.yaml`;
  // A row's file sits under some pack's `content/`; the packs are
  // siblings, so ask each rather than hard-coding which owns what.
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

describe('the carcass opens onto rows that exist', () => {
  it('⭐⭐ every yield row the butchery names resolves to a shipped row', () => {
    expect(existsSync(CONTROLLER)).toBe(true);
    const src = readFileSync(CONTROLLER, 'utf8');

    const rows = [...src.matchAll(/\brow:\s*'([^']+)'/g)].map((m) => m[1]!);
    // The four cuts of the whole carcass — meat, tallow, hide, bone.
    expect(rows.length).toBeGreaterThanOrEqual(4);

    const missing = rows.filter((r) => !rowExists(r));
    expect(missing).toEqual([]);

    // ⭐ And none of them may be a MATERIAL path: a material is what a cut
    // is made OF, and cloning one yields an Idea, not a thing you can
    // carry. This is the exact shape of the defect.
    const materials = rows.filter((r) => r.includes('/idea/material/'));
    expect(materials).toEqual([]);
  });
});
