/**
 * Storage and control (watershed W6).
 *
 * `StorageNode` is the build's **one genuinely stateful thing** —
 * everything else derives, but a level cannot, because outflow depends
 * on what players drew. `ControlStructure` is its most consequential
 * one: it converts flow *variability* into flow *reliability*, and it
 * makes the watershed political, because whoever holds the dam holds
 * everyone below.
 *
 * The claims:
 *
 *  - a tower **fills against Δh at an energy cost** and **supplies head**
 *    to the ground below it — which is how a flat city gets a gravity
 *    main;
 *  - ⭐ **the buffer size is the outage tolerance**;
 *  - a dam redistributes flow **in time**, a headgate **in space**, and
 *    both are the same arithmetic;
 *  - hydro output is `ρ·g·Δh·Q·η` and **rises and falls with flow**;
 *  - a live control's withholding shows up as a **real reduction
 *    downstream**.
 *
 * See docs/subsystems/watershed.md.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Biome from '@saxonberg/server/mud/lib/biome/Biome';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import StorageNode from '../thing/StorageNode';
import ControlStructure from '../thing/ControlStructure';
import WatercourseCatalogue from '../idea/WatercourseCatalogue';

const YEAR = 365 * 86_400;
const RHO = 1000;
const G = 9.81;

interface Row {
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
}

const WORLD: Row[] = [
  {
    path: '/platform/idea/persistence/PersistentHydrator',
    class: '/platform/idea/persistence/PersistentHydrator',
    data: {},
  },
  {
    path: '/stuff/idea/Watercourse/kestrel',
    class: '/system/water/idea/Watercourse',
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
  {
    // ⭐ Terminus is FLAT by construction — 5 m of ground, which is
    // exactly why it needs a tower to get any head at all.
    path: '/world/flatcity',
    class: '/platform/idea/location/CartesianZone',
    hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    data: { elevation: 5 },
  },
];

/**
 * An in-memory stand-in for both stores the wave touches: the `content`
 * collection the drainage reads, and `holder_snapshots` — where the
 * persistence spine actually puts a captured level, so the
 * survives-a-restart claim can be PROVEN rather than asserted.
 */
function installWorld(): void {
  const store = WORLD.map((r, i) => ({ _id: String(i + 1), ...r }));
  const snapshots: Array<Record<string, unknown> & { _id?: string }> = [];
  let nextId = 1;

  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection === Collections.HolderSnapshots) {
        return snapshots.filter((d) =>
          Object.entries(query).every(([k, v]) => d[k] === v),
        );
      }
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
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (collection: string, doc: Record<string, unknown>) => {
      if (collection !== Collections.HolderSnapshots) return '0';
      const copy = { ...doc };
      const existing = copy._id
        ? snapshots.findIndex((d) => d._id === copy._id)
        : -1;
      if (existing >= 0) {
        snapshots[existing] = copy;
        return String(copy._id);
      }
      copy._id = String(nextId++);
      snapshots.push(copy);
      return String(copy._id);
    },
  );
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(G, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

let seq = 0;
function makeTower(spec: {
  capacity?: number;
  elevation?: number;
  extent?: string;
  level?: number;
}): StorageNode {
  seq += 1;
  return makeStuffAtPath(() => {
    const t = new StorageNode();
    t.setShortDescription('the standpipe tower');
    t.setStorageKind('tower');
    t.setCapacityM3(spec.capacity ?? 500);
    t.setElevationM(spec.elevation ?? 40);
    t.setServesExtent(spec.extent ?? '/world/flatcity');
    t.setLevelM3(spec.level ?? 0);
    return t;
  }, `/system/water/thing/StorageNode/_test-${seq}`) as StorageNode;
}

function makeControl(spec: {
  reach?: string;
  pass?: number;
  divertsTo?: string;
  head?: number;
  generates?: boolean;
}): ControlStructure {
  seq += 1;
  return makeStuffAtPath(() => {
    const c = new ControlStructure();
    c.setShortDescription('the headgate');
    c.setReachRef(spec.reach ?? 'kestrel:falls');
    c.setPassFraction(spec.pass ?? 1);
    c.setDivertsTo(spec.divertsTo ?? '');
    c.setHeadM(spec.head ?? 0);
    c.setGenerates(spec.generates ?? false);
    return c;
  }, `/system/water/thing/ControlStructure/_test-${seq}`) as ControlStructure;
}

const catalogue = (): WatercourseCatalogue =>
  makeStuff(() => new WatercourseCatalogue()) as WatercourseCatalogue;

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  // The level is a plain number, so nothing here needs a real
  // marshaller — but the spine preloads the resolver on every capture.
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
});

afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ a tower supplies HEAD — which is how a flat city gets a gravity main', () => {
  it('a tower above the ground it serves gives that ground its head', async () => {
    installWorld();
    const tower = makeTower({ elevation: 40, extent: '/world/flatcity' });
    // 40 m of tank over 5 m of town.
    expect(await tower.headOverServedGroundM()).toBe(35);
  });

  it('⚠ ground with no elevation reads UNKNOWN head, not zero', async () => {
    installWorld();
    const tower = makeTower({ extent: '/world/unmapped' });
    expect(await tower.headOverServedGroundM()).toBeNull();
  });

  it('it supplies the extent below it by longest prefix, and nothing else', () => {
    const tower = makeTower({ extent: '/world/flatcity' });
    expect(tower.serves('/world/flatcity/market')).toBe(true);
    expect(tower.serves('/world/flatcityhall')).toBe(false);
    expect(tower.serves('/world/hills')).toBe(false);
  });
});

describe('filling costs energy exactly when the water has to rise', () => {
  it('a lift costs ρ·g·Δh·V / η', () => {
    installRootBiome();
    const tower = makeTower({ elevation: 40, capacity: 500 });
    // 100 m³ raised from the river at 5 m to a tank at 40 m.
    const moved = tower.fillFrom(100, 5);
    expect(moved.m3).toBe(100);
    expect(moved.levelM3).toBe(100);
    expect(moved.joules).toBeCloseTo((RHO * G * 35 * 100) / 0.6, 0);
  });

  it('⭐ water arriving from ABOVE costs nothing — the whole argument for gravity', () => {
    installRootBiome();
    const tower = makeTower({ elevation: 40, capacity: 500 });
    const moved = tower.fillFrom(100, 400); // fed from the falls
    expect(moved.m3).toBe(100);
    expect(moved.joules).toBe(0);
  });

  it('a full tank refuses the surplus rather than pretending to take it', () => {
    installRootBiome();
    const tower = makeTower({ capacity: 100, level: 90 });
    const moved = tower.fillFrom(50, 0);
    expect(moved.m3).toBe(10);
    expect(moved.levelM3).toBe(100);
    // …and a second fill moves nothing at all, at no cost.
    const again = tower.fillFrom(50, 0);
    expect(again.m3).toBe(0);
    expect(again.joules).toBe(0);
  });

  it('a draw is level-capped — a run-down store delivers what it has', () => {
    const tower = makeTower({ capacity: 100, level: 30 });
    expect(tower.draw(50).m3).toBe(30);
    expect(tower.getLevelM3()).toBe(0);
    expect(tower.fullness()).toBe(0);
  });

  it('shrinking the capacity spills the surplus rather than holding an impossible level', () => {
    const tower = makeTower({ capacity: 100, level: 100 });
    tower.setCapacityM3(40);
    expect(tower.getLevelM3()).toBe(40);
  });
});

describe('⭐ the buffer size IS the outage tolerance', () => {
  it('a full tower holds out for level ÷ draw seconds', () => {
    const tower = makeTower({ capacity: 500, level: 500 });
    expect(tower.outageToleranceS(0.5)).toBe(1000);
    // Twice the town, half the time. That is the whole design argument
    // about how big to build one.
    expect(tower.outageToleranceS(1)).toBe(500);
  });

  it('an empty tower holds out for nothing; an unused one, forever', () => {
    expect(makeTower({ level: 0 }).outageToleranceS(1)).toBe(0);
    expect(makeTower({ capacity: 500, level: 500 }).outageToleranceS(0)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe('the level is STATE, and it is the only state in the build', () => {
  it('⭐ a level SURVIVES A RESTART — the persistence spine round trip', async () => {
    installWorld();
    const tower = makeTower({ capacity: 500, level: 275 });
    expect(tower.getLevelM3()).toBe(275);

    // Capture through the universal self-persistence spine, exactly as
    // a shutdown or an autosave would.
    await PersistableApi.capture(tower);

    // Now lose it the way a process restart loses it: the live value is
    // wrong, and only the record knows better.
    tower.setLevelM3(0);
    expect(tower.getLevelM3()).toBe(0);

    await PersistableApi.materialize(tower);
    expect(tower.getLevelM3()).toBe(275);
  });

  it('the level is declared persistent — the field a restart must not lose', () => {
    const meta = (StorageNode as unknown as {
      fieldMeta: Record<string, { persistent?: boolean }>;
    }).fieldMeta;
    expect(meta.levelM3?.persistent).toBe(true);
    // …and it is NOT authorable: a level is a fact about the world, not
    // an authoring decision, and a template that set one would be
    // asserting how much water is in a tank it has never seen.
    expect(
      (meta.levelM3 as { authorable?: boolean }).authorable,
    ).toBeUndefined();
  });
});

describe('⭐ a control redistributes flow in TIME or in SPACE', () => {
  it('a weir passes everything — a structure nobody has set changes nothing', () => {
    const weir = makeControl({ pass: 1 });
    const split = weir.split(10);
    expect(split.passedM3S).toBe(10);
    expect(split.divertedM3S).toBe(0);
  });

  it('a DAM holds water back — redistribution in TIME', () => {
    const dam = makeControl({ pass: 0.25 });
    const split = dam.split(10);
    expect(split.passedM3S).toBe(2.5);
    // Held, not sent anywhere: it goes into the reservoir behind it and
    // comes down in August.
    expect(split.divertedM3S).toBe(0);
  });

  it('a HEADGATE sends the same share into a canal — redistribution in SPACE', () => {
    const gate = makeControl({ pass: 0.25, divertsTo: 'ditch:head' });
    const split = gate.split(10);
    expect(split.passedM3S).toBe(2.5);
    expect(split.divertedM3S).toBe(7.5);
  });

  it('a closed gate passes nothing, and the arithmetic still balances', () => {
    const gate = makeControl({ pass: 0, divertsTo: 'ditch:head' });
    const split = gate.split(10);
    expect(split.passedM3S).toBe(0);
    expect(split.divertedM3S).toBe(10);
  });

  it('the setting clamps to [0, 1] — no control passes more than arrives', () => {
    const c = makeControl({});
    c.setPassFraction(5);
    expect(c.getPassFraction()).toBe(1);
    c.setPassFraction(-3);
    expect(c.getPassFraction()).toBe(0);
  });
});

describe('⭐ hydro output is the same equation, read the paying way', () => {
  it('ρ·g·Δh·Q·η, and it rises and falls with flow', () => {
    installRootBiome();
    const dam = makeControl({ head: 30, generates: true });
    expect(dam.generationW(10)).toBeCloseTo(RHO * G * 30 * 10 * 0.85, 0);
    // Double the river, double the power. That is the whole seasonality
    // story arriving at the generator.
    expect(dam.generationW(20)).toBeCloseTo(dam.generationW(10) * 2, 3);
    expect(dam.generationW(0)).toBe(0);
  });

  it('no turbine, no power — and a dam without one is still a dam', () => {
    installRootBiome();
    const dam = makeControl({ head: 30, generates: false });
    expect(dam.generationW(10)).toBe(0);
    expect(dam.split(10).passedM3S).toBe(10);
  });

  it('no head, no power — a weir on the flat generates nothing', () => {
    installRootBiome();
    expect(makeControl({ head: 0, generates: true }).generationW(10)).toBe(0);
  });

  it('generation reads the ARRIVING flow, so diverting does not cost output', () => {
    installRootBiome();
    const gate = makeControl({
      head: 20,
      generates: true,
      pass: 0.2,
      divertsTo: 'ditch:head',
    });
    // The water goes through the machine whichever way it leaves.
    expect(gate.split(10).generatedW).toBeCloseTo(gate.generationW(10), 6);
  });
});

describe('a live control is a real reduction downstream', () => {
  it('⭐ a headgate at the falls is felt at the confluence', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = catalogue();

    const open = (await c.flowAt('kestrel:confluence', YEAR))!;
    expect(open.m3s).toBeGreaterThan(0);

    // Put a gate on the reach above and shut it most of the way.
    makeControl({ reach: 'kestrel:falls', pass: 0.1, divertsTo: 'ditch:head' });
    const draws = await c.liveDraws(YEAR + 1);
    const held = (await c.flowAt('kestrel:confluence', YEAR + 1, draws))!;

    expect(held.drawnM3S).toBeGreaterThan(0);
    expect(held.m3s).toBeLessThan(open.m3s);
  });

  it('a control set to pass everything withdraws nothing', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = catalogue();
    makeControl({ reach: 'kestrel:falls', pass: 1 });
    const draws = await c.liveDraws(YEAR);
    expect([...draws.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('a control on a reach that does not exist is silently no withdrawal', async () => {
    WeatherApi._forceTypeForTesting('storm');
    installWorld();
    installRootBiome();
    const c = catalogue();
    makeControl({ reach: 'nowhere:at-all', pass: 0 });
    expect((await c.liveDraws(YEAR)).size).toBe(0);
  });
});
