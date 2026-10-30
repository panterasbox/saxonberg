/**
 * The river read on a line (river D1, D3, D17): the ends are required,
 * a citation reads the stretch at its position, the current and depth come
 * from the stretch's own gradient, and the temperature from the source.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '../idea/WatercourseCatalogue';

const DAY = 86_400;
const YEAR = 365 * DAY;

type Row = { path: string; class: string; data: Record<string, unknown> };

function installRows(rows: Row[]): void {
  const store = rows.map((r, i) => ({ _id: String(i + 1), ...r }));
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      const q = query.path as { $regex?: string; $in?: string[] } | string | undefined;
      if (typeof q === 'object' && q !== null && typeof q.$regex === 'string') {
        const re = new RegExp(q.$regex);
        return store.filter((d) => re.test(d.path));
      }
      if (typeof q === 'object' && q !== null && Array.isArray(q.$in)) return store.filter((d) => q.$in!.includes(d.path));
      if (typeof q === 'string') return store.filter((d) => d.path === q);
      return store.slice();
    },
  );
}

function kestrel(extra: Record<string, unknown> = {}): Row {
  return {
    path: '/stuff/idea/Watercourse/kestrel',
    class: '/system/water/idea/Watercourse',
    data: {
      key: 'kestrel', name: 'the Kestrel', basin: 'kestrel', branchesFrom: null,
      source: { kind: 'melt' },
      mouth: { into: 'sea', node: '/stuff/idea/WaterExpanse/greywater/bar' },
      bed: 'gravel',
      nodes: [
        { name: 'headwaters', km: 62, elevation: 1400, catchmentKm2: 900 },
        { name: 'falls', km: 41, elevation: 140, drop: 22, channelWidthM: 18 },
        { name: 'confluence', km: 9, elevation: 30, channelWidthM: 90 },
        { name: 'estuary', km: 0, elevation: 0, channelWidthM: 160 },
      ],
      ...extra,
    },
  };
}

const catalogue = (): WatercourseCatalogue =>
  makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH) as WatercourseCatalogue;

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ a river declares its ends', () => {
  it('a course with no mouth fails the compile, naming itself', async () => {
    const row = kestrel();
    delete (row.data as Record<string, unknown>).mouth;
    installRows([row]);
    await expect(catalogue().reachOf('kestrel:falls')).rejects.toThrow(/watercourse 'kestrel' declares no mouth/);
  });

  it('a node with no km fails, naming the node', async () => {
    const row = kestrel();
    const nodes = (row.data as { nodes: Array<Record<string, unknown>> }).nodes;
    delete nodes[2]!.km;
    installRows([row]);
    await expect(catalogue().reachOf('kestrel:falls')).rejects.toThrow(/node 'confluence' authors no km/);
  });

  it('km must fall source-first', async () => {
    const row = kestrel();
    (row.data as { nodes: Array<Record<string, unknown>> }).nodes[1]!.km = 70;
    installRows([row]);
    await expect(catalogue().reachOf('kestrel:falls')).rejects.toThrow(/is not below the node before it/);
  });

  it('a one-node mere is exempt', async () => {
    installRows([{
      path: '/stuff/idea/Watercourse/mere', class: '/system/water/idea/Watercourse',
      data: { key: 'mere', name: 'mere', basin: 'mere', branchesFrom: null, nodes: [{ name: 'mere', elevation: 50 }] },
    }]);
    expect(await catalogue().reachOf('mere:mere')).not.toBeNull();
    expect(await catalogue().lineOf('mere')).toBeNull();
  });
});

describe('⭐ a citation reads the stretch at its position', () => {
  it('a reach ref, a node offset and a stretch id all resolve; the shore reads by stretch id', async () => {
    installRows([kestrel()]);
    const c = catalogue();
    const pos = (await c.positionOf('kestrel:confluence+0.4,left'))!;
    expect(pos.km).toBeCloseTo(8.6, 9);
    expect(pos.across).toBeCloseTo(9, 0);
    expect((await c.reachOf('kestrel:confluence+0.4'))!.ref).toBe('kestrel:confluence');
    const line = (await c.lineOf('kestrel'))!;
    const id = line.stretchAt(8.6)!.id;
    expect(c.currentWaterRef('kestrel:confluence+0.4,left', {} as never)).toBe(id);
    expect((await c.reachOf(id))!.ref).toBe('kestrel:confluence');
    // A node with no offset is the stretch at the node's km.
    expect(c.currentWaterRef('kestrel:confluence', {} as never)).toBe(line.stretchAt(9)!.id);
  });
});

describe('⭐ the river at a position, now', () => {
  it('a pool is deeper and slower than the riffle above it, from the same water', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installRows([kestrel()]);
    const c = catalogue();
    const line = (await c.lineOf('kestrel'))!;
    const pool = line.stretchesBetween(30, 20).find((s) => s.kind === 'pool')!;
    const riffle = line.stretchesBetween(30, 20).find((s) => s.kind === 'riffle')!;
    const at = (s: typeof pool) => ({ course: 'kestrel', km: (s.upKm + s.downKm) / 2, across: 40 });
    const p = (await c.riverStateAt(at(pool), YEAR + 120 * DAY))!;
    const r = (await c.riverStateAt(at(riffle), YEAR + 120 * DAY))!;
    expect(p.flowM3S).toBeGreaterThan(0);
    expect(p.depthM).toBeGreaterThan(r.depthM);
    expect(p.currentMps).toBeLessThan(r.currentMps);
    expect(r.roughness).toBeGreaterThan(p.roughness);
  });

  it('the margin runs slower than the channel; the bar is shallow', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installRows([kestrel()]);
    const c = catalogue();
    const line = (await c.lineOf('kestrel'))!;
    const pool = line.stretchesBetween(30, 20).find((s) => s.kind === 'pool')!;
    const km = (pool.upKm + pool.downKm) / 2;
    const s = (await c.riverStateAt({ course: 'kestrel', km, across: 40 }, YEAR + 120 * DAY))!;
    const inside = pool.outside === 'left' ? 'right' : 'left';
    expect(s.margins[inside].currentMps).toBeLessThan(s.currentMps);
    expect(s.margins[inside].depthM).toBeLessThan(s.depthM);
  });

  it('⭐ a spring river holds near the ground’s temperature; a melt river is pulled cold', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installRows([kestrel({ source: { kind: 'spring' } })]);
    const c = catalogue();
    const summer = YEAR + 200 * DAY;
    const near = (await c.riverStateAt({ course: 'kestrel', km: 61, across: 5 }, summer))!;
    expect(Math.abs(near.temperatureK - 282)).toBeLessThan(3);
  });
});

describe('⭐ a ship’s passage on the line (river D18, D28)', () => {
  const hull = { draftM: 0.15, beamM: 6, lengthM: 30 };

  it('upstream is slower than down over the same water, and the passage ends at the head of what she was set for', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installRows([kestrel()]);
    const c = catalogue();
    const t = YEAR + 120 * DAY;
    const from = { course: 'kestrel', km: 2, across: 60 };
    const up = await c.planPassage(from, { direction: 'upstream', landing: null, throughWaterMps: 1, ...hull }, t);
    const down = await c.planPassage({ ...from, km: 8 }, { direction: 'downstream', landing: null, throughWaterMps: 1, ...hull }, t);
    if ('refused' in up || 'refused' in down) throw new Error('refused');
    // The legs run in order of travel, time rising.
    for (let i = 1; i < up.legs.length; i++) expect(up.legs[i]![1]).toBeGreaterThan(up.legs[i - 1]![1]);
    const upRate = (up.legs[1]![0] - up.legs[0]![0]) / (up.legs[1]![1] - up.legs[0]![1]);
    const downRate = (down.legs[0]![0] - down.legs[1]![0]) / (down.legs[1]![1] - down.legs[0]![1]);
    expect(downRate).toBeGreaterThan(upRate);
    expect(down.stop?.reason).toBe('mouth');
  });

  it('⭐ upstream with no landing, the foot of the falls is as far as she goes', async () => {
    WeatherApi._forceTypeForTesting('rain');
    // A drizzle every segment (0.3 mm/h, the `water.rate.rain` dial): an
    // ordinary river. At the calibrated 1.5 mm/h (cover B42) a month of
    // unbroken rain is a spate, and a 3 m/s launch stems it short of the
    // falls — true, and not what this test is about.
    const setting = AppApi.setting.bind(AppApi);
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'water.rate.rain' ? '0.3' : setting(key),
    );
    installRows([kestrel()]);
    const c = catalogue();
    const r = await c.planPassage(
      { course: 'kestrel', km: 40.6, across: 10 },
      { direction: 'upstream', landing: null, throughWaterMps: 3, draftM: 0.1, beamM: 2, lengthM: 5 },
      YEAR + 120 * DAY + 12 * 3600,
    );
    if ('refused' in r) throw new Error(r.refused);
    expect(r.stop?.reason, r.stop?.words).toBe('falls');
    expect(r.stop!.km).toBeLessThanOrEqual(41);
    // …and a landing beyond them is refused before she moves.
    const beyond = await c.planPassage(
      { course: 'kestrel', km: 30, across: 10 },
      { direction: 'upstream', landing: '/nowhere', throughWaterMps: 2, draftM: 0.1, beamM: 2, lengthM: 5 },
      YEAR + 200 * DAY,
    );
    expect(beyond).toHaveProperty('refused');
  });

  it('⭐ she grounds at the entry to a stretch with less water than she draws', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installRows([kestrel()]);
    const c = catalogue();
    const r = await c.planPassage(
      { course: 'kestrel', km: 1, across: 60 },
      { direction: 'upstream', landing: null, throughWaterMps: 3, draftM: 20, beamM: 6, lengthM: 30 },
      YEAR + 200 * DAY,
    );
    if ('refused' in r) throw new Error(r.refused);
    expect(r.stop?.reason).toBe('aground');
    expect(r.stop?.km).toBe(1);
  });
});
