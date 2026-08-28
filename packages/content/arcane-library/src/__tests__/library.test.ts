/**
 * The arcane library's own suite (capability packs D9): every row the
 * pack ships names a class that resolves — the two loci into THIS
 * pack's `src/`, the item classes into arcana's, the rest into the
 * kernel — and every spell row's effects validate (a row `SpellCatalogue`
 * would drop is a broken row). The rung's own installability, without a
 * database: the same resolution `requires-kernel` runs at install.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ModuleApi } from '@saxonberg/server/mud/api/module';
import { MagicEffects } from '@saxonberg/server/mud/lib/magic/Effect';
import { makeStuff, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import GlowlightMote from '../thing/GlowlightMote';
import SparkLocus from '../thing/SparkLocus';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '../../content');
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function* yamlFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* yamlFiles(full);
    else if (e.endsWith('.yaml')) yield full;
  }
}

interface Row { class?: string; data?: Record<string, unknown> }

describe('the arcane library — every row installs', () => {
  const rows = [...yamlFiles(CONTENT)].map((f) => ({ file: f, row: YAML.parse(readFileSync(f, 'utf-8')) as Row }));

  it('ships thirty rows: 12 spells, 2 loci, 13 items, 3 draughts', () => {
    expect(rows).toHaveLength(30);
  });

  it('every class resolves — the loci into this pack, the item classes into arcana, the rest into the kernel', async () => {
    for (const { file, row } of rows) {
      expect(row.class, file).toBeTruthy();
      const res = StuffApi.resolveClassFile(row.class!);
      if (row.class!.startsWith('/arcane-library/')) {
        expect(res.origin, file).toMatchObject({ root: '/arcane-library' });
        expect(res.file.startsWith(SRC), file).toBe(true);
      } else if (row.class!.startsWith('/arcana/')) {
        expect(res.origin, file).toMatchObject({ root: '/arcana' });
      } else {
        expect(res.origin, file).toBe('kernel');
      }
      await expect(StuffApi.loadClassByPath(row.class!), file).resolves.toBeTruthy();
    }
  });

  it("every spell row's effects validate, and the two loci-naming rows name this pack's rows", () => {
    const spells = rows.filter((r) => r.row.class === '/platform/idea/magic/Spell');
    expect(spells).toHaveLength(12);
    const named = new Set<string>();
    for (const { file, row } of spells) {
      for (const raw of row.data!.effects as unknown[]) {
        const e = MagicEffects.validate(raw);
        if (e.kind === 'emit-field') named.add(e.locus);
        if (e.kind === 'inject-channel' && e.channel === 'shock') named.add(e.locus!);
        expect(e, file).toBeTruthy();
      }
    }
    expect([...named].sort()).toEqual(['/stuff/thing/magic/glowlight-mote', '/stuff/thing/magic/spark-locus']);
    const paths = rows.map((r) => '/' + r.file.slice(CONTENT.length + 1).replace(/\.yaml$/, ''));
    for (const p of named) expect(paths).toContain(p);
  });

  it('the loci are what their spells need: a light source and an energized locus, stamped in this pack', () => {
    const mote = makeStuff(() => new GlowlightMote());
    stampTemplatePathForTest(mote, '/obj/test/mote');
    expect(MixinApi.isLightSource(mote)).toBe(true);
    const locus = makeStuff(() => new SparkLocus());
    stampTemplatePathForTest(locus, '/obj/test/locus');
    expect(MixinApi.isEnergized(locus)).toBe(true);
    expect(ModuleApi.lookup(GlowlightMote)).toBe('/arcane-library/thing/GlowlightMote');
    expect(ModuleApi.lookup(SparkLocus)).toBe('/arcane-library/thing/SparkLocus');
  });
});
