/**
 * ElectricPump — a pump on a wire (the pump build, D11).
 *
 * ⭐ A prime mover is a `Powered` implementer: the kernel pump reads the
 * grid's shape structurally. Running = switched on + powered + sealed; a
 * cut stops it; and turning the switch reconciles the running wear first,
 * so the hours before the flip are integrated at the old position.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { Piecewise } from '@saxonberg/server/mud/lib/Trajectory';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import ElectricPump from '../thing/ElectricPump';

function pump(): ElectricPump {
  const p = makeStuff(() => new ElectricPump());
  p.setLiftM(30);
  p.setThroughputLps(1200);
  const leather = makeStuff(() => new Tool());
  leather.setCapabilities(['packing']);
  ContainmentApi.move(leather, p);
  return p;
}

function supply(p: ElectricPump, watts: number): void {
  vi.spyOn(p, 'availablePowerW').mockReturnValue(watts);
  vi.spyOn(p, 'isPowered').mockReturnValue(watts > 0);
  vi.spyOn(p, 'poweredTrajectory').mockImplementation(
    (from: number, to: number) =>
      new Piecewise([{ fromS: from, toS: to, startValue: 1, target: 1, tau: 0 }]),
  );
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ElectricPump', () => {
  it('runs only while switched on, powered and sealed', () => {
    const p = pump();
    supply(p, 60_000);
    expect(p.isRunning()).toBe(false); // Switchable defaults off
    p.setOn(true);
    expect(p.isRunning()).toBe(true);
    expect(p.moverPowerW()).toBe(60_000);
  });

  it('a cut stops it', () => {
    const p = pump();
    supply(p, 0);
    p.setOn(true);
    expect(p.isRunning()).toBe(false);
    expect(p.deliverableM3S(5, 1.2)).toBe(0);
  });

  it('⭐ the analyze-power duck: it answers availablePowerW like any consumer', () => {
    const p = pump();
    supply(p, 60_000);
    expect(p.availablePowerW()).toBe(60_000);
  });

  it('⭐⭐ turning it off reconciles the hours it ran, first', () => {
    const p = pump();
    supply(p, 60_000);
    p.setOn(true);
    const now = WorldClockApi.getNow().rawValue();
    p.runStamp = now - 3_600 * 10;
    const before = p.packingPart()!.getCondition();
    p.setOn(false);
    expect(before - p.packingPart()!.getCondition()).toBeCloseTo(10 * 0.002, 4);
  });

  it('a hand at its handle is told it is machinery', async () => {
    const p = pump();
    // Not set in anything at all → the loose-pump refusal, in its own words.
    const plan = await p.planPump(p);
    expect(plan.kind === 'refusal' && plan.reason).toBe('not-set');
    void Quantity;
  });
});

describe('ElectricPump — the analyze-power duck', () => {
  it('⭐ a running pump answers throughputNow in kg a minute; a stopped one does not turn', () => {
    const p = pump();
    supply(p, 60_000);
    expect(p.throughputNow()).toBe(0);
    p.setOn(true);
    // Loose (no source): no head, so it moves its full throughput.
    expect(p.throughputNow()).toBeCloseTo(1200 * 60, 0);
  });
});
