/**
 * `GroundPointMixin` — the position reads for a thing STANDING in a
 * place, rather than for the place itself.
 *
 * ⭐⭐ **This is the mixin that makes *a bore is a point, not a place*
 * affordable.** A hole mints no room and has no inside; the thing you
 * stand at is a fixture in an ordinary surface Location, and it asks the
 * ground through its container. Without this, a hole would have had to be
 * a room to know where it was — and then every hole would be a room.
 *
 * ⚠ The two things worth a test of their own:
 *
 *  1. **The conversion.** The horizontal pair scales by the zone's
 *     `cellSize` and the DEPTH does not, because a bore is sunk and
 *     logged in metres and the room's own `z` is irrelevant to it.
 *     Getting this wrong would put a well in the wrong stratum —
 *     silently and consistently, which is the worst kind.
 *  2. **The null path.** A wellhead in a cart, a pocket or nowhere says
 *     *it is not standing on anything* rather than reading a stale
 *     column.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { GroundPointMixin, GROUND_POINT_MIXIN } from '../lib/GroundPoint';
import Deposit, { type FluidBody } from '../idea/Deposit';

class TestFixture extends GroundPointMixin(Thing) {}

const DEPOSIT_PATH = '/test/idea/deposit/fixture';
const BRINE = '/stuff/idea/material/bulk/salt-water';
const WATER = '/stuff/idea/material/bulk/water';

function stubZone(cellSize: number, deposit: string | null) {
  return {
    getCellSize: () => cellSize,
    lookupField: async <T,>(f: string): Promise<T | null> =>
      f === 'deposit' ? (deposit as unknown as T) : null,
  };
}

/** A surface room with coordinates and a zone — what a derrick stands in. */
function room(coords: [number, number, number], zone: unknown): CartesianLocation {
  const r = makeStuff(() => new CartesianLocation());
  r.setCoordinates(coords);
  (r as unknown as { getZone(): unknown }).getZone = () => zone;
  return r;
}

/** The fixture, standing in `place` (or nowhere when `place` is null). */
function standing(place: unknown): TestFixture {
  const f = makeStuff(() => new TestFixture());
  (f as unknown as { getContainer(): unknown }).getContainer = () => place;
  return f;
}

const BODY: FluidBody = {
  key: 'salt-leg',
  fluid: BRINE,
  trap: {
    crest: [0, 0, -110],
    strike: 40,
    alongExtent: 300,
    acrossExtent: 200,
    closureM: 30,
  },
  topZ: -110,
  baseZ: -140,
  charge: true,
  capacityL: 50_000,
};

function installDeposit(): Deposit {
  const d = makeStuffAtPath(() => new Deposit(), DEPOSIT_PATH) as Deposit;
  d.setName('fixture');
  d.setStratigraphy([{ toZ: -400, host: '/stuff/idea/material/rock/slate' }]);
  d.setWaterTable(-45);
  d.setLode(null);
  d.setFluids([BODY]);
  return d;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
});

describe('GroundPointMixin', () => {
  it('is registered and narrows', () => {
    expect(
      MixinApi.isActive(standing(room([0, 0, 0], stubZone(1, null))), GROUND_POINT_MIXIN),
    ).toBe(true);
  });

  it('⭐ metresHere scales the HORIZONTAL pair by cellSize and the depth NOT at all', () => {
    const f = standing(room([3, -4, 0], stubZone(10, null)));
    expect(f.metresHere(120)).toEqual([30, -40, -120]);
  });

  it('a depth is always DOWN, however it is handed in', () => {
    // A bore's depth is a positive number everybody says out loud; the
    // column's z is negative down. One `Math.abs` rather than a contract
    // nobody can remember at the call site.
    const f = standing(room([0, 0, 0], stubZone(1, null)));
    expect(f.metresHere(-120)).toEqual([0, 0, -120]);
    expect(f.metresHere(0)).toEqual([0, 0, 0]);
  });

  it('⚠ the room\'s own z is IGNORED — the hole starts at the collar', () => {
    const deep = standing(room([1, 1, -8], stubZone(10, null)));
    expect(deep.metresHere(50)).toEqual([10, 10, -50]);
  });

  it('a zone with no cellSize means one metre per cell', () => {
    const f = standing(room([3, -4, 0], { lookupField: async () => null }));
    expect(f.metresHere(2)).toEqual([3, -4, -2]);
  });
});

describe('⚠ nothing to stand on', () => {
  it('in nobody\'s hands at all: every read is null or empty, and nothing throws', async () => {
    const f = standing(null);
    expect(f.groundPlace()).toBeNull();
    expect(f.metresHere(10)).toBeNull();
    await expect(f.getDeposit()).resolves.toBeNull();
    await expect(f.sampleAtDepth(10)).resolves.toBeNull();
    await expect(f.fluidAtDepth(120)).resolves.toBeNull();
    await expect(f.structuresHere(0.1)).resolves.toEqual([]);
    await expect(f.getGroundAddress()).resolves.toBe('');
  });

  it('⛔ a container that is not a PLACE is not ground', async () => {
    // A crate, a cart, a pocket. It has contents, it is not the ground —
    // and the tell is that it answers no coordinates.
    const crate = makeStuff(() => new Thing());
    const f = standing(crate);
    expect(f.groundPlace()).toBeNull();
    await expect(f.fluidAtDepth(120)).resolves.toBeNull();
  });

  it('a place citing no deposit reads barren rather than throwing', async () => {
    const f = standing(room([0, 0, 0], stubZone(1, null)));
    await expect(f.getDeposit()).resolves.toBeNull();
    await expect(f.structuresHere(0.1)).resolves.toEqual([]);
  });

  it('⚠ a citation naming no row degrades to null, and logs', async () => {
    const f = standing(room([0, 0, 0], stubZone(1, '/no/such/deposit')));
    await expect(f.getDeposit()).resolves.toBeNull();
    await expect(f.fluidAtDepth(120)).resolves.toBeNull();
  });
});

describe('the reads, through the container\'s zone', () => {
  it('resolves the deposit the room\'s zone cites', async () => {
    installDeposit();
    const f = standing(room([0, 0, 0], stubZone(1, DEPOSIT_PATH)));
    expect((await f.getDeposit())?.getName()).toBe('fixture');
  });

  it('reads the structure under the thing it is standing at', async () => {
    installDeposit();
    const f = standing(room([0, 0, 0], stubZone(1, DEPOSIT_PATH)));
    const structures = await f.structuresHere(0.1);
    expect(structures).toHaveLength(1);
    expect(structures[0]!.key).toBe('salt-leg');
    expect(structures[0]!.crestDepthM).toBe(110);
  });

  it('⭐ a thing one cell over reads the SAME structure from a different point', async () => {
    installDeposit();
    const here = standing(room([0, 0, 0], stubZone(10, DEPOSIT_PATH)));
    const there = standing(room([5, 0, 0], stubZone(10, DEPOSIT_PATH)));
    const a = (await here.structuresHere(0.1))[0]!;
    const b = (await there.structuresHere(0.1))[0]!;
    // Same truth, different distance to the crest, different observation.
    expect(b.crestDepthM).toBe(a.crestDepthM);
    expect(b.distanceM).toBeGreaterThan(a.distanceM);
    expect(b.readingDepthM).not.toBe(a.readingDepthM);
  });

  it('reads the fluid at depth: the water above the leg, the brine in it', async () => {
    installDeposit();
    const f = standing(room([0, 0, 0], stubZone(1, DEPOSIT_PATH)));
    expect((await f.fluidAtDepth(10))).toBeNull();
    expect((await f.fluidAtDepth(60))!.materialPath).toBe(WATER);
    expect((await f.fluidAtDepth(120))!.materialPath).toBe(BRINE);
    expect((await f.fluidAtDepth(120))!.bodyKey).toBe('salt-leg');
  });

  it('samples the host rock at depth — what the next metre costs', async () => {
    installDeposit();
    const f = standing(room([0, 0, 0], stubZone(1, DEPOSIT_PATH)));
    const sample = (await f.sampleAtDepth(100))!;
    expect(sample.hostPath).toBe('/stuff/idea/material/rock/slate');
    expect(sample.hardnessMPa).toBeGreaterThan(0);
  });

  it('the seed is stable for one point and derives from the address alone', async () => {
    installDeposit();
    const f = standing(room([0, 0, 0], stubZone(1, DEPOSIT_PATH)));
    const a = await f.getGroundSeed();
    expect(await f.getGroundSeed()).toBe(a);
    // With no locality to resolve the address is empty — and the seed is
    // still the address's, which is the property that matters.
    expect(a).toBe(Deposit.seedFor(await f.getGroundAddress()));
  });
});
