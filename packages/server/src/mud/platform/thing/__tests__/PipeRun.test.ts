/**
 * PipeRun — the pipe that brings water into a room (water-supply D10).
 *
 * ⭐ An unlaid run records its lengths EMPTY and delivers nothing until the
 * last is laid; a run holding water in a room that went below freezing
 * BURSTS — lead bulges, brittle iron cracks — and on the thaw LEAKS onto
 * the floor; a lead run's standing water takes up lead by the shipped face
 * law; a service run's last length is refused where its main does not
 * serve the premises.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PipeRun from '../PipeRun';
import Location from '../../location/Location';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../../lib/quantity';
import { Piecewise } from '../../../lib/Trajectory';
import '../../idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

const DAY = 86_400;
let now = 50 * DAY;

function mat(path: string, tags: string[], leachMg = 0): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    if (leachMg > 0) m.setLeaches([{ toxin: 'lead', mgPerLPerDay: leachMg }]);
    return m;
  }, path) as unknown as Material;
}

/** A room whose air follows `curveK` — the trajectory a run reads. */
function room(curveK: (atS: number) => number): Location {
  const r = makeStuff(() => new Location());
  vi.spyOn(r as never, 'temperatureTrajectory' as never).mockImplementation(((from: number, to: number) => {
    const stretches = [];
    const step = 3600;
    for (let t = from; t < to; t += step) {
      const v = curveK(t + step / 2);
      stretches.push({ fromS: t, toS: Math.min(to, t + step), startValue: v, target: v, tau: 0 });
    }
    return new Piecewise(stretches.length > 0 ? stretches : [{ fromS: from, toS: to, startValue: curveK(to), target: curveK(to), tau: 0 }]);
  }) as never);
  return r;
}

function run(material: Material, opts: { unlaid?: boolean } = {}): PipeRun {
  return makeStuff(() => {
    const p = new PipeRun();
    p.setMaterial(material);
    if (opts.unlaid) {
      (p as unknown as { setBill(b: unknown): void }).setBill({
        parts: [{ part: 'pipe', template: '/test/thing/lead-pipe', count: 2, role: 'structural' }],
        joints: [],
      });
      p.setUnlaid(true);
    }
    return p;
  });
}

let lead: Material;
let iron: Material;

beforeEach(() => {
  StuffApi.clearAll();
  now = 50 * DAY;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  lead = mat('/test/material/lead', ['metal'], 40);
  iron = mat('/test/material/cast-iron', ['metal', 'brittle']);
  mat('/stuff/idea/material/bulk/water', ['liquid']);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ an unlaid run delivers nothing until the last length is laid', () => {
  it('its lengths are recorded EMPTY', () => {
    const r = run(lead, { unlaid: true });
    expect(r.isComplete()).toBe(false);
    expect(r.isSound()).toBe(false);
    expect(r.getParts()[0]!.failed).toBe(2);
    expect(r.stateWords()).toContain('not yet laid');
  });

  it('⭐ its missing lengths are SEATS, not split lengths — through the laying', async () => {
    const r = run(lead, { unlaid: true });
    expect(r.getParts()[0]!.empty).toBe(true);
    r.replaceMembers('pipe', 1, { material: '/test/material/lead', grade: 'fair', maker: '' });
    await r.afterMembersFitted(r as never);
    // One laid, one still wanted — and still read as wanted, not broken.
    expect(r.getParts()[0]!.failed).toBe(1);
    expect(r.getParts()[0]!.empty).toBe(true);
  });

  it('laying both lengths makes it sound', () => {
    const r = run(lead, { unlaid: true });
    r.ensureParts();
    r.replaceMembers('pipe', 2, { material: '/test/material/lead', grade: 'fair', maker: '' });
    expect(r.isComplete()).toBe(true);
    expect(r.isSound()).toBe(true);
  });

  it('a run with no bill is ONE PIECE, and sound', () => {
    expect(run(lead).isSound()).toBe(true);
  });
});

describe('⭐⭐ frost: lead bulges, iron cracks, and the thaw leaks', () => {
  const frostNight = (atS: number): number => (atS < 50 * DAY + 12 * 3600 ? 265 : 280);

  it('a lead run in a room that froze is burst — and mendable', () => {
    const r = run(lead);
    ContainmentApi.move(r, room(frostNight));
    r.reconcileFrost(now);
    now += 18 * 3600;
    r.reconcileFrost(now);
    expect(r.isBurst()).toBe(true);
    expect(r.getCondition()).toBeCloseTo(0.4, 9);
    expect(r.isSound()).toBe(false);
    // Mended back to sound, it is no longer burst.
    r.setCondition(0.9);
    now += 3600;
    r.reconcileFrost(now);
    expect(r.isBurst()).toBe(false);
    expect(r.isSound()).toBe(true);
  });

  it('brittle iron cracks outright', () => {
    const r = run(iron);
    ContainmentApi.move(r, room(frostNight));
    r.reconcileFrost(now);
    now += 18 * 3600;
    r.reconcileFrost(now);
    expect(r.getCondition()).toBe(0);
  });

  it('a room that never froze bursts nothing', () => {
    const r = run(lead);
    ContainmentApi.move(r, room(() => 285));
    r.reconcileFrost(now);
    now += DAY;
    r.reconcileFrost(now);
    expect(r.isBurst()).toBe(false);
  });

  it('⭐ on the thaw the burst runs out across the floor', () => {
    const r = run(lead);
    const rm = room(frostNight);
    ContainmentApi.move(r, rm);
    const spilled = vi.fn();
    vi.spyOn(rm as never, 'getFloor' as never).mockReturnValue(null as never);
    r.reconcileFrost(now);
    now += 18 * 3600;
    r.reconcileFrost(now);
    expect(r.stateWords()).toBe('burst, and has run out across the floor');
    void spilled;
  });
});

describe('the lead law in the pipe', () => {
  // The face law reads the real clock (it needs the registry), so these
  // two run on it rather than on the mocked `getNow`.
  let real = 1_000_000;
  const advance = (gameS: number): void => {
    real += (gameS / WorldClockApi.getScale()) * 1000;
  };
  beforeEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ soft acid water standing in a lead run takes up lead overnight', () => {
    const r = run(lead);
    const p = r.standingWater({ pH: 6.3, hardnessDgh: 2, salinityPpt: 0.3 });
    expect(p?.pH).toBe(6.3);
    r.getBulkPayload('interior');
    advance(DAY);
    const dose = r.getBulkPayload('interior')?.dissolvedToxins?.find((t) => t.type === 'lead')?.amount ?? 0;
    // 40 mg/L/day × 10^((2.4 − 6.3)/2) × (6 − 2)/6 — about a fifth of a mg.
    expect(dose).toBeCloseTo(40 * Math.pow(10, (2.4 - 6.3) / 2) * (4 / 6), 2);
    // A draw flushes it.
    r.flush();
    expect(r.getBulkPayload('interior')?.dissolvedToxins).toBeUndefined();
  });

  it('hard water through the same run takes up none', () => {
    const r = run(lead);
    r.standingWater({ pH: 6.3, hardnessDgh: 14, salinityPpt: 0.3 });
    r.getBulkPayload('interior');
    advance(DAY);
    expect(r.getBulkPayload('interior')?.dissolvedToxins ?? []).toEqual([]);
  });
});

describe('⭐ the service run connects the premises — or refuses its last length', () => {
  it('refuses the last length where the main it names does not serve the lot', async () => {
    const r = run(lead, { unlaid: true });
    r.setRunKind('service');
    r.setConnectsTo('/test/thing/main');
    ContainmentApi.move(r, makeStuffAtPath(() => new Location(), '/test/place/lot/yard') as Location);
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue({ serves: () => false } as never);
    r.ensureParts();
    const by = makeStuff(() => new Location());
    expect((await r.canTakeMembers('pipe', 1, by)).ok).toBe(true);
    const last = await r.canTakeMembers('pipe', 2, by);
    expect(last).toEqual({ ok: false, reason: 'No main runs past here.' });
  });
});
