/**
 * Gate — a controlled structure with a setting, a lock and a log
 * (water-supply D12, D21).
 *
 *  - It passes its setting's share of its capacity, never more than arrives.
 *  - A padlock refuses anybody without its key.
 *  - ⭐ The rota is the turn list: the turns the roster implies since the
 *    last read are reconciled into the log — and a padlocked turnout stays
 *    shut for them, the refused turn recorded.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Roster } from '@saxonberg/server/mud/lib/employment/Roster';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Gate from '../thing/Gate';

const H = 3600;
const DAY = 86_400;
let now = 70 * DAY;

beforeEach(() => {
  StuffApi.clearAll();
  now = 70 * DAY;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function gate(): Gate {
  return makeStuff(() => {
    const g = new Gate();
    g.setCapacityM3S(0.1);
    g.setKeyway('ditch-junior');
    return g;
  });
}

describe('the water through a gate', () => {
  it('passes its setting × capacity, never more than arrives', () => {
    const g = gate();
    g.setOpening(0.25);
    expect(g.split(1).divertedM3S).toBeCloseTo(0.025, 9);
    expect(g.split(1).passedM3S).toBeCloseTo(0.975, 9);
    g.setOpening(1);
    expect(g.withdrawalM3S(0.04)).toBeCloseTo(0.04, 9);
    g.setOpening(0);
    expect(g.withdrawalM3S(1)).toBe(0);
  });
});

describe('⭐ the lock is the gate', () => {
  it('a padlocked gate refuses anybody without its key', () => {
    const g = gate();
    g.lock();
    const stranger = makeStuff(() => new Good());
    expect(g.canOpen(stranger)).toEqual({ ok: false, reason: "It's padlocked shut." });
    vi.spyOn(g, 'opensFor').mockReturnValue(true);
    expect(g.canOpen(stranger).ok).toBe(true);
  });
});

describe('⭐⭐ the rota is the turn list (D21)', () => {
  function rostered(g: Gate, schedule: Array<{ days: number[]; hours: [number, number] }>): void {
    g.setTurnOf({ business: '/test/idea/company', positionKey: 'irrigator', assignee: '/test/agent/furtado' });
    const roster = Roster.of([{ positionKey: 'irrigator', assignee: '/test/agent/furtado', schedule }]);
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue({ getRoster: () => roster } as never);
    vi.spyOn(MixinApi, 'isOrganization').mockReturnValue(true);
  }

  it('a turn nobody watched opened and shut the gate, by the irrigator', async () => {
    const g = gate();
    rostered(g, [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [4, 10] }]);
    await g.reconcileScheduled(now);
    now += DAY;
    await g.reconcileScheduled(now);
    const log = g.getWorkLog();
    expect(log.map((r) => r.opening)).toEqual([1, 0]);
    expect(log[0]!.by).toBe('/test/agent/furtado');
    // The field integrates exactly six hours of a full turnout.
    expect(g.openingTrajectory(now - DAY, now).secondsAtOrAbove(0.5)).toBeCloseTo(6 * H, -1);
  });

  it('⭐ settleOpening is the rota: a field integrating the gate sees the turn', async () => {
    const g = gate();
    rostered(g, [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [4, 10] }]);
    await g.settleOpening(now);
    now += DAY;
    await g.settleOpening(now);
    expect(g.openingTrajectory(now - DAY, now).secondsAtOrAbove(0.5)).toBeCloseTo(6 * H, -1);
  });

  it('⭐ a gate first read mid-turn is open for that turn', async () => {
    const g = gate();
    rostered(g, [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [4, 10] }]);
    now += 6 * H; // 06:00, inside the 04:00–10:00 turn
    await g.settleOpening(now);
    expect(g.getOpening()).toBe(1);
    expect(g.getWorkLog().at(-1)?.by).toBe('/test/agent/furtado');
  });

  it('⭐ its look says how it is set and who last worked it', async () => {
    const g = gate();
    rostered(g, [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [4, 10] }]);
    await g.reconcileScheduled(now);
    now += DAY;
    await g.reconcileScheduled(now);
    const aug = (Gate as unknown as { markupAugmenters: Array<(t: string, h: unknown) => string> }).markupAugmenters[0]!;
    const text = aug('A gate.', g);
    expect(text).toMatch(/It is (shut|fully open)\./);
    expect(text).toMatch(/furtado last set it/);
  });

  it('⚠ a padlocked turnout stays shut for a keyless turn, and the log says so', async () => {
    const g = gate();
    rostered(g, [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [22, 4] }]);
    g.lock();
    await g.reconcileScheduled(now);
    now += DAY;
    await g.reconcileScheduled(now);
    expect(g.getOpening()).toBe(0);
    expect(g.getWorkLog().some((r) => r.by.endsWith('#refused'))).toBe(true);
  });
});
