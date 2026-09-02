/**
 * Contamination (watershed W8) — **the map is the argument**.
 *
 * The claims:
 *
 *  - an outfall raises contamination at its reach, and everything below;
 *  - ⭐ an **organic** load **decays downstream** while a **persistent**
 *    one does not — the river recovers below the town and never
 *    recovers below the smelter;
 *  - ⭐ **an intake above an outfall is clean and below it is not** —
 *    derived from terrain, **authored by nobody**;
 *  - contamination is a **concentration**, so the same outfall fouls a
 *    summer trickle far worse than a spring freshet;
 *  - a treated conduit reduces what arrives, and only a supply can be
 *    `fouled` — a sewer carrying filth is a sewer working.
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
import Conduit from '../thing/Conduit';
import WatercourseCatalogue, {
  CONTAMINANT_SURVIVAL_PER_HOP,
  type ContaminantKind,
} from '../idea/WatercourseCatalogue';

const YEAR = 365 * 86_400;

/**
 * The Kestrel through a town: four reaches, so an outfall at `mill` has
 * two reaches of river below it to recover over.
 */
const WORLD = [
  {
    path: '/stuff/idea/Watercourse/kestrel',
    class: '/system/water/idea/Watercourse',
    data: {
      key: 'kestrel',
      name: 'the Kestrel',
      basin: 'kestrel',
      branchesFrom: null,
      nodes: [
        { name: 'headwaters', elevation: 900 },
        { name: 'mill', elevation: 400 },
        { name: 'town', elevation: 120 },
        { name: 'estuary', elevation: 0, channelWidthM: 120 },
      ],
    },
  },
  {
    path: '/stuff/idea/Locality/terminus',
    class: '/platform/idea/Locality',
    data: { name: 'terminus', _reach: 'kestrel:headwaters', _catchmentKm2: 800 },
  },
];

function installWorld(): void {
  const store = WORLD.map((r, i) => ({ _id: String(i + 1), ...r }));
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

let seq = 0;
/** An outfall: a disposal conduit discharging `load` of `kind`. */
function makeOutfall(
  reach: string,
  load: number,
  kind: ContaminantKind = 'organic',
): Conduit {
  seq += 1;
  return makeStuffAtPath(() => {
    const c = new Conduit();
    c.setShortDescription('the outfall');
    c.setDirection('disposal');
    c.setReachRef(reach);
    c.setExtent('/world/town');
    c.setCapacityM3S(5);
    c.setDischargeLoadPerSecond(load);
    c.setDischargeKind(kind);
    c.switchOn();
    return c;
  }, `/system/water/thing/Conduit/_outfall-${seq}`) as Conduit;
}

/** An intake: a supply conduit drawing from `reach`. */
function makeIntake(reach: string, treatment = 0): Conduit {
  seq += 1;
  return makeStuffAtPath(() => {
    const c = new Conduit();
    c.setShortDescription('the city intake');
    c.setDirection('supply');
    c.setReachRef(reach);
    c.setExtent('/world/town');
    c.setCapacityM3S(2);
    c.setTreatmentFactor(treatment);
    c.switchOn();
    return c;
  }, `/system/water/thing/Conduit/_intake-${seq}`) as Conduit;
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

describe('an outfall fouls its reach and everything below it', () => {
  it('a clean river reports zero, and says so rather than saying nothing', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    const dirt = await catalogue().contaminationAt('kestrel:town', YEAR);
    expect(dirt).not.toBeNull();
    expect(dirt!.level).toBe(0);
  });

  it('a reach that names nothing reads null — not clean', async () => {
    installWorld();
    expect(await catalogue().contaminationAt('kestrel:nowhere', YEAR)).toBeNull();
  });

  it('an outfall raises the level at its own reach and downstream', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    makeOutfall('kestrel:mill', 4, 'organic');
    const c = catalogue();
    expect((await c.contaminationAt('kestrel:mill', YEAR))!.level).toBeGreaterThan(0);
    expect((await c.contaminationAt('kestrel:town', YEAR))!.level).toBeGreaterThan(0);
  });

  it('⭐ an outfall BELOW you does not foul you — the whole of "move your intake"', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    makeOutfall('kestrel:town', 4, 'organic');
    const c = catalogue();
    // Upstream of the outfall: clean, and nobody authored that.
    expect((await c.contaminationAt('kestrel:mill', YEAR))!.level).toBe(0);
    expect((await c.contaminationAt('kestrel:headwaters', YEAR))!.level).toBe(0);
    // Below it: not.
    expect((await c.contaminationAt('kestrel:estuary', YEAR))!.level).toBeGreaterThan(0);
  });

  it('shutting an outfall cleans the river below it, with no rule saying so', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    const outfall = makeOutfall('kestrel:mill', 4);
    const c = catalogue();
    expect((await c.contaminationAt('kestrel:town', YEAR))!.level).toBeGreaterThan(0);
    outfall.switchOff();
    expect((await c.contaminationAt('kestrel:town', YEAR))!.level).toBe(0);
  });
});

describe('⭐ the KIND decides whether the river recovers', () => {
  it('an ORGANIC load decays downstream — the river recovers below the town', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    makeOutfall('kestrel:mill', 10, 'organic');
    const c = catalogue();
    const at = (await c.contaminationAt('kestrel:mill', YEAR))!.byKind.organic;
    const oneDown = (await c.contaminationAt('kestrel:town', YEAR))!.byKind.organic;
    const twoDown = (await c.contaminationAt('kestrel:estuary', YEAR))!.byKind
      .organic;
    expect(oneDown).toBeLessThan(at);
    expect(twoDown).toBeLessThan(oneDown);
    expect(oneDown / at).toBeCloseTo(CONTAMINANT_SURVIVAL_PER_HOP.organic, 6);
  });

  it('a PERSISTENT load does NOT decay — the river never recovers below the smelter', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    makeOutfall('kestrel:mill', 10, 'persistent');
    const c = catalogue();
    const at = (await c.contaminationAt('kestrel:mill', YEAR))!.byKind.persistent;
    const twoDown = (await c.contaminationAt('kestrel:estuary', YEAR))!.byKind
      .persistent;
    expect(twoDown).toBeCloseTo(at, 9);
  });

  it('SEDIMENT settles faster than sewage; NUTRIENT does not settle at all', async () => {
    expect(CONTAMINANT_SURVIVAL_PER_HOP.sediment).toBeLessThan(
      CONTAMINANT_SURVIVAL_PER_HOP.organic,
    );
    expect(CONTAMINANT_SURVIVAL_PER_HOP.nutrient).toBe(1);
  });

  it('two outfalls of different kinds keep their kinds apart downstream', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    makeOutfall('kestrel:mill', 10, 'organic');
    makeOutfall('kestrel:mill', 10, 'persistent');
    const dirt = (await catalogue().contaminationAt('kestrel:estuary', YEAR))!;
    // Same load, same distance — and the sewage is mostly gone while
    // the metal is entirely still there.
    expect(dirt.byKind.persistent).toBeGreaterThan(dirt.byKind.organic * 2);
    expect(dirt.level).toBeCloseTo(dirt.byKind.organic + dirt.byKind.persistent, 9);
  });
});

describe('⭐ contamination is a CONCENTRATION, so a dry month is a dirty month', () => {
  it('the same outfall fouls a low river far worse than a high one', async () => {
    installWorld();
    makeOutfall('kestrel:mill', 5, 'persistent');
    const c = catalogue();

    WeatherApi._forceTypeForTesting('storm');
    const wet = (await c.contaminationAt('kestrel:town', YEAR))!.level;
    c.invalidateCache();

    WeatherApi._forceTypeForTesting('clear');
    const dry = (await c.contaminationAt('kestrel:town', YEAR))!.level;

    expect(dry).toBeGreaterThan(wet);
  });
});

describe('the intake reads what arrives, after its own treatment', () => {
  it('⭐ an intake ABOVE the outfall is fine; the same intake BELOW it is fouled', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    installRootBiome();
    makeOutfall('kestrel:mill', 200, 'persistent');
    const c = catalogue();

    const above = makeIntake('kestrel:headwaters');
    const below = makeIntake('kestrel:town');
    expect((await above.readingFor(c, YEAR, 1)).state).not.toBe('fouled');
    expect((await below.readingFor(c, YEAR, 1)).state).toBe('fouled');
  });

  it('treatment on the conduit clears it — the third rung of the ladder', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    installRootBiome();
    makeOutfall('kestrel:mill', 200, 'persistent');
    const c = catalogue();

    const raw = makeIntake('kestrel:town', 0);
    const treated = makeIntake('kestrel:town', 0.995);
    expect((await raw.readingFor(c, YEAR, 1)).state).toBe('fouled');
    expect((await treated.readingFor(c, YEAR, 1)).state).not.toBe('fouled');
  });

  it('a SEWER carrying filth is a sewer working — only a supply can be fouled', async () => {
    WeatherApi._forceTypeForTesting('rain');
    installWorld();
    installRootBiome();
    const outfall = makeOutfall('kestrel:mill', 500, 'persistent');
    const c = catalogue();
    expect((await outfall.readingFor(c, YEAR, 1)).state).not.toBe('fouled');
  });
});
