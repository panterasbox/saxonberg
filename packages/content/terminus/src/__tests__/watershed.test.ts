/**
 * Terminus on the water (watershed W9) — the shipped basins, read
 * through the real catalogue over the real authored rows.
 *
 * ⚠ Kernel tests prove the KERNEL over synthetic fixtures; assertions
 * about the realm's own geography live beside the realm's own content,
 * which is what this file is (`lint:test-content`'s rule, and it bit
 * the residences build twice).
 *
 * The acceptance criteria this file is answerable for:
 *
 *  - **18** — a Locality declares its watercourse, two localities in one
 *    basin resolve an upstream/downstream relation, and two in different
 *    basins resolve **none**;
 *  - **19** — the inter-basin aqueduct delivers **gravity-fed end to
 *    end** and its surplus head drives a generator;
 *  - **12/13** — the city's intake is above its outfall, so the water it
 *    draws is clean and the water below the arch is not — **derived from
 *    terrain, authored by nobody**;
 *  - **20**'s content half — a continuous walkable chain from the market
 *    square to the Hinkley Hills stop.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
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
import WatercourseCatalogue from '@saxonberg/content-water/src/idea/WatercourseCatalogue';
import Conduit from '@saxonberg/content-water/src/thing/Conduit';
import ControlStructure from '@saxonberg/content-water/src/thing/ControlStructure';
import StorageNode from '@saxonberg/content-water/src/thing/StorageNode';

const YEAR = 365 * 86_400;

/** The packs whose content this file reads. */
const PACKS = ['world-seed', 'terminus', 'hinkley-hills'] as const;

function packFile(pack: string, rel: string): string {
  return fileURLToPath(new URL(`../../../${pack}/content/${rel}`, import.meta.url));
}

/** Read one authored row's whole document. */
function row(rel: string): Record<string, unknown> {
  for (const pack of PACKS) {
    const file = packFile(pack, rel);
    if (existsSync(file)) {
      return YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    }
  }
  throw new Error(`no shipped pack carries ${rel}`);
}

const data = (rel: string): Record<string, unknown> =>
  row(rel).data as Record<string, unknown>;

/**
 * Serve the authored watercourse, locality and zone rows through
 * `PersistApi.find`, at the template paths the installer would give
 * them — so the catalogue compiles the REAL geography.
 */
function installShippedContent(): void {
  const store: Array<Record<string, unknown> & { path: string }> = [];
  const add = (path: string, rel: string): void => {
    const doc = row(rel);
    store.push({ _id: String(store.length + 1), path, ...doc });
  };

  for (const key of ['kestrel', 'delight', 'holloway', 'cold-fell']) {
    add(`/stuff/idea/Watercourse/${key}`, `stuff/idea/Watercourse/${key}.yaml`);
  }
  for (const key of [
    'counting-houses',
    'university-avenue',
    'eternal-campus',
    'hinkley-hills',
    'moor',
    'last-counted-mile',
  ]) {
    add(`/stuff/idea/Locality/${key}`, `stuff/idea/Locality/${key}.yaml`);
  }
  add('/world/terminus', 'world/terminus.yaml');
  add('/world/terminus/hinkley-hills', 'world/terminus/hinkley-hills.yaml');
  store.push({
    _id: String(store.length + 1),
    path: '/platform/idea/persistence/PersistentHydrator',
    class: '/platform/idea/persistence/PersistentHydrator',
    data: {},
  });

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

/** Build a live pack object from its own authored row. */
let seq = 0;
function fromRow<T>(rel: string, make: () => T, apply: (o: T, d: Record<string, unknown>) => void): T {
  seq += 1;
  const d = data(rel);
  return makeStuffAtPath(() => {
    const o = make();
    apply(o, d);
    return o;
  }, `/world/_watershed-test/${seq}`) as T;
}

function conduitFrom(rel: string): Conduit {
  return fromRow(rel, () => new Conduit(), (c, d) => {
    c.setShortDescription(String(d.shortDescription ?? ''));
    c.setConduitKey(String(d.conduitKey ?? ''));
    c.setDirection(d.direction as never);
    c.setReachRef(String(d.reachRef ?? ''));
    c.setExtent(String(d.extent ?? ''));
    c.setCapacityM3S(Number(d.capacityM3S ?? 0));
    c.setTreatmentFactor(Number(d.treatmentFactor ?? 0));
    c.setDischargeLoadPerSecond(Number(d.dischargeLoadPerSecond ?? 0));
    if (d.dischargeKind !== undefined) c.setDischargeKind(d.dischargeKind as never);
    c.switchOn();
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  installShippedContent();
  installRootBiome();
});

afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the shipped basins compile, and say what the design says', () => {
  it('all four watercourses parse — the elevations describe a world water runs downhill in', async () => {
    const reaches = await catalogue().allReaches();
    expect(reaches.length).toBeGreaterThan(10);
    expect(reaches.map((r) => r.ref)).toContain('kestrel:confluence');
    expect(reaches.map((r) => r.ref)).toContain('cold-fell:cascade');
  });

  it('an unauthored reach INTERPOLATES between the control points around it', async () => {
    // The Kestrel's `gorge` authors no elevation: it is one step between
    // 1400 m and 500 m, so it must read 950 and nobody typed that.
    const gorge = await catalogue().reachOf('kestrel:gorge');
    expect(gorge!.elevation).toBe(950);
  });

  it('⭐ the Delight is a TRIBUTARY, and nothing in the row says so', async () => {
    const c = catalogue();
    // Derived purely from which of its ends is nearest the junction.
    expect(await c.compare('delight:flats', 'kestrel:confluence')).toBe('upstream');
    expect(await c.compare('delight:spring', 'kestrel:estuary')).toBe('upstream');
  });

  it('⭐ two localities in ONE basin resolve upstream/downstream (D18)', async () => {
    const c = catalogue();
    // Hinkley and the city both sit on the confluence; the falls above
    // them is upstream of both, which is where the mining town will be.
    expect(await c.compare('kestrel:falls', 'kestrel:confluence')).toBe('upstream');
    expect(await c.compare('kestrel:headwaters', 'kestrel:estuary')).toBe('upstream');
  });

  it('⭐ two localities in DIFFERENT basins resolve NONE (D18)', async () => {
    const c = catalogue();
    // The moor is on the Holloway; Terminus is on the Kestrel.
    expect(await c.compare('holloway:vale', 'kestrel:confluence')).toBe('unrelated');
    expect(await c.compare('kestrel:headwaters', 'holloway:mouth')).toBe('unrelated');
    // …and the third basin is unrelated to both, which is what makes an
    // aqueduct to it a POLITICAL act rather than a plumbing one.
    expect(await c.compare('cold-fell:cascade', 'kestrel:confluence')).toBe('unrelated');
  });

  it('⚠ The Last Counted Mile is off the watershed, and that is not an error', () => {
    const mile = data('stuff/idea/Locality/last-counted-mile.yaml');
    expect(mile._reach).toBeUndefined();
    // The frontier is deliberately wild — its row says so, so nobody
    // "fixes" it. It resolves no government either.
    expect(mile._governmentKey).toBeUndefined();
  });

  it('every locality that declares a reach names one that EXISTS', async () => {
    const c = catalogue();
    for (const key of [
      'counting-houses',
      'university-avenue',
      'eternal-campus',
      'hinkley-hills',
      'moor',
    ]) {
      const ref = data(`stuff/idea/Locality/${key}.yaml`)._reach as string;
      expect(ref, key).toBeTruthy();
      expect(await c.reachOf(ref), `${key} → ${ref}`).not.toBeNull();
    }
  });

  it("the city's catchment accumulates the whole basin above it", async () => {
    const c = catalogue();
    const falls = (await c.reachOf('kestrel:falls'))!;
    const conf = (await c.reachOf('kestrel:confluence'))!;
    expect(conf.catchmentKm2).toBeGreaterThan(falls.catchmentKm2);
    // Big enough to be a river rather than a gutter — which is what the
    // wild-catchment declarations on the nodes are for.
    expect(conf.catchmentKm2).toBeGreaterThan(900);
  });

  it('the Kestrel at Terminus carries water, and it is navigable there', async () => {
    WeatherApi._forceTypeForTesting('rain');
    const flow = (await catalogue().flowAt('kestrel:confluence', YEAR))!;
    expect(flow.m3s).toBeGreaterThan(0);
    expect(flow.navigable).toBe(true);
  });
});

describe('⭐ Terminus drinks and discharges into the same water', () => {
  it("the intake and the outfall are on the SAME reach — the city's whole problem", () => {
    const intake = data('world/terminus/wharfside/thing/city-intake.yaml');
    const outfall = data('world/terminus/wharfside/thing/city-outfall.yaml');
    expect(intake.reachRef).toBe(outfall.reachRef);
    expect(intake.direction).toBe('supply');
    expect(outfall.direction).toBe('disposal');
  });

  it('⭐ the outfall fouls what is BELOW it and not what is above — nobody authored that', async () => {
    WeatherApi._forceTypeForTesting('rain');
    conduitFrom('world/terminus/wharfside/thing/city-outfall.yaml');
    const c = catalogue();

    const aboveTheCity = (await c.contaminationAt('kestrel:falls', YEAR))!;
    const atTheCity = (await c.contaminationAt('kestrel:confluence', YEAR))!;
    const belowIt = (await c.contaminationAt('kestrel:estuary', YEAR))!;

    expect(aboveTheCity.level).toBe(0);
    expect(atTheCity.level).toBeGreaterThan(0);
    // Sewage is ORGANIC, so the estuary is measurably cleaner than the
    // arch — the river recovers below the town.
    expect(belowIt.level).toBeGreaterThan(0);
    expect(belowIt.level).toBeLessThan(atTheCity.level);
  });

  it("⚠ the city's intake needs a PUMP, forever — Terminus is flat", async () => {
    const intake = conduitFrom('world/terminus/wharfside/thing/city-intake.yaml');
    const head = await intake.resolveHead(catalogue());
    // River at 30 m, city ground at 35: five metres the wrong way.
    expect(head).toBe(-5);
    expect(intake.requiresPump()).toBe(true);
    expect(intake.pumpWattsFor(1)).toBeGreaterThan(0);
  });

  it('the intake ships UNTREATED — treatment is what a town decides to buy', () => {
    expect(data('world/terminus/wharfside/thing/city-intake.yaml').treatmentFactor).toBe(0);
  });
});

describe('⭐⭐ the Cold Fell aqueduct (D22 / acceptance 19)', () => {
  it('delivers across BASINS, gravity-fed end to end', async () => {
    const aqueduct = conduitFrom(
      'world/terminus/wharfside/thing/cold-fell-aqueduct.yaml',
    );
    const head = await aqueduct.resolveHead(catalogue());
    // 1150 m at the cascade, 35 m at the city.
    expect(head).toBe(1115);
    expect(aqueduct.isGravityFed()).toBe(true);
    expect(aqueduct.requiresPump()).toBe(false);
    // ⭐ It costs NOTHING to run — the whole reason such a route is chosen.
    expect(aqueduct.pumpWattsFor(aqueduct.getCapacityM3S())).toBe(0);
  });

  it('its intake is in a basin unrelated to the one the city sits in', async () => {
    const c = catalogue();
    const aqueduct = data('world/terminus/wharfside/thing/cold-fell-aqueduct.yaml');
    expect(await c.compare(aqueduct.reachRef as string, 'kestrel:confluence')).toBe(
      'unrelated',
    );
    // ⭐ Which is the point: the body you form around is not the source
    // you drink from.
  });

  it('the surplus head DRIVES A GENERATOR, and the output rises with flow', () => {
    const d = data('world/terminus/wharfside/thing/aqueduct-house.yaml');
    const house = makeStuff(() => {
      const s = new ControlStructure();
      s.setControlKind(d.controlKind as never);
      s.setReachRef(String(d.reachRef));
      s.setPassFraction(Number(d.passFraction));
      s.setHeadM(Number(d.headM));
      s.setGenerates(d.generates === true);
      return s;
    }) as ControlStructure;

    expect(house.generationW(0.8)).toBeGreaterThan(0);
    expect(house.generationW(1.6)).toBeCloseTo(house.generationW(0.8) * 2, 3);
    // ⭐ A WEIR, not a dam: it takes the energy out of water that was
    // going past anyway and decides nothing about who gets any.
    expect(house.split(1).passedM3S).toBe(1);
    expect(house.withdrawalM3S(1)).toBe(0);
  });

  it('it is TREATED — the third rung of the ladder, bought once', () => {
    expect(
      data('world/terminus/wharfside/thing/cold-fell-aqueduct.yaml').treatmentFactor,
    ).toBeGreaterThan(0.5);
  });
});

describe("⭐ Hinkley's is a HEAD problem, not a rights problem (D20 / D27)", () => {
  it('the suburb sits a hundred metres above its own river', async () => {
    const zone = data('world/terminus/hinkley-hills.yaml');
    const reach = await catalogue().reachOf(
      data('stuff/idea/Locality/hinkley-hills.yaml')._reach as string,
    );
    expect(Number(zone.elevation)).toBe(130);
    expect(reach!.elevation).toBe(30);
    // A main from the Kestrel would have to lift a hundred metres,
    // forever. That is why the Hills store instead.
    expect(Number(zone.elevation) - reach!.elevation).toBe(100);
  });

  it('⭐ the District tank gives the standpipe its pressure with no pump', async () => {
    const d = data('world/terminus/hinkley-hills/thing/district-tank.yaml');
    const tank = makeStuff(() => {
      const t = new StorageNode();
      t.setStorageKind(d.storageKind as never);
      t.setCapacityM3(Number(d.capacityM3));
      t.setElevationM(Number(d.elevationM));
      t.setServesExtent(String(d.servesExtent));
      return t;
    }) as StorageNode;

    // 145 m of tank over 130 m of ground: fifteen metres of head, and
    // that IS the pressure at the tap.
    expect(await tank.headOverServedGroundM()).toBe(15);
    expect(tank.serves('/world/terminus/hinkley-hills/location/lane')).toBe(true);
  });

  it('⭐ the buffer is an OUTAGE TOLERANCE measured in days, not hours', () => {
    const d = data('world/terminus/hinkley-hills/thing/district-tank.yaml');
    const tank = makeStuff(() => {
      const t = new StorageNode();
      t.setCapacityM3(Number(d.capacityM3));
      t.setLevelM3(Number(d.capacityM3));
      return t;
    }) as StorageNode;
    // A suburb's draw, in the tens of litres a second.
    expect(tank.outageToleranceS(0.02) / 86_400).toBeGreaterThan(0.2);
  });

  it('the works are the DISTRICT’s, and the District is still a shell otherwise', () => {
    const gov = data('stuff/idea/Government/hinkley-hills.yaml');
    expect(gov.key).toBe('hinkley-hills');
    // Its first real job, and nothing else about it changed: no
    // charter, no treasury, no seats. Water scarcity gave a paper
    // institution something to do; it did not charter a new authority.
    expect(gov.charter).toBe('');
    expect(gov.seats).toEqual([]);
  });
});

describe('⭐ the valley road — a walkable chain, no wizard anywhere (D23)', () => {
  const roomExits = (rel: string): Record<string, { destination?: string }> =>
    (data(rel).exits ?? {}) as Record<string, { destination?: string }>;

  it('market square → the bank → the towpath → the narrows → the shoulder → the stop', () => {
    const chain: Array<[string, string, string]> = [
      ['world/terminus/market/square.yaml', 'south', '/world/terminus/wharfside/bank'],
      ['world/terminus/wharfside/bank.yaml', 'west', '/world/terminus/valley-road/towpath'],
      ['world/terminus/valley-road/towpath.yaml', 'west', '/world/terminus/valley-road/the-narrows'],
      ['world/terminus/valley-road/the-narrows.yaml', 'west', '/world/terminus/valley-road/the-shoulder'],
      ['world/terminus/valley-road/the-shoulder.yaml', 'west', '/world/terminus/hinkley-hills/location/arrival'],
    ];
    for (const [file, dir, dest] of chain) {
      expect(roomExits(file)[dir]?.destination, `${file} ${dir}`).toBe(dest);
    }
  });

  it('and it walks BACK — a one-way road into a suburb is a trap', () => {
    const back: Array<[string, string, string]> = [
      ['world/terminus/hinkley-hills/location/arrival.yaml', 'east', '/world/terminus/valley-road/the-shoulder'],
      ['world/terminus/valley-road/the-shoulder.yaml', 'east', '/world/terminus/valley-road/the-narrows'],
      ['world/terminus/valley-road/the-narrows.yaml', 'east', '/world/terminus/valley-road/towpath'],
      ['world/terminus/valley-road/towpath.yaml', 'east', '/world/terminus/wharfside/bank'],
      ['world/terminus/wharfside/bank.yaml', 'north', '/world/terminus/market/square'],
    ];
    for (const [file, dir, dest] of back) {
      expect(roomExits(file)[dir]?.destination, `${file} ${dir}`).toBe(dest);
    }
  });

  it('⚠ every room on the road is ordinary content — no gate, no wizard check', () => {
    for (const file of [
      'world/terminus/wharfside/bank.yaml',
      'world/terminus/valley-road/towpath.yaml',
      'world/terminus/valley-road/the-narrows.yaml',
      'world/terminus/valley-road/the-shoulder.yaml',
    ]) {
      const doc = row(file);
      expect(String(doc.class)).toBe('/platform/location/SingletonCartesianLocation');
      expect(JSON.stringify(doc)).not.toContain('wizard');
    }
  });
});
