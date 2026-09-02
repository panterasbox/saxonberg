/**
 * Flow, snowpack and navigability (watershed W4) — **the second
 * consumer of the precipitation integral**.
 *
 * A bed multiplies the millimetres by its land area to get litres of
 * soil moisture; a reach multiplies the SAME millimetres by its
 * catchment area to get cubic metres of river. That is the whole spine
 * of the build, and this file is the half of it that makes a diversion
 * matter.
 *
 * The claims:
 *
 *  - a locality's declared catchment accumulates onto its reach **and
 *    every reach below it**;
 *  - an upstream intake **reduces** measured flow downstream, and one
 *    below it does not;
 *  - snow falling at altitude **banks** and releases on melt, producing
 *    a **spring rise and a late-summer low** — and that low is why
 *    senior rights bind at all;
 *  - navigability is **derived** from flow and channel, so nobody
 *    authors a navigable stretch and a diversion can strand one.
 *
 * See docs/subsystems/watershed.md.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type { DrawLedger } from '../idea/WatercourseCatalogue';

const DAY = 86_400;
const YEAR = 365 * DAY;

interface Row {
  path: string;
  class: string;
  data: Record<string, unknown>;
}

function installRows(rows: Row[]): void {
  const store = rows.map((r, i) => ({ _id: String(i + 1), ...r }));
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      const q = query.path as { $regex?: string } | string | undefined;
      if (typeof q === 'object' && q !== null && typeof q.$regex === 'string') {
        const re = new RegExp(q.$regex);
        return store.filter((d) => re.test(d.path));
      }
      if (typeof q === 'string') return store.filter((d) => d.path === q);
      return store.slice();
    },
  );
}

/** The Kestrel, plus two localities on it. */
function installValley(): void {
  installRows([
    {
      path: '/stuff/idea/Watercourse/kestrel',
      class: '/system/water/idea/Watercourse',
      data: {
        key: 'kestrel',
        name: 'the Kestrel',
        basin: 'kestrel',
        branchesFrom: null,
        nodes: [
          { name: 'headwaters', elevation: 1400 },
          { name: 'falls', elevation: 500 },
          { name: 'confluence', elevation: 40, channelWidthM: 60 },
          { name: 'estuary', elevation: 0, channelWidthM: 140 },
        ],
      },
    },
    {
      path: '/stuff/idea/Locality/rejection',
      class: '/platform/idea/Locality',
      data: { name: 'rejection', _reach: 'kestrel:headwaters', _catchmentKm2: 300 },
    },
    {
      path: '/stuff/idea/Locality/terminus',
      class: '/platform/idea/Locality',
      data: { name: 'terminus', _reach: 'kestrel:confluence', _catchmentKm2: 120 },
    },
    {
      // ⚠ Off the watershed on purpose: a locality that declares no
      // reach is a normal state of the world and must contribute
      // nothing rather than throwing.
      path: '/stuff/idea/Locality/last-counted-mile',
      class: '/platform/idea/Locality',
      data: { name: 'last-counted-mile', _catchmentKm2: 900 },
    },
  ]);
}

const catalogue = (): WatercourseCatalogue =>
  makeStuff(() => new WatercourseCatalogue()) as WatercourseCatalogue;

beforeEach(() => {
  StuffApi.clearAll();
});

afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('catchment accumulates downstream', () => {
  it("a locality's declared area lands on its reach AND everything below", async () => {
    installValley();
    const c = catalogue();
    expect((await c.reachOf('kestrel:headwaters'))!.catchmentKm2).toBe(300);
    expect((await c.reachOf('kestrel:falls'))!.catchmentKm2).toBe(300);
    // The confluence gets Rejection's 300 plus Terminus's own 120.
    expect((await c.reachOf('kestrel:confluence'))!.catchmentKm2).toBe(420);
    expect((await c.reachOf('kestrel:estuary'))!.catchmentKm2).toBe(420);
  });

  it('⚠ a locality off the watershed contributes nothing and throws nothing', async () => {
    installValley();
    const c = catalogue();
    const total = (await c.allReaches()).reduce(
      (max, r) => Math.max(max, r.catchmentKm2),
      0,
    );
    expect(total).toBe(420); // never 1320
  });

  it('the biggest contributor becomes the catchment’s climate proxy', async () => {
    installValley();
    const c = catalogue();
    // Rejection (300) outweighs Terminus (120) even at the confluence.
    expect((await c.reachOf('kestrel:confluence'))!.climateLocalityPath).toBe(
      '/stuff/idea/Locality/rejection',
    );
  });
});

describe('flow is a takeable volume', () => {
  it('a catchment with rain on it carries water, and more of it downstream', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installValley();
    const c = catalogue();
    const up = (await c.flowAt('kestrel:headwaters', YEAR))!;
    const down = (await c.flowAt('kestrel:confluence', YEAR))!;
    expect(up.m3s).toBeGreaterThan(0);
    // More ground above it, so more water through it.
    expect(down.m3s).toBeGreaterThan(up.m3s);
  });

  it('⭐ an upstream intake REDUCES flow below it', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installValley();
    const c = catalogue();
    const before = (await c.flowAt('kestrel:confluence', YEAR))!;
    const draws: DrawLedger = new Map([['kestrel:falls', 1.5]]);
    const after = (await c.flowAt('kestrel:confluence', YEAR, draws))!;
    expect(after.m3s).toBeCloseTo(before.m3s - 1.5, 6);
    expect(after.drawnM3S).toBe(1.5);
    expect(after.naturalM3S).toBe(before.naturalM3S); // nature is unchanged
  });

  it('a draw BELOW a reach does not touch it — the water already went past', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installValley();
    const c = catalogue();
    const draws: DrawLedger = new Map([['kestrel:estuary', 5]]);
    const at = (await c.flowAt('kestrel:confluence', YEAR, draws))!;
    expect(at.drawnM3S).toBe(0);
  });

  it('a draw on a reach counts against that reach itself', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installValley();
    const c = catalogue();
    const draws: DrawLedger = new Map([['kestrel:confluence', 2]]);
    expect((await c.flowAt('kestrel:confluence', YEAR, draws))!.drawnM3S).toBe(2);
  });

  it('flow floors at zero — an over-drawn reach runs dry, never negative', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installValley();
    const c = catalogue();
    const draws: DrawLedger = new Map([['kestrel:headwaters', 10_000]]);
    expect((await c.flowAt('kestrel:estuary', YEAR, draws))!.m3s).toBe(0);
  });

  it('a reach nobody drains to carries nothing', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installRows([
      {
        path: '/stuff/idea/Watercourse/dry',
        class: '/system/water/idea/Watercourse',
        data: {
          key: 'dry',
          name: 'dry',
          basin: 'dry',
          branchesFrom: null,
          nodes: [{ name: 'a', elevation: 100 }, { name: 'b', elevation: 0 }],
        },
      },
    ]);
    expect((await catalogue().flowAt('dry:b', YEAR))!.m3s).toBe(0);
  });

  it('a citation naming no reach reads null, not zero', async () => {
    installValley();
    expect(await catalogue().flowAt('kestrel:nowhere', YEAR)).toBeNull();
  });
});

describe('⭐ snowpack: the spring rise and the late-summer low', () => {
  it('snow at altitude BANKS rather than running off', async () => {
    WeatherApi._forceTypeForTesting('snow');
    installValley();
    const c = catalogue();
    const head = (await c.flowAt('kestrel:headwaters', YEAR))!;
    // 1400 m under a permanent snow sky: it piles up and stays.
    expect(head.snowpackMm).toBeGreaterThan(0);
  });

  it('⭐ the SAME sky banks snow high up and none at sea level — ALTITUDE is the mechanism', async () => {
    WeatherApi._forceTypeForTesting('snow');
    // One course, two reaches, identical in every way except height —
    // and the same locality's catchment reaches both, so the weather,
    // the area and the runoff coefficient are all held constant. The
    // only variable left is the lapse rate acting on elevation.
    installRows([
      {
        path: '/stuff/idea/Watercourse/step',
        class: '/system/water/idea/Watercourse',
        data: {
          key: 'step',
          name: 'step',
          basin: 'step',
          branchesFrom: null,
          nodes: [{ name: 'alp', elevation: 2000 }, { name: 'shore', elevation: 0 }],
        },
      },
      {
        path: '/stuff/idea/Locality/highland',
        class: '/platform/idea/Locality',
        data: { name: 'highland', _reach: 'step:alp', _catchmentKm2: 300 },
      },
    ]);
    const c = catalogue();
    // Sampled across a whole year, because WHEN you look decides how
    // much is lying — the claim is about the difference, not a moment.
    let alpTotal = 0;
    let shoreTotal = 0;
    for (let t = YEAR; t < 2 * YEAR; t += 10 * DAY) {
      alpTotal += (await c.flowAt('step:alp', t))!.snowpackMm;
      shoreTotal += (await c.flowAt('step:shore', t))!.snowpackMm;
    }
    expect(alpTotal).toBeGreaterThan(0);
    // Two kilometres of lapse rate is thirteen Kelvin, and thirteen
    // Kelvin is the difference between a snowfield and a wet winter.
    expect(alpTotal).toBeGreaterThan(shoreTotal * 2);
  });

  it('⭐⭐ a full game year gives a spring RISE and a late-summer LOW', async () => {
    installValley();
    const c = catalogue();
    const samples: Array<{ m3s: number; melt: number; pack: number }> = [];
    for (let t = YEAR; t < 2 * YEAR; t += 10 * DAY) {
      const f = (await c.flowAt('kestrel:confluence', t))!;
      const h = (await c.flowAt('kestrel:headwaters', t))!;
      samples.push({ m3s: f.m3s, melt: f.meltM3S, pack: h.snowpackMm });
    }
    const peak = Math.max(...samples.map((s) => s.m3s));
    const trough = Math.min(...samples.map((s) => s.m3s));

    // A river with a SEASON, not a constant. The exact months are the
    // weather grammar's business; the shape is the claim — and that
    // low is why senior rights bind at all. Without it, seniority
    // never binds and the whole allocation layer is decoration.
    expect(trough).toBeGreaterThanOrEqual(0);
    expect(peak).toBeGreaterThan(trough * 3);

    // The pack BANKS and RELEASES: it is nonzero somewhere in the year
    // and gone somewhere else. A pack that only ever grew, or one that
    // never formed, would satisfy neither half.
    expect(Math.max(...samples.map((s) => s.pack))).toBeGreaterThan(0);
    expect(Math.min(...samples.map((s) => s.pack))).toBe(0);

    // …and the peak is a MELT peak, legibly so.
    const atPeak = samples.find((s) => s.m3s === peak)!;
    expect(atPeak.melt).toBeGreaterThan(0);
  });
});

describe('navigability is derived, never authored', () => {
  it('a wide reach in good flow carries a boat; the gorge above it does not', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installValley();
    const c = catalogue();
    expect(await c.isNavigableAt('kestrel:estuary', YEAR)).toBe(true);
    // `falls` authors no channel width at all — a torrent through a
    // gorge is not navigable however much water is in it.
    expect(await c.isNavigableAt('kestrel:falls', YEAR)).toBe(false);
  });

  it('⭐ a diversion STRANDS a navigation claim, and withdrawing it restores one', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installValley();
    const c = catalogue();
    expect(await c.isNavigableAt('kestrel:estuary', YEAR)).toBe(true);
    const open = (await c.flowAt('kestrel:estuary', YEAR))!;
    const greedy: DrawLedger = new Map([['kestrel:falls', open.m3s]]);
    expect(await c.isNavigableAt('kestrel:estuary', YEAR, greedy)).toBe(false);
    // Curtail the junior right and the river comes back.
    expect(await c.isNavigableAt('kestrel:estuary', YEAR, new Map())).toBe(true);
  });

  it('a dry sky closes a navigable reach with nobody diverting anything', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installValley();
    expect(await catalogue().isNavigableAt('kestrel:estuary', YEAR)).toBe(false);
  });
});

describe('the per-segment flow memo', () => {
  it('two reads inside one weather segment agree exactly', async () => {
    installValley();
    const c = catalogue();
    const a = (await c.flowAt('kestrel:confluence', YEAR))!;
    const b = (await c.flowAt('kestrel:confluence', YEAR + 60))!;
    expect(b.m3s).toBe(a.m3s);
  });

  it('invalidateCache drops it along with the compile', async () => {
    installValley();
    const c = catalogue();
    const before = (await c.flowAt('kestrel:confluence', YEAR))!.m3s;
    c.invalidateCache();
    expect((await c.flowAt('kestrel:confluence', YEAR))!.m3s).toBe(before);
  });
});
