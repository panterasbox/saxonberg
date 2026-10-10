/**
 * The snowbound way (the climate build, W8) — a path that closes when
 * the snow lying where it starts is deeper than its threshold, read from
 * the floor (whose depth is the kernel's one snow function), refusing in
 * words that name the snow, physical only.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import SnowboundExit from '../idea/SnowboundExit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { installModes } from './transport-fixtures';

const HOUR = 3_600;
let depthM = 0;

/** A pass out of a room whose floor reads `depthM` of snow. */
function pass(closesAboveM = 0.5): SnowboundExit {
  const zone = makeStuff(() => new CartesianZone());
  const here = makeStuff(() => new SingletonCartesianLocation());
  const there = makeStuff(() => new SingletonCartesianLocation());
  zone.addLocation(here, 0, 0, 0);
  zone.addLocation(there, 0, 1, 0);
  vi.spyOn(here, 'getFloor').mockReturnValue({
    getSnowDepthM: () => depthM,
  } as never);
  return makeStuff(
    () =>
      new SnowboundExit({
        direction: 'north',
        source: here as never,
        destination: there as never,
        media: ['ground'],
        closesAboveM,
      }),
  );
}

function at(gameSeconds: number): void {
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(gameSeconds, 's'));
}

beforeEach(() => {
  StuffApi.clearAll();
  installModes();
  depthM = 0;
  at(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a snowbound way reads the snow', () => {
  it('⭐ open in autumn, shut in winter, open again in spring', async () => {
    const p = pass(0.5);
    depthM = 0.05;
    at(1 * HOUR);
    await p.refreshCrossing();
    expect(p.isBlocked()).toBe(false);

    depthM = 0.9;
    at(100 * HOUR);
    await p.refreshCrossing();
    expect(p.isBlocked()).toBe(true);

    depthM = 0.1;
    at(200 * HOUR);
    await p.refreshCrossing();
    expect(p.isBlocked()).toBe(false);
  });

  it('the refusal names the snow, and the mover stays put', async () => {
    const p = pass(0.2);
    depthM = 0.4;
    expect(await p.applyTraversal({} as Stuff)).toBe(false);
    const guard = p.canTraverse({} as Stuff & Containable, 'walk');
    expect(guard.ok).toBe(false);
    if (guard.ok) return;
    expect(guard.gate).toBe('blocked');
    expect(guard.reason).toMatch(/under snow/);
  });

  it('two reads inside one weather segment agree; the next segment picks up the change', async () => {
    const p = pass(0.5);
    depthM = 0.1;
    at(1 * HOUR);
    await p.refreshCrossing();
    depthM = 0.9;
    at(3 * HOUR);
    await p.refreshCrossing();
    expect(p.isBlocked()).toBe(false);
    at(9 * HOUR);
    await p.refreshCrossing();
    expect(p.isBlocked()).toBe(true);
  });

  it('a room with no floor has no snow on it — the way is open', async () => {
    const p = pass(0.5);
    vi.spyOn(p.getSource() as never as { getFloor(): unknown }, 'getFloor').mockReturnValue(null);
    await p.refreshCrossing();
    expect(p.isBlocked()).toBe(false);
  });

  it('the threshold is validated', () => {
    const p = makeStuff(() => new SnowboundExit());
    expect(() => p.setClosesAboveM(0)).toThrow(TypeError);
    expect(() => p.setClosesAboveM(Number.NaN)).toThrow(TypeError);
  });
});
