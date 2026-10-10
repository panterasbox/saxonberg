import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Expanse } from '../Expanse';
import { GeoPosition } from '../GeoPosition';
import { Voyage, VOYAGE_TYPE } from '../Voyage';
import Band from '../../../platform/idea/Band';
import ExpanseNode from '../../../platform/idea/ExpanseNode';
import Structure from '../../../platform/idea/Structure';
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

class TestShip extends Structure {
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
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: null });
    hours(2);
    const expected = new GeoPosition(50, -5).destination(90, 12);
    expect(ship.getExpansePosition()!.distanceNm(expected)).toBeLessThan(0.01);
  });

  it('⭐ a current sets you by its speed × the time you spend in it', async () => {
    addBand('set', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 49, latMaxDeg: 51 });
      b.setSetKn(1.5);
      b.setDirection(0);
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: null });
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
    node.setExpansePosition(new GeoPosition(50, -5).destination(90, 10));
    live.set(`${SEA}/rock`, node);
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: `${SEA}/rock` });
    hours(2);
    await started[0]!.watch();
    expect(SchedulerApi.complete).toHaveBeenCalledTimes(1);
    expect(ship.getCourse()).toBeNull();
    expect(ship.getExpansePosition()!.distanceNm(node.getExpansePosition()!)).toBeLessThan(1e-6);
    expect(told.join('\n')).toContain('You raise the Rock');
  });
});

describe('the watch', () => {
  it('a boundary is reported once, in order, by the water — never a position', async () => {
    addBand('haar', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 49, latMaxDeg: 51, lonMinDeg: -4.9, lonMaxDeg: -4.8 });
      b.setOutsideDescription('A grey fog lies on the water.');
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: null });
    hours(2);
    await started[0]!.watch();
    const crossings = told.filter((t) => t.startsWith('The water changes.'));
    expect(crossings).toHaveLength(2);
    expect(crossings[0]).toContain('A grey fog');
    expect(told.join('\n')).not.toMatch(/°/);
    told = [];
    hours(4);
    await started[0]!.watch();
    expect(told.filter((t) => t.startsWith('The water changes.'))).toHaveLength(0);
  });

  it('a bare bearing never arrives', async () => {
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: null });
    hours(20);
    await started[0]!.watch();
    expect(SchedulerApi.complete).not.toHaveBeenCalled();
  });

  it('an unmanned watch wears the gear by the formula; a manned one by a quarter', async () => {
    addBand('race', (b) => {
      b.setExtent({ kind: 'belt', latMinDeg: 49, latMaxDeg: 51 });
      b.setGearHardness(0.5);
    });
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: null });
    hours(4);
    await started[0]!.watch();
    expect(gear.wear).toHaveBeenLastCalledWith(0.5 * 1 * 0.02);
    manned = true;
    hours(4);
    await started[0]!.watch();
    expect(gear.wear).toHaveBeenLastCalledWith(0.5 * 1 * 0.02 * 0.25);
  });
});

describe('anchor and restart', () => {
  it('anchoring cancels the voyage `anchored` and stops the craft where it truly is', async () => {
    await ship.steer({ bearingDeg: 90, speedKn: 6, node: null });
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

  it('a restored craft at anchor registers and starts nothing', async () => {
    await ship.onRestored();
    expect(started).toHaveLength(0);
    expect(sea.craft()).toContain(ship);
  });
});
