/**
 * The water tier (maritime B1): sea state DERIVED from wind, fetch and
 * depth with no row authoring it; the gunwale citing the sea cell under
 * its craft; the fishery reading that cell from the bands' stock; the
 * sounding; and the pilot's `told` claims, signed.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WaterExpanse from '../idea/WaterExpanse';
import WaterBand from '../idea/WaterBand';
import FisheryRegistry from '../idea/FisheryRegistry';
import Gunwale from '../thing/Gunwale';
import Pilot from '../agent/Pilot';

const SEA = '/test/sea/grey';
let sea: WaterExpanse;
const live = new Map<string, Stuff>();

function band(key: string, set: (b: WaterBand) => void): WaterBand {
  const b = makeStuffAtPath(() => new WaterBand(), `${SEA}/${key}`);
  set(b);
  live.set(`${SEA}/${key}`, b);
  sea.invalidate();
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  live.clear();
  sea = makeStuffAtPath(() => new WaterExpanse(), SEA);
  live.set(SEA, sea);
  vi.spyOn(Template, 'findDescendants').mockImplementation(async () =>
    [...live.keys()].filter((p) => p.startsWith(`${SEA}/`)).map((path) => ({ path, data: {} }) as unknown as Template),
  );
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
    const s = live.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s as never;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('sea state is derived', () => {
  it('⭐ a long fetch running onto a shoal is rougher than the same wind over deep water', async () => {
    band('deep', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 49, latMaxDeg: 50 });
      b.setFetchKm(150);
      b.setDepthM(80);
    });
    band('bar', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 50, latMaxDeg: 51 });
      b.setFetchKm(150);
      b.setDepthM(4);
    });
    const deep = await sea.seaStateAt(new GeoPosition(49.5, 0), null);
    const shoal = await sea.seaStateAt(new GeoPosition(50.5, 0), null);
    expect(shoal.steep).toBe(true);
    expect(deep.steep).toBe(false);
    expect(shoal.heightM).toBeGreaterThan(deep.heightM);
    expect(await sea.readAt(new GeoPosition(50.5, 0), null)).toMatch(/short and steep/);
  });

  it('the narrow band\'s lean wins: the sea runs from its direction', async () => {
    band('belt', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 49, latMaxDeg: 51 });
      b.setLean({ directionDeg: 0, strengthMps: 0 });
    });
    band('race', (b) => {
      b.setExtent({ kind: 'corridor', from: { latDeg: 50, lonDeg: -1 }, to: { latDeg: 50, lonDeg: 1 }, widthNm: 2 });
      b.setLean({ directionDeg: 270, strengthMps: 8 });
    });
    const s = await sea.seaStateAt(new GeoPosition(50, 0), null);
    expect(s.fromDeg).toBe(270);
    expect(await sea.readAt(new GeoPosition(50, 0), null)).toMatch(/from the west/);
  });

  it('the sounding reads the narrowest band\'s depth, else the sea\'s own', async () => {
    band('bank', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 50, latMaxDeg: 51 });
      b.setDepthM(12);
      b.setBottom('coarse sand and shell');
    });
    expect(await sea.depthAt(new GeoPosition(50.5, 0))).toBe(12);
    expect(await sea.bottomAt(new GeoPosition(50.5, 0))).toBe('coarse sand and shell');
    expect(await sea.depthAt(new GeoPosition(10, 0))).toBe(sea.getDepthM());
  });
});

describe('the gunwale and the sea fishery', () => {
  it('a gunwale cites the 0.1° cell under its craft', () => {
    const g = makeStuffAtPath(() => new Gunwale(), '/test/ship/thing/gunwale');
    const craft = {
      getExpansePosition: () => new GeoPosition(50.237, -4.461),
      getExpanse: () => SEA,
    } as unknown as Stuff;
    (g as unknown as { craftPath: string }).craftPath = '/test/ship/structure';
    vi.spyOn(StuffApi, 'findByTemplatePath').mockReturnValue(craft as never);
    vi.spyOn(MixinApi, 'isPositioned').mockReturnValue(true);
    expect(g.getReachRef()).toBe(`${SEA}@50.2,-4.5`);
  });

  it('⭐ the fishery reads a sea cell from the stock its bands place', async () => {
    band('banks', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 50, latMaxDeg: 51 });
      b.setStock({ '/test/species/herring': 0.5 });
    });
    const reg = makeStuffAtPath(() => new FisheryRegistry(), '/test/fishery');
    const herring = {
      getHabitat: () => ({ abundance: 1, role: 'forage', fightRating: 1 }),
      getTemplatePath: () => '/test/species/herring',
      fitIn: () => ({ fit: 0, limiting: null }),
      getCommonNames: () => ['herring'],
    };
    vi.spyOn(reg as unknown as { species: () => Promise<unknown[]> }, 'species').mockResolvedValue([herring]);
    vi.spyOn(reg, 'read').mockResolvedValue(null);
    const standing = await reg.standingAt(`${SEA}@50.5,0.0`, 0);
    expect(standing?.species).toHaveLength(1);
    expect(standing?.species[0]!.capacity).toBe(20);
    expect(standing?.water.salinityPpt).toBe(35);
    expect(await reg.standingAt(`${SEA}@10.0,0.0`, 0).then((s) => s?.species.length)).toBe(0);
  });
});

describe('the pilot', () => {
  it('a pilot\'s knowledge is written as told claims, signed with their name', async () => {
    const pilot = makeStuffAtPath(() => new Pilot(), '/test/pilot');
    pilot.setOf(SEA);
    pilot.setEntries([{ kind: 'band', path: `${SEA}/westerlies`, name: 'the Westerlies', where: 'ten miles south of the bar' }]);
    const reader = {
      keepsMaps: () => true,
      mapOwnerKey: () => '/platform/agent/Avatar/reader',
    } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isCartographer').mockImplementation(((x: unknown) => x === reader) as never);
    const record = vi.spyOn(NavigationApi, 'recordPlace').mockResolvedValue();
    vi.spyOn(NavigationApi, 'mapNow').mockReturnValue(5);
    expect(await pilot.writeClaimsFor(reader, { by: '/test/pilot' })).toBe(1);
    const claims = record.mock.calls[0]![2];
    expect(claims[0]).toMatchObject({ kind: 'band', channel: 'told', toldBy: '/test/pilot', where: 'ten miles south of the bar' });
  });
});
