/**
 * EmploymentLogic roster-tick tests — the game-clock pass that maintains
 * each assignee's shift status. The clock is mocked to a computed instant
 * (weekday·86400 + hour·3600 game-seconds → decompose gives that weekday +
 * hour) so a `tickRoster()` call is deterministic — no reliance on the
 * recurring real-time schedule.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmploymentApi } from '../../../api/employment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import BusinessEntity from '../../../lib/employment/Business';
import { EmployedMixin } from '../../../lib/employment/Employed';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const BUSINESS = '/domain/lounge/business';
const MARA = '/domain/lounge/npc/mara';

class Worker extends EmployedMixin(Idea) {
  static _mixinName = 'Worker';
}

/** Game-seconds that decompose to `weekday` at `hour`. */
function instant(weekday: number, hour: number): Quantity<'s'> {
  return Quantity.of(weekday * 86_400 + hour * 3_600, 's');
}

function atClock(weekday: number, hour: number): number {
  const q = instant(weekday, hour);
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(q);
  return q.rawValue();
}

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, confers: ['MakerMixin'] },
  ];
  b.rosterSlots = [
    {
      positionKey: 'bartender',
      assignee: MARA,
      // Mara's day shift, lifted from the seed: weekdays 0–4, hours [6,14).
      schedule: [{ days: [0, 1, 2, 3, 4], hours: [6, 14] }],
    },
  ];
  b.operatingLocations = ['/domain/lounge/bar'];
  return b;
}

describe('EmploymentLogic.tickRoster', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lazy-materializes an off-shift record outside the window', () => {
    seedBusiness();
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    atClock(2, 20); // Wednesday 20:00 — off shift
    EmploymentApi.tickRoster();

    const emp = mara.getEmployment(BUSINESS);
    expect(emp?.positionKey).toBe('bartender');
    expect(emp?.status).toBe('off-shift');
    expect(emp?.onShiftSince).toBeNull();
  });

  it('flips off→on and stamps onShiftSince inside the window', () => {
    seedBusiness();
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    const now = atClock(2, 10); // Wednesday 10:00 — on shift
    EmploymentApi.tickRoster();

    const emp = mara.getEmployment(BUSINESS);
    expect(emp?.status).toBe('on-shift');
    expect(emp?.onShiftSince).toBe(now);
    expect(EmploymentApi.shiftStateOf(mara)).toBe('on-shift');
  });

  it('flips on→off and clears onShiftSince at shift end', () => {
    seedBusiness();
    const mara = makeStuffAtPath(() => new Worker(), MARA);

    atClock(2, 10); // on
    EmploymentApi.tickRoster();
    expect(mara.getEmployment(BUSINESS)?.status).toBe('on-shift');

    atClock(2, 20); // later — off
    EmploymentApi.tickRoster();
    const emp = mara.getEmployment(BUSINESS);
    expect(emp?.status).toBe('off-shift');
    expect(emp?.onShiftSince).toBeNull();
    expect(EmploymentApi.shiftStateOf(mara)).toBe('off-shift');
  });

  it('does not resurrect a fired worker', () => {
    const biz = seedBusiness();
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    // Materialize, then fire.
    atClock(2, 20);
    EmploymentApi.tickRoster();
    EmploymentApi.fire(biz, mara);
    expect(mara.getEmployment(BUSINESS)?.status).toBe('fired');

    // A tick during the on-shift window leaves the terminal status alone.
    atClock(2, 10);
    EmploymentApi.tickRoster();
    expect(mara.getEmployment(BUSINESS)?.status).toBe('fired');
  });

  it('is a no-op for an assignee that is not present', () => {
    seedBusiness();
    // No Mara instance registered.
    atClock(2, 10);
    expect(() => EmploymentApi.tickRoster()).not.toThrow();
  });
});
