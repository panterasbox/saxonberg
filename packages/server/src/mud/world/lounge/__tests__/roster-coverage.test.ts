/**
 * ⭐⭐⭐ **Somebody other than the owner is on the bar at 03:00 on a
 * Saturday.**
 *
 * The bar never closes. That is a content decision, and it carries an
 * obligation the roster did not meet: **weekend 00:00–10:00 was on nobody's
 * roster at all.** For ten hours of every Saturday and Sunday the only
 * person who could serve anybody was Dave — covering his own bar, unpaid,
 * on the graveyard shift, because the cover reconcile has no idea it is
 * being imposed on. *A house that never closes has to be staffed when it is
 * open.*
 *
 * ⚠ This is a unit test over `Roster.evaluate` rather than a drive step
 * because **the hole is not clock-reachable**: the wire world's clock runs
 * at 12× and a drive may not set it, so a game week is fourteen real hours.
 * Driving it would mean a `clock` verb the project has refused; the
 * arithmetic is the honest substitute, and it covers all 168 hours rather
 * than the one a drive could reach.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Roster } from '../../../lib/employment/Roster';

const BUSINESS = fileURLToPath(
  new URL(
    '../../../../../../content/saxonberg-lounge/content/world/lounge/idea/business.yaml',
    import.meta.url,
  ),
);
const DAVE = '/world/lounge/agent/dave';

interface Row {
  data: {
    call?: string;
    positions: { key: string; fulfills?: string[] }[];
    rosterSlots: {
      positionKey: string;
      assignee: string;
      schedule: { days: number[]; hours: [number, number] }[];
    }[];
  };
}

const row = (): Row => YAML.parse(readFileSync(BUSINESS, 'utf8')) as Row;

describe("Dave's Bar is staffed every hour it is open", () => {
  it('⭐⭐⭐ every (weekday, hour) of the week has a NON-PROPRIETOR in a fulfilling seat', () => {
    const data = row().data;
    const fulfilling = new Set(
      data.positions.filter((p) => (p.fulfills ?? []).length).map((p) => p.key),
    );
    const roster = Roster.of(
      data.rosterSlots.filter(
        (s) => fulfilling.has(s.positionKey) && s.assignee !== DAVE,
      ) as never,
    );

    const uncovered: string[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let hour = 0; hour < 24; hour++) {
        const on = roster
          .getAssignments()
          .some((a) => roster.evaluate(a, { weekday, hour }) === 'on-shift');
        if (!on) uncovered.push(`weekday ${weekday} @ ${hour}:00`);
      }
    }
    expect(uncovered, uncovered.join(' · ')).toEqual([]);
  });

  it('⚠ and the specific hole, named: Saturday 03:00', () => {
    // Kept as its own case so a regression reads as the thing it is rather
    // than as "168 hours, one of them wrong". `DefaultCalendar` weekday 5
    // is what the lounge roster treats as Saturday.
    const data = row().data;
    const roster = Roster.of(
      data.rosterSlots.filter(
        (s) => s.positionKey === 'bartender' && s.assignee !== DAVE,
      ) as never,
    );
    const who = roster
      .getAssignments()
      .filter((a) => roster.evaluate(a, { weekday: 5, hour: 3 }) === 'on-shift')
      .map((a) => a.assignee);
    expect(who.length).toBeGreaterThan(0);
    expect(who).not.toContain(DAVE);
  });

  it('⭐ two bartenders overlap somewhere with no player involved — the lunch rush', () => {
    // Without an overlap, "a crew shares the work" has nowhere to happen and
    // the call rule can only ever have one candidate.
    const data = row().data;
    const roster = Roster.of(
      data.rosterSlots.filter((s) => s.positionKey === 'bartender') as never,
    );
    let best = 0;
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let hour = 0; hour < 24; hour++) {
        const n = roster
          .getAssignments()
          .filter(
            (a) => roster.evaluate(a, { weekday, hour }) === 'on-shift',
          ).length;
        best = Math.max(best, n);
      }
    }
    expect(best).toBeGreaterThanOrEqual(2);
  });

  it('and the house authors a call rule, because it has a fulfilling seat', () => {
    expect(row().data.call).toBe('regulars');
  });
});
