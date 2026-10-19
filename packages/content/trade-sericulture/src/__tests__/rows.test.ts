/**
 * The pack's rows stand up: every class a row names resolves to a file in
 * this pack's `src/` (or is the kernel's), every `extends:` parent exists,
 * and every material, strain and species a row cites is a row somewhere.
 * ⚠ A dangling path here is a thing a player can buy and nothing can
 * load.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import RearingTray from '../thing/RearingTray';
import HouseTray from '../thing/HouseTray';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const CONTENT_ROOT = join(PACK, '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (n.endsWith('.yaml')) out.push(p);
  }
  return out;
}

/** Is `path` a row in ANY pack's content tree? */
function rowExists(path: string): boolean {
  for (const pack of readdirSync(CONTENT_ROOT)) {
    if (existsSync(join(CONTENT_ROOT, pack, 'content', `${path}.yaml`))) return true;
  }
  return false;
}

const rows = walk(join(PACK, 'content')).filter((f) => !f.includes('/settings/'));

describe('trade-sericulture rows', () => {
  it.each(rows.map((f) => [f.slice(PACK.length)]))('%s resolves', (rel) => {
    const doc = YAML.parse(readFileSync(join(PACK, rel), 'utf-8')) as {
      class?: string;
      extends?: string;
      data?: Record<string, unknown>;
    };
    if (doc.class?.startsWith('/trade/sericulture/')) {
      const file = doc.class.replace('/trade/sericulture/', 'src/') + '.ts';
      expect(existsSync(join(PACK, file)), `${doc.class} → ${file}`).toBe(true);
    }
    if (doc.extends) expect(rowExists(doc.extends), doc.extends).toBe(true);
    for (const key of ['_materialPath', '_strainPath', '_speciesPath', 'interiorMaterial', 'growsIntoPath', 'harvestTemplatePath']) {
      const v = doc.data?.[key];
      if (typeof v === 'string') expect(rowExists(v), `${key}: ${v}`).toBe(true);
    }
  });

  it('⭐ D15 — a house tray persists its rearing', () => {
    expect(MixinApi.hasMixin(HouseTray as never, 'PersistableMixin' as never)).toBe(true);
    const persisted = new Set(MixinApi.getAllPersistentFields(RearingTray as never));
    for (const f of ['rearingState', '_strainPath', 'eggCount', 'lotGeneticMg', 'pebrineLoad', 'degreeDays', 'rearingStamp', 'fifthAgeSat', 'keeperPath']) {
      expect(persisted.has(f), f).toBe(true);
    }
  });
});
