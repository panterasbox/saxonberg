/**
 * A well draws on water that can run low (water-supply D13).
 *
 *  - A LONE well has a body of its own: drawn down, it runs dry, and it
 *    recovers by what seeps back in a day.
 *  - A well on an AQUIFER reads the shared surface: the water stands
 *    (collar − surface) down, and a shallow well goes dry while a deep one
 *    on the same water still reaches it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Well from '../Well';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

const DAY = 86_400;
let now = 20 * DAY;

beforeEach(() => {
  StuffApi.clearAll();
  now = 20 * DAY;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    return m;
  }, '/stuff/idea/material/bulk/water');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function well(depth: number, opts: { aquifer?: string; collar?: number; body?: number } = {}): Well {
  return makeStuff(() => {
    const w = new Well();
    w.setDepthM(depth);
    w.interiorBulk = true;
    (w as unknown as { interiorCapacity: unknown }).interiorCapacity = Quantity.of(1e9, 'L');
    if (opts.aquifer) w.setAquifer(opts.aquifer);
    if (opts.collar !== undefined) w.setCollarM(opts.collar);
    if (opts.body !== undefined) w.setBodyM3(opts.body);
    return w;
  });
}

describe('⭐ a lone well has a body of its own', () => {
  it('drawn down it runs dry; a day later some has seeped back', async () => {
    const w = well(6, { body: 2 });
    expect(await w.standingAvailableL()).toBe(2000);
    expect(await w.liftInto(1500)).toBe(1500);
    expect(await w.liftInto(1500)).toBe(500);
    expect(await w.standingAvailableL()).toBe(0);
    now += DAY / 4;
    expect(await w.standingAvailableL()).toBeGreaterThan(0);
  });

  it('a lone well still stands its water at its bottom — the pump reads it as before', () => {
    expect(well(14).standingDepthM()).toBe(14);
  });
});

describe('⭐⭐ wells on one aquifer share one level', () => {
  function aquifer(surface: number) {
    const state = { surface, drawn: 0 };
    const a = {
      surfaceM: () => state.surface,
      getBottomM: () => 430,
      recordDraw: (l: number) => {
        state.drawn += l;
        return l;
      },
      ensureLocality: async () => {},
      isDestroyed: () => false,
    };
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(a as never);
    return state;
  }

  it('the water stands (collar − surface) down, and draws are the aquifer’s', async () => {
    const state = aquifer(446);
    const shallow = well(6, { aquifer: '/stuff/idea/Aquifer/test', collar: 450 });
    expect(await shallow.standingAvailableL()).toBe(Infinity);
    expect(shallow.standingDepthM()).toBe(4);
    await shallow.liftInto(300);
    expect(state.drawn).toBe(300);
  });

  it('⭐ the shallow well goes dry first; the deep one on the same water still reaches it', async () => {
    const state = aquifer(446);
    const shallow = well(6, { aquifer: '/stuff/idea/Aquifer/test', collar: 450 });
    const deep = well(14, { aquifer: '/stuff/idea/Aquifer/test', collar: 450 });
    state.surface = 442; // a dry year: the till has sunk below the shallow well's bottom
    expect(await shallow.standingAvailableL()).toBe(0);
    expect(await deep.standingAvailableL()).toBe(Infinity);
  });

  it('a hillside well stands its water deeper than the yard’s (R9)', async () => {
    aquifer(446);
    const hillside = well(14, { aquifer: '/stuff/idea/Aquifer/test', collar: 458 });
    await hillside.standingAvailableL();
    expect(hillside.standingDepthM()).toBe(12);
  });
});
