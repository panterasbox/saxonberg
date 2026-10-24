/**
 * The ford — ⭐ **a crossing that reads the body, not a threshold** (river
 * D10, requirement 7).
 *
 * The claims:
 *
 *  - the water at the crossing (how deep, how fast) is READ from the river,
 *    not authored anywhere;
 *  - the SAME water a tall body wades is over a short one's head — then it
 *    is a swim, refused in the water's words;
 *  - depth × speed past what a body can stand against takes its feet part
 *    way: the crossing is the exit's, and the body is handed to the river;
 *  - an install with **no water pack** has a ford that is simply a road.
 *
 * ⚠ The water here is a stand-in answering by SHAPE: what is under test is
 * the MECHANISM (water and body in, verdict out). The drive crosses the
 * real Delight.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import FordExit from '../idea/FordExit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Locale from '@saxonberg/server/mud/platform/location/Locale';
import { installModes } from './transport-fixtures';
import { LineFrameMixin } from '@saxonberg/server/mud/lib/expanse/LineFrame';

const RIVER = '/stuff/idea/Watercourse/delight';

/** A stand-in river frame (the kernel's `LineFrame`): the water at the ford, and who it was handed. */
class FakeRiver extends LineFrameMixin(Idea) {
  public depthM = 0.4;
  public mps = 0.8;
  public handed: Stuff[] = [];
  override async locate(_c: string) {
    return { course: 'delight', km: 0.3, across: 15 };
  }
  override async waterAt() {
    return { depthM: this.depthM, currentMps: this.mps, widthM: 12 };
  }
  override async handIn(thing: Stuff) {
    this.handed.push(thing);
    return true;
  }
}

let water: FakeRiver;
let warren: FakeRiver;

function installWater(): void {
  water = makeStuffAtPath(() => new FakeRiver(), RIVER);
  warren = water;
  const real = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) =>
    path === RIVER ? Promise.resolve(water as unknown as Stuff) : real(path)) as typeof StuffApi.singleton);
}

function ford(): FordExit {
  const zone = makeStuff(() => new CartesianZone());
  const here = makeStuff(() => new Locale());
  const there = makeStuff(() => new Locale());
  zone.addLocation(here, 0, 0, 0);
  zone.addLocation(there, 0, 1, 0);
  return makeStuff(
    () =>
      new FordExit({
        direction: 'south',
        source: here as never,
        destination: there as never,
        media: ['ground'],
        crossesAt: { frame: RIVER, cite: 'mouth-0.3' },
      }),
  );
}

/** A body of a given height and weight, as the ford reads one. */
function body(statureM: number, kg: number): Stuff & Containable {
  return {
    getSpecies: () => ({ getStature: () => statureM }),
    getMass: () => Quantity.of(kg, 'kg'),
    isTangible: () => true,
  } as unknown as Stuff & Containable;
}

beforeEach(() => {
  StuffApi.clearAll();
  installModes();
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(0, 's'));
  // The bodies are organisms: a ford reads their species' stature (W16 — by
  // the kernel predicate, never by shape).
  vi.spyOn(MixinApi, 'isOrganism').mockImplementation(((x: { getSpecies?: unknown }) => x?.getSpecies !== undefined) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the ford reads the body (river D10)', () => {
  it('⭐ the same water: a tall heavy body wades across, a short light one is taken off its feet', () => {
    const w = { depthM: 0.6, currentMps: 1.0 };
    expect(ford().verdictFor(body(1.85, 90), w)).toBe('across');
    expect(ford().verdictFor(body(1.3, 35), w)).toBe('swept');
  });

  it('over your head it is a swim, whoever you are', () => {
    const w = { depthM: 1.4, currentMps: 0.1 };
    expect(ford().verdictFor(body(1.5, 60), w)).toBe('over-head');
    expect(ford().verdictFor(body(1.9, 90), w)).toBe('across');
  });

  it('the refusal at the water’s edge names the water — and only over your head', async () => {
    installWater();
    water.depthM = 1.6;
    const f = ford();
    const g = await f.canTraverse(body(1.6, 60), 'walk');
    expect(g.ok).toBe(false);
    expect(!g.ok && g.reason).toMatch(/over your head/);
  });

  it('⭐ a crossing that fails part-way is the exit’s: the river is handed the body', async () => {
    installWater();
    water.depthM = 0.5;
    water.mps = 1.2;
    const f = ford();
    const short = body(1.3, 35);
    expect(await f.applyTraversal(short)).toBe(true);
    expect(warren.handed).toEqual([short]);
    // A body that stands in it wades across as on any road.
    expect(await f.applyTraversal(body(1.9, 95))).toBe(false);
  });

  it('⚠ with no water pack installed, a ford is just a road', async () => {
    const f = ford();
    expect(await f.waterNow()).toBeNull();
    expect(await f.applyTraversal(body(1.3, 35))).toBe(false);
  });

  it('a ford that names no water is a road', async () => {
    installWater();
    const f = makeStuff(() => new FordExit());
    expect(await f.waterNow()).toBeNull();
  });
});
