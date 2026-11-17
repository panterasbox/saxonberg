/**
 * ⭐ The leatherworker's carrying gear (size and carrying W6): the halter is
 * the one garment a lead is tied to (worn AND Tieable, and the lead hangs
 * from it); the belt family hangs things `from` a length; the hung goods
 * claim no body slot; the shaped ones name their kind; tack claims the
 * quadruped's back.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Halter from '../thing/Halter';

const THING = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'trade', 'tanning', 'thing');
const QUAD = '/stuff/idea/species/BodyPlan/quadruped';
const FROM = '/platform/placements/from';

function row(name: string): { class: string; data: Record<string, unknown> } {
  return YAML.parse(readFileSync(join(THING, `${name}.yaml`), 'utf8'));
}

describe('tanning — carrying gear rows (W6)', () => {
  it('the halter is worn and Tieable', () => {
    const h = makeStuff(() => new Halter());
    expect(MixinApi.isTieable(h)).toBe(true);
    expect(MixinApi.isWearable(h)).toBe(true);
    const r = row('halter');
    expect(r.class).toBe('/trade/tanning/thing/Halter');
    expect(r.data.placements).toEqual([FROM]);
    expect((r.data.slotClaims as Record<string, string[]>)[QUAD]).toEqual(['collar']);
  });

  it('belts and harnesses hang things from a length', () => {
    for (const n of ['belt', 'utility-belt', 'bandolier', 'chest-harness']) {
      expect(row(n).data.placements).toEqual([FROM]);
    }
  });

  it('hung goods claim no slot; shaped ones name their kind', () => {
    for (const n of ['belt-pouch', 'medics-pouch', 'purse', 'canteen-clip', 'holster', 'sheath', 'scabbard', 'quiver', 'saddlebags', 'pannier', 'oilskin-pouch']) {
      expect(row(n).data.slotClaims, n).toBeUndefined();
      expect(row(n).data.dimensions, n).toBeDefined();
    }
    for (const n of ['canteen-clip', 'holster', 'sheath', 'scabbard', 'quiver']) {
      expect(typeof row(n).data.shapedTo, n).toBe('string');
    }
  });

  it('tack sits on the quadruped back and offers from', () => {
    for (const n of ['saddle', 'pack-saddle']) {
      const d = row(n).data;
      expect((d.slotClaims as Record<string, string[]>)[QUAD]).toEqual(['back:1']);
      expect(d.placements).toEqual([FROM]);
    }
  });

  it('every new row names a material', () => {
    const rows = readdirSync(THING).filter((f) => f.endsWith('.yaml'));
    for (const n of ['belt', 'satchel', 'rucksack', 'frame-pack', 'haversack', 'bumbag']) {
      expect(rows).toContain(`${n}.yaml`);
      expect(typeof row(n).data._materialPath).toBe('string');
    }
  });
});
