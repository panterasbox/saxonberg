/**
 * Elevation as a zone field (watershed W2) — and the pressure fallback
 * that makes the altimeter honest.
 *
 * Three claims:
 *
 *  1. **Elevation lives on the ZONE and inherits.** A district declares
 *     a height; a room inside it says nothing and gets it; an authored
 *     value anywhere in the chain wins over anything above it.
 *  2. ⭐ **Pressure is the CONSEQUENCE.** `measure altitude` computes
 *     `(P_sea − P_local) / (ρ·g)`, so before this field altitude was
 *     back-computed from a number an author typed. The fallback derives
 *     pressure from elevation with the same expression solved the other
 *     way, so the instrument reads back the zone's height exactly — one
 *     physical fact, one source of truth. An **authored** pressure
 *     anywhere in the chain still wins.
 *  3. ⚠ **`coords.z` is not elevation.** A third-floor flat and the
 *     lobby are the same point on the watershed. A stairwell is not a
 *     waterfall.
 *
 * See docs/subsystems/watershed.md.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ZoneApi } from '../../../api/zone';
import { BiomeApi } from '../../../api/biome';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Biome from '../../biome/Biome';
import { Zone } from '../Zone';
import { Stuff } from '../../stuff/Stuff';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

const SEA_LEVEL_PA = 101_325;
const AIR_DENSITY = 1.225; // kg/m³, the tabulated `air` figure
const G = 9.81;

function installInMemoryStore(initial: Doc[] = []): void {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));
  const save = vi.fn(async (_c: string, doc: Doc) => doc._id ?? '1');
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    },
  );
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);
}

/** The universe biome, holding the sea-level pressure REFERENCE. */
function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(SEA_LEVEL_PA, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(G, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

/** A room stamped into `zone`, with the root biome on it. */
function roomIn(zone: Zone): CartesianLocation {
  const room = makeStuff(() => new CartesianLocation());
  Stuff._stampZone(room, zone as never);
  room.setBiome(BiomeApi.getRootBiome());
  return room;
}

/** The pressure the linear hydrostatic form gives at `h` metres. */
const expectedPa = (h: number): number => SEA_LEVEL_PA - AIR_DENSITY * G * h;

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('elevation — a zone field that inherits', () => {
  it('a zone reports the height declared ON it', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const zone = await StuffApi.singleton<Zone>('/hinkley');
    zone.setElevation(420);
    expect(await zone.lookupField<number>('elevation')).toBe(420);
  });

  it('a child zone that declares nothing INHERITS its ancestor height', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/FolderZone', data: {} },
      { path: '/hinkley/lane', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const slope = await StuffApi.singleton<Zone>('/hinkley');
    slope.setElevation(420);
    const lane = await StuffApi.singleton<Zone>('/hinkley/lane');
    expect(await lane.lookupField<number>('elevation')).toBe(420);
  });

  it('an authored value on the child WINS over the ancestor', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/FolderZone', data: {} },
      { path: '/hinkley/lane', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const slope = await StuffApi.singleton<Zone>('/hinkley');
    slope.setElevation(420);
    const lane = await StuffApi.singleton<Zone>('/hinkley/lane');
    lane.setElevation(465);
    expect(await lane.lookupField<number>('elevation')).toBe(465);
    // …and the ancestor is unchanged: terrain varies by zoning FINER.
    expect(await slope.lookupField<number>('elevation')).toBe(420);
  });

  it('nothing in the chain declaring one reads null, never zero', async () => {
    installInMemoryStore([
      { path: '/nowhere', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const zone = await StuffApi.singleton<Zone>('/nowhere');
    expect(await zone.lookupField<number>('elevation')).toBeNull();
  });

  it('ZoneApi.elevationFor resolves through the place a thing stands in', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const zone = await StuffApi.singleton<Zone>('/hinkley');
    zone.setElevation(420);
    const room = makeStuff(() => new CartesianLocation());
    Stuff._stampZone(room, zone as never);
    expect(await ZoneApi.elevationFor(room)).toBe(420);
  });

  it('a place in no zone at all reads null', async () => {
    const room = makeStuff(() => new CartesianLocation());
    expect(await ZoneApi.elevationFor(room)).toBeNull();
  });
});

describe('⭐ pressure derives from elevation — the altimeter reads a cause', () => {
  it('an unauthored pressure at height derives, and the source says so', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/hinkley');
    zone.setElevation(400);
    const room = roomIn(zone);

    const p = await BiomeApi.resolvePressureFor(room);
    expect(p.rawValue()).toBeCloseTo(expectedPa(400), 6);

    const trace = await BiomeApi.traceResolvePressureFor(room);
    expect(trace.source).toBe('elevation');
    expect(trace.sourcePath).toBe('/hinkley');
  });

  it('⭐ the altimeter reads back the zone height EXACTLY (D4 acceptance)', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/hinkley');
    zone.setElevation(437);
    const room = roomIn(zone);

    // The `measure altitude` expression, verbatim.
    const local = await BiomeApi.resolvePressureFor(room);
    const seaLevel = BiomeApi.getRootBiome().getDefaultPressure()!;
    const density = BiomeApi.densityOf(
      await BiomeApi.resolveAtmosphereFor(room),
    );
    const gravity = await BiomeApi.resolveGravityFor(room);
    const altitude =
      (seaLevel.rawValue() - local.rawValue()) /
      (density.rawValue() * gravity.rawValue());

    expect(altitude).toBeCloseTo(437, 6);
  });

  it('an AUTHORED pressure still wins — the fallback never overrides an author', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/hinkley');
    zone.setElevation(400);
    const room = roomIn(zone);
    room._pressure = Quantity.of(90_000, 'Pa');

    const p = await BiomeApi.resolvePressureFor(room);
    expect(p.rawValue()).toBe(90_000);
    expect((await BiomeApi.traceResolvePressureFor(room)).source).toBe('room');
  });

  it('a biome that names its own pressure wins too', async () => {
    installInMemoryStore([
      { path: '/hinkley', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/hinkley');
    zone.setElevation(400);
    const room = roomIn(zone);
    const deep = makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultPressure(Quantity.of(120_000, 'Pa'));
      b._extendsBiomePath = '/stuff/idea/biome/universe';
      return b;
    }, '/stuff/idea/biome/deep');
    room.setBiome(deep as never);

    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(120_000);
  });

  it('no elevation anywhere leaves the sea-level reference untouched', async () => {
    installInMemoryStore([
      { path: '/flat', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/flat');
    const room = roomIn(zone);
    const p = await BiomeApi.resolvePressureFor(room);
    expect(p.rawValue()).toBe(SEA_LEVEL_PA);
    expect((await BiomeApi.traceResolvePressureFor(room)).source).not.toBe(
      'elevation',
    );
  });

  it('elevation ZERO is the reference, not a derivation', async () => {
    installInMemoryStore([
      { path: '/shore', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/shore');
    zone.setElevation(0);
    const room = roomIn(zone);
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(
      SEA_LEVEL_PA,
    );
  });

  it('below sea level reads HIGHER pressure — the sign is not fudged', async () => {
    installInMemoryStore([
      { path: '/sink', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/sink');
    zone.setElevation(-80);
    const room = roomIn(zone);
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBeCloseTo(
      expectedPa(-80),
      6,
    );
  });
});

describe('⚠ coords.z is NOT elevation — a stairwell is not a waterfall', () => {
  it('two rooms in one zone at different z resolve the SAME elevation', async () => {
    installInMemoryStore([
      { path: '/tower', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    installRootBiome();
    const zone = await StuffApi.singleton<Zone>('/tower');
    zone.setElevation(12);

    const lobby = roomIn(zone);
    lobby.setCoords({ x: 0, y: 0, z: 0 });
    const flat = roomIn(zone);
    flat.setCoords({ x: 0, y: 0, z: 3 }); // three floors up

    expect(await ZoneApi.elevationFor(lobby)).toBe(12);
    expect(await ZoneApi.elevationFor(flat)).toBe(12);
    // …and therefore the same barometric pressure, to the pascal.
    expect((await BiomeApi.resolvePressureFor(flat)).rawValue()).toBe(
      (await BiomeApi.resolvePressureFor(lobby)).rawValue(),
    );
  });
});
