import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Thing from '../../../thing/Thing';
import Structure from '../../Structure';
import { Template } from '../../../../lib/stuff/Template';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { BiomeApi } from '../../../../api/biome';
import { WeatherApi } from '../../../../api/weather';
import ExpanseNode from '../../ExpanseNode';
import { Expanse } from '../../../../lib/expanse/Expanse';
import { GeoPosition } from '../../../../lib/expanse/GeoPosition';
import { MqlApi } from '../../../../api/mql';
import { PerceptionApi } from '../../../../api/perception';
import { ContainmentApi } from '../../../../api/containment';
import StructureCatalogue, { type StructureRow } from '../../StructureCatalogue';
import { TemplatePaths } from '../../../../lib/paths';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

/**
 * The horizon (maritime R4), SYNCHRONOUS over resident state: ashore,
 * zones name zones and the rest is derived — open sky, a structure's
 * height against the zones' size in metres; afloat (or from a height
 * naming a sea), the resident craft from the viewer's eye, through the
 * cached sky. The MQL seed reads it directly — nothing to call first.
 */

class TestExpanse extends Expanse {}

let sky = true;
const live = new Map<string, Stuff>();

function zoneAt(path: string, cells: Array<[number, number]>, cellSize = 3): CartesianZone {
  const z = makeStuffAtPath(() => new CartesianZone(), path);
  z.setCellSize(cellSize);
  cells.forEach(([x, y], i) => {
    const loc = makeStuffAtPath(() => new CartesianLocation(), `${path}/room-${i}`);
    z.addLocation(loc, x, y, 0);
    live.set(`${path}/room-${i}`, loc);
  });
  live.set(path, z);
  return z;
}

/** The structure catalogue's rows, as the fixture authors them. */
const rows: StructureRow[] = [];

function structureAt(path: string, extent: string, heightM: number, keywords: string[]): Structure {
  rows.push({ path, name: keywords[0]!, extent, entrance: null, landmark: false, heightM, expanse: null, deckHeightM: null });
  const s = makeStuffAtPath(() => new Structure(), path);
  s.setExtent(extent);
  s.setHeightM(heightM);
  s.setKeywords(keywords);
  s.setShortDescription(keywords[0]!);
  live.set(path, s);
  return s;
}

function viewerIn(roomPath: string): Stuff {
  const v = makeStuff(() => new Thing());
  ContainmentApi.move(v as never, live.get(roomPath) as never);
  return v;
}

let avenue: CartesianZone;

beforeEach(() => {
  StuffApi.clearAll();
  live.clear();
  rows.length = 0;
  // ⭐ The scope that answers *which building is this room in* and *what
  // stands in this zone* — the horizon asks it, never the registry.
  const cat = makeStuffAtPath(() => new StructureCatalogue(), TemplatePaths.structureCatalogue);
  vi.spyOn(cat, 'peekStructureOf').mockImplementation((place: string) => {
    let best: StructureRow | null = null;
    for (const r of rows) {
      const inside = place === r.extent || place.startsWith(`${r.extent}/`);
      if (inside && (best === null || r.extent.length > best.extent.length)) best = r;
    }
    return best;
  });
  vi.spyOn(cat, 'peekStructuresWithin').mockImplementation((zone: string) =>
    rows.filter((r) => r.extent === zone || r.extent.startsWith(`${zone}/`)),
  );
  sky = true;
  vi.spyOn(BiomeApi, 'isSkyExposed').mockImplementation(() => sky);
  vi.spyOn(WeatherApi, 'peekSkyType').mockReturnValue('clear');
  // A 30 m avenue and a 30 m town: from the avenue the town is ~30 m off.
  avenue = zoneAt('/t/avenue', [[0, 0], [9, 0]]);
  zoneAt('/t/town', [[0, 0], [9, 0]]);
  structureAt('/t/town/tower', '/t/town/keep', 25, ['tower', 'clock']);
  structureAt('/t/town/shed', '/t/town/room-1', 1, ['shed']);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
    const s = live.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s as never;
  });
  avenue.setHorizon(['/t/town']);
});

afterEach(() => vi.restoreAllMocks());

const names = (v: { things: { stuff: Stuff }[] }): string[] =>
  v.things.map((t) => t.stuff.getTemplatePath() ?? '').sort();

describe('the horizon ashore', () => {
  it('⭐ a named zone\'s structure is in view when its height clears the distance; a low one is not', async () => {
    const v = viewerIn('/t/avenue/room-0');
    const view = PerceptionApi.horizonFor(v);
    expect(view.atSea).toBe(false);
    // 25 m × 20 clears 30 m; a 1 m shed × 20 = 20 m does not.
    expect(names(view)).toEqual(['/t/town/tower']);
  });

  it('an interior (no sky) sees nothing beyond its walls', async () => {
    sky = false;
    const view = PerceptionApi.horizonFor(viewerIn('/t/avenue/room-0'));
    expect(view.things).toEqual([]);
  });

  it('an authored [] is an answer — the room overrides its zone', async () => {
    const room = live.get('/t/avenue/room-1') as CartesianLocation;
    room.setHorizon([]);
    expect((PerceptionApi.horizonFor(viewerIn('/t/avenue/room-1'))).things).toEqual([]);
    expect(names(PerceptionApi.horizonFor(viewerIn('/t/avenue/room-0')))).toEqual(['/t/town/tower']);
  });

  it('nothing named, nothing scanned', async () => {
    avenue.setHorizon(null);
    expect((PerceptionApi.horizonFor(viewerIn('/t/avenue/room-0'))).things).toEqual([]);
  });

  it('⛔ you never see the structure you are standing in', async () => {
    (live.get('/t/town') as CartesianZone).setHorizon(['/t/town']);
    const view = PerceptionApi.horizonFor(viewerIn('/t/town/room-1'));
    // Inside the shed's extent: the tower (half the town off) only — the
    // shed, low as it is, would clear 15 m from anywhere else in town.
    expect(names(view)).toEqual(['/t/town/tower']);
  });

  it('⭐ the MQL seed reads it — `horizon` and `horizon:tower` — a bare `horizon` is a SET, `horizon:clock` a name', async () => {
    const v = viewerIn('/t/avenue/room-0');
    const all = MqlApi.resolveMany('horizon', { commandGiver: v as never, scope: '' });
    expect(all.stuff.map((s) => s.getTemplatePath())).toEqual(['/t/town/tower']);
    const one = MqlApi.resolveOne('horizon:clock', { commandGiver: v as never, scope: '' });
    expect(one.stuff?.getTemplatePath()).toBe('/t/town/tower');
    // A bare `horizon` names a SET; `horizon:clock` a name (maritime revision 2).
    expect(all.isSet).toBe(true);
    expect(one.isSet).toBeUndefined();
  });
});

/** A sea at `/t/sea` with one landing node, compiled. */
async function seaWithLanding(dest: string): Promise<TestExpanse> {
  const sea = makeStuffAtPath(() => new TestExpanse(), '/t/sea');
  sea.setTrafficDefault(0);
  live.set('/t/sea', sea);
  const node = makeStuffAtPath(() => new ExpanseNode(), '/t/sea/landing');
  node.setKind('place');
  node.setDestination(dest);
  node.setExpansePosition({ latDeg: 42, lonDeg: -8.4 });
  live.set('/t/sea/landing', node);
  vi.spyOn(Template, 'findDescendants').mockResolvedValue([
    { path: '/t/sea/landing', data: {} },
  ] as unknown as Template[]);
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  await sea.nodes();
  return sea;
}

/** A positioned structure on `/t/sea`. */
function afloat(path: string, extent: string, heightM: number, at: GeoPosition, deck: number | null): Structure {
  const s = structureAt(path, extent, heightM, [path.split('/').pop()!]);
  s.setExpanse('/t/sea');
  s.setExpansePosition(at);
  s.setDeckHeightM(deck);
  // On the sea's own books: a ship is registered craft, a building with no
  // deck (a light) is one of its landmarks — what its compile would do.
  const sea = live.get('/t/sea') as unknown as { register(c: unknown): void; landmarks: unknown[] };
  if (deck === null) sea.landmarks.push(s);
  else sea.register(s);
  return s;
}

describe('a height ashore that names a sea (R11)', () => {
  it('⭐ looks out over it from the nearest landing — the height decides what it raises', async () => {
    await seaWithLanding('/t/head/room-0');
    const head = zoneAt('/t/head', [[0, 0]], 20);
    head.setHorizon(['/t/sea']);
    // 18 nm out: a 30 m light needs an eye of ~9 m to raise it.
    afloat('/t/rock/structure', '/t/rock', 30, new GeoPosition(42, -8.4).destination(45, 18), null);
    head.setElevation(2);
    expect(names(PerceptionApi.horizonFor(viewerIn('/t/head/room-0')))).toEqual([]);
    head.setElevation(45);
    const view = PerceptionApi.horizonFor(viewerIn('/t/head/room-0'));
    expect(names(view)).toEqual(['/t/rock/structure']);
    expect(view.things[0]!.rangeNm).toBeCloseTo(18, 0);
  });
});

describe('the horizon afloat', () => {
  it('⭐ from the viewer\'s eye over the resident craft on her sea — and fog cuts it to a tenth', async () => {
    await seaWithLanding('/t/elsewhere/landing');
    zoneAt('/t/ship', [[0, 0]]);
    const ship = afloat('/t/ship/structure', '/t/ship', 18, new GeoPosition(42, -8), 3);
    const brig = afloat('/t/brig/structure', '/t/brig', 18, new GeoPosition(42, -8).destination(90, 3), 3);
    void ship;
    let type: string | null = 'clear';
    vi.spyOn(WeatherApi, 'peekSkyType').mockImplementation(() => type as never);
    const v = viewerIn('/t/ship/room-0');
    const view = PerceptionApi.horizonFor(v);
    expect(view.atSea).toBe(true);
    expect(names(view)).toEqual(['/t/brig/structure']); // never her own structure
    expect(view.things[0]!.bearingDeg).toBeCloseTo(90, 0);
    type = 'fog';
    expect(PerceptionApi.horizonFor(v).things).toEqual([]);
    type = null; // never read: counted clear this once
    expect(names(PerceptionApi.horizonFor(v))).toEqual(['/t/brig/structure']);
    void brig;
  });

  it('below decks there is no horizon', async () => {
    await seaWithLanding('/t/elsewhere/landing');
    zoneAt('/t/ship', [[0, 0]]);
    afloat('/t/ship/structure', '/t/ship', 18, new GeoPosition(42, -8), 3);
    afloat('/t/brig/structure', '/t/brig', 18, new GeoPosition(42, -8).destination(90, 3), 3);
    sky = false;
    const view = PerceptionApi.horizonFor(viewerIn('/t/ship/room-0'));
    expect(view.atSea).toBe(true);
    expect(view.things).toEqual([]);
  });
});
