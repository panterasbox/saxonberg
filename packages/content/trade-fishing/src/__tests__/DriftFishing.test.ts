/**
 * ⭐ Fishing from a drifting boat (river D34): the bite falls away as the
 * drift quickens — at `water.fishery.driftKillMps` nothing takes — and a
 * boat held still (beached, on a killick) fishes as the bank does.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { FishingEngagement } from '../lib/FishingEngagement';

afterEach(() => vi.restoreAllMocks());

function overWater(currentMps: number, underWay: boolean): number {
  const room = { isUnderWay: () => underWay, currentFor: () => currentMps, getContainer: () => null };
  const boat = { getContainer: () => room };
  const angler = { getContainer: () => boat };
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
  vi.spyOn(MixinApi, 'isShore').mockImplementation(((x: unknown) => x === room) as never);
  vi.spyOn(MixinApi, 'isWaterPlace').mockImplementation(((x: unknown) => x === room) as never);
  const e = Object.create(FishingEngagement.prototype) as { actor: unknown; driftFactor(): number };
  e.actor = angler;
  return e.driftFactor();
}

describe('drift fishing (river D34)', () => {
  it('a boat held still fishes as the bank does', () => {
    expect(overWater(2, false)).toBe(1);
  });

  it('⭐ the bite falls away as the drift quickens, and at a meter a second nothing takes', () => {
    const slow = overWater(0.2, true);
    const quick = overWater(0.7, true);
    expect(slow).toBeGreaterThan(quick);
    expect(overWater(1.2, true)).toBe(0);
  });
});
