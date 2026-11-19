/**
 * ⭐⭐ The skyline (geography W2, D1/D2/D8) — what stands tall where, read
 * off the content ROWS by the location graph's attachment derivation, and
 * a skyline per vantage kept until a structure is built, pulled down or
 * moved. Nothing is loaded to decide what is seen.
 *
 * Fixture world (all under /test):
 *   /test/sea              an expanse row with an origin at 50°N 4°W
 *   /test/sea/rock         its node, 10 nm due east, landing at /test/sky/rock/landing
 *   /test/sky              a zone 40 m up, address skyland/town
 *   /test/sky/light        a 30 m landmark on the rock, lit — no point of its own (the node's)
 *   /test/sky/mill         a 20 m building with its own point
 *   /test/sky/hall         a 15 m building, no point — stands at the town's
 *   /test/sky/shed         a 4 m building — not worth seeing
 *   /test/sky/boat         a ship on the sea — a craft, read at the act, never a mark
 */
import '../../../../test-bootstrap';
import { withSaveMany } from '../../../lib/persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { NavigationApi } from '../../../api/navigation';
import { ParcelApi } from '../../../api/parcel';
import { AddressApi } from '../../../api/address';
import { AppApi } from '../../../api/app';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import LocationGraphRegistry from '../LocationGraphRegistry';
import Locality from '../Locality';
import AddressRegistry from '../AddressRegistry';
import Building from '../Building';
import { GeoPosition } from '../../../lib/expanse/GeoPosition';
import { Vantage } from '../../../lib/perception/Vantage';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';

const ORIGIN = { latDeg: 50, lonDeg: -4 };
let store: Array<Record<string, unknown>>;

function rowAt(path: string): Record<string, unknown> {
  const r = store.find((d) => d.path === path);
  if (!r) throw new Error(`no row ${path}`);
  return r.data as Record<string, unknown>;
}

beforeEach(() => {
  StuffApi.clearAll();
  store = seedKernelContentStore([
    { path: '/test/sea', class: '/platform/idea/Business', data: { origin: ORIGIN } },
    { path: '/test/sea/rock', class: '/platform/idea/Business', data: {
      destination: '/test/sky/rock/landing', focus: { rho: 18520, theta: 90 },
    } },
    { path: '/test/sky', class: '/platform/idea/location/CartesianZone', data: { elevation: 40, address: 'skyland/town' } },
    { path: '/test/sky/light', class: '/platform/idea/Building', data: {
      extent: '/test/sky/rock', entrance: '/test/sky/rock/landing', heightM: 30, landmark: true, showsLight: true,
    } },
    { path: '/test/sky/mill', class: '/platform/idea/Building', data: {
      extent: '/test/sky/mill', heightM: 20, position: { latDeg: 50.05, lonDeg: -4 },
    } },
    { path: '/test/sky/hall', class: '/platform/idea/Building', data: { extent: '/test/sky/hall', heightM: 15 } },
    { path: '/test/sky/shed', class: '/platform/idea/Building', data: { extent: '/test/sky/shed', heightM: 4 } },
    { path: '/test/sky/boat', class: '/platform/idea/Ship', data: {
      extent: '/test/sky/boat', expanse: '/test/sea', heightM: 20, landmark: true,
    } },
  ]);
  const real = PersistenceManager.get() as unknown as {
    save(c: string, d: Record<string, unknown>): Promise<string>;
    find(c: string, q: Record<string, unknown>, o?: unknown): Promise<Array<Record<string, unknown>>>;
    findById(c: string, id: string): Promise<unknown>;
    delete(c: string, id: string): Promise<void>;
  };
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(withSaveMany({
    isConnected: () => true,
    save: async (c: string, d: Record<string, unknown>) => (c === 'location_graph' ? 'id' : real.save(c, d)),
    find: async (c: string, q: Record<string, unknown>, o?: unknown) => (c === 'location_graph' ? [] : real.find(c, q, o)),
    findById: async (c: string, id: string) => real.findById(c, id),
    delete: async (c: string, id: string) => (c === 'location_graph' ? undefined : real.delete(c, id)),
  }) as unknown as PersistenceManager);
  vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
  makeStuffAtPath(() => new LocationGraphRegistry(), '/platform/idea/LocationGraphRegistry');
  AddressApi._resetRegistryRefForReload();
  makeStuffAtPath(() => new AddressRegistry(), '/platform/idea/AddressRegistry');
  const town = makeStuffAtPath(() => {
    const l = new Locality();
    l.setAddress('skyland/town');
    l.setPosition({ latDeg: 50.02, lonDeg: -4.02 });
    l.setRadiusM(1500);
    return l;
  }, '/stuff/idea/Locality/skyland-town');
  AddressApi.registerLocality(town);
});

afterEach(() => {
  vi.restoreAllMocks();
  AddressApi._resetRegistryRefForReload();
});

/** A high eye west of everything, so curvature admits every mark. */
const eye = (): Vantage => new Vantage(new GeoPosition(50, -4.1), 50);
const paths = (es: { path: string }[]): string[] => es.map((e) => e.path);

describe('the skyline is read off the rows', () => {
  it('⭐ a structure row nobody has loaded is on the skyline', async () => {
    await NavigationApi.skylineReady();
    const sky = NavigationApi.skylineNow(eye());
    expect(paths(sky)).toEqual(expect.arrayContaining(['/test/sky/light', '/test/sky/mill', '/test/sky/hall']));
    expect(StuffApi.findByTemplatePath('/test/sky/light')).toBeUndefined();
    expect(StuffApi.findByTemplatePath('/test/sky/mill')).toBeUndefined();
  });

  it('a point resolves own → sea node → Locality', async () => {
    await NavigationApi.skylineReady();
    const node = new GeoPosition(ORIGIN).atFocus({ rho: 18520, theta: 90 });
    expect(NavigationApi.markPointNow('/test/sky/light')!.lonDeg).toBeCloseTo(node.lonDeg, 6);
    expect(NavigationApi.markPointNow('/test/sky/mill')!.latDeg).toBeCloseTo(50.05, 6);
    expect(NavigationApi.markPointNow('/test/sky/hall')).toBeNull();
    const hall = NavigationApi.skylineNow(eye()).find((e) => e.path === '/test/sky/hall')!;
    expect(hall.at.latDeg).toBeCloseTo(50.02, 6);
  });

  it('a craft is never a mark, and a short building is not worth seeing', async () => {
    await NavigationApi.skylineReady();
    const sky = paths(NavigationApi.skylineNow(eye()));
    expect(sky).not.toContain('/test/sky/boat');
    expect(sky).not.toContain('/test/sky/shed');
  });

  it('carries the light flag and the top above the sea (height + the ground)', async () => {
    await NavigationApi.skylineReady();
    const light = NavigationApi.skylineNow(eye()).find((e) => e.path === '/test/sky/light')!;
    expect(light.showsLight).toBe(true);
    expect(light.landmark).toBe(true);
    // The clear-air reach is the eye's to a 70 m top (30 m + 40 m ground).
    expect(light.clearNm).toBeCloseTo(eye().reachNm(70), 6);
  });

  it('curvature cuts: a low eye far off sees nothing past its reach', async () => {
    await NavigationApi.skylineReady();
    const far = new Vantage(new GeoPosition(50, -5), 2);
    expect(NavigationApi.skylineNow(far)).toEqual([]);
  });

  it('⭐ inside the near radius a mark is listed whatever the curvature, and marked near', async () => {
    await NavigationApi.skylineReady();
    const ground = new Vantage(new GeoPosition(50.02, -4.02), 0);
    const sky = NavigationApi.skylineNow(ground, { nearM: 1500 });
    const hall = sky.find((e) => e.path === '/test/sky/hall');
    expect(hall?.near).toBe(true);
  });

  it('the viewer\'s own structure is never on its own skyline', async () => {
    await NavigationApi.skylineReady();
    expect(paths(NavigationApi.skylineNow(eye(), { own: '/test/sky/mill' }))).not.toContain('/test/sky/mill');
  });
});

describe('prominence (D8) and the handful', () => {
  it('landmarks first, then by how tall each stands in the eye; the rest cut to the dial', async () => {
    await NavigationApi.skylineReady();
    const sky = NavigationApi.skylineNow(eye());
    expect(sky[0]!.path).toBe('/test/sky/light');
    const real = AppApi.setting.bind(AppApi);
    vi.spyOn(AppApi, 'setting').mockImplementation((k: string) => (k === 'perception.skyline.size' ? '1' : real(k)));
    const cut = NavigationApi.skylineNow(eye());
    expect(cut).toHaveLength(2);
    expect(cut[0]!.landmark).toBe(true);
  });
});

describe('kept, and dropped when the world changes', () => {
  it('⭐ a kept skyline is served without recomputing', async () => {
    await NavigationApi.skylineReady();
    const a = NavigationApi.skylineNow(eye(), { keepAs: 'town|52' });
    const b = NavigationApi.skylineNow(eye(), { keepAs: 'town|52' });
    expect(b).toBe(a);
  });

  it('a row saved with a new height changes the next read', async () => {
    await NavigationApi.skylineReady();
    const before = NavigationApi.skylineNow(eye(), { keepAs: 'k' });
    expect(paths(before)).not.toContain('/test/sky/shed');
    rowAt('/test/sky/shed').heightM = 40;
    await NavigationApi.projectRow('/test/sky/shed');
    await NavigationApi.skylineReady();
    expect(paths(NavigationApi.skylineNow(eye(), { keepAs: 'k' }))).toContain('/test/sky/shed');
  });

  it('a row removed leaves the skyline', async () => {
    await NavigationApi.skylineReady();
    NavigationApi.skylineNow(eye(), { keepAs: 'k' });
    store.splice(store.findIndex((d) => d.path === '/test/sky/mill'), 1);
    await NavigationApi.removeRow('/test/sky/mill');
    await NavigationApi.skylineReady();
    expect(paths(NavigationApi.skylineNow(eye(), { keepAs: 'k' }))).not.toContain('/test/sky/mill');
  });

  it('⭐ a minted structure attached at runtime joins the skyline, and leaves it when detached', async () => {
    await NavigationApi.skylineReady();
    NavigationApi.skylineNow(eye(), { keepAs: 'k' });
    const tower = makeStuff(() => new Building());
    tower.setHeightM(60);
    tower.setPosition({ latDeg: 50.03, lonDeg: -4.03 });
    NavigationApi.attachStructure('/test/sky/lots/1#a', tower as never);
    const withTower = NavigationApi.skylineNow(eye(), { keepAs: 'k' });
    expect(withTower.some((e) => e.live === tower)).toBe(true);
    NavigationApi.detachStructure('/test/sky/lots/1#a', tower as never);
    expect(NavigationApi.skylineNow(eye(), { keepAs: 'k' }).some((e) => e.live === tower)).toBe(false);
  });
});
