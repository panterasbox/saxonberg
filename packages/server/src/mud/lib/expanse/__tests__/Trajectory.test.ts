import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Trajectory, TrajectoryBuilder } from '../Trajectory';
import { GeoPosition } from '../GeoPosition';
import type { FramePos } from '../Frame';

/**
 * ⭐⭐ A trajectory is what a moving thing WILL do, as a value (river D39,
 * D40): legs read by interpolation, marks that set a phase, a mouth that
 * is a change of frame — and nothing in it knows a rate.
 */

const RIVER = '/test/river';
const SEA = '/test/sea';
const km = (k: number): FramePos => ({ frame: 'line', at: { course: 'test', km: k, across: 20 } });
const sea = (lat: number, lon: number): FramePos => ({ frame: 'chart', at: new GeoPosition(lat, lon) });

describe('a trajectory', () => {
  it('⭐ glides, holds and jumps, read at any time', () => {
    const t = new TrajectoryBuilder(RIVER, km(10), 0)
      .glide(km(8), 100)
      .hold(200)
      .jump(km(2), 300)
      .build();
    expect(t.at(-5)!.pos).toEqual(km(10));
    expect((t.at(50)!.pos.at as { km: number }).km).toBeCloseTo(9, 6);
    expect(t.at(150)!.pos).toEqual(km(8));
    // A jump is THERE at its end, and not before.
    expect(t.at(299)!.pos).toEqual(km(8));
    expect(t.at(300)!.pos).toEqual(km(2));
    expect(t.at(10_000)!.pos).toEqual(km(2));
  });

  it('⭐ crosses frames: down to the mouth on the line, out over the bar onto the chart', () => {
    const t = new TrajectoryBuilder(RIVER, km(2), 0)
      .glide(km(0), 100)
      .into(SEA, sea(42, -8.47))
      .glide(sea(42, -8.4), 400)
      .build();
    expect(t.at(50)!.framePath).toBe(RIVER);
    const out = t.at(250)!;
    expect(out.framePath).toBe(SEA);
    expect(out.pos.frame).toBe('chart');
  });

  it('the next event is the next leg boundary or mark; none past the end', () => {
    const t = new TrajectoryBuilder(RIVER, km(10), 0)
      .glide(km(8), 100)
      .mark({ name: 'phase', phase: 'pool', atS: 60 })
      .glide(km(6), 300)
      .build();
    expect(t.nextEventAfter(0)).toBe(60);
    expect(t.nextEventAfter(60)).toBe(100);
    expect(t.nextEventAfter(100)).toBe(300);
    expect(t.nextEventAfter(300)).toBeNull();
  });

  it('⭐ a phase is state: the last phase mark at or before a time says what it is', () => {
    // A slow mover: a floe over a spring — a few long legs, phases between.
    const DAY = 86_400;
    const t = new TrajectoryBuilder(RIVER, km(30), 0)
      .mark({ name: 'phase', phase: 'sound' })
      .hold(20 * DAY)
      .mark({ name: 'phase', phase: 'rotten', words: 'The ice greys and softens.' })
      .glide(km(20), 30 * DAY)
      .mark({ name: 'phase', phase: 'breaking', words: 'The floe cracks across.' })
      .build();
    expect(t.phaseAt(DAY)).toBe('sound');
    expect(t.phaseAt(25 * DAY)).toBe('rotten');
    expect(t.phaseAt(31 * DAY)).toBe('breaking');
    expect(t.marksBetween(0, 25 * DAY).map((m) => m.phase)).toEqual(['rotten']);
  });

  it('round-trips as a plain record, and a re-plan cuts it at the moment', () => {
    const t = new TrajectoryBuilder(RIVER, km(10), 0).glide(km(0), 1000).mark({ name: 'stop', atS: 1000 }).build();
    const back = new Trajectory(JSON.parse(JSON.stringify(t.toJSON())));
    expect((back.at(500)!.pos.at as { km: number }).km).toBeCloseTo(5, 6);
    const cut = back.until(500);
    expect(cut.endsAtS()).toBe(500);
    expect((cut.at(10_000)!.pos.at as { km: number }).km).toBeCloseTo(5, 6);
    expect(cut.getMarks()).toHaveLength(0);
  });
});
