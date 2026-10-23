import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MovingMixin } from '../Moving';
import { PositionedMixin } from '../Positioned';
import { Trajectory, TrajectoryBuilder } from '../Trajectory';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import type { FramePos } from '../Frame';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { ScheduleApi } from '../../../api/schedule';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * ⭐⭐ How a thing moves, separate from what it is (river D40–D43): the
 * trajectory persisted only when somebody touched it, the phase as state,
 * what is told gathered per viewer into one beat, and marks on their own
 * clock for a mover with no watch.
 */

const RIVER = '/test/river';
const km = (k: number): FramePos => ({ frame: 'line', at: { course: 'test', km: k, across: 0 } });

const viewers: Stuff[] = [];
class Floe extends MovingMixin(PositionedMixin(Idea)) {
  override async audience(): Promise<Stuff[]> {
    return viewers;
  }
}

let nowS = 0;
let sent: Array<{ to: string; text: string }> = [];
let scheduled: Array<() => void> = [];
let clocked: Array<{ at: number; cb: () => void }> = [];

beforeEach(() => {
  StuffApi.clearAll();
  nowS = 1000;
  sent = [];
  scheduled = [];
  clocked = [];
  viewers.length = 0;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's'));
  vi.spyOn(MixinApi, 'isSensor').mockReturnValue(true);
  vi.spyOn(ScheduleApi, 'schedule').mockImplementation(((_ms: number, fn: () => void) => {
    scheduled.push(fn);
    return {} as never;
  }) as never);
  vi.spyOn(WorldClockApi, 'at').mockImplementation(((d: Quantity<'s'>, cb: () => void) => {
    clocked.push({ at: d.rawValue(), cb });
    return { cancel: () => {} } as never;
  }) as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation(((who: Stuff) => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { sent.push({ to: who.stuffId, text: m.toString() }); return b; };
    b.send = () => {};
    return b as never;
  }) as never);
});

afterEach(() => vi.restoreAllMocks());

function viewer(id: string): Stuff {
  const v = { stuffId: id, isDestroyed: () => false } as unknown as Stuff;
  viewers.push(v);
  return v;
}

describe('a moving thing', () => {
  it('⭐ a trajectory somebody chose is persisted; the world’s own is held at runtime (D43)', () => {
    const floe = makeStuff(() => new Floe());
    const t = new TrajectoryBuilder(RIVER, km(10), 0).glide(km(0), 100).build();
    floe.setTrajectory(t);
    expect(floe.isTrajectoryTouched()).toBe(false);
    expect((floe.trajectoryAt(50)!.pos.at as { km: number }).km).toBeCloseTo(5, 6);
    floe.setTrajectory(t, true);
    expect(floe.isTrajectoryTouched()).toBe(true);
    expect((floe.trajectoryAt(50)!.pos.at as { km: number }).km).toBeCloseTo(5, 6);
  });

  it('⭐ the phase is the state the last phase mark set (D40)', () => {
    const floe = makeStuff(() => new Floe());
    floe.setTrajectory(
      new TrajectoryBuilder(RIVER, km(10), 0)
        .mark({ name: 'phase', phase: 'sound' })
        .hold(2000)
        .mark({ name: 'phase', phase: 'rotten' })
        .build(),
    );
    expect(floe.currentPhase()).toBe('sound');
    nowS = 3000;
    expect(floe.currentPhase()).toBe('rotten');
  });

  it('⭐ what is told gathers per viewer and goes as one beat (D42)', async () => {
    const floe = makeStuff(() => new Floe());
    viewer('a');
    viewer('b');
    await floe.tellAboard('The water quickens.');
    await floe.tellAboard('A riffle chatters under you.');
    await floe.tellAboard('The water quickens.');
    expect(sent).toHaveLength(0);
    expect(scheduled).toHaveLength(1);
    scheduled[0]!();
    expect(sent.map((s) => s.to)).toEqual(['a', 'b']);
    expect(sent[0]!.text).toMatch(/quickens\. A riffle chatters under you\. The water quickens/);
  });

  it('⭐ moving, its position is read off the trajectory; placed, the placement replaces it (W10)', () => {
    const floe = makeStuff(() => new Floe());
    floe.placeOnLine(RIVER, { course: 'test', km: 10, across: 0 });
    floe.setTrajectory(new TrajectoryBuilder(RIVER, km(10), 1000).glide(km(0), 2000).build());
    nowS = 1500;
    expect(floe.getLinePosition()!.km).toBeCloseTo(5, 6);
    floe.placeOnLine(RIVER, { course: 'test', km: 7, across: 0 });
    expect(floe.getTrajectory()).toBeNull();
    expect(floe.getLinePosition()!.km).toBe(7);
  });

  it('marks on their own clock: each fires when it comes, and the next is armed', async () => {
    const floe = makeStuff(() => new Floe());
    viewer('a');
    floe.setTrajectory(
      new TrajectoryBuilder(RIVER, km(10), 1000)
        .hold(2000)
        .mark({ name: 'phase', phase: 'rotten', words: 'The ice greys and softens.' })
        .hold(3000)
        .mark({ name: 'phase', phase: 'breaking', words: 'The floe cracks across.' })
        .build(),
    );
    floe.followMarks();
    expect(clocked.at(-1)!.at).toBe(2000);
    nowS = 2000;
    clocked.at(-1)!.cb();
    await new Promise((r) => setTimeout(r, 0));
    scheduled.at(-1)!();
    expect(sent.at(-1)!.text).toMatch(/greys and softens/);
    expect(clocked.at(-1)!.at).toBe(3000);
  });
});
