import { describe, it, expect } from 'vitest';
import { Roster, type RosterAssignment } from '../Roster';
import { DefaultCalendar } from '../../time/DefaultCalendar';
import { Quantity } from '../../quantity';

// Mara's day-shift window, lifted from the seed: weekdays 0–4, hours [6,14).
const MARA: RosterAssignment = {
  positionKey: 'bartender',
  assignee: '/world/lounge/agent/mara',
  schedule: [{ days: [0, 1, 2, 3, 4], hours: [6, 14] }],
};

describe('Roster', () => {
  it('exposes its assignments in order', () => {
    const r = Roster.of([MARA]);
    expect(r.getAssignments()).toHaveLength(1);
    expect(r.getAssignments()[0]?.assignee).toBe('/world/lounge/agent/mara');
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

  it('⭐⭐⭐ NOBODY IS ON SHIFT AT BOOT — a fresh realm starts at midnight', () => {
    /*
     * ⚠⚠ This cost the logistics build several live drives and very
     * nearly shipped as a "the loop is broken" conclusion.
     *
     * A fresh database restores the world clock at **0s**, and 0s
     * decomposes to hour 0 — midnight — on weekday 0. Every shipped
     * roster window starts hours later, so **on a freshly reset realm
     * every rostered NPC is off shift**, and every brain gated on
     * `shiftState()` does nothing at all.
     *
     * ⭐ At the default 12× scale, game 06:00 is **thirty real minutes**
     * after boot. A drive that settles for four minutes is looking at
     * game 00:48 and will see a dead world, correctly, and conclude the
     * wrong thing.
     */
    const boot = DefaultCalendar.singleton().decompose(Quantity.of(0, 's'));
    expect(boot.hour).toBe(0);
    expect(boot.weekday).toBe(0);
    const r = Roster.of([MARA]);
    expect(r.evaluate(MARA, boot)).toBe('off-shift');
    // …and she opens the bar six game-hours later.
    expect(
      r.evaluate(MARA, DefaultCalendar.singleton().decompose(Quantity.of(6 * 3600, 's'))),
    ).toBe('on-shift');
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
