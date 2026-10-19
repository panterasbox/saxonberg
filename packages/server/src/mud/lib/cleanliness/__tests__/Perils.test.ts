/**
 * ⭐ The cleanser perils and the bleach ladder (cleanliness D21–D23):
 * a ferment's breath is the profile's (byte-identical default), a burnt
 * fuel gives off its own products, a substance flashes at its own limit,
 * lye on the head blinds until rinsed, and a garment on the line whitens
 * by day and not by night — wool yellows, and the fume whitens it back.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import MaturationProfile from '../../maturation/MaturationProfile';
import Material from '../../material/Material';
import { ContainerMixin } from '../../spatial/Container';
import { Idea } from '../../stuff/Idea';
import Garment from '../../../platform/thing/equipment/Garment';
import { CelestialApi } from '../../../api/celestial';
import { BiomeApi } from '../../../api/biome';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Room extends ContainerMixin(Idea) {}

const CONTENT = join(__dirname, '..', '..', '..', '..', '..', '..', 'content');

function profileRows(): Array<{ path: string; data: Record<string, unknown> }> {
  const out: Array<{ path: string; data: Record<string, unknown> }> = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules') continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.includes('/idea/maturation/') && e.endsWith('.yaml')) {
        const doc = YAML.parse(readFileSync(full, 'utf8'));
        if (doc?.class?.endsWith('MaturationProfile')) out.push({ path: full, data: doc.data });
      }
    }
  };
  walk(CONTENT);
  return out;
}

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

beforeEach(() => {
  installV1QuantityMarshallers();
  atGameSeconds(1_000_000);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('what a ferment breathes (D22)', () => {
  it('⭐ census: every shipped profile breathes what it breathed before', () => {
    const rows = profileRows();
    expect(rows.length).toBeGreaterThan(10);
    for (const r of rows) {
      const p = makeStuff(() => new MaturationProfile());
      p.mechanism = (r.data.mechanism as never) ?? 'microbial';
      if (r.data.offGas !== undefined) {
        // Only this build's rows author it.
        expect(r.path).toMatch(/cleanliness|lavoir|stale-urine|chandlery/);
        continue;
      }
      const gas = p.getOffGas();
      if (p.mechanism === 'microbial') {
        expect(gas).toEqual({ material: '/stuff/idea/material/gas/carbon-dioxide', litresPerDay: 5000 });
      } else {
        expect(gas).toBeNull();
      }
    }
  });

  it('an authored gas replaces the default; an empty one is nothing', () => {
    const p = makeStuff(() => new MaturationProfile());
    p.offGas = { material: '/stuff/idea/material/gas/ammonia', litresPerDay: 200 };
    expect(p.getOffGas()?.material).toBe('/stuff/idea/material/gas/ammonia');
    p.offGas = { material: '', litresPerDay: 0 };
    expect(p.getOffGas()).toBeNull();
  });
});

describe('the material facts (D22, D24)', () => {
  it('flammable limit, combustion products, vapour and ash round-trip', () => {
    const m = makeStuff(() => new Material());
    m.setFlammableLimit(0.01);
    m.setCombustionProducts([{ material: '/g/so2', litresPerKg: 700 }, { material: '', litresPerKg: 1 }]);
    m.setVapourLPerLPerHour(40);
    m.setAshFraction(0.01);
    expect(m.getFlammableLimit()).toBe(0.01);
    expect(m.getCombustionProducts()).toEqual([{ material: '/g/so2', litresPerKg: 700 }]);
    expect(m.getVapourLPerLPerHour()).toBe(40);
    expect(m.getAshFraction()).toBe(0.01);
  });
});

describe('the bleach ladder (D21, AC 10)', () => {
  function onTheLine(tags: string[]): Garment {
    const m = makeStuffAtPath(() => {
      const x = new Material();
      x.setTags(tags);
      return x;
    }, `/stuff/idea/material/_air/${tags.join('-')}`);
    const g = makeStuff(() => new Garment());
    g.setMaterial(m);
    const room = makeStuff(() => new Room());
    vi.spyOn(g, 'getContainer').mockReturnValue(room as never);
    return g;
  }

  it('⭐ linen in the sun: the colour fades by DAY', async () => {
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);
    vi.spyOn(BiomeApi, 'resolveAtmosphereContentsFor').mockReturnValue([]);
    vi.spyOn(CelestialApi, 'isDayAt').mockResolvedValue(true);
    const g = onTheLine(['textile', 'fibre', 'cellulose']);
    g.applyDye({ dyestuff: '/d', mordant: '', strength: 0.8, transmitR: 0.9, transmitG: 0.2, transmitB: 0.2 });
    await g.reconcileAiring(); // stamp
    atGameSeconds(1_000_000 + 3 * 86_400);
    await g.reconcileAiring();
    expect(g.getDyeStack()[0]!.strength).toBeLessThan(0.8);
    expect(g.sunYellow).toBe(0);
  });

  it('⭐ …and not by NIGHT', async () => {
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);
    vi.spyOn(BiomeApi, 'resolveAtmosphereContentsFor').mockReturnValue([]);
    vi.spyOn(CelestialApi, 'isDayAt').mockResolvedValue(false);
    const g = onTheLine(['textile', 'fibre', 'cellulose']);
    g.applyDye({ dyestuff: '/d', mordant: '', strength: 0.8, transmitR: 0.9, transmitG: 0.2, transmitB: 0.2 });
    await g.reconcileAiring();
    atGameSeconds(1_000_000 + 3 * 86_400);
    await g.reconcileAiring();
    expect(g.getDyeStack()[0]!.strength).toBe(0.8);
  });

  it('⭐ wool in the sun YELLOWS; sulfur fume whitens it back', async () => {
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);
    const contents = vi.spyOn(BiomeApi, 'resolveAtmosphereContentsFor').mockReturnValue([]);
    const day = vi.spyOn(CelestialApi, 'isDayAt').mockResolvedValue(true);
    const g = onTheLine(['textile', 'fibre', 'protein']);
    await g.reconcileAiring();
    atGameSeconds(1_000_000 + 5 * 86_400);
    await g.reconcileAiring();
    expect(g.sunYellow).toBeGreaterThan(0.25);
    expect(g.soilLookLine()).toMatch(/yellowed/);

    makeStuffAtPath(() => {
      const so2 = new Material();
      so2.setTags(['gas', 'sulfur-fume']);
      return so2;
    }, '/stuff/idea/material/gas/_so2');
    day.mockResolvedValue(false);
    contents.mockReturnValue([{ type: '/stuff/idea/material/gas/_so2', amount: 0.05 }] as never);
    atGameSeconds(1_000_000 + 5 * 86_400 + 6 * 3600);
    await g.reconcileAiring();
    expect(g.sunYellow).toBeLessThan(0.25);
  });

  it('a worn garment is not hung out — nothing happens to it', async () => {
    const g = makeStuff(() => new Garment());
    vi.spyOn(g, 'getContainer').mockReturnValue({ isAgent: () => true } as never);
    const day = vi.spyOn(CelestialApi, 'isDayAt');
    await g.reconcileAiring();
    atGameSeconds(1_000_000 + 86_400);
    await g.reconcileAiring();
    expect(day).not.toHaveBeenCalled();
  });
});
