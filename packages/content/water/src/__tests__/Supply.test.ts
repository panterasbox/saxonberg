/**
 * Intermittent supply and the divider (water-supply W1, D5/D6).
 *
 *  - ⭐⭐ A tank FILLS on its schedule while its main delivers, and is drawn
 *    down all day at the district's rate — reconciled over any gap on the
 *    next read, an outage in the unwatched night shorting the morning.
 *  - ⭐ A short main shares by RANK (`priority`: civic, then the trades,
 *    then houses) or by fraction (`proportion`).
 *  - A conduit's cut and switch are a delivery log.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ShiftSchedule } from '@saxonberg/server/mud/lib/employment/ShiftSchedule';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import StorageNode from '../thing/StorageNode';
import Conduit from '../thing/Conduit';

const H = 3600;
const DAY = 86_400;
let now = 0;

beforeEach(() => {
  StuffApi.clearAll();
  now = 10 * DAY;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ShiftSchedule — a schedule read over a span', () => {
  it('a daily window is on for its hours each day', () => {
    const s = new ShiftSchedule([{ days: [0, 1, 2, 3, 4, 5, 6], hours: [0, 5] }]);
    expect(s.onSecondsBetween(10 * DAY, 13 * DAY)).toBe(3 * 5 * H);
  });

  it('⭐ a night turn runs across midnight', () => {
    const s = new ShiftSchedule([{ days: [0, 1, 2, 3, 4, 5, 6], hours: [22, 4] }]);
    // From noon to noon: 22:00 → 04:00, six hours.
    expect(s.onSecondsBetween(10 * DAY + 12 * H, 11 * DAY + 12 * H)).toBe(6 * H);
    expect(s.isOnAt(11 * DAY + 2 * H)).toBe(true);
    expect(s.isOnAt(11 * DAY + 5 * H)).toBe(false);
  });

  it('an empty schedule is never on', () => {
    expect(new ShiftSchedule([]).onSecondsBetween(0, DAY)).toBe(0);
  });
});

function tank(): StorageNode {
  return makeStuff(() => {
    const t = new StorageNode();
    t.setCapacityM3(400);
    t.setElevationM(145);
    t.setFillRateM3S(0.008);
    t.setSchedule([{ days: [0, 1, 2, 3, 4, 5, 6], hours: [0, 5] }]);
    t.setDrawM3S(0.0015);
    t.setInitialLevelM3(300);
    return t;
  });
}

describe('⭐⭐ the tank fills on its schedule (D5)', () => {
  it('the first read stands it at its authored level and stamps', () => {
    const t = tank();
    t.reconcileLevel(now);
    expect(t.getLevelM3()).toBe(300);
  });

  it('a day: five hours of fill against a day of draw', () => {
    const t = tank();
    t.setInitialLevelM3(200);
    t.setFillsFrom('/test/thing/main');
    t.reconcileLevel(now);
    t.reconcileLevel(now + DAY);
    // 5 h × 0.008 = 144 in; 24 h × 0.0015 = 129.6 out.
    expect(t.getLevelM3()).toBeCloseTo(200 + 144 - 129.6, 1);
  });

  it('⭐ a full tank spills what it cannot hold — the fill is clamped hour by hour', () => {
    const t = tank();
    t.setFillsFrom('/test/thing/main');
    t.reconcileLevel(now);
    t.reconcileLevel(now + 5 * H);
    expect(t.getLevelM3()).toBe(400);
  });

  it('with no source it only drains', () => {
    const t = tank();
    t.reconcileLevel(now);
    t.reconcileLevel(now + DAY);
    expect(t.getLevelM3()).toBeCloseTo(300 - 129.6, 1);
  });

  it('it never stands above full, and a dry tank reads dry', () => {
    const t = tank();
    t.setFillsFrom('/test/thing/main');
    t.setFillRateM3S(1);
    t.reconcileLevel(now);
    t.reconcileLevel(now + DAY);
    expect(t.getLevelM3()).toBeLessThanOrEqual(400);
    const empty = tank();
    empty.setInitialLevelM3(0);
    empty.reconcileLevel(now);
    expect(empty.supplyStateNow()).toBe('dry');
  });

  it('⭐ an outage in the night, logged by the main, shorts the morning', () => {
    const mainOf = () =>
      makeStuff(() => {
        const c = new Conduit();
        c.setDirection('supply');
        c.switchOn();
        return c;
      });
    const shut = mainOf();
    const kept = mainOf();
    const a = tank();
    const b = tank();
    for (const [t, m] of [[a, shut], [b, kept]] as const) {
      // Low enough that neither tank brims and spills over the two nights.
      t.setInitialLevelM3(100);
      t.setFillsFrom('/test/thing/main');
      // Hand each tank its source the way a load-on-use resolve would.
      (t as unknown as { _source: unknown })._source = m;
      t.reconcileLevel(now);
    }
    // 23:00: one main is shut off and stays off through the night's fill.
    now += 23 * H;
    shut.switchOff();
    now += 9 * H; // 08:00 the next morning — nobody was in Hinkley.
    a.reconcileLevel(now);
    b.reconcileLevel(now);
    // The kept tank took the night's five hours of fill; the shut one did not.
    expect(b.getLevelM3() - a.getLevelM3()).toBeCloseTo(5 * H * 0.008, 1);
  });
});

describe('⭐ a short main shares by rank (D6)', () => {
  function main(shares: 'priority' | 'proportion'): Conduit {
    const c = makeStuff(() => new Conduit());
    c.setDemandM3S(1);
    c.setShares(shares);
    // What the main carries this minute, as a reading would set it.
    (c as unknown as { _shareCache: unknown })._shareCache = {
      atS: now,
      deliverableM3S: 0.4,
    };
    return c;
  }

  it('priority: the public outlets first, then the trades, then the houses', async () => {
    const c = main('priority');
    // civic 0.15 + trades 0.35 = 0.5 of a demand of 1; 0.4 delivered.
    expect(await c.shareFor('civic')).toBe(1);
    expect(await c.shareFor('commercial')).toBeCloseTo(0.25 / 0.35, 5);
    expect(await c.shareFor('residential')).toBe(0);
  });

  it('proportion: everybody the same fraction', async () => {
    const c = main('proportion');
    expect(await c.shareFor('civic')).toBeCloseTo(0.4, 5);
    expect(await c.shareFor('residential')).toBeCloseTo(0.4, 5);
  });

  it('⭐ an OVERDRAWN main still carries what it carries — to the first ranks', async () => {
    // The real path: the reading says `overdrawn` (demand above capacity)
    // and delivers nothing in its own words, but it CARRIES its capacity,
    // and the share rule divides that.
    const c = makeStuff(() => new Conduit());
    c.setDemandM3S(2);
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue({
      liveDraws: async () => new Map(),
    } as never);
    vi.spyOn(c, 'readingFor').mockResolvedValue({
      state: 'overdrawn',
      deliveredM3S: 0,
      demandM3S: 2,
      headM: null,
      pumpWatts: 0,
      carriesM3S: 1.2,
    });
    // civic 0.3 + trades 0.7 = 1.0 of 2.0; 1.2 carried.
    expect(await c.shareFor('civic')).toBe(1);
    expect(await c.shareFor('industrial')).toBe(1);
    expect(await c.shareFor('residential')).toBeCloseTo(0.2, 5);
  });

  it('with no authored demand there is no shortage to share', async () => {
    const c = makeStuff(() => new Conduit());
    expect(await c.shareFor('residential')).toBe(1);
  });

  it('a district demand is what it withdraws from the river, not its capacity', () => {
    const c = makeStuff(() => new Conduit());
    c.setDirection('supply');
    c.setCapacityM3S(1.2);
    c.switchOn();
    expect(c.withdrawalM3S(10)).toBe(1.2);
    c.setDemandM3S(0.4);
    expect(c.withdrawalM3S(10)).toBe(0.4);
  });
});

describe('a main keeps a delivery log', () => {
  it('a cut and a switch are breakpoints the trajectory reads', () => {
    const c = makeStuff(() => new Conduit());
    c.switchOn();
    now += H;
    c.setCut(true);
    now += H;
    c.setCut(false);
    const t = c.deliveryTrajectory(10 * DAY, now + H);
    expect(t.at(10 * DAY + 30 * 60)).toBe(1);
    expect(t.at(10 * DAY + H + 30 * 60)).toBe(0);
    expect(t.at(now + 30 * 60)).toBe(1);
  });
});
