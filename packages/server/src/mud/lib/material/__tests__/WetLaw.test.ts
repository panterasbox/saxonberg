/**
 * ⭐⭐ The ONE wet law (storage-and-ice D9): `Material.permeability()` and
 * `Material.wetProperty(dry, fluid, saturation)`.
 *
 *  1. The law: an impermeable material (wAC ≤ 2 %) answers `dry` however
 *     wet it is; above the cutoff the pores fill in proportion to
 *     `wAC / absorptionReference`, capped at 1.
 *  2. ⚠ Cloth's clo is UNCHANGED by the migration: for every shipped
 *     material above the cutoff, the old textiles arithmetic and the new
 *     law agree to 1e-12 at every wetness; and no shipped fibre or leather
 *     material sits at or under the cutoff (the only place the new cutoff
 *     could have changed a garment).
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import Material from '../Material';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';

const K_AIR = 0.026;
const K_WATER = 0.6;
const REFERENCE = 40;

function withWac(wac: number): Material {
  const m = makeStuff(() => new Material());
  m.setName(`wac-${wac}`);
  m.setWaterAbsorptionCapacity(Quantity.of(wac, '%'));
  return m;
}

/** The shipped textiles arithmetic, verbatim, before the migration. */
function oldKVoid(wac: number, wetness: number): number {
  const soak = wetness * Math.min(1, wac / REFERENCE);
  return K_AIR * (1 - soak) + K_WATER * soak;
}

function materialRows(): { file: string; wac: number; tags: string[] }[] {
  const root = fileURLToPath(new URL('../../../../../../content/', import.meta.url));
  const out: { file: string; wac: number; tags: string[] }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'src') continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.yaml') && p.includes('/idea/material/')) {
        const row = parse(readFileSync(p, 'utf8')) as { data?: Record<string, unknown> } | null;
        const wac = Number(row?.data?.waterAbsorptionCapacity);
        if (!Number.isFinite(wac)) continue;
        out.push({ file: p, wac, tags: (row?.data?.tags as string[] | undefined) ?? [] });
      }
    }
  };
  walk(root);
  return out;
}

describe('the one wet law', () => {
  it('an impermeable material answers dry however wet it is', () => {
    for (const wac of [0, 0.1, 2]) {
      const m = withWac(wac);
      expect(m.permeability()).toBe(0);
      expect(m.wetProperty(K_AIR, K_WATER, 1)).toBe(K_AIR);
    }
  });

  it('above the cutoff the pores fill in proportion, capped at 1', () => {
    expect(withWac(20).permeability()).toBeCloseTo(0.5, 12);
    expect(withWac(100).permeability()).toBe(1);
    const sawdust = withWac(100);
    expect(sawdust.wetProperty(0.06, K_WATER, 0)).toBe(0.06);
    expect(sawdust.wetProperty(0.06, K_WATER, 1)).toBeCloseTo(K_WATER, 12);
    expect(sawdust.wetProperty(0.06, K_WATER, 0.5)).toBeCloseTo(0.33, 12);
  });

  it('⚠ every shipped material above the cutoff wets exactly as cloth did', () => {
    const rows = materialRows();
    expect(rows.length).toBeGreaterThan(20);
    for (const row of rows.filter((r) => r.wac > 2)) {
      const m = withWac(row.wac);
      for (const wetness of [0, 0.15, 0.45, 0.8, 1]) {
        expect(m.wetProperty(K_AIR, K_WATER, wetness), row.file).toBeCloseTo(
          oldKVoid(row.wac, wetness),
          12,
        );
      }
    }
  });

  it('⚠ and no shipped fibre or leather sits at or under the cutoff', () => {
    const cloth = materialRows().filter((r) =>
      r.tags.some((t) => ['textile', 'fibre', 'leather', 'hide'].includes(t)),
    );
    expect(cloth.length).toBeGreaterThan(0);
    expect(cloth.filter((r) => r.wac <= 2).map((r) => r.file)).toEqual([]);
  });
});
