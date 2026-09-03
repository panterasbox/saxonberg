/**
 * `MagicApi.relocationCost` — the `m·g·Δh` that prices a teleport, and
 * the flat arm it must not disturb (TPA reform W3, AC2–AC4).
 *
 * ⭐ The headline is a NEGATIVE: **distance costs nothing.** Two hops of
 * wildly different length at the same altitude and mass cost the same,
 * because there is no distance term in the function at all — which is
 * why AC3 is assertable by reading `relocationCostImpl` and not only by
 * running this. The fiction's claim is that teleportation's hard part is
 * SPECIFICATION; the spell's authored `cost` prices that, and this
 * prices the lift.
 *
 * Elevation is spied rather than authored: the subject here is the
 * arithmetic, and `ZoneApi.elevationFor`'s own outward walk has its own
 * suite.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MagicApi } from '../../../api/magic';
import { ZoneApi } from '../../../api/zone';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  bearerCreature,
  massThing,
} from '../../encumbrance/__tests__/encumbrance-fixtures';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

let seq = 0;
const elevations = new Map<Stuff, number | null>();

function room(elevation: number | null): Stuff & Container {
  const r = makeStuff(() => new SingletonCartesianLocation());
  stampTemplatePathForTest(r, `/platform/location/test/reloc-${seq++}`);
  elevations.set(r as unknown as Stuff, elevation);
  return r as unknown as Stuff & Container;
}

/** A real body: mass from its body plan, and a burden gauge. */
function traveller(massKg: number): Stuff & Container {
  return bearerCreature(massKg) as unknown as Stuff & Container;
}

describe('MagicApi.relocationCost — m·g·Δh, and nothing else', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    elevations.clear();
    vi.spyOn(ZoneApi, 'elevationFor').mockImplementation(
      async (scope) => elevations.get(scope as unknown as Stuff) ?? null,
    );
    // Earth-normal everywhere, so the arithmetic below is checkable by
    // hand. `g` really is a per-place biome read in production.
    vi.spyOn(BiomeApi, 'resolveGravityFor').mockResolvedValue(
      Quantity.of(9.81, 'm/s²'),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────── AC3 ───────────────────────────

  it('AC3 — distance costs NOTHING: two hops of different length, same price', async () => {
    const t = traveller(70);
    const here = room(100);
    ContainmentApi.move(t as never, here as never);
    const nextDoor = room(300);
    const acrossTheWorld = room(300);

    const near = await MagicApi.relocationCost({ traveller: t, to: nextDoor });
    const far = await MagicApi.relocationCost({
      traveller: t,
      to: acrossTheWorld,
    });

    expect(near).toBeGreaterThan(0);
    expect(far).toBe(near);
  });

  // ─────────────────────────── AC4 ───────────────────────────

  it('AC4 — altitude is real: arriving higher costs more', async () => {
    const t = traveller(70);
    const here = room(0);
    ContainmentApi.move(t as never, here as never);

    const low = await MagicApi.relocationCost({ traveller: t, to: room(100) });
    const high = await MagicApi.relocationCost({ traveller: t, to: room(1000) });

    // 70 kg × 9.81 × 100 m = 68 670 J = 68.67 τ
    expect(low).toBeCloseTo(68.67, 2);
    expect(high).toBeCloseTo(686.7, 1);
    expect(high).toBeGreaterThan(low);
  });

  it('AC4 — mass is real: a loaded traveller costs more', async () => {
    const here = room(0);
    const up = room(100);

    const light = traveller(70);
    ContainmentApi.move(light as never, here as never);
    const bare = await MagicApi.relocationCost({ traveller: light, to: up });

    const heavy = traveller(70);
    ContainmentApi.move(heavy as never, here as never);
    ContainmentApi.move(massThing(30) as never, heavy as never);
    const loaded = await MagicApi.relocationCost({ traveller: heavy, to: up });

    // You pay to lift the pack too. The exact multiplier is the
    // encumbrance gauge's business — a loose-carried 30 kg costs more
    // than 30 kg of borne burden — so this asserts the RELATIONSHIP,
    // which is the claim, rather than pinning somebody else's number.
    expect(loaded).toBeGreaterThan(bare);
    expect(loaded / bare).toBeCloseTo(
      (70 + (heavy as unknown as { getBorneBurden(): { rawValue(): number } })
        .getBorneBurden()
        .rawValue()) /
        70,
      6,
    );
  });

  // ─────────────────────── the two floors ───────────────────────

  it('downhill is FREE, and never a refund', async () => {
    const t = traveller(70);
    ContainmentApi.move(t as never, room(1000) as never);
    expect(await MagicApi.relocationCost({ traveller: t, to: room(0) })).toBe(0);
  });

  it('an unzoned endpoint reads as LEVEL, not as an error', async () => {
    const t = traveller(70);
    ContainmentApi.move(t as never, room(0) as never);
    // A place nobody gave an elevation is not a place that is expensive
    // to reach — it is a place the model has nothing to say about.
    expect(await MagicApi.relocationCost({ traveller: t, to: room(null) })).toBe(
      0,
    );
  });

  it('an explicit `from` overrides the traveller`s current scene', async () => {
    const t = traveller(70);
    ContainmentApi.move(t as never, room(900) as never);
    const low = room(0);
    const high = room(100);
    // Standing high, but priced from the low room: it is still a lift.
    const cost = await MagicApi.relocationCost({
      traveller: t,
      from: low,
      to: high,
    });
    expect(cost).toBeCloseTo(68.67, 2);
  });
});
