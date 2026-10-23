import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Expanse } from '../Expanse';
import { GeoPosition } from '../GeoPosition';
import { Voyage, VOYAGE_TYPE } from '../Voyage';
import Band from '../../../platform/idea/Band';
import ExpanseNode from '../../../platform/idea/ExpanseNode';
import Ship from '../../../platform/idea/Ship';
import { Template } from '../../stuff/Template';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { SchedulerApi } from '../../../api/scheduler';
import { MessageApi } from '../../../api/message';
import { PersistableApi } from '../../../api/persistable';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/** The sea's origin — what the graph's points are measured from. */
const ORIGIN = new GeoPosition(50, -5);
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
 * The voyage (maritime A3) over a synthetic sea with a hand-kept clock:
 * the position is derived from three fields, a boundary is reported once
 * and in order, a course for a node arrives and a bearing never does,
 * anchoring cancels `anchored`, a restore re-arms it, and neglect wears
 * the gear by the formula.
 */
class TestExpanse extends Expanse {}

let nowS = 1_000_000;
let told: string[] = [];
let manned = false;
const gear = { wear: vi.fn() };

class TestShip extends Ship {
  override async aboard(): Promise<Stuff[]> { return [listener]; }
  override async watchRoom(): Promise<(Stuff & Container) | null> {
    return deck;
  }
  override async gearAboard(): Promise<Stuff[]> { return [gear as unknown as Stuff]; }
}

const SEA = '/test/voy/sea';
let sea: TestExpanse;
let ship: TestShip;
let listener: Stuff;
const deck = { getContents: () => (manned ? [listener] : []) } as unknown as Stuff & Container;
const live = new Map<string, Stuff>();
let started: Voyage[] = [];

beforeEach(() => {
  StuffApi.clearAll();
  live.clear();
  told = [];
  started = [];
  manned = false;
  gear.wear.mockReset();
  nowS = 1_000_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's'));
  sea = makeStuffAtPath(() => new TestExpanse(), SEA);
  sea.setOrigin(ORIGIN);
  live.set(SEA, sea);
  listener = { stuffId: 'listener', isAlive: () => true } as unknown as Stuff;
  vi.spyOn(MixinApi, 'isContainer').mockImplementation(((x: unknown) => x === deck) as never);
  vi.spyOn(MixinApi, 'isSensor').mockImplementation((x) => x === listener);
  vi.spyOn(MixinApi, 'isOrganism').mockImplementation((x) => x === listener);
  vi.spyOn(MixinApi, 'isDurable').mockImplementation((x) => x === (gear as unknown));
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { told.push(m.toString()); return b; };
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(Template, 'findDescendants').mockImplementation(async () =>
    [...live.keys()].filter((p) => p.startsWith(`${SEA}/`)).map((path) => ({ path, data: {} }) as unknown as Template),
  );
  vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([]);
  vi.spyOn(Template, 'findByPaths').mockResolvedValue([]);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
    const s = live.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s as never;
  });
  vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) => live.get(p) ?? null) as never);
  vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
  vi.spyOn(SchedulerApi, 'start').mockImplementation((e) => {
    started.push(e as Voyage);
    return { ok: true } as never;
  });
  vi.spyOn(SchedulerApi, 'cancel').mockImplementation(() => {});
  vi.spyOn(SchedulerApi, 'complete').mockImplementation(() => {});
  ship = makeStuffAtPath(() => new TestShip(), '/test/voy/ship/structure');
  ship.setExpanse(SEA);
  ship.setExpansePosition({ latDeg: 50, lonDeg: -5 });
  ship.setSpeedKn(6);
});

afterEach(() => vi.restoreAllMocks());

function addBand(key: string, set: (b: Band) => void): Band {
  const b = makeStuffAtPath(() => new Band(), `${SEA}/${key}`);
  set(b);
  live.set(`${SEA}/${key}`, b);
  sea.invalidate();
  return b;
}

const hours = (h: number): void => { nowS += h * 3600; };

describe('the position is derived from three fields', () => {
  it('with no band, fix + course × time', async () => {
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(2);
    const expected = new GeoPosition(50, -5).destination(90, 12);
    expect(ship.getExpansePosition()!.distanceNm(expected)).toBeLessThan(0.01);
  });

  it('⭐ a current sets you by its speed × the time you spend in it', async () => {
    addBand('set', (b) => {
      b.setExtent(belt(49, 51));
      b.setSetKn(1.5);
      b.setDirection(0);
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(2);
    const expected = new GeoPosition(50, -5).destination(90, 12).displaced(3, 0);
    expect(ship.getExpansePosition()!.distanceNm(expected)).toBeLessThan(0.05);
    // …and the reckoning knows nothing of it.
    const reckoned = ship.reckonedNow()!;
    expect(reckoned.distanceNm(new GeoPosition(50, -5).destination(90, 12))).toBeLessThan(0.01);
  });

  it('⭐ removing every band leaves the sea crossable: a course still arrives', async () => {
    const node = makeStuffAtPath(() => new ExpanseNode(), `${SEA}/rock`);
    node.setName('the Rock');
    node.setFocus({ rho: 10 * 1852, theta: 90 });
    live.set(`${SEA}/rock`, node);
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: `${SEA}/rock` });
    hours(2);
    await started[0]!.watch();
    expect(SchedulerApi.complete).toHaveBeenCalledTimes(1);
    expect(ship.getCourse()).toBeNull();
    expect(ship.getExpansePosition()!.distanceNm(node.getExpansePosition()!)).toBeLessThan(1e-6);
    expect(told.join('\n')).toContain('You raise the Rock');
  });

  it('⭐ between watches she never sails PAST the node: the drift stops inside its radius', async () => {
    const node = makeStuffAtPath(() => new ExpanseNode(), `${SEA}/rock`);
    node.setName('the Rock');
    node.setFocus({ rho: 10 * 1852, theta: 90, radius: 0.5 * 1852 });
    live.set(`${SEA}/rock`, node);
    sea.invalidate();
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: `${SEA}/rock` });
    hours(1);
    // An hour out she is six miles along, not yet there.
    expect(ship.getExpansePosition()!.distanceNm(node.getExpansePosition()!)).toBeCloseTo(4, 1);
    hours(3);
    // Four hours at six knots is twenty-four miles — she stopped at the edge.
    const d = ship.getExpansePosition()!.distanceNm(node.getExpansePosition()!);
    expect(d).toBeLessThanOrEqual(0.5 + 1e-3);
    expect(d).toBeGreaterThan(0.45);
    // …and the watch records the arrival she has already made.
    await started[0]!.watch();
    expect(told.join('\n')).toContain('You raise the Rock');
    expect(ship.getCourse()).toBeNull();
    // A course set for nothing still runs on.
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(1);
    expect(ship.getExpansePosition()!.distanceNm(node.getExpansePosition()!)).toBeGreaterThan(5);
  });
});

describe('the watch', () => {
  it('⭐ a boundary reports what CHANGED, once, in order — never a position', async () => {
    addBand('stream', (b) => {
      b.setExtent(belt(49, 51, -4.9, -4.8));
      b.setDirection(45);
      b.setSetKn(2);
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(2);
    await started[0]!.watch();
    expect(told).toContain('A current takes her, setting north-east.');
    expect(told).toContain('The current lets her go.');
    expect(told.indexOf('A current takes her, setting north-east.'))
      .toBeLessThan(told.indexOf('The current lets her go.'));
    expect(told.join('\n')).not.toMatch(/°/);
    told = [];
    hours(4);
    await started[0]!.watch();
    expect(told.filter((t) => /current/.test(t))).toHaveLength(0);
  });

  it('a band that changes nothing perceptible says nothing', async () => {
    addBand('haar', (b) => {
      b.setExtent(belt(49, 51, -4.9, -4.8));
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(2);
    await started[0]!.watch();
    expect(told).toEqual([]);
  });

  it('a bare bearing never arrives', async () => {
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(20);
    await started[0]!.watch();
    expect(SchedulerApi.complete).not.toHaveBeenCalled();
  });

  it('an unmanned watch wears the gear by the formula; a manned one by a quarter', async () => {
    addBand('race', (b) => {
      b.setExtent(belt(49, 51));
      b.setGearHardness(0.5);
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(4);
    await started[0]!.watch();
    expect(gear.wear).toHaveBeenLastCalledWith(0.5 * 1 * 0.02);
    manned = true;
    hours(4);
    await started[0]!.watch();
    expect(gear.wear).toHaveBeenLastCalledWith(0.5 * 1 * 0.02 * 0.25);
  });
});

describe('⭐ one craft, either frame (river review, W7)', () => {
  it('a steamer burns at sea as on a river: with the fire out she loses way and the set has her', async () => {
    const burnt: number[] = [];
    let wood = true;
    ship.burnFor = async (km: number) => { burnt.push(km); return wood; };
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    hours(4);
    await started[0]!.watch();
    expect(burnt[0]).toBeGreaterThan(40);
    wood = false;
    hours(4);
    await started[0]!.watch();
    expect(told.at(-1)).toMatch(/fire dies/);
    // Re-steered at no speed through the water: adrift.
    expect(started.at(-1)!).not.toBe(started[0]);
    expect(ship.getCourse()!.speedKn).toBe(0);
  });
});

describe('anchor and restart', () => {
  it('anchoring cancels the voyage `anchored` and stops the craft where it truly is', async () => {
    await ship.steer({ bearingDeg: 90, speedKn: 6, toward: null });
    vi.spyOn(ship, 'currentVoyage').mockReturnValue(started[0]!);
    hours(1);
    const there = ship.getExpansePosition()!;
    await ship.anchorHere();
    expect(SchedulerApi.cancel).toHaveBeenCalledWith(started[0], 'anchored');
    hours(5);
    expect(ship.getExpansePosition()!.distanceNm(there)).toBeLessThan(1e-6);
  });

  it('⭐ a restored craft with a course re-starts its voyage', async () => {
    ship.setCourse({ bearingDeg: 90, speedKn: 6, node: null });
    ship.setCourseSetAtS(nowS);
    await ship.onRestored();
    expect(started).toHaveLength(1);
    expect(started[0]!.type).toBe(VOYAGE_TYPE);
    expect(sea.craft()).toContain(ship);
  });

  it('a restored craft at anchor starts nothing — the sea\'s compile registers its ships', async () => {
    await ship.onRestored();
    expect(started).toHaveLength(0);
    expect(sea.craft()).not.toContain(ship);
  });
});
