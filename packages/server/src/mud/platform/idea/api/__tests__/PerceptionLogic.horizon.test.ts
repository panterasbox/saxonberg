import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianZone from '../../location/CartesianZone';
import Location from '../../../../lib/location/Location';
import Thing from '../../../thing/Thing';
import Structure from '../../Structure';
import Ship from '../../Ship';
import Locality from '../../Locality';
import AddressRegistry from '../../AddressRegistry';
import { Template } from '../../../../lib/stuff/Template';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { BiomeApi } from '../../../../api/biome';
import { WeatherApi } from '../../../../api/weather';
import { CelestialApi } from '../../../../api/celestial';
import { AddressApi } from '../../../../api/address';
import { Expanse } from '../../../../lib/expanse/Expanse';
import { GeoPosition } from '../../../../lib/expanse/GeoPosition';
import { MqlApi } from '../../../../api/mql';
import { PerceptionApi } from '../../../../api/perception';
import { ContainmentApi } from '../../../../api/containment';
import { attachGraph } from '../../../../lib/location/__tests__/attachments-fixture';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

/**
 * ⭐⭐ The horizon — ONE rule (geography D3), SYNCHRONOUS over warm state.
 * Where the viewer stands on the chart and how high their eye is decide
 * it: the kept skyline (what stands still, read off the rows) filtered by
 * the weather, the night and the place's `block`; and the craft of the sea
 * the viewer is on or `reach`es, read at the act. Inside the viewer's own
 * Locality a structure is *close by*, with no direction invented.
 *
 * Fixture world (all fictional): the town of Pell at 42°N 8.5°W, radius
 * 1500 m; its clock tower stands there (no point of its own); a lit light
 * 12 nm north-east; an unlit mill 2 nm due east.
 */

class TestExpanse extends Expanse {}

const PELL = new GeoPosition(42, -8.5);
const LIGHT_AT = PELL.destination(45, 12);
const MILL_AT = PELL.destination(90, 2);

let sky = true;
let skyType: string | null = 'clear';
let skyFactor = 1;
const live = new Map<string, Stuff>();
let graph: ReturnType<typeof attachGraph>;

async function zoneAt(path: string, address: string | null, rooms: Array<[number, number, number]>, elevation = 0): Promise<CartesianZone> {
  const z = makeStuffAtPath(() => new CartesianZone(), path);
  z.setCellSize(3);
  z.setElevation(elevation);
  if (address) z.setAddress(address);
  live.set(path, z);
  for (const [i, [x, y, zz]] of rooms.entries()) {
    const loc = makeStuffAtPath(() => new Location(), `${path}/room-${i}`);
    Stuff._stampZone(loc, z as never);
    await loc.setCoords({ x, y, z: zz });
    live.set(`${path}/room-${i}`, loc);
  }
  return z;
}

function structureAt(path: string, keywords: string[], opts: { landmark?: boolean; showsLight?: boolean; extent?: string } = {}): Structure {
  const s = makeStuffAtPath(() => new Structure(), path);
  s.setExtent(opts.extent ?? path);
  s.setKeywords(keywords);
  s.setShortDescription(keywords[0]!);
  s.setLandmark(opts.landmark === true);
  s.setShowsLight(opts.showsLight === true);
  live.set(path, s);
  return s;
}

async function viewerIn(roomPath: string): Promise<Stuff> {
  const room = live.get(roomPath) as Location;
  await room.resolveWeatherLocality();
  const v = makeStuff(() => new Thing());
  ContainmentApi.move(v as never, room as never);
  return v;
}

const names = (v: { things: { stuff: Stuff }[] }): string[] =>
  v.things.map((t) => t.stuff.getTemplatePath() ?? '');

beforeEach(async () => {
  StuffApi.clearAll();
  live.clear();
  graph = attachGraph({});
  live.set('/platform/idea/LocationGraphRegistry', graph as unknown as Stuff);
  AddressApi._resetRegistryRefForReload();
  makeStuffAtPath(() => new AddressRegistry(), '/platform/idea/AddressRegistry');
  const pell = makeStuffAtPath(() => {
    const l = new Locality();
    l.setAddress('realm/pell');
    l.setPosition(PELL.toJSON());
    l.setRadiusM(1500);
    return l;
  }, '/stuff/idea/Locality/pell');
  AddressApi.registerLocality(pell);

  sky = true;
  skyType = 'clear';
  skyFactor = 1;
  vi.spyOn(BiomeApi, 'isSkyExposed').mockImplementation(() => sky);
  vi.spyOn(WeatherApi, 'peekSkyType').mockImplementation(() => skyType as never);
  vi.spyOn(CelestialApi, 'skyFactorAt').mockImplementation(() => skyFactor);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
    const s = live.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s as never;
  });

  await zoneAt('/t/pell', 'realm/pell', [[0, 0, 0], [1, 0, 0], [0, 0, 10]]);
  structureAt('/t/pell/tower', ['tower', 'clock'], { landmark: true });
  structureAt('/t/rock/light', ['light'], { landmark: true, showsLight: true });
  structureAt('/t/mill', ['mill'], { extent: '/t/pell/room-1' });
  graph.marks = [
    { path: '/t/pell/tower', at: PELL, heightM: 25, landmark: true },
    { path: '/t/rock/light', at: LIGHT_AT, heightM: 30, landmark: true, showsLight: true },
    { path: '/t/mill', at: MILL_AT, heightM: 20 },
  ];
});

afterEach(() => {
  vi.restoreAllMocks();
  AddressApi._resetRegistryRefForReload();
});

describe('the skyline ashore', () => {
  it('⭐ inside your own Locality the tower is close by; the light has a direction; landmarks first', async () => {
    const view = PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0'));
    expect(view.atSea).toBe(false);
    const tower = view.things.find((t) => t.stuff.getTemplatePath() === '/t/pell/tower')!;
    expect(tower.closeBy).toBe(true);
    expect(tower.bearingDeg).toBeNull();
    const light = view.things.find((t) => t.stuff.getTemplatePath() === '/t/rock/light')!;
    expect(light.bearingDeg).toBeCloseTo(45, 0);
    expect(light.rangeNm).toBeCloseTo(12, 0);
    expect(light.fixed).toBe(true);
    expect(names(view).slice(0, 2).sort()).toEqual(['/t/pell/tower', '/t/rock/light']);
  });

  it('an interior (no sky) sees nothing beyond its walls', async () => {
    sky = false;
    expect(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')).things).toEqual([]);
  });

  it('⭐ a place on no chart sees no skyline (a test world) — by construction', async () => {
    await zoneAt('/t/nowhere', 'elsewhere', [[0, 0, 0]]);
    expect(PerceptionApi.horizonFor(await viewerIn('/t/nowhere/room-0')).things).toEqual([]);
  });

  it('⭐ a higher room sees what a lower one cannot — the eye is the total height', async () => {
    // A low hut 12 nm west: under a standing eye's horizon, over a 30 m one.
    structureAt('/t/hut', ['hut']);
    graph.marks.push({ path: '/t/hut', at: PELL.destination(270, 12), heightM: 10 });
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')))).not.toContain('/t/hut');
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-2')))).toContain('/t/hut');
  });

  it('fog cuts the far light but not what is close by', async () => {
    skyType = 'fog';
    const view = PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0'));
    expect(names(view)).toContain('/t/pell/tower');
    expect(names(view)).not.toContain('/t/rock/light');
  });

  it('⭐ by night only what shows a light is seen', async () => {
    skyFactor = 0;
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')))).toEqual(['/t/rock/light']);
  });

  it('⛔ you never see the structure you are standing in', async () => {
    graph.table['/t/pell/room-1'] = [['/t/mill', 'structure']];
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-1')))).not.toContain('/t/mill');
  });
});

describe('the author\'s word: block and reach (D5)', () => {
  it('block: all — nothing from in here; the room overrides its zone', async () => {
    (live.get('/t/pell/room-1') as Location).setHorizon({ block: 'all' });
    expect(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-1')).things).toEqual([]);
    expect(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')).things.length).toBeGreaterThan(0);
  });

  it('a blocked sector hides what lies past its distance, and nothing else', async () => {
    (live.get('/t/pell') as CartesianZone).setHorizon({ block: [{ from: 20, to: 70, beyondNm: 5 }] });
    const seen = names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')));
    expect(seen).not.toContain('/t/rock/light'); // 45°, 12 nm — behind the ridge
    expect(seen).toContain('/t/mill');           // 90° — outside the sector
    expect(seen).toContain('/t/pell/tower');     // close by has no bearing to block
  });

  it('⚠ the retired list form and an unknown key throw', () => {
    const z = live.get('/t/pell') as CartesianZone;
    expect(() => z.setHorizon(['/t/elsewhere'] as never)).toThrow(RangeError);
    expect(() => z.setHorizon({ look: 'all' } as never)).toThrow(RangeError);
  });

  it('reach: a structure is named whatever curvature says', async () => {
    structureAt('/t/far-spire', ['spire']);
    graph.marks.push({ path: '/t/far-spire', at: PELL.destination(0, 80), heightM: 5 });
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')))).not.toContain('/t/far-spire');
    (live.get('/t/pell') as CartesianZone).setHorizon({ reach: ['/t/far-spire'] });
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')))).toContain('/t/far-spire');
  });
});

describe('the MQL seed', () => {
  it('⭐ `horizon` is a set and `~horizon:light` a name', async () => {
    const v = await viewerIn('/t/pell/room-0');
    const all = MqlApi.resolveMany('~horizon', { commandGiver: v as never, scope: '' });
    expect(all.isSet).toBe(true);
    expect(all.stuff.map((s) => s.getTemplatePath())).toContain('/t/rock/light');
    const one = MqlApi.resolveOne('~horizon:light', { commandGiver: v as never, scope: '' });
    expect(one.stuff?.getTemplatePath()).toBe('/t/rock/light');
  });
});

/* ───────────────────────────── the sea ───────────────────────────── */

async function sea(): Promise<TestExpanse> {
  const s = makeStuffAtPath(() => new TestExpanse(), '/t/sea');
  s.setOrigin(PELL);
  s.setTrafficDefault(0);
  live.set('/t/sea', s);
  vi.spyOn(Template, 'findDescendants').mockResolvedValue([]);
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  await s.nodes();
  return s;
}

function shipAt(path: string, at: GeoPosition, opts: { lit?: boolean; extent?: string } = {}): Ship {
  const s = makeStuffAtPath(() => new Ship(), path);
  const extent = opts.extent ?? path;
  s.setExtent(extent);
  // A ship's rooms are told by her warren (zone-instancing D12); this
  // fixture's rooms are plain rooms under her extent, so membership is
  // answered by the path here.
  vi.spyOn(s, 'hasMember').mockImplementation((p: string) => p === extent || p.startsWith(`${extent}/`));
  s.setHeightM(18);
  s.setKeywords([path.split('/').pop()!]);
  s.setShortDescription(path.split('/').pop()!);
  s.setShowsLight(opts.lit === true);
  s.setExpanse('/t/sea');
  s.setExpansePosition(at);
  s.setDeckHeightM(3);
  live.set(path, s);
  (live.get('/t/sea') as TestExpanse).register(s);
  return s;
}

describe('the horizon afloat', () => {
  it('⭐ from the deck: the craft in reach, never her own, and the land\'s skyline too', async () => {
    await sea();
    await zoneAt('/t/ship', null, [[0, 0, 0]]);
    const here = PELL.destination(45, 10);
    shipAt('/t/ship/structure', here, { extent: '/t/ship' });
    graph.table['/t/ship'] = [['/t/ship/structure', 'structure']];
    shipAt('/t/brig', here.destination(90, 3));
    const view = PerceptionApi.horizonFor(await viewerIn('/t/ship/room-0'));
    expect(view.atSea).toBe(true);
    expect(names(view)).toContain('/t/brig');
    expect(names(view)).not.toContain('/t/ship/structure');
    // The light, 5 nm on: a landmark the deck raises, with a direction.
    const light = view.things.find((t) => t.stuff.getTemplatePath() === '/t/rock/light')!;
    expect(light.bearingDeg).toBeCloseTo(45, 0);
  });

  it('⭐ by night an unlit ship is not seen; a lit one is', async () => {
    await sea();
    await zoneAt('/t/ship', null, [[0, 0, 0]]);
    const here = PELL.destination(45, 10);
    shipAt('/t/ship/structure', here, { extent: '/t/ship' });
    graph.table['/t/ship'] = [['/t/ship/structure', 'structure']];
    shipAt('/t/brig', here.destination(90, 3));
    shipAt('/t/packet', here.destination(180, 3), { lit: true });
    skyFactor = 0;
    const seen = names(PerceptionApi.horizonFor(await viewerIn('/t/ship/room-0')));
    expect(seen).not.toContain('/t/brig');
    expect(seen).toContain('/t/packet');
  });

  it('below decks there is no horizon', async () => {
    await sea();
    await zoneAt('/t/ship', null, [[0, 0, 0]]);
    shipAt('/t/ship/structure', PELL.destination(45, 10), { extent: '/t/ship' });
    graph.table['/t/ship'] = [['/t/ship/structure', 'structure']];
    sky = false;
    const view = PerceptionApi.horizonFor(await viewerIn('/t/ship/room-0'));
    expect(view.atSea).toBe(true);
    expect(view.things).toEqual([]);
  });

  it('⭐ a shore place sees a sea\'s craft only when it reaches the sea', async () => {
    await sea();
    shipAt('/t/brig', MILL_AT.destination(90, 1));
    expect(names(PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0')))).not.toContain('/t/brig');
    (live.get('/t/pell') as CartesianZone).setHorizon({ reach: ['/t/sea'] });
    const view = PerceptionApi.horizonFor(await viewerIn('/t/pell/room-0'));
    expect(names(view)).toContain('/t/brig');
    expect(view.things.find((t) => t.stuff.getTemplatePath() === '/t/brig')!.bearingDeg).toBeCloseTo(90, 0);
  });
});
