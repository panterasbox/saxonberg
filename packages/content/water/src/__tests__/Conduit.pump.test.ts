/**
 * A pumped main holds its pump (the pump build, D10/D11).
 *
 * ⭐⭐ Before the pump build a pumped conduit's pump was arithmetic with no
 * caller in production. Now the main HOLDS a pump, and the sync subset of
 * the six words is what a tap uphill reads: a pumped main whose pump is not
 * running is `off`, the same word as a closed valve. A gravity main does
 * not care. And the bill reads through the fitted pump.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import Pump from '@saxonberg/server/mud/platform/thing/Pump';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import { Piecewise } from '@saxonberg/server/mud/lib/Trajectory';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Conduit from '../thing/Conduit';

function main(headM: number): Conduit {
  return makeStuff(() => {
    const c = new Conduit();
    c.setHeadM(headM);
    c.setCapacityM3S(1.2);
    c.setOn(true);
    return c;
  });
}

/** A pump on a fake supply — the Powered shape, read structurally. */
function poweredPump(watts: number, on = true): Pump {
  const p = makeStuff(() => new Pump());
  p.setLiftM(30);
  p.setThroughputLps(1200);
  const leather = makeStuff(() => new Tool());
  leather.setCapabilities(['packing']);
  ContainmentApi.move(leather, p);
  const host = p as unknown as Record<string, unknown>;
  host.availablePowerW = () => watts;
  host.isOn = () => on;
  host.poweredTrajectory = (from: number, to: number) =>
    new Piecewise([{ fromS: from, toS: to, startValue: watts > 0 ? 1 : 0, target: watts > 0 ? 1 : 0, tau: 0 }]);
  return p;
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a pumped main and its pump', () => {
  it('a gravity main delivers with no pump at all', () => {
    expect(main(15).supplyStateNow()).toBeNull();
  });

  it('⭐ a pumped main with no pump fitted is off', () => {
    expect(main(-5).supplyStateNow()).toBe('off');
  });

  it('a pumped main whose pump is switched off is off', () => {
    const c = main(-5);
    ContainmentApi.move(poweredPump(60_000, false), c);
    expect(c.supplyStateNow()).toBe('off');
  });

  it('…and whose pump has lost its supply is off too (the six words have no unpowered)', () => {
    const c = main(-5);
    ContainmentApi.move(poweredPump(0), c);
    expect(c.supplyStateNow()).toBe('off');
  });

  it('a pumped main with a running pump delivers', () => {
    const c = main(-5);
    ContainmentApi.move(poweredPump(60_000), c);
    expect(c.supplyStateNow()).toBeNull();
  });

  it('a cut line is cut, whatever the pump is doing', () => {
    const c = main(-5);
    ContainmentApi.move(poweredPump(60_000), c);
    c.setCut(true);
    expect(c.supplyStateNow()).toBe('cut');
  });

  it('the bill reads through the fitted pump', () => {
    const c = main(-5);
    const p = poweredPump(60_000);
    ContainmentApi.move(p, c);
    expect(c.pumpWattsFor(1.2)).toBeCloseTo(p.powerForDuty(5, 1.2), 6);
    // ρ·g·h·Q/η at the intake's own numbers: ~98 kW, against a 60 kW band.
    expect(c.pumpWattsFor(1.2)).toBeCloseTo(98_100, -2);
  });

  it('a main holds a pump and nothing else, and only one', () => {
    const c = main(-5);
    expect(c.canAddContainable(makeStuff(() => new Good()) as never).ok).toBe(false);
    const a = poweredPump(60_000);
    ContainmentApi.move(a, c);
    expect(c.pumpFitted()).toBe(a);
    expect(c.canAddContainable(poweredPump(60_000) as never).ok).toBe(false);
  });
});
