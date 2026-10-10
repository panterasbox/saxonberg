import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Expanse } from '../Expanse';
import { GeoPosition } from '../GeoPosition';
import Band from '../../../platform/idea/Band';
import ExpanseNode from '../../../platform/idea/ExpanseNode';
import Structure from '../../../platform/idea/Structure';
import { Template } from '../../stuff/Template';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { ExpanseApi } from '../../../api/expanse';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

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
      b.setExtent({ kind: 'belt', latMinDeg: 49, latMaxDeg: 51 });
      b.setLean({ directionDeg: 200, strengthMps: 1 });
      b.setHazards(['/test/hazard/fog']);
      b.setStock({ herring: 0.4, mackerel: 0.2 });
    });
    band('the-race', (b) => {
      b.setExtent({
        kind: 'corridor',
        from: { latDeg: 50, lonDeg: -5 },
        to: { latDeg: 50, lonDeg: -4 },
        widthNm: 2,
      });
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
    n.setExpansePosition({ latDeg: 50.3, lonDeg: -4.2 });
    live.set(`${SEA}/gannet-rock`, n);
    sea.invalidate();
    expect((await sea.nodeByKeyword('gannet'))?.getTemplatePath()).toBe(`${SEA}/gannet-rock`);
    expect((await sea.nodeByKeyword('the gannet rock'))).not.toBeNull();
    expect(await sea.nodeByKeyword('lundy')).toBeNull();
    expect((await sea.nodeNear(new GeoPosition(50.31, -4.2), 1))?.getName()).toBe('Gannet Rock');
    expect(await sea.nodeNear(new GeoPosition(51, -4.2), 1)).toBeNull();
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
    const ship = makeStuffAtPath(() => new Structure(), '/test/ship/structure');
    ship.setDeckHeightM(3);
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    const other = makeStuffAtPath(() => new Structure(), '/test/other/structure');
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
    const ship = makeStuffAtPath(() => new Structure(), '/test/ship/structure');
    live.set('/test/ship/structure', ship);
    const { default: StructureCatalogue } = await import('../../../platform/idea/StructureCatalogue');
    const cat = makeStuffAtPath(() => new StructureCatalogue(), '/platform/idea/StructureCatalogue');
    live.set('/platform/idea/StructureCatalogue', cat);
    vi.spyOn(Template, 'findByClass').mockResolvedValue([
      { path: '/test/ship/structure', data: { extent: '/test/ship' } },
    ] as unknown as Template[]);
    expect(await ExpanseApi.craftAt('/test/ship/deck')).toBeNull(); // no position: ashore
    ship.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    expect(await ExpanseApi.craftAt('/test/ship/deck')).toBe(ship);
    expect(await ExpanseApi.craftAt('/test/elsewhere')).toBeNull();
  });
});
