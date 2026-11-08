import { describe, it, expect } from 'vitest';
import { Roster, type RosterAssignment } from '../Roster';
import { ShiftSchedule } from '../ShiftSchedule';
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

describe('⭐ seasonal shifts (storage-and-ice D20)', () => {
  const crew: RosterAssignment = {
    positionKey: 'crew',
    assignee: '/x/crew',
    schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 16], season: ['winter'] }],
  };
  const keeper: RosterAssignment = {
    positionKey: 'keeper',
    assignee: '/x/keeper',
    schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 16] }],
  };
  const roster = Roster.of([crew, keeper]);

  it('a winter seat is on in winter and off in summer; an unseasoned seat is on in both', () => {
    expect(roster.evaluate(crew, { weekday: 1, hour: 10, season: 'winter' })).toBe('on-shift');
    expect(roster.evaluate(crew, { weekday: 1, hour: 10, season: 'summer' })).toBe('off-shift');
    expect(roster.evaluate(keeper, { weekday: 1, hour: 10, season: 'summer' })).toBe('on-shift');
  });

  it('⚠ a season-bound seat is OFF while the house\'s season is unknown; nobody else notices', () => {
    expect(roster.evaluate(crew, { weekday: 1, hour: 10 })).toBe('off-shift');
    expect(roster.evaluate(keeper, { weekday: 1, hour: 10 })).toBe('on-shift');
  });

  it('a row\'s season list keeps only the four words', () => {
    const r = Roster.fromData([
      { positionKey: 'p', assignee: '/a', schedule: [{ days: [0], hours: [0, 24], season: ['winter', 'mud'] }] },
    ]);
    expect(r.getAssignments()[0]!.schedule[0]!.season).toEqual(['winter']);
  });

  describe('⭐⭐ one reading of a ShiftEntry — the roster and the gate agree (water-supply)', () => {
    // Avila's turn on the Delight ditch: three nights a week, 22:00 to 04:00.
    const AVILA: RosterAssignment = {
      positionKey: 'irrigator',
      assignee: '/world/terminus/hearts-delight/ditch/agent/avila',
      schedule: [{ days: [1, 3, 5], hours: [22, 4] }],
    };

    it('a night turn is on in its evening AND in the small hours of the next day', () => {
      const r = Roster.of([AVILA]);
      expect(r.evaluate(AVILA, { weekday: 1, hour: 23 })).toBe('on-shift');
      expect(r.evaluate(AVILA, { weekday: 2, hour: 2 })).toBe('on-shift');
      expect(r.evaluate(AVILA, { weekday: 2, hour: 4 })).toBe('off-shift');
      expect(r.evaluate(AVILA, { weekday: 1, hour: 2 })).toBe('off-shift'); // day 0 is not hers
      expect(r.evaluate(AVILA, { weekday: 2, hour: 23 })).toBe('off-shift');
    });

    it('the roster and the integral say the same thing, hour by hour, across a week', () => {
      const r = Roster.of([AVILA]);
      const schedule = new ShiftSchedule(AVILA.schedule);
      const cal = DefaultCalendar.singleton();
      for (let h = 0; h < cal.daysPerWeek * cal.hoursPerDay; h++) {
        const atS = h * 3600 + 1800;
        const d = cal.decompose(Quantity.of(atS, 's'));
        const roster = r.evaluate(AVILA, { weekday: d.weekday, hour: d.hour }) === 'on-shift';
        expect(schedule.isOnAt(atS), `hour ${h}`).toBe(roster);
      }
    });

    it('an entry whose two hours are equal covers nothing, in either reading', () => {
      const e = { days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 8] as [number, number] };
      expect(new ShiftSchedule([e]).covers({ weekday: 0, hour: 8 })).toBe(false);
      expect(new ShiftSchedule([e]).onSecondsBetween(0, 7 * 86_400)).toBe(0);
    });

    it('a season-bound window is off without the house\'s season, in either reading', () => {
      const e = { days: [0], hours: [8, 16] as [number, number], season: ['winter' as const] };
      expect(new ShiftSchedule([e]).covers({ weekday: 0, hour: 9 })).toBe(false);
      expect(new ShiftSchedule([e]).covers({ weekday: 0, hour: 9, season: 'winter' })).toBe(true);
      const sched = new ShiftSchedule([e]);
      expect(sched.onSecondsBetween(0, 86_400)).toBe(0);
      expect(sched.onSecondsBetween(0, 86_400, () => 'winter')).toBe(8 * 3600);
      expect(sched.onSecondsBetween(0, 86_400, () => 'summer')).toBe(0);
    });
  });
});
