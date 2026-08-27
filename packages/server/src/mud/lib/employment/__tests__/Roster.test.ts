import { describe, it, expect } from 'vitest';
import { Roster, type RosterAssignment } from '../Roster';

// Mara's day-shift window, lifted from the seed: weekdays 0–4, hours [6,14).
const MARA: RosterAssignment = {
  positionKey: 'bartender',
  assignee: '/world/lounge/npc/mara',
  schedule: [{ days: [0, 1, 2, 3, 4], hours: [6, 14] }],
};

describe('Roster', () => {
  it('exposes its assignments in order', () => {
    const r = Roster.of([MARA]);
    expect(r.getAssignments()).toHaveLength(1);
    expect(r.getAssignments()[0]?.assignee).toBe('/world/lounge/npc/mara');
  });

  it('is on-shift inside the window (day + hour)', () => {
    const r = Roster.of([MARA]);
    expect(r.evaluate(MARA, { weekday: 2, hour: 6 })).toBe('on-shift'); // start
    expect(r.evaluate(MARA, { weekday: 2, hour: 13 })).toBe('on-shift'); // mid
  });

  it('is off-shift outside the hour window (half-open end)', () => {
    const r = Roster.of([MARA]);
    expect(r.evaluate(MARA, { weekday: 2, hour: 5 })).toBe('off-shift'); // pre
    expect(r.evaluate(MARA, { weekday: 2, hour: 14 })).toBe('off-shift'); // end excluded
  });

  it('is off-shift on a non-scheduled weekday', () => {
    const r = Roster.of([MARA]);
    expect(r.evaluate(MARA, { weekday: 5, hour: 10 })).toBe('off-shift');
    expect(r.evaluate(MARA, { weekday: 6, hour: 10 })).toBe('off-shift');
  });

  it('coerces a loosely-typed seed blob (fromData)', () => {
    const r = Roster.fromData([
      {
        positionKey: 'bartender',
        assignee: '/x',
        schedule: [{ days: [5, 6], hours: [10, 24] }],
      },
    ]);
    const a = r.getAssignments()[0]!;
    expect(a.assignee).toBe('/x');
    expect(r.evaluate(a, { weekday: 6, hour: 23 })).toBe('on-shift');
    expect(r.evaluate(a, { weekday: 0, hour: 23 })).toBe('off-shift');
  });

  it('fromData of a non-array yields an empty roster', () => {
    expect(Roster.fromData(undefined).getAssignments()).toEqual([]);
    expect(Roster.fromData(null).getAssignments()).toEqual([]);
  });
});
