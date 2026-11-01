/**
 * ⭐ The colorman's and the house painter (paint D20), as rows: `painter`
 * names the house painter (the boat's line is a bow line); the
 * cottage is a building whose landing is the towpath; the round's stations
 * are where buildings meet the weather.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const ROOT = fileURLToPath(new URL('../../content/world/terminus/', import.meta.url));

function rowsUnder(dir: string): { file: string; data: Record<string, unknown> }[] {
  const out: { file: string; data: Record<string, unknown> }[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...rowsUnder(p));
    else if (name.endsWith('.yaml')) {
      out.push({ file: p, data: ((parse(readFileSync(p, 'utf8')) ?? {}) as { data?: Record<string, unknown> }).data ?? {} });
    }
  }
  return out;
}

describe('the colorman and the house painter', () => {
  it('"painter" names the house painter, and the boat\'s line is a bow line', () => {
    const tam = rowsUnder(join(ROOT, 'wharfside/colorman/agent')).find((r) => r.data.name === 'Tam Rook')!;
    expect(tam.data.keywords).toContain('painter');
  });

  it('the house painter paints through the brain, with a brush and a pot', () => {
    const tam = rowsUnder(join(ROOT, 'wharfside/colorman/agent')).find((r) => r.data.name === 'Tam Rook')!;
    expect((tam.data.behaviors as { brain: string }[]).map((b) => b.brain)).toContain('/trade/painting/behavior/paints');
    expect(tam.data.props).toEqual(expect.arrayContaining(['/trade/painting/thing/brush', '/trade/painting/thing/ochre-oil-paint']));
  });

  it('the cottage is a limewashed building entered from the towpath', () => {
    const s = parse(readFileSync(join(ROOT, 'wharfside/cottage/structure.yaml'), 'utf8')).data;
    expect(s.extent).toBe('/world/terminus/wharfside/cottage');
    expect(s.coats.outside[0].material).toMatch(/milk-of-lime$/);
    const towpath = parse(readFileSync(join(ROOT, 'valley-road/towpath.yaml'), 'utf8')).data;
    expect(towpath.exits.door.destination).toBe('/world/terminus/wharfside/cottage/location/room');
  });
});
