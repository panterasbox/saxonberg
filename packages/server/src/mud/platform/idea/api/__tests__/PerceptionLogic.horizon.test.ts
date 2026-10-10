import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Thing from '../../../thing/Thing';
import Structure from '../../Structure';
import StructureCatalogue from '../../StructureCatalogue';
import { Template } from '../../../../lib/stuff/Template';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { BiomeApi } from '../../../../api/biome';
import { ZoneApi } from '../../../../api/zone';
import { ExpanseApi } from '../../../../api/expanse';
import { MqlApi } from '../../../../api/mql';
import { PerceptionApi } from '../../../../api/perception';
import { ContainmentApi } from '../../../../api/containment';
import { TemplatePaths } from '../../../../lib/paths';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

/**
 * The horizon (maritime R4): ashore, zones name zones and the rest is
 * derived — open sky, a structure's height against the zones' size in
 * metres; afloat, the expanse's contacts. The MQL seed reads the result.
 */

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

function structureAt(path: string, extent: string, heightM: number, keywords: string[]): Structure {
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
  sky = true;
  vi.spyOn(BiomeApi, 'isSkyExposed').mockImplementation(() => sky);
  vi.spyOn(ZoneApi, 'getEnclosingZone').mockResolvedValue(null);
  vi.spyOn(ExpanseApi, 'craftAt').mockResolvedValue(null);
  // A 30 m avenue and a 30 m town: from the avenue the town is ~30 m off.
  avenue = zoneAt('/t/avenue', [[0, 0], [9, 0]]);
  zoneAt('/t/town', [[0, 0], [9, 0]]);
  structureAt('/t/town/tower', '/t/town/keep', 25, ['tower', 'clock']);
  structureAt('/t/town/shed', '/t/town/room-1', 1, ['shed']);
  const cat = makeStuffAtPath(() => new StructureCatalogue(), TemplatePaths.structureCatalogue);
  live.set(TemplatePaths.structureCatalogue, cat);
  vi.spyOn(Template, 'findByClass').mockResolvedValue([
    { path: '/t/town/tower', data: { extent: '/t/town/keep', landmark: true } },
    { path: '/t/town/shed', data: { extent: '/t/town/room-1' } },
  ] as unknown as Template[]);
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
    const view = await PerceptionApi.horizonFor(v);
    expect(view.atSea).toBe(false);
    // 25 m × 20 clears 30 m; a 1 m shed × 20 = 20 m does not.
    expect(names(view)).toEqual(['/t/town/tower']);
  });

  it('an interior (no sky) sees nothing beyond its walls', async () => {
    sky = false;
    const view = await PerceptionApi.horizonFor(viewerIn('/t/avenue/room-0'));
    expect(view.things).toEqual([]);
  });

  it('an authored [] is an answer — the room overrides its zone', async () => {
    const room = live.get('/t/avenue/room-1') as CartesianLocation;
    room.setHorizon([]);
    expect((await PerceptionApi.horizonFor(viewerIn('/t/avenue/room-1'))).things).toEqual([]);
    expect(names(await PerceptionApi.horizonFor(viewerIn('/t/avenue/room-0')))).toEqual(['/t/town/tower']);
  });

  it('nothing named, nothing scanned', async () => {
    avenue.setHorizon(null);
    expect((await PerceptionApi.horizonFor(viewerIn('/t/avenue/room-0'))).things).toEqual([]);
  });

  it('⛔ you never see the structure you are standing in', async () => {
    (live.get('/t/town') as CartesianZone).setHorizon(['/t/town']);
    const view = await PerceptionApi.horizonFor(viewerIn('/t/town/room-1'));
    // Inside the shed's extent: the tower (half the town off) only — the
    // shed, low as it is, would clear 15 m from anywhere else in town.
    expect(names(view)).toEqual(['/t/town/tower']);
  });

  it('⭐ the MQL seed reads it — `horizon` and `horizon:tower` — and a bare `horizon` names a whole scope', async () => {
    const v = viewerIn('/t/avenue/room-0');
    await MqlApi.prepare('horizon:tower', v);
    const all = MqlApi.resolveMany('horizon', { commandGiver: v as never, scope: '' });
    expect(all.stuff.map((s) => s.getTemplatePath())).toEqual(['/t/town/tower']);
    const one = MqlApi.resolveOne('horizon:clock', { commandGiver: v as never, scope: '' });
    expect(one.stuff?.getTemplatePath()).toBe('/t/town/tower');
    expect(MqlApi.namesWholeScope(' Horizon ')).toBe(true);
    expect(MqlApi.namesWholeScope('horizon:tower')).toBe(false);
  });
});

describe('a height ashore that names a sea (R11)', () => {
  it('⭐ looks out over it from the nearest landing, its eye at the zone\'s elevation', async () => {
    const head = zoneAt('/t/head', [[0, 0]], 20);
    head.setElevation(40);
    head.setHorizon(['/t/sea']);
    const light = structureAt('/t/rock/structure', '/t/rock', 30, ['light']);
    const sightingsFrom = vi.fn().mockResolvedValue([
      { craft: light, name: 'the light', bearingDeg: 50, rangeNm: 18, channel: 'visual', fixed: true },
    ]);
    const shorePositionFor = vi.fn().mockResolvedValue({ latDeg: 42, lonDeg: -8.4 });
    vi.spyOn(ExpanseApi, 'expanse').mockImplementation(async (p: string) =>
      (p === '/t/sea' ? { shorePositionFor, sightingsFrom } : null) as never,
    );
    const view = await PerceptionApi.horizonFor(viewerIn('/t/head/room-0'));
    expect(names(view)).toEqual(['/t/rock/structure']);
    expect(view.things[0]!.rangeNm).toBe(18);
    expect(shorePositionFor).toHaveBeenCalledWith('/t/head/room-0');
    expect(sightingsFrom.mock.calls[0]![1]).toBe(42); // 40 m of headland + a 2 m eye
  });
});

describe('the horizon afloat', () => {
  it('reports the expanse\'s contacts from the viewer\'s eye — craft as things, traffic in words', async () => {
    const other = structureAt('/t/sea/brig', '/t/brig', 18, ['brig']);
    const contactsFrom = vi.fn().mockResolvedValue([
      { craft: other, name: 'the brig', bearingDeg: 45, rangeNm: 3, channel: 'visual', fixed: false },
      { craft: null, name: 'a fishing boat', bearingDeg: 180, rangeNm: 5, channel: 'visual', fixed: false },
    ]);
    const craft = structureAt('/t/sea/ship', '/t/ship', 18, ['ship']);
    craft.setExpansePosition({ latDeg: 42, lonDeg: -8 });
    vi.spyOn(craft, 'liveExpanse').mockResolvedValue({ contactsFrom } as never);
    vi.spyOn(ExpanseApi, 'craftAt').mockResolvedValue(craft as never);
    const v = viewerIn('/t/avenue/room-0');
    const view = await PerceptionApi.horizonFor(v);
    expect(view.atSea).toBe(true);
    expect(names(view)).toEqual(['/t/sea/brig']);
    expect(view.things[0]!.bearingDeg).toBe(45);
    expect(view.traffic).toEqual([{ name: 'a fishing boat', bearingDeg: 180, rangeNm: 5 }]);
    expect(contactsFrom.mock.calls[0]![1]).toBe(v);
  });
});
