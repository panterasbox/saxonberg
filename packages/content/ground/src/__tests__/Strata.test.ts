/**
 * `StrataMixin` — the five position reads, lifted out of `WorkingMixin` so
 * the second consumer does not have to depend on a mine.
 *
 * ⭐ The reason the extraction build's quarry can start at W1: knowing
 * where you are in the column is the GROUND's business; cutting it is the
 * trade's. `WorkingMixin` composes over this and keeps the cutting.
 *
 * ⚠ The one thing worth a test of its own is the CONVERSION. A cell is a
 * room somebody cut; the deposit speaks metres, because rock does not know
 * what cell size anybody chose. Getting that wrong would put a gallery in
 * the wrong stratum — silently, and consistently, which is the worst kind.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { StrataMixin, STRATA_MIXIN } from '../lib/Strata';

class TestGround extends StrataMixin(CartesianLocation) {}

/** A zone that answers a cell size and a deposit citation, and nothing else. */
function stubZone(cellSize: number, deposit: string | null) {
  return {
    getCellSize: () => cellSize,
    lookupField: async <T,>(f: string): Promise<T | null> =>
      (f === 'deposit' ? (deposit as unknown as T) : null),
  };
}

function room(coords: [number, number, number], zone: unknown): TestGround {
  // ⚠ `makeStuff`, not `StuffApi.createSync`: since the ground build every
  // Location composes `PostRegistrationMixin` at the base (that is what
  // gives it a floor), and `createSync` refuses a class that needs async
  // setup. This test is about the position reads, not about minting rooms.
  const r = makeStuff(() => new TestGround());
  r.setCoordinates(coords);
  (r as unknown as { getZone(): unknown }).getZone = () => zone;
  return r;
}

describe('StrataMixin', () => {
  beforeEach(() => StuffApi.clearAll());

  it('is registered and narrows', () => {
    const r = room([0, 0, 0], stubZone(1, null));
    expect(MixinApi.isActive(r, STRATA_MIXIN)).toBe(true);
  });

  it('getCell is the room’s own coordinates', () => {
    expect(room([3, -4, -2], stubZone(1, null)).getCell()).toEqual([3, -4, -2]);
  });

  it('⭐ metresOf multiplies by the ZONE’s cellSize, on every axis', () => {
    const r = room([3, -4, -2], stubZone(5, null));
    expect(r.metresOf(r.getCell())).toEqual([15, -20, -10]);
  });

  it('a zone with no cellSize means one metre per cell', () => {
    const r = room([3, -4, -2], { lookupField: async () => null });
    expect(r.metresOf(r.getCell())).toEqual([3, -4, -2]);
  });

  it('no zone → no deposit, and no throw', async () => {
    const r = makeStuff(() => new TestGround());
    (r as unknown as { getZone(): unknown }).getZone = () => null;
    await expect(r.getDeposit()).resolves.toBeNull();
    await expect(r.sampleHere()).resolves.toBeNull();
  });

  it('a zone citing nothing → no deposit', async () => {
    const r = room([0, 0, 0], stubZone(1, null));
    await expect(r.getDeposit()).resolves.toBeNull();
  });

  it('⚠ a citation naming no row degrades to null rather than throwing', async () => {
    // Barren ground is the honest reading of an authoring fault — but the
    // fault goes to the log, because "barren" is what a real barren cell
    // says and the two must not be indistinguishable.
    const r = room([0, 0, 0], stubZone(1, '/no/such/deposit'));
    await expect(r.getDeposit()).resolves.toBeNull();
    await expect(r.sampleHere()).resolves.toBeNull();
  });

  it('getGroundSeed is stable for one room, with no locality to resolve', async () => {
    const r = room([0, 0, 0], stubZone(1, null));
    const a = await r.getGroundSeed();
    const b = await r.getGroundSeed();
    expect(a).toBe(b);
    expect(Number.isFinite(a)).toBe(true);
  });
});
