/**
 * Propel — ⭐ a small boat moved by its people's effort (river D21): the
 * stroke's way against the current, the bottom a pole needs, and the
 * water rougher than her freeboard.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Propel, type PaddleWater, type PropelHeading } from '../lib/Propel';

afterEach(() => vi.restoreAllMocks());

interface Rig {
  propel: Propel;
  water: PaddleWater & { destinationOf: ReturnType<typeof vi.fn> };
  boat: { capsize: ReturnType<typeof vi.fn> };
  told: string[];
  cancelled: () => boolean;
}

function rig(opts: {
  heading: PropelHeading;
  currentMps?: number;
  depthM?: number;
  roughness?: number;
  needs?: 'water' | 'bottom';
  reachM?: number;
  freeboardM?: number;
}): Rig {
  const told: string[] = [];
  let cancelled = false;
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isExerting').mockReturnValue(false);
  vi.spyOn(ContainmentApi, 'move').mockImplementation(() => undefined);
  vi.spyOn(SchedulerApi, 'cancel').mockImplementation((() => {
    cancelled = true;
  }) as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation((() => {
    const chain = {
      topic: () => chain,
      toSelf: (m: unknown) => {
        told.push(String(m));
        return chain;
      },
      send: () => undefined,
    };
    return chain;
  }) as never);
  const room = { id: 'room' };
  const part = {
    getNeeds: () => opts.needs ?? 'water',
    getReachM: () => opts.reachM ?? 0,
    getEfficiency: () => 0.5,
    getPropulsionKind: () => (opts.needs === 'bottom' ? 'pole' : 'paddle'),
  };
  const boat = {
    isDestroyed: () => false,
    isCapsized: () => false,
    propulsion: () => part,
    getContainer: () => room,
    crew: () => [{}],
    getHull: () => ({ beamM: 0.9, draftM: 0.15 }),
    freeboardNowM: () => opts.freeboardM ?? 0.3,
    capsize: vi.fn(),
  };
  const actor = { getContainer: () => boat };
  const water = {
    riverAt: vi.fn(async () => ({
      currentMps: opts.currentMps ?? 0,
      depthM: opts.depthM ?? 2,
      roughness: opts.roughness ?? 0,
      barSide: null,
    })),
    refusalOf: vi.fn(async () => null),
    destinationOf: vi.fn(async () => ({ id: 'next' })),
    launchPlaceFor: vi.fn(async () => null),
    hailRangeM: () => 100,
  };
  const propel = new Propel({
    actor: actor as never,
    boat: boat as never,
    heading: opts.heading,
    inside: false,
    hard: false,
    water: water as never,
  });
  return { propel, water: water as never, boat, told, cancelled: () => cancelled };
}

/** Run `n` beats of paddling. */
async function beats(r: Rig, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await (r.propel as unknown as { beat(): Promise<void> }).beat();
  }
}

describe('Propel (river D21)', () => {
  it('⭐ downstream the current adds to the stroke: she makes a hail’s way sooner', async () => {
    const still = rig({ heading: 'downstream', currentMps: 0 });
    await beats(still, 3);
    const stillMoves = still.water.destinationOf.mock.calls.length;
    vi.restoreAllMocks();
    const running = rig({ heading: 'downstream', currentMps: 1.5 });
    await beats(running, 3);
    expect(running.water.destinationOf.mock.calls.length).toBeGreaterThan(stillMoves);
    expect(running.water.destinationOf).toHaveBeenCalledWith(expect.anything(), 'downstream');
  });

  it('⭐⭐ upstream against a current stronger than you, you lose ground — and are told so, once', async () => {
    const r = rig({ heading: 'upstream', currentMps: 3 });
    await beats(r, 5);
    expect(r.water.destinationOf).not.toHaveBeenCalled();
    expect(r.told.filter((t) => /current is stronger than you/.test(t))).toHaveLength(1);
  });

  it('upstream in slack water a paddler makes way', async () => {
    const r = rig({ heading: 'upstream', currentMps: 0.1 });
    await beats(r, 10);
    expect(r.water.destinationOf).toHaveBeenCalledWith(expect.anything(), 'upstream');
  });

  it('⭐ a pole needs a bottom: over deep water it finds none and the poling ends', async () => {
    const r = rig({ heading: 'downstream', needs: 'bottom', reachM: 3, depthM: 5 });
    await beats(r, 1);
    expect(r.cancelled()).toBe(true);
    expect(r.told.join(' ')).toMatch(/finds no bottom/);
  });

  it('⭐ water rougher than her freeboard swamps her', async () => {
    const r = rig({ heading: 'downstream', roughness: 1, freeboardM: 0.2 });
    await beats(r, 1);
    expect(r.boat.capsize).toHaveBeenCalled();
    expect(r.cancelled()).toBe(true);
  });

  it('to a bank: one stroke across and she grounds, and the paddling ends', async () => {
    const r = rig({ heading: 'left' });
    await beats(r, 3);
    expect(r.water.destinationOf).toHaveBeenCalledWith(expect.anything(), 'left');
    expect(r.cancelled()).toBe(true);
  });
});
