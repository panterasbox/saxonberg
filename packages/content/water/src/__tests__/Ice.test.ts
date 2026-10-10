/**
 * Ice on a still reach (the climate build, W7, D8) — grown by freezing
 * degree-days (Stefan's law), spoiled by snow lying on it, melted by a
 * thaw, walked back to the last open water, and bearing `σ·h²`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, {
  WATERCOURSE_CATALOGUE_PATH,
} from '../idea/WatercourseCatalogue';

const DAY = 86_400;
/** Two years in — the walk-back has history to read. */
const T0 = 720 * DAY;

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

/** A one-node mere: wide and deep, so the water is still. */
function mere(key: string, site: Record<string, number>, elevation: number): Row {
  return {
    path: `/stuff/idea/Watercourse/${key}`,
    class: '/system/water/idea/Watercourse',
    data: {
      key,
      name: key,
      basin: key,
      branchesFrom: null,
      site,
      nodes: [{ name: 'mere', elevation, channelWidthM: 200, meanDepthM: 4 }],
    },
  };
}

/** A fast narrow beck with a big catchment: the water moves. */
const BECK: Row = {
  path: '/stuff/idea/Watercourse/beck',
  class: '/system/water/idea/Watercourse',
  data: {
    key: 'beck',
    name: 'the beck',
    basin: 'beck',
    branchesFrom: null,
    site: { latitudeDeg: -66, continentality: 1, offsetK: -7 },
    nodes: [
      { name: 'race', elevation: 900, channelWidthM: 2, meanDepthM: 0.2, catchmentKm2: 800 },
      { name: 'foot', elevation: 0 },
    ],
  },
};

const CIRCLE = { latitudeDeg: -66, continentality: 1, offsetK: -7 };

const catalogue = (): WatercourseCatalogue =>
  makeStuffAtPath(
    () => new WatercourseCatalogue(),
    WATERCOURSE_CATALOGUE_PATH,
  ) as WatercourseCatalogue;

beforeEach(() => {
  StuffApi.clearAll();
  installRows([
    mere('circlemere', CIRCLE, 900),
    mere('icecap', { latitudeDeg: 89, continentality: 1, offsetK: -20 }, 4000),
    mere('tropic', { latitudeDeg: 0 }, 0),
    BECK,
  ]);
});

afterEach(() => {
  WeatherApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ice grows on still water by freezing degree-days', () => {
  it('thickens day on day where the cold is days old, and bears more as it does', async () => {
    WeatherApi._forceTypeForTesting('clear');
    const c = catalogue();
    const d0 = (await c.iceAt('circlemere:mere', T0))!;
    const d1 = (await c.iceAt('circlemere:mere', T0 + DAY))!;
    const d2 = (await c.iceAt('circlemere:mere', T0 + 2 * DAY))!;
    expect(d1.thicknessM).toBeGreaterThan(d0.thicknessM);
    expect(d2.thicknessM).toBeGreaterThan(d1.thicknessM);
    expect(d2.bearsKg).toBeGreaterThan(d1.bearsKg);
    expect(d2.bearsKg).toBeCloseTo(2.5e4 * d2.thicknessM ** 2, 6);
    expect(d2.quality).toBe('black');
    expect(d2.perennial).toBe(false);
  });

  it('snow lying on it makes white snow-ice; a bare twin makes black ice', async () => {
    const c = catalogue();
    WeatherApi._forceTypeForTesting('snow');
    const snowy = (await c.iceAt('circlemere:mere', T0 + 3 * DAY))!;
    c.invalidateCache();
    WeatherApi._forceTypeForTesting('clear');
    const bare = (await c.iceAt('circlemere:mere', T0 + 3 * DAY))!;
    expect(snowy.quality).toBe('snow-ice');
    expect(bare.quality).toBe('black');
    // ⚠ No claim on which is THICKER: the `snow` weather type runs 6 K
    // colder than `clear`, which outweighs the snow's insulation over a
    // few days (plan B11). The kind of ice is the read.
    expect(snowy.thicknessM).toBeGreaterThan(0);
    expect(bare.thicknessM).toBeGreaterThan(0);
  });

  it('a warm water is open, and says so', async () => {
    WeatherApi._forceTypeForTesting('clear');
    const r = (await catalogue().iceAt('tropic:mere', T0))!;
    expect(r.thicknessM).toBe(0);
    expect(r.reason).toBe('warm');
    expect(r.bearsKg).toBe(0);
  });

  it('running water does not freeze over here', async () => {
    WeatherApi._forceTypeForTesting('storm');
    const r = (await catalogue().iceAt('beck:race', T0))!;
    expect(r.reason).toBe('running');
    expect(r.thicknessM).toBe(0);
  });

  it('a sheet that has never opened is perennial, at the cap — never a sliding constant', async () => {
    WeatherApi._forceTypeForTesting('clear');
    const c = catalogue();
    const a = (await c.iceAt('icecap:mere', T0))!;
    const b = (await c.iceAt('icecap:mere', T0 + 100 * DAY))!;
    expect(a.perennial).toBe(true);
    expect(a.thicknessM).toBeCloseTo(2.0, 9);
    expect(b.thicknessM).toBeCloseTo(2.0, 9);
  });

  it('a citation naming nothing reads null', async () => {
    expect(await catalogue().iceAt('nowhere:at-all', T0)).toBeNull();
  });

  it('two reads in one weather segment agree exactly (the memo)', async () => {
    WeatherApi._forceTypeForTesting('clear');
    const c = catalogue();
    const a = (await c.iceAt('circlemere:mere', T0 + 60))!;
    const b = (await c.iceAt('circlemere:mere', T0 + 120))!;
    expect(b).toBe(a);
  });
});
