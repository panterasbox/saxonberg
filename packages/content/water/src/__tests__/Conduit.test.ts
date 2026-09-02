/**
 * Conduit (watershed W5) — **the conveyance ladder**.
 *
 * Getting water from a source to a place is not a topology; it is a
 * question terrain asks of every place. The claims:
 *
 *  - **feasibility derives from Δh** — nobody declares gravity-fed;
 *  - a lift **needs a pump**, and that pump draws power, forever;
 *  - capacity refuses with **`overdrawn`**, and every one of the six
 *    failure states is reachable and legible;
 *  - delivery resolves by **longest-prefix extent**, so a parcel under
 *    a served extent reads as on the main;
 *  - ⭐ **a sewer is the same object reversed** — one `direction` field,
 *    and the head expression read the other way.
 *
 * See docs/subsystems/watershed.md.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Biome from '@saxonberg/server/mud/lib/biome/Biome';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { SUPPLY_STATES } from '@saxonberg/server/mud/lib/supply/SupplyState';
import Conduit from '../thing/Conduit';
import WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type { DrawLedger } from '../idea/WatercourseCatalogue';

const YEAR = 365 * 86_400;

interface Row {
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
}

/**
 * The Kestrel, one locality on it, and two zones at different heights —
 * `/world/lowtown` down at 5 m and `/world/hightown` up at 900 m.
 */
const WORLD: Row[] = [
  // The hydrator the zone rows name — a row like any other.
  {
    path: '/platform/idea/persistence/PersistentHydrator',
    class: '/platform/idea/persistence/PersistentHydrator',
    data: {},
  },
  {
    path: '/stuff/idea/Watercourse/kestrel',
    class: '/water/idea/Watercourse',
    data: {
      key: 'kestrel',
      name: 'the Kestrel',
      basin: 'kestrel',
      branchesFrom: null,
      nodes: [
        { name: 'falls', elevation: 400, channelWidthM: 20 },
        { name: 'confluence', elevation: 40, channelWidthM: 80 },
      ],
    },
  },
  {
    path: '/stuff/idea/Locality/terminus',
    class: '/platform/idea/Locality',
    data: { name: 'terminus', _reach: 'kestrel:falls', _catchmentKm2: 900 },
  },
  // ⚠ `hydratorClass` is not optional here: without it `clone()`
  // silently discards every key in `data`, and the zone would come back
  // with no elevation at all — the orphaned-`data` trap `lint:instanceable`
  // exists to catch in shipped content.
  {
    path: '/world/lowtown',
    class: '/platform/idea/location/CartesianZone',
    hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    data: { elevation: 5 },
  },
  {
    path: '/world/hightown',
    class: '/platform/idea/location/CartesianZone',
    hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    data: { elevation: 900 },
  },
  // A zone that declares NO elevation — the unresolved-head case.
  {
    path: '/world/nowhere',
    class: '/platform/idea/location/CartesianZone',
    data: {},
  },
];

function installWorld(extra: Row[] = []): void {
  const store = [...WORLD, ...extra].map((r, i) => ({ _id: String(i + 1), ...r }));
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

/** The universe biome, so density / gravity reads have something to say. */
function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

const catalogue = (): WatercourseCatalogue =>
  makeStuff(() => new WatercourseCatalogue()) as WatercourseCatalogue;

let seq = 0;
function makeConduit(spec: {
  reach?: string;
  extent?: string;
  direction?: 'supply' | 'disposal';
  capacity?: number;
  treatment?: number;
}): Conduit {
  seq += 1;
  return makeStuffAtPath(() => {
    const c = new Conduit();
    c.setShortDescription('the city intake');
    c.setConduitKey(`test-${seq}`);
    c.setReachRef(spec.reach ?? 'kestrel:falls');
    c.setExtent(spec.extent ?? '/world/lowtown');
    c.setDirection(spec.direction ?? 'supply');
    c.setCapacityM3S(spec.capacity ?? 2);
    c.setTreatmentFactor(spec.treatment ?? 0);
    c.switchOn();
    return c;
  }, `/water/thing/Conduit/_test-${seq}`) as Conduit;
}

beforeEach(() => {
  StuffApi.clearAll();
});

afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ feasibility derives from Δh — nobody declares gravity-fed', () => {
  it('a source ABOVE its delivery runs on gravity and costs nothing to run', async () => {
    installWorld();
    installRootBiome();
    const c = makeConduit({ reach: 'kestrel:falls', extent: '/world/lowtown' });
    const head = await c.resolveHead(catalogue());
    expect(head).toBe(395); // 400 m of river over a 5 m town
    expect(c.isGravityFed()).toBe(true);
    expect(c.requiresPump()).toBe(false);
    expect(c.pumpWattsFor(1)).toBe(0);
  });

  it('a source BELOW its delivery must be pumped, and the pump draws power', async () => {
    installWorld();
    installRootBiome();
    const c = makeConduit({ reach: 'kestrel:falls', extent: '/world/hightown' });
    const head = await c.resolveHead(catalogue());
    expect(head).toBe(-500); // 400 m of river under a 900 m town
    expect(c.isGravityFed()).toBe(false);
    expect(c.requiresPump()).toBe(true);

    // ρ·g·Δh·Q / η — the SAME equation hydro generation reads the other
    // way. 1000 × 9.81 × 500 × 1 / 0.6 ≈ 8.18 MW.
    expect(c.pumpWattsFor(1)).toBeCloseTo((1000 * 9.81 * 500) / 0.6, 0);
    // …and it scales with what you actually move.
    expect(c.pumpWattsFor(2)).toBeCloseTo(c.pumpWattsFor(1) * 2, 3);
  });

  it('⚠ an unsurveyed head reads UNKNOWN, never flat', async () => {
    installWorld();
    const c = makeConduit({ extent: '/world/nowhere' });
    expect(c.getHeadM()).toBeNull();
    expect(await c.resolveHead(catalogue())).toBeNull();
    expect(c.getHeadM()).toBeNull();
    // Unknown is not "no": neither predicate claims to know.
    expect(c.isGravityFed()).toBe(false);
    expect(c.requiresPump()).toBe(false);
  });

  it('a reach that names nothing leaves the head unresolved', async () => {
    installWorld();
    const c = makeConduit({ reach: 'kestrel:imaginary' });
    expect(await c.resolveHead(catalogue())).toBeNull();
  });
});

describe('⭐ a sewer is the same object reversed', () => {
  it('`disposal` computes the head the other way, with no second class', async () => {
    installWorld();
    installRootBiome();
    // The town at 900 m draining down into the river at 400 m.
    const sewer = makeConduit({
      reach: 'kestrel:falls',
      extent: '/world/hightown',
      direction: 'disposal',
    });
    expect(await sewer.resolveHead(catalogue())).toBe(500);
    expect(sewer.isGravityFed()).toBe(true);

    // The SAME two ends, as a supply, need a pump — which is exactly
    // the point: one primitive, and direction is the only difference.
    const main = makeConduit({
      reach: 'kestrel:falls',
      extent: '/world/hightown',
      direction: 'supply',
    });
    await main.resolveHead(catalogue());
    expect(main.requiresPump()).toBe(true);
  });

  it('a disposal conduit never reports `dry` — it is not asking the river for anything', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installWorld();
    installRootBiome();
    const sewer = makeConduit({
      extent: '/world/hightown',
      direction: 'disposal',
      capacity: 5,
    });
    await sewer.resolveHead(catalogue());
    const r = await sewer.readingFor(catalogue(), YEAR, 1);
    expect(r.state).not.toBe('dry');
  });
});

describe('delivery resolves by longest-prefix extent', () => {
  it('a path under the served extent is on the main; a sibling is not', () => {
    const c = makeConduit({ extent: '/world/terminus/city' });
    expect(c.serves('/world/terminus/city')).toBe(true);
    expect(c.serves('/world/terminus/city/university-avenue/crossing')).toBe(true);
    expect(c.serves('/world/terminus/docks')).toBe(false);
    expect(c.serves('/world/terminus/citywall')).toBe(false); // not a path segment
  });

  it('⚠ an empty extent serves NOTHING — never everything', () => {
    const c = makeConduit({ extent: '' });
    expect(c.serves('/world/anywhere')).toBe(false);
    expect(c.serves('')).toBe(false);
  });
});

describe('the six-word failure vocabulary', () => {
  it('a working conduit reports no state at all', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = makeConduit({ capacity: 2 });
    await c.resolveHead(catalogue());
    const r = await c.readingFor(catalogue(), YEAR, 1);
    expect(r.state).toBeNull();
    expect(r.deliveredM3S).toBe(1);
  });

  it('`overdrawn` — more asked of it than it carries', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = makeConduit({ capacity: 2 });
    const r = await c.readingFor(catalogue(), YEAR, 5);
    expect(r.state).toBe('overdrawn');
    expect(r.deliveredM3S).toBe(0);
  });

  it('`dry` — the river below what is being asked of it', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installWorld();
    installRootBiome();
    const c = makeConduit({ capacity: 100 });
    const r = await c.readingFor(catalogue(), YEAR, 90);
    expect(r.state).toBe('dry');
  });

  it('`dry` — a supply whose reach names no water FAILS CLOSED', async () => {
    installWorld();
    installRootBiome();
    const c = makeConduit({ reach: 'kestrel:imaginary', capacity: 2 });
    expect((await c.readingFor(catalogue(), YEAR, 1)).state).toBe('dry');
  });

  it('`off` — somebody shut it, and somebody can open it again', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = makeConduit({});
    c.switchOff();
    expect((await c.readingFor(catalogue(), YEAR, 1)).state).toBe('off');
    c.switchOn();
    expect((await c.readingFor(catalogue(), YEAR, 1)).state).toBeNull();
  });

  it('`cut` — the line broken, the one failure that is STORED', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = makeConduit({});
    c.setCut(true);
    expect((await c.readingFor(catalogue(), YEAR, 1)).state).toBe('cut');
  });

  it('⭐ precedence: a severed pipe never reports `overdrawn`', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installWorld();
    installRootBiome();
    const c = makeConduit({ capacity: 1 });
    c.setCut(true);
    c.switchOff();
    // Cut AND off AND dry AND overdrawn, all at once. The player is
    // told the one furthest from being fixed by asking.
    expect((await c.readingFor(catalogue(), YEAR, 99)).state).toBe('cut');
  });

  it('`off` outranks the river — a closed valve is not a drought', async () => {
    WeatherApi._forceTypeForTesting('clear');
    installWorld();
    installRootBiome();
    const c = makeConduit({ capacity: 100 });
    c.switchOff();
    expect((await c.readingFor(catalogue(), YEAR, 90)).state).toBe('off');
  });

  it('an upstream draw can push a working conduit into `dry`', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = makeConduit({ capacity: 100 });
    const open = await c.readingFor(catalogue(), YEAR, 1);
    expect(open.state).toBeNull();
    const greedy: DrawLedger = new Map([['kestrel:falls', 10_000]]);
    const starved = await c.readingFor(catalogue(), YEAR, 1, greedy);
    expect(starved.state).toBe('dry');
  });

  it('the vocabulary is exactly six words — a seventh is a design conversation', () => {
    expect([...SUPPLY_STATES].sort()).toEqual([
      'cut',
      'dry',
      'fouled',
      'frozen',
      'off',
      'overdrawn',
    ]);
  });
});

describe('treatment is an attribute of the conduit', () => {
  it('a treated conduit reduces what arrives; an untreated one changes nothing', () => {
    expect(makeConduit({ treatment: 0 }).foulingOf(0.8)).toBeCloseTo(0.8, 9);
    expect(makeConduit({ treatment: 0.75 }).foulingOf(0.8)).toBeCloseTo(0.2, 9);
    // Clean water in, clean water out — treatment cannot go negative.
    expect(makeConduit({ treatment: 0.75 }).foulingOf(0)).toBe(0);
  });

  it('the factor clamps to [0, 1] — no conduit removes more than everything', () => {
    const c = makeConduit({});
    c.setTreatmentFactor(5);
    expect(c.getTreatmentFactor()).toBe(1);
    c.setTreatmentFactor(-1);
    expect(c.getTreatmentFactor()).toBe(0);
  });
});
