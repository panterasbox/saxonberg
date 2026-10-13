import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Expanse } from '../Expanse';
import { GeoPosition } from '../GeoPosition';
import Band from '../../../platform/idea/Band';
import ExpanseNode from '../../../platform/idea/ExpanseNode';
import Ship from '../../../platform/idea/Ship';
import { Template } from '../../stuff/Template';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { ExpanseApi } from '../../../api/expanse';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { WeatherApi } from '../../../api/weather';
import { MixinApi } from '../../../api/mixin';

/** The sea's origin — what the graph's points are measured from. */
const ORIGIN = new GeoPosition(50, -4);
/** A chart point as the graph authors it: range (m) and bearing from the origin. */
function focusAt(latDeg: number, lonDeg: number): { rho: number; theta: number } {
  const p = new GeoPosition(latDeg, lonDeg);
  return { rho: ORIGIN.distanceNm(p) * 1852, theta: ORIGIN.bearingTo(p) };
}
/** A belt between two chart corners, authored relative to the origin. */
function belt(latMin: number, latMax: number, lonMin = ORIGIN.lonDeg - 30, lonMax = ORIGIN.lonDeg + 30) {
  return { kind: 'belt' as const, from: focusAt(latMin, lonMin), to: focusAt(latMax, lonMax) };
}
/** A corridor between two chart points, authored relative to the origin. */
function corridor(from: [number, number], to: [number, number], widthNm: number) {
  return { kind: 'corridor' as const, from: focusAt(...from), to: focusAt(...to), widthM: widthNm * 1852 };
}


/**
 * The frame (maritime A2) over synthetic rows: composition at a position,
 * nodes by keyword, the seeded traffic field, per-channel co-presence.
 */
class TestExpanse extends Expanse {}

const SEA = '/test/sea';
let sea: TestExpanse;
const live = new Map<string, Stuff>();

function band(key: string, set: (b: Band) => void): Band {
  const b = makeStuffAtPath(() => new Band(), `${SEA}/${key}`);
  set(b);
  live.set(`${SEA}/${key}`, b);
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  live.clear();
  sea = makeStuffAtPath(() => new TestExpanse(), SEA);
  sea.setOrigin(ORIGIN);
  live.set(SEA, sea);
  vi.spyOn(Template, 'findDescendants').mockImplementation(async () =>
    [...live.keys()].filter((p) => p !== SEA).map((path) => ({ path, data: {} }) as unknown as Template),
  );
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
    const s = live.get(path);
    if (!s) throw new Error(`no fixture at ${path}`);
    return s as never;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('Expanse.fieldAt — the narrowest wins, placed things union', () => {
  beforeEach(() => {
    band('the-haar', (b) => {
      b.setExtent(belt(49, 51));
      b.setLean({ directionDeg: 200, strengthMps: 1 });
      b.setHazards(['/test/hazard/fog']);
      b.setStock({ herring: 0.4, mackerel: 0.2 });
    });
    band('the-race', (b) => {
      b.setExtent(corridor([50, -5], [50, -4], 2));
      b.setLean({ directionDeg: 270, strengthMps: 9 });
      b.setHazards(['/test/hazard/overfalls']);
      b.setStock({ herring: 0.9 });
    });
  });

  it('inside both, the race wins the field and the hazards and stock union', async () => {
    const f = await sea.fieldAt(new GeoPosition(50, -4.5));
    expect(f.band?.getTemplatePath()).toBe(`${SEA}/the-race`);
    expect(f.band?.getLean()?.strengthMps).toBe(9);
    expect(f.hazards.sort()).toEqual(['/test/hazard/fog', '/test/hazard/overfalls']);
    expect(f.stock).toEqual({ herring: 0.9, mackerel: 0.2 });
  });

  it('⭐ a belt that joins nothing behaves exactly as a band does', async () => {
    const f = await sea.fieldAt(new GeoPosition(49.5, 10));
    expect(f.band?.getTemplatePath()).toBe(`${SEA}/the-haar`);
  });

  it('outside every band there is no band — and the sea is still crossable', async () => {
    const f = await sea.fieldAt(new GeoPosition(10, 10));
    expect(f.band).toBeNull();
    expect(f.traffic).toBe(sea.getTrafficDefault());
  });
});

describe('nodes', () => {
  it('a node resolves by a word of its own name, never through MQL', async () => {
    const n = makeStuffAtPath(() => new ExpanseNode(), `${SEA}/gannet-rock`);
    n.setName('Gannet Rock');
    n.setFocus(focusAt(50.3, -4.2));
    live.set(`${SEA}/gannet-rock`, n);
    sea.invalidate();
    expect((await sea.nodeByKeyword('gannet'))?.getTemplatePath()).toBe(`${SEA}/gannet-rock`);
    expect((await sea.nodeByKeyword('the gannet rock'))).not.toBeNull();
    expect(await sea.nodeByKeyword('lundy')).toBeNull();
    // Unsized, a node is reached within the `expanse.arrivalNm` fallback.
    expect((await sea.nodeAt(new GeoPosition(50.31, -4.2)))?.getName()).toBe('Gannet Rock');
    expect(await sea.nodeAt(new GeoPosition(51, -4.2))).toBeNull();
  });

  it('a place node carries no passage; a bad kind is refused', () => {
    const n = makeStuffAtPath(() => new ExpanseNode(), `${SEA}/pool`);
    n.setKind('place');
    expect(n.getPassage()).toBeNull();
    expect(() => n.setKind('room' as never)).toThrow(/place \| passage/);
  });
});

describe('sight and traffic', () => {
  it('two hundred-foot heights see each other at about twenty-three miles', () => {
    expect(sea.sightRangeNm(30.48, 30.48)).toBeCloseTo(23.4, 1);
  });

  it('⭐ traffic is seeded: the same place and hour give the same answer', () => {
    const p = new GeoPosition(50.05, -4.45);
    const answers = new Set(
      [0, 1, 2].map(() => JSON.stringify(sea.trafficAt(p, 42, 0.5))),
    );
    expect(answers.size).toBe(1);
    expect(sea.trafficAt(p, 42, 0)).toBeNull();
  });

  it('a masthead sees a craft the deck does not', async () => {
    const ship = makeStuffAtPath(() => new Ship(), '/test/ship/structure');
    ship.setDeckHeightM(3);
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    const other = makeStuffAtPath(() => new Ship(), '/test/other/structure');
    other.setName('the Kittiwake');
    other.setHeightM(5);
    // 10 nm east: beyond a 3 m eye + 5 m hull (≈ 8.4), within a 20 m
    // eye's (≈ 14.2), and inside the 12-mile signal range.
    other.setExpansePosition(new GeoPosition(50, -4).destination(90, 10));
    sea.register(ship);
    sea.register(other);
    const fromDeck = await sea.contactsFrom(ship, ship, 'visual', 1);
    expect(fromDeck.some((c) => c.craft === other)).toBe(false);
    ship.setDeckHeightM(20);
    const fromHigh = await sea.contactsFrom(ship, ship, 'visual', 1);
    expect(fromHigh.find((c) => c.craft === other)?.name).toBe('the Kittiwake');
    const bySignal = await sea.contactsFrom(ship, ship, 'signal', 1);
    expect(bySignal.some((c) => c.craft === other)).toBe(true);
  });
});

describe('ExpanseApi.craftAt', () => {
  it('a room answers the Structure covering it, when it has a position', async () => {
    const ship = makeStuffAtPath(() => new Ship(), '/test/ship/structure');
    live.set('/test/ship/structure', ship);
    const { default: StructureCatalogue } = await import('../../../platform/idea/StructureCatalogue');
    const cat = makeStuffAtPath(() => new StructureCatalogue(), '/platform/idea/StructureCatalogue');
    live.set('/platform/idea/StructureCatalogue', cat);
    // The ship is a SHIP row; no plain Structure rows here.
    vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
      (cls === '/platform/idea/Ship'
        ? [{ path: '/test/ship/structure', data: { extent: '/test/ship' } }]
        : []) as unknown as Template[]);
    expect(await ExpanseApi.craftAt('/test/ship/deck')).toBeNull(); // no position: ashore
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    expect(await ExpanseApi.craftAt('/test/ship/deck')).toBe(ship);
    expect(await ExpanseApi.craftAt('/test/elsewhere')).toBeNull();
  });
});

describe('the weather on the water (maritime R9/R10)', () => {
  it('⭐ fog shortens sight to a tenth — what a clear day shows, a haar hides', async () => {
    const ship = makeStuffAtPath(() => new Ship(), '/test/ship/structure');
    ship.setDeckHeightM(20);
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    const other = makeStuffAtPath(() => new Ship(), '/test/other/structure');
    other.setHeightM(5);
    other.setExpansePosition(new GeoPosition(50, -4).destination(90, 10));
    sea.register(ship);
    sea.register(other);
    const room = { stuffId: 'deck' } as unknown as Stuff;
    const eye = { stuffId: 'eye', getContainer: () => room } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isContainable').mockImplementation(((x: unknown) => x === eye) as never);
    vi.spyOn(MixinApi, 'isContainer').mockImplementation(((x: unknown) => x === room) as never);
    let sky = 'clear';
    vi.spyOn(WeatherApi, 'skyReadFor').mockImplementation(async () => ({ currentType: sky }) as never);
    expect((await sea.contactsFrom(ship, eye, 'visual', 1)).some((c) => c.craft === other)).toBe(true);
    sky = 'fog';
    expect((await sea.contactsFrom(ship, eye, 'visual', 1)).some((c) => c.craft === other)).toBe(false);
    // A gun or a lamp is not seen through the fog — it is heard.
    expect((await sea.contactsFrom(ship, eye, 'signal', 1)).some((c) => c.craft === other)).toBe(true);
  });

  it('⭐ a crossing reports what CHANGED: a current takes her, lets her go, or nothing', async () => {
    band('stream', (b) => {
      b.setExtent(belt(49, 51));
      b.setDirection(45);
      b.setSetKn(2);
    });
    band('slack', (b) => b.setExtent(belt(52, 53)));
    const outside = new GeoPosition(48, 0);
    const inside = new GeoPosition(50, 0);
    const slack = new GeoPosition(52.5, 0);
    expect(await sea.changesAcross(outside, inside, null)).toEqual(['A current takes her, setting north-east.']);
    expect(await sea.changesAcross(inside, outside, null)).toEqual(['The current lets her go.']);
    expect(await sea.changesAcross(outside, slack, null)).toEqual([]);
  });

  it('⭐ the lean under a craft is the narrowest band\'s — and a cold sea leans nothing', async () => {
    const ship = makeStuffAtPath(() => new Ship(), '/test/ship/structure');
    live.set('/test/ship/structure', ship);
    ship.setExtent('/test/ship');
    ship.setExpanse(SEA);
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    band('haar', (b) => {
      b.setExtent(belt(49, 51));
      b.setWeatherLean({ fog: 8 });
    });
    const { default: StructureCatalogue } = await import('../../../platform/idea/StructureCatalogue');
    const cat = makeStuffAtPath(() => new StructureCatalogue(), '/platform/idea/StructureCatalogue');
    live.set('/platform/idea/StructureCatalogue', cat);
    // The ship is a SHIP row; no plain Structure rows here.
    vi.spyOn(Template, 'findByClass').mockImplementation(async (cls: string) =>
      (cls === '/platform/idea/Ship'
        ? [{ path: '/test/ship/structure', data: { extent: '/test/ship' } }]
        : []) as unknown as Template[]);
    vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) => live.get(p) ?? null) as never);
    expect(ExpanseApi.leanAtSync('/test/ship/deck')).toBeNull(); // cold: nothing stood up
    await cat.all();
    expect(ExpanseApi.leanAtSync('/test/ship/deck')).toBeNull(); // the bands are not compiled yet
    await sea.bands();
    expect(ExpanseApi.leanAtSync('/test/ship/deck')).toEqual({ fog: 8 });
    expect(ExpanseApi.leanAtSync('/test/elsewhere')).toBeNull();
    expect(() => band('bad', (b) => b.setWeatherLean({ fog: -1 }))).toThrow(/non-negative/);
  });
});

describe('⭐⭐ the graph is spherical, the chart is lat/lon (maritime review, 2026-10-13)', () => {
  function node(key: string, focus: { rho: number; theta: number; phi?: number; radius?: number }): ExpanseNode {
    const n = makeStuffAtPath(() => new ExpanseNode(), `${SEA}/${key}`);
    n.setName(key);
    n.setFocus(focus);
    live.set(`${SEA}/${key}`, n);
    sea.invalidate();
    return n;
  }

  it('a node is a focus RELATIVE to its expanse: moving the origin moves it', async () => {
    const rock = node('rock', { rho: 15 * 1852, theta: 50 });
    await sea.nodes();
    const was = rock.getExpansePosition()!;
    expect(ORIGIN.distanceNm(was)).toBeCloseTo(15, 6);
    expect(ORIGIN.bearingTo(was)).toBeCloseTo(50, 6);
    const moved = ORIGIN.destination(0, 60);
    sea.setOrigin(moved);
    expect(moved.distanceNm(rock.getExpansePosition()!)).toBeCloseTo(15, 6);
    expect(rock.getExpanse()).toBe(SEA);
  });

  it('phi below the surface is a depth on the same three numbers', () => {
    const at = ORIGIN.atFocus({ rho: 100, theta: 0, phi: 180 });
    expect(at.depthM).toBe(100);
    expect(at.distanceNm(ORIGIN)).toBeLessThan(1e-9);
    expect(ORIGIN.atFocus({ rho: 1852, theta: 90 }).depthM).toBe(0);
  });

  it('⭐ an edge drawn between two nodes FOLLOWS them — it restates nothing', async () => {
    const a = node('a', { rho: 0, theta: 0 });
    const b = node('b', { rho: 20 * 1852, theta: 90 });
    band('stream', (s) => {
      s.setExtent({ kind: 'corridor', widthM: 2 * 1852 });
      s.setEndpoints([`${SEA}/a`, `${SEA}/b`]);
    });
    await sea.bands();
    const mid = ORIGIN.destination(90, 10);
    expect((await sea.fieldAt(mid)).band?.getTemplatePath()).toBe(`${SEA}/stream`);
    // Move b due north: the corridor swings with it.
    b.setFocus({ rho: 20 * 1852, theta: 0 });
    sea.invalidate();
    await sea.bands();
    expect((await sea.fieldAt(mid)).band).toBeNull();
    expect((await sea.fieldAt(ORIGIN.destination(0, 10))).band?.getTemplatePath()).toBe(`${SEA}/stream`);
    expect(a.getExpansePosition()!.distanceNm(ORIGIN)).toBeLessThan(1e-9);
  });

  it('⭐ the radius is how close is THERE', async () => {
    const cove = node('cove', { rho: 5 * 1852, theta: 0, radius: 400 });
    const bank = node('bank', { rho: 5 * 1852, theta: 180, radius: 3 * 1852 });
    await sea.nodes();
    const nearCove = ORIGIN.destination(0, 5).destination(90, 0.5);
    expect(cove.isAt(nearCove)).toBe(false);
    expect(await sea.nodeAt(nearCove)).toBeNull();
    const nearBank = ORIGIN.destination(180, 5).destination(90, 2.5);
    expect((await sea.nodeAt(nearBank))?.getName()).toBe('bank');
    expect(bank.getArrivalNm()).toBeCloseTo(3, 6);
  });
});
