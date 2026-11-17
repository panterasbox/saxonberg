/**
 * Geography W1 — a Locality and a building have a point on the chart, and
 * a place knows where it stands (D4) and which latitude its climate reads
 * (D7).
 *
 * Fixture roster (fictional, never a shipped row):
 *   /stuff/idea/Locality/narnia         'narnia'          no point (the realm root)
 *   /stuff/idea/Locality/cair-paravel   'narnia/castle'   at 50.0, -4.0, radius 2000
 *   /stuff/idea/Locality/castle-keep    'narnia/castle/keep'  no point (inside the castle's radius)
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Place from '../Place';
import Locality from '../../../platform/idea/Locality';
import AddressRegistry from '../../../platform/idea/AddressRegistry';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { AddressApi } from '../../../api/address';
import { ZoneApi } from '../../../api/zone';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../Stuff';
import Building from '../../../platform/idea/Building';
import StructureRow from '../../../platform/idea/Structure';
import { DEFAULT_CLIMATE_SITE } from '../../weather/WeatherType';
import type Structure from '../../structure/Structure';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class TestRoom extends Place {}

function installLocality(path: string, address: string, at?: [number, number], radiusM?: number): Locality {
  const loc = makeStuffAtPath(() => {
    const l = new Locality();
    l.setName(path.split('/').pop()!);
    l.setAddress(address);
    if (at) l.setPosition({ latDeg: at[0], lonDeg: at[1] });
    if (radiusM !== undefined) l.setRadiusM(radiusM);
    return l;
  }, path);
  AddressApi.registerLocality(loc);
  return loc;
}

async function roomAt(address: string | null): Promise<TestRoom> {
  const r = makeStuff(() => new TestRoom());
  if (address !== null) r.setAddress(address);
  await r.resolveWeatherLocality();
  return r;
}

beforeEach(() => {
  AddressApi._resetRegistryRefForReload();
  makeStuffAtPath(() => new AddressRegistry(), '/platform/idea/AddressRegistry');
  installLocality('/stuff/idea/Locality/narnia', 'narnia');
  installLocality('/stuff/idea/Locality/cair-paravel', 'narnia/castle', [50, -4], 2000);
  installLocality('/stuff/idea/Locality/castle-keep', 'narnia/castle/keep');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  AddressApi._resetRegistryRefForReload();
});

describe('a Locality has a point and a radius', () => {
  it('round-trips a point as a GeoPosition', () => {
    const l = AddressApi.findByAddress('narnia/castle')!;
    expect(l.getPosition()?.latDeg).toBe(50);
    expect(l.getPosition()?.lonDeg).toBe(-4);
    expect(l.getRadiusM()).toBe(2000);
    expect(AddressApi.findByAddress('narnia')!.getPosition()).toBeNull();
  });

  it('refuses a town that is nowhere, and a radius that is not positive', () => {
    const l = makeStuff(() => new Locality());
    expect(() => l.setPosition({ latDeg: Number.NaN, lonDeg: 0 })).toThrow();
    expect(() => l.setRadiusM(0)).toThrow(RangeError);
    expect(() => l.setRadiusM(-5)).toThrow(RangeError);
    l.setPosition(null);
    expect(l.getPosition()).toBeNull();
  });
});

describe('AddressApi.positionedLocalityOf — the nearest Locality on the chart', () => {
  it('walks the coverage chain outward past a Locality with no point', () => {
    expect(AddressApi.positionedLocalityOf('narnia/castle/keep/well')?.getAddress()).toBe('narnia/castle');
    expect(AddressApi.positionedLocalityOf('narnia/castle')?.getAddress()).toBe('narnia/castle');
  });

  it('is null where nothing over the address has a point', () => {
    expect(AddressApi.positionedLocalityOf('narnia/wild')).toBeNull();
    expect(AddressApi.positionedLocalityOf('elsewhere')).toBeNull();
    expect(AddressApi.positionedLocalityOf(null)).toBeNull();
  });
});

describe('Place.chartPoint — where a room stands (D4)', () => {
  it('case 3: a room with no point of its own stands at its Locality, with the radius', async () => {
    const r = await roomAt('narnia/castle/keep/hall');
    const p = r.chartPoint();
    expect(p).not.toBeNull();
    expect(p!.at.latDeg).toBe(50);
    expect(p!.owner).toBe(AddressApi.findByAddress('narnia/castle'));
    expect(p!.radiusM).toBe(2000);
  });

  it('case 4: a room under no positioned Locality is on no chart', async () => {
    expect((await roomAt('narnia/wild/glade')).chartPoint()).toBeNull();
    expect((await roomAt(null)).chartPoint()).toBeNull();
  });

  it('case 2: a room whose structure has a point of its own stands there, with no radius', async () => {
    const r = await roomAt('narnia/castle/keep/hall');
    const tower = makeStuff(() => new Building());
    tower.setPosition({ latDeg: 50.01, lonDeg: -4.02 });
    vi.spyOn(TestRoom.prototype, 'structureNow').mockReturnValue(tower as unknown as Structure);
    const p = r.chartPoint();
    expect(p!.at.latDeg).toBeCloseTo(50.01, 6);
    expect(p!.radiusM).toBeNull();
  });

  it('a structure with no point of its own defers to the Locality', async () => {
    const r = await roomAt('narnia/castle/keep/hall');
    const shed = makeStuff(() => new StructureRow());
    vi.spyOn(TestRoom.prototype, 'structureNow').mockReturnValue(shed as unknown as Structure);
    expect(r.chartPoint()!.radiusM).toBe(2000);
  });
});

describe('the climate latitude follows the chart (D7)', () => {
  function zoneWith(latitude: number | null): CartesianZone {
    const z = makeStuffAtPath(() => new CartesianZone(), '/test/narnia/castle');
    if (latitude !== null) z.setLatitude(latitude);
    return z;
  }

  async function siteOf(zone: CartesianZone, address: string): Promise<number> {
    const r = makeStuff(() => new TestRoom());
    r.setAddress(address);
    Stuff._stampZone(r, zone as never);
    vi.spyOn(ZoneApi, 'getEnclosingZone').mockResolvedValue(null);
    return (await ZoneApi.climateSiteFor(r)).latitudeDeg;
  }

  it('a zone that states a latitude keeps it', async () => {
    expect(await siteOf(zoneWith(-30), 'narnia/castle/keep')).toBe(-30);
  });

  it('a zone that states none takes its Locality\'s point', async () => {
    expect(await siteOf(zoneWith(null), 'narnia/castle/keep')).toBe(50);
  });

  it('neither → the realm default', async () => {
    expect(await siteOf(zoneWith(null), 'narnia/wild')).toBe(DEFAULT_CLIMATE_SITE.latitudeDeg);
  });
});
