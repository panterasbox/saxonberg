import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Voyage } from '../Voyage';
import { GeoPosition } from '../GeoPosition';
import Ship from '../../../platform/idea/Ship';
import Steamer from '../../../platform/idea/Steamer';
import ExpanseNode from '../../../platform/idea/ExpanseNode';
import { Expanse } from '../Expanse';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import { LineFrameMixin, type LinePositionRecord, type PassagePlan, type PassageRequest } from '../LineFrame';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { SchedulerApi } from '../../../api/scheduler';
import { MessageApi } from '../../../api/message';
import { PersistableApi } from '../../../api/persistable';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/**
 * ⭐ A ship on a river's LINE (river D18, D28, D29): her position is read
 * off the passage the river worked out when the course was set; the watch
 * tells what changed and, when her stop comes, what it is — a landing, the
 * ground, the sea.
 */

let nowS = 2_000_000;
let told: string[] = [];
let started: Voyage[] = [];
let plan: PassagePlan | { refused: string };
let asked: PassageRequest | null = null;
let depthNow = 3;
const live = new Map<string, Stuff>();
const LINE = '/test/river/line';
const SEA = '/test/river/sea';
const BAR = '/test/river/sea/bar';

const listener = { stuffId: 'listener', isAlive: () => true } as unknown as Stuff;
const deck = { getContents: () => [listener] } as unknown as Stuff & Container;

class TestShip extends Ship {
  override async aboard(): Promise<Stuff[]> { return [listener]; }
  override async watchRoom(): Promise<(Stuff & Container) | null> { return deck; }
  override async cargoKg(): Promise<number> { return 0; }
}

/** ⭐ A real line frame (river review, W7) with the river's hooks stubbed. */
class TestRiver extends LineFrameMixin(Idea) {
  override courseKey(): string {
    return 'test';
  }
  override async planPassage(_from: LinePositionRecord, req: PassageRequest): Promise<PassagePlan | { refused: string }> {
    asked = req;
    return plan;
  }
  override changesAlong(a: number, b: number): string[] {
    return Math.floor(a) !== Math.floor(b) ? ['The water quickens.'] : [];
  }
  override async wakeAt(): Promise<void> {
    return;
  }
  override async depthAt(): Promise<number | null> {
    return depthNow;
  }
  override mouthOnSea(): { expanse: string; node: string } | null {
    return { expanse: SEA, node: BAR };
  }
}
let frame: TestRiver;
/** A course along the river, as `course` asks for one. */
const along = (direction: 'upstream' | 'downstream', landing: string | null = null) =>
  ({ direction, toward: landing, speedKn: (3 * 3600) / 1852 });

let ship: TestShip;

beforeEach(() => {
  StuffApi.clearAll();
  live.clear();
  told = [];
  started = [];
  asked = null;
  depthNow = 3;
  nowS = 2_000_000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's'));
  vi.spyOn(MixinApi, 'isSensor').mockImplementation((x) => x === listener);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { told.push(m.toString()); return b; };
    b.send = () => {};
    return b as never;
  });
  frame = makeStuffAtPath(() => new TestRiver(), LINE);
  vi.spyOn(frame, 'wakeAt');
  live.set(LINE, frame as unknown as Stuff);
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
  ship = makeStuffAtPath(() => new TestShip(), '/test/river/ship/structure');
  ship.setLine(LINE);
  ship.setLinePosition({ course: 'test', km: 10, across: 20 });
  ship.setSpeedKn(6);
  ship.setHull({ draftM: 1.2, beamM: 7, lengthM: 38 });
  plan = {
    course: 'test',
    across: 25,
    legs: [[10, nowS], [11, nowS + 1000], [12, nowS + 3000]],
    stop: { km: 12, atS: nowS + 3000, reason: 'landing', words: 'She comes in alongside the landing.', landing: '/test/landing' },
  };
});

afterEach(() => vi.restoreAllMocks());

describe('a ship on a river (river D18)', () => {
  it('⭐ asks the river for her passage with her hull, and her position is read off it', async () => {
    const r = await ship.steer(along('upstream', '/test/landing'));
    expect('refused' in r).toBe(false);
    expect(asked).toMatchObject({ direction: 'upstream', draftM: 1.2, beamM: 7, lengthM: 38 });
    nowS += 500;
    expect(ship.getLinePosition()!.km).toBeCloseTo(10.5, 5);
    nowS += 1500;
    expect(ship.getLinePosition()!.km).toBeCloseTo(11.5, 5);
    // Past the stop she is at the stop, not beyond it.
    nowS += 10_000;
    expect(ship.getLinePosition()!.km).toBe(12);
    expect(started).toHaveLength(1);
  });

  it('a refused passage leaves her where she was, in the river’s words', async () => {
    plan = { refused: 'Nothing goes past the falls.' };
    const r = await ship.steer(along('upstream', null));
    expect(r).toEqual({ refused: 'Nothing goes past the falls.' });
    expect(ship.getCourse()).toBeNull();
    expect(started).toHaveLength(0);
  });

  it('⭐ the watch tells what changed, and at the landing she stops and comes alongside', async () => {
    await ship.steer(along('upstream', '/test/landing'));
    const v = started[0]!;
    nowS += 1500;
    await v.watch();
    expect(told).toContain('The water quickens.');
    expect(frame.wakeAt).toHaveBeenCalled();
    nowS += 2000;
    await v.watch();
    expect(told.at(-1)).toMatch(/alongside the landing/);
    expect(ship.getCourse()).toBeNull();
    expect(ship.getLinePosition()!.km).toBe(12);
  });

  it('⭐ where the channel has less water than she draws she is hard aground, and no course moves her', async () => {
    plan = { course: 'test', across: 25, legs: [[10, nowS]], stop: { km: 10, atS: nowS, reason: 'aground', words: 'She takes the ground.' } };
    await ship.steer(along('upstream', null));
    await started[0]!.watch();
    expect(ship.isAground()).toBe(true);
    // Still too little water: no course moves her.
    depthNow = 0.5;
    const again = await ship.steer(along('downstream', null));
    expect(again).toMatchObject({ refused: expect.stringMatching(/hard aground/) });
    expect(ship.isAground()).toBe(true);
    // ⭐ The water comes up (3 m against her 1.2): asked for a course, she floats and goes.
    depthNow = 3;
    const off = await ship.steer(along('downstream', null));
    expect('refused' in off).toBe(false);
    expect(ship.isAground()).toBe(false);
  });

  it('⭐ at the mouth she leaves the river’s line for the sea’s chart, at its node', async () => {
    const sea = makeStuffAtPath(() => new (class extends Expanse {})(), SEA);
    sea.setOrigin(new GeoPosition(42, -8.47));
    live.set(SEA, sea);
    const bar = makeStuffAtPath(() => new ExpanseNode(), BAR);
    vi.spyOn(bar, 'getExpansePosition').mockReturnValue(new GeoPosition(42, -8.47));
    live.set(BAR, bar);
    vi.spyOn(sea, 'adopt').mockImplementation(() => undefined);
    vi.spyOn(sea, 'ready').mockResolvedValue(undefined);
    plan = { course: 'test', across: 25, legs: [[10, nowS], [0, nowS + 100]], stop: { km: 0, atS: nowS + 100, reason: 'mouth', words: 'She comes down to the mouth.' } };
    await ship.steer(along('downstream', null));
    nowS += 200;
    await started[0]!.watch();
    expect(ship.getLine()).toBeNull();
    expect(ship.getLinePosition()).toBeNull();
    expect(ship.getExpanse()).toBe(SEA);
    expect(ship.getExpansePosition()!.distanceNm(new GeoPosition(42, -8.47))).toBeLessThan(0.01);
    expect(told.at(-1)).toMatch(/out over the bar/);
  });

  it('⭐ the hull draws more laden: cargo puts her deeper (D28 lightening)', async () => {
    ship.cargoKg = async () => 30_000;
    await ship.steer(along('upstream', null));
    expect(asked!.draftM).toBeGreaterThan(1.2);
  });

  it('⭐ the fire eats billets of her fuel’s material out of the bunker, and dies when it is empty (D29)', async () => {
    const billet = (mat: string) => ({
      stuffId: mat,
      getMaterial: () => ({ getTemplatePath: () => mat }),
      getMass: () => Quantity.of(3.2, 'kg'),
    });
    const hazel = billet('/stuff/idea/material/wood/hazel');
    const stone = billet('/stuff/idea/material/stone');
    const contents = [hazel, stone];
    live.set('/test/bunker', { stuffId: 'bunker', getContents: () => contents } as unknown as Stuff);
    vi.spyOn(MixinApi, 'isContainer').mockImplementation(((x: unknown) => x === live.get('/test/bunker')) as never);
    vi.spyOn(MixinApi, 'isTangible').mockImplementation(((x: unknown) => x === hazel || x === stone) as never);
    const burnt: unknown[] = [];
    vi.spyOn(StuffApi, 'destruct').mockImplementation(((x: unknown) => { burnt.push(x); contents.splice(contents.indexOf(x as never), 1); }) as never);
    // A steamer — a sailing ship has no firebox (W14).
    const steamer = makeStuffAtPath(() => new Steamer(), '/test/river/steamer/structure');
    steamer.setFuel({ material: '/stuff/idea/material/wood', kgPerKm: 3 });
    steamer.setBunker('/test/bunker');
    expect(await steamer.burnFor(1)).toBe(true);
    expect(burnt).toEqual([hazel]);
    expect(await steamer.burnFor(1)).toBe(false);
    // …and a ship under sail burns nothing, ever.
    expect(await ship.burnFor(100)).toBe(true);
  });

  it('⭐ she keeps who went over her side while they are in the water, and lets go of them aboard again (D30)', async () => {
    const swimmer = { stuffId: 'sw', getIdentityPath: () => '/p/sw', getTemplatePath: () => '/p/sw', isDestroyed: () => false } as unknown as Stuff;
    let inWater = true;
    vi.spyOn(StuffApi, 'findByIdentityPath').mockImplementation(((p: string) => (p === '/p/sw' ? [swimmer] : [])) as never);
    vi.spyOn(MixinApi, 'isOrganism').mockReturnValue(false);
    vi.spyOn(MixinApi, 'isContainable').mockImplementation(((x: unknown) => x === swimmer) as never);
    vi.spyOn(MixinApi, 'isWaterPlace').mockImplementation((() => inWater) as never);
    (swimmer as unknown as { getContainer(): unknown }).getContainer = () => ({});
    ship.noteOverboard(swimmer);
    expect(await ship.peopleInTheWater()).toEqual([swimmer]);
    inWater = false;
    expect(await ship.peopleInTheWater()).toEqual([]);
    // Once let go of, coming back into the water is not hers to wait for.
    inWater = true;
    expect(await ship.peopleInTheWater()).toEqual([]);
  });
});
