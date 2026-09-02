/**
 * Which verbs need a body — pinned, so the split cannot drift.
 *
 * `requiresEmbodied` is where **function over form** stops being a
 * doctrine and becomes mechanical. The set of verbs carrying it IS the
 * embodied half of what a participant can do; everything else is the
 * platform half and keeps working no matter what has happened to the
 * body. A dead player still talks, walks the commons, reads the forums
 * and shows up in `who`.
 *
 * That makes the tagging a design decision rather than a detail, so it
 * lives here rather than in anyone's head. A new verb in a material
 * category fails this test until someone decides, deliberately, which
 * half it belongs to.
 *
 * The test is "does this ACT ON MATTER" — not "which folder is it in".
 * Reading verbs in material categories (`inventory`, `wallet`, `menu`,
 * `spells`) are informational and stay untagged: a shade checking its
 * empty pockets is not touching anything.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// The engine verbs are the platform pack's content (content-packs wave 2).
const CMD_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content');
const TAG = '/lib/command/validators/requiresEmbodied';

/** Categories whose verbs act on matter. */
const MATERIAL_CATEGORIES = [
  'inventory',
  'crafting',
  'bulk',
  'device',
  'boundary',
  'combat',
  'medical',
  'retail',
  'banking',
  'posture',
  'magic',
];

/**
 * Categories that ride the participant, not the body. A shade keeps every
 * one of these — that is the whole of function-over-form.
 */
const PLATFORM_CATEGORIES = [
  'movement',
  'social',
  'perception',
  'system',
  'shell',
  'author',
  'charactergen',
  'governance',
  'civics',
  'stream',
  'work',
  'tpa',
  'employment',
];

/**
 * Informational verbs that happen to live in a material category. Each is
 * a READ, so each stays untagged. Adding to this list is a deliberate
 * ruling, which is the point of naming them.
 */
const READ_ONLY_IN_MATERIAL = new Set([
  'platform/cmd/banking/bank.yaml',
  'platform/cmd/banking/wallet.yaml',
  'platform/cmd/banking/house.yaml',
  'platform/cmd/banking/reserve.yaml',
  'platform/cmd/retail/menu.yaml',
  'platform/cmd/inventory/inventory.yaml',
  'system/arcana/cmd/magic/spells.yaml',
]);

function viewsIn(category: string): string[] {
  const dir = join(CMD_ROOT, category);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yaml'));
}

describe('requiresEmbodied tagging', () => {
  it('every material verb requires a body', () => {
    const missing: string[] = [];
    for (const category of MATERIAL_CATEGORIES) {
      for (const file of viewsIn(category)) {
        const rel = `${category}/${file}`;
        if (READ_ONLY_IN_MATERIAL.has(rel)) continue;
        const yaml = readFileSync(join(CMD_ROOT, category, file), 'utf8');
        if (!yaml.includes(TAG)) missing.push(rel);
      }
    }
    expect(
      missing,
      'these act on matter but a shade could still do them — tag them, ' +
        'or add them to READ_ONLY_IN_MATERIAL if they are really reads',
    ).toEqual([]);
  });

  it('no platform verb requires a body', () => {
    const wrong: string[] = [];
    for (const category of PLATFORM_CATEGORIES) {
      for (const file of viewsIn(category)) {
        const yaml = readFileSync(join(CMD_ROOT, category, file), 'utf8');
        if (yaml.includes(TAG)) wrong.push(`${category}/${file}`);
      }
    }
    expect(
      wrong,
      'these ride the participant and must survive losing a body — ' +
        'tagging them severs a dead player from the platform',
    ).toEqual([]);
  });

  it('the read-only exceptions really are untagged', () => {
    for (const rel of READ_ONLY_IN_MATERIAL) {
      // A view's key is its document PATH, and a path's first segment is
      // its namespace root — which is not the same thing as the pack
      // DIRECTORY that ships it. `/system/arcana/…` is shipped by the
      // `arcana` pack, exactly as `/trade/hospitality/…` is shipped by
      // `trade-hospitality`. So the directory is the LAST segment of the
      // root, not the first: `system/arcana/cmd/…` → `arcana`.
      const segs = rel.split('/');
      const pack = segs[0] === 'system' ? segs[1]! : segs[0]!;
      const root = pack === 'platform' ? CMD_ROOT : join(CMD_ROOT, '..', '..', pack, 'content');
      const yaml = readFileSync(join(root, rel), 'utf8');
      expect(yaml.includes(TAG), `${rel} should be untagged`).toBe(false);
    }
  });

  it('tpa stays untagged — the credential gate already handles a shade', () => {
    // A shade holds no travel credential, so the shipped gate refuses it
    // without a special case. Same argument as locked doors: the ordinary
    // machinery already says no, and adding a second refusal would just be
    // a worse error message.
    for (const file of viewsIn('tpa')) {
      const yaml = readFileSync(join(CMD_ROOT, 'tpa', file), 'utf8');
      expect(yaml.includes(TAG)).toBe(false);
    }
  });
});
