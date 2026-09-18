/**
 * The Hanging Wood (forestry D13/D14) — the rejection venue's rows, read
 * off disk: three clearings on `Wood` whose `mix:` resolves, every exit
 * resolving, every room plotted and lit above `dim` for its own cell,
 * no two rooms on one cell, no two rooms propping one panel, and the
 * title admitting cultivation. ⭐ The venue ships NO code — that is the
 * claim a second wood rests on, and `exemplar.test.ts` in trade-mining
 * pins it for the whole pack.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const REJECTION = join(CONTENT, 'rejection', 'content', 'world', 'rejection');
const WOOD = join(REJECTION, 'hanging-wood');

interface Row {
  class: string;
  data: Record<string, unknown> & {
    coords?: { x: number; y: number; z: number };
    exits?: Record<string, { destination: string }>;
    ambientIntensity?: number;
    props?: string[];
    mix?: Array<{ speciesPath: string; woodMaterialPath: string; seedPath: string | null; standing: number; capacity: number; incrementPerYear: number }>;
  };
}

function row(file: string): Row {
  return YAML.parse(readFileSync(file, 'utf8')) as Row;
}

/** A template path → whether some pack ships it. */
function shipped(templatePath: string): boolean {
  for (const pack of readdirSync(CONTENT)) {
    if (existsSync(join(CONTENT, pack, 'content', `${templatePath}.yaml`))) return true;
  }
  return false;
}

const ROOMS = ['treeline', 'ride', 'oak-clearing', 'hazel-cant'].map((n) => join(WOOD, `${n}.yaml`));

describe('the Hanging Wood', () => {
  it('is a sub-zone of its own at the region’s cell size, addressed', () => {
    const zone = row(join(REJECTION, 'hanging-wood.yaml'));
    expect(zone.class).toBe('/platform/idea/location/CartesianZone');
    expect(zone.data.cellSize).toBe(10);
    expect(zone.data.address).toBe('terminus/rejection/hanging-wood');
  });

  it('⭐ three clearings are STANDS on the forestry Wood; the treeline is not', () => {
    const classes = Object.fromEntries(ROOMS.map((f) => [f.split('/').pop(), row(f).class]));
    expect(classes['treeline.yaml']).toBe('/platform/location/SingletonCartesianLocation');
    for (const r of ['ride.yaml', 'oak-clearing.yaml', 'hazel-cant.yaml']) {
      expect(classes[r], r).toBe('/trade/forestry/location/Wood');
    }
  });

  it('every stand’s mix names a species, a wood and a seed that ship', () => {
    let standards = 0;
    for (const f of ROOMS) {
      const r = row(f);
      if (r.class !== '/trade/forestry/location/Wood') continue;
      expect(r.data.mix, f).toBeDefined();
      for (const sp of r.data.mix!) {
        expect(shipped(sp.speciesPath), `${f}: ${sp.speciesPath}`).toBe(true);
        expect(shipped(sp.woodMaterialPath), `${f}: ${sp.woodMaterialPath}`).toBe(true);
        if (sp.seedPath) expect(shipped(sp.seedPath), `${f}: ${sp.seedPath}`).toBe(true);
        expect(sp.standing).toBeLessThanOrEqual(sp.capacity);
        expect(sp.incrementPerYear).toBeGreaterThan(0);
        standards += sp.standing;
      }
      expect(r.data.woodName).toBe('the Hanging Wood');
      expect(r.data.areaM2).toBe(100);
    }
    // Thirty-six standards over three rooms: 24 oak, 12 ash.
    expect(standards).toBe(36);
  });

  it('every exit resolves, and the hillside climbs into it', () => {
    for (const f of ROOMS) {
      for (const [dir, exit] of Object.entries(row(f).data.exits ?? {})) {
        expect(shipped(exit.destination), `${f} ${dir} → ${exit.destination}`).toBe(true);
      }
    }
    const hillside = row(join(REJECTION, 'location', 'hillside.yaml'));
    expect(hillside.data.exits!.north!.destination).toBe('/world/rejection/hanging-wood/treeline');
    expect(row(join(WOOD, 'treeline.yaml')).data.exits!.south!.destination).toBe('/world/rejection/location/hillside');
  });

  it('every room plots on its own cell, and no two rooms prop one panel', () => {
    const cells = new Set<string>();
    const panels = new Set<string>();
    for (const f of ROOMS) {
      const r = row(f);
      expect(r.data.coords, f).toBeDefined();
      const key = `${r.data.coords!.x},${r.data.coords!.y},${r.data.coords!.z}`;
      expect(cells.has(key), `${f} shares ${key}`).toBe(false);
      cells.add(key);
      for (const p of r.data.props ?? []) {
        if (!p.includes('/panel-')) continue;
        expect(panels.has(p), `${p} propped twice`).toBe(false);
        panels.add(p);
        expect(shipped(p), p).toBe(true);
        expect(row(join(CONTENT, 'rejection', 'content', `${p}.yaml`)).class).toBe('/trade/forestry/thing/Panel');
      }
    }
    expect(panels.size).toBe(2);
  });

  it('⭐ daylight: every wood room clears `dim` at its 10 m cell; the wood is dimmer than the hill, its clearings brighter than its ride', () => {
    const lux = (f: string, cell: number): number => (row(f).data.ambientIntensity ?? 0) / (cell * cell);
    expect(lux(join(WOOD, 'treeline.yaml'), 10)).toBeGreaterThanOrEqual(20); // lit
    expect(lux(join(WOOD, 'ride.yaml'), 10)).toBeGreaterThanOrEqual(5); // dim
    expect(lux(join(WOOD, 'ride.yaml'), 10)).toBeLessThan(20);
    expect(lux(join(WOOD, 'oak-clearing.yaml'), 10)).toBeGreaterThan(lux(join(WOOD, 'ride.yaml'), 10));
    expect(lux(join(REJECTION, 'location', 'hillside.yaml'), 10)).toBeGreaterThan(lux(join(WOOD, 'treeline.yaml'), 10));
  });

  it('⭐ daylight over Rejection: every surface room clears `dim` at 10 m and every Kestrel room `bright` at 20 m', () => {
    for (const f of readdirSync(join(REJECTION, 'location'))) {
      const r = row(join(REJECTION, 'location', f));
      expect(r.data.ambientIntensity, f).toBeDefined();
      expect(r.data.ambientIntensity! / 100, f).toBeGreaterThanOrEqual(5);
    }
    for (const f of readdirSync(join(REJECTION, 'kestrel-road'))) {
      const r = row(join(REJECTION, 'kestrel-road', f));
      expect(r.data.ambientIntensity! / 400, f).toBeGreaterThanOrEqual(60);
    }
  });

  it('the title admits cultivation — agricultural, not wild', () => {
    const pack = YAML.parse(readFileSync(join(CONTENT, 'rejection', 'pack.yaml'), 'utf8')) as {
      requires: { title: Array<{ extent: string; landUse?: string; holder: { group?: string } }> };
    };
    const wood = pack.requires.title.find((t) => t.extent === '/world/rejection/hanging-wood')!;
    expect(wood).toBeDefined();
    expect(wood.landUse).toBe('agricultural');
    expect(wood.holder.group).toBe('rejection');
  });

  it('⭐ the venue ships no code', () => {
    expect(existsSync(join(CONTENT, 'rejection', 'src'))).toBe(false);
  });
});
