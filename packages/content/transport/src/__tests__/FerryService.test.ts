/**
 * FerryService — ⭐ a ferry that runs to a timetable written as rows
 * (river D45, W12): the day planned into phases — boarding, the crossing,
 * alongside, on call — read by whoever needs them, and on call outside the
 * timetable's hours and season.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import FerryService from '../idea/FerryService';

const DAY = 86_400;
const NEAR = '/world/towpath';
const FAR = '/world/landing';
let nowS = 0;

function service(): FerryService {
  const s = makeStuff(() => new FerryService());
  s.placeOnLine('/stuff/idea/Watercourse/kestrel', { course: 'kestrel', km: 8.6, across: 0 });
  s.setLandings([NEAR, FAR]);
  s.setCrossingM(35);
  s.setTimetable({ departs: ['06:00', '07:00'], crossingMin: 8, returnAfterMin: 15, boardMin: 10, season: { fromDay: 60, toDay: 300 } });
  return s;
}

const at = (day: number, hh: number, mm = 0): number => day * DAY + hh * 3600 + mm * 60;

beforeEach(() => {
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's'));
});
afterEach(() => vi.restoreAllMocks());

describe('the market boat', () => {
  it('⭐ the day as phases: on call, boarding at the towpath, crossing, alongside, the run back', () => {
    const s = service();
    nowS = at(80, 5, 0);
    expect(s.phaseNow()).toBe('on-call');
    nowS = at(80, 5, 55);
    expect(s.phaseNow()).toBe(`boarding:${NEAR}`);
    expect(s.boardingAt(NEAR)).toBe(true);
    nowS = at(80, 6, 3);
    expect(s.phaseNow()).toBe('crossing');
    nowS = at(80, 6, 10);
    expect(s.phaseNow()).toBe(`alongside:${FAR}`);
    // Back a quarter of an hour after she lands (06:08 + 15 → 06:23), boarding from 06:13.
    nowS = at(80, 6, 15);
    expect(s.phaseNow()).toBe(`boarding:${FAR}`);
    nowS = at(80, 9, 0);
    expect(s.phaseNow()).toBe('on-call');
  });

  it('says when the next boat leaves a landing, and when the last has gone', () => {
    const s = service();
    nowS = at(80, 6, 30);
    expect(s.clockWords(s.nextDepartureFrom(NEAR)!)).toBe('07:00');
    expect(s.lastDepartureFrom(NEAR)).toBe(at(80, 6, 0));
    nowS = at(80, 8, 0);
    expect(s.nextDepartureFrom(NEAR)).toBeNull();
  });

  it('⭐ out of season she is on call all day — the bell rules', () => {
    const s = service();
    nowS = at(20, 5, 55);
    expect(s.phaseNow()).toBe('on-call');
    expect(s.isTimetabled()).toBe(false);
  });

  it('where she is reads off the same trajectory: mid-crossing, mid-river', () => {
    const s = service();
    nowS = at(80, 6, 4);
    expect(s.getLinePosition()!.across).toBeCloseTo(17.5, 1);
  });
});
