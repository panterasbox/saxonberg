/**
 * ⭐ What a ship's people are told over a watch (river D18, D31): the
 * character of the water, not every step of it. The browser walk got a line
 * a second on the lower Kestrel — pool, white water, run, round and round,
 * with a snag warning between each — because a step–pool reach changes
 * every few tens of meters and a watch covers a kilometer.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import WatercourseCatalogue from '../idea/WatercourseCatalogue';

interface FakeStretch {
  upKm: number;
  downKm: number;
  flow: string;
  obstruction: number;
  bendName?: string;
}

/** A catalogue whose one course is `stretches` (km from the mouth, upKm > downKm). */
function catalogueOf(stretches: FakeStretch[]): WatercourseCatalogue {
  const line = {
    stretchAt: (km: number) => stretches.find((s) => km <= s.upKm && km > s.downKm) ?? null,
    stretchesBetween: (a: number, b: number) => stretches.filter((s) => s.upKm > a && s.downKm < b),
  };
  const cat = Object.create(WatercourseCatalogue.prototype) as WatercourseCatalogue;
  (cat as unknown as { lineOfSync: () => unknown }).lineOfSync = () => line;
  return cat;
}

/** Twenty-meter steps going down from km 3: pool, rapid, run, pool, rapid, run… */
function stair(n: number, snagFrom = Infinity, bend?: { from: number; name: string }): FakeStretch[] {
  const flows = ['pool', 'rapid', 'run'];
  return Array.from({ length: n }, (_, i) => ({
    upKm: 3 - i * 0.02,
    downKm: 3 - (i + 1) * 0.02,
    flow: flows[i % 3]!,
    obstruction: i >= snagFrom ? 0.55 : 0.1,
    ...(bend && i >= bend.from ? { bendName: bend.name } : {}),
  }));
}

describe('telling a passage (river D31)', () => {
  it('⭐ a kilometer of step–pool water is ONE line — the stair, and where she ends', () => {
    const told = catalogueOf(stair(60)).changesAlong('k', 2.99, 1.99);
    expect(told).toHaveLength(1);
    expect(told[0]).toMatch(/runs down a stair of pools and white water/);
  });

  it('a single change is told as it comes', () => {
    const cat = catalogueOf([
      { upKm: 3, downKm: 2, flow: 'run', obstruction: 0 },
      { upKm: 2, downKm: 1, flow: 'pool', obstruction: 0 },
    ]);
    expect(cat.changesAlong('k', 2.5, 1.5)).toEqual(['The water slackens and deepens; she runs easy through a long pool.']);
  });

  it('snags are told once, as she comes into them — not again while she is among them', () => {
    const cat = catalogueOf(stair(60, 10));
    const into = cat.changesAlong('k', 2.99, 2.5);
    expect(into.filter((l) => /^Snags ahead/.test(l))).toHaveLength(1);
    const among = cat.changesAlong('k', 2.5, 2.0);
    expect(among.filter((l) => /^Snags ahead/.test(l))).toHaveLength(0);
  });

  it('a named bend is told as she comes into it', () => {
    const cat = catalogueOf(stair(60, Infinity, { from: 20, name: "Hob's Bend" }));
    expect(cat.changesAlong('k', 2.99, 2.5)).toContain("This is Hob's Bend.");
    expect(cat.changesAlong('k', 2.5, 2.0)).not.toContain("This is Hob's Bend.");
  });
});
