/**
 * Boat — ⭐ the leak and bailing (harbors B5, P21).
 *
 * - a boat leaks from her STATE — a hole stove in her — never the
 *   calendar; ashore nothing comes in;
 * - the water in her takes her freeboard; bailed (a bucketful a spell,
 *   more than a hole lets in) she stays up; left, she goes down with what
 *   is in her;
 * - she answers the platform's one `bail` (`BailableMixin`), and she takes
 *   a coat on her outside (`FacedMixin`).
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import SeaPatch from '@saxonberg/content-water/src/location/SeaPatch';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Boat from '../thing/Boat';

const T0 = 1_000_000;
let now = T0;

function rowboat(): Boat {
  const boat = makeStuff(() => new Boat());
  boat.setHull({ form: 'round', draftM: 0.25, beamM: 1.3, lengthM: 4.5, freeboardM: 0.4, capacityKg: 500 });
  return boat;
}

/** Put her in `room` with a body of `kg` in her. */
function lay(boat: Boat, room: Stuff, kg: number): void {
  vi.spyOn(boat, 'getContainer').mockReturnValue(room as never);
  vi.spyOn(boat, 'getContents').mockReturnValue(
    kg > 0 ? [{ getMass: () => ({ rawValue: () => kg }) } as never] : [],
  );
  vi.spyOn(MixinApi, 'isTangible').mockImplementation(((x: Stuff) => 'getMass' in x) as never);
}

beforeEach(() => {
  StuffApi.clearAll();
  now = T0;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('Boat — the leak and bailing (harbors P21)', () => {
  it('⭐ she answers the one `bail`, and her outside takes a coat', () => {
    const boat = rowboat();
    expect(MixinApi.isBailable(boat as unknown as Stuff)).toBe(true);
    expect(MixinApi.hasMixin(boat as unknown as Stuff, 'FacedMixin')).toBe(true);
    expect(boat.faces()).toContain('outside');
  });

  it('⭐ sound, nothing comes in — afloat or ashore, whatever the calendar says', () => {
    const boat = rowboat();
    const water = makeStuff(() => new SeaPatch());
    lay(boat, water, 80);
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(true);
    boat.reconcileBilge();
    now = T0 + 365 * 86_400;
    expect(boat.leakLps()).toBe(0);
    expect(boat.bilgeNowL()).toBe(0);
  });

  it('⭐⭐ holed: she fills; bailed she stays up; left, she goes down with what is in her', async () => {
    const boat = rowboat();
    const water = makeStuff(() => new SeaPatch());
    lay(boat, water, 80);
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(true);
    boat.reconcileBilge();
    (boat as unknown as { addFlaw(k: string, v: boolean): void }).addFlaw('holed', true);
    expect(boat.leakLps()).toBeCloseTo(0.3, 9);
    now += 1000;
    expect(boat.bilgeNowL()).toBeCloseTo(300, 6);
    expect(boat.freeboardNowM()).toBeCloseTo(0.4 - 380 / 4095, 6);
    expect(boat.describeBoat().join(' ')).toMatch(/water/);

    // Bailing: a bucketful each twenty seconds out-runs the hole.
    const plan = await boat.planBail({} as never, { vessel: null, tool: null });
    expect(plan.kind).toBe('plan');
    const before = boat.bilgeNowL();
    for (let i = 0; i < 30; i++) {
      now += 20;
      await boat.completeBail({ isDestroyed: () => false } as never, { vessel: null, tool: null }, null);
    }
    expect(boat.bilgeNowL()).toBeLessThan(before - 100);
    expect(await boat.reconcileFloat()).toBe(false);

    // Left: the water takes the last of her freeboard and she goes down.
    const sink = vi.spyOn(water, 'sink').mockResolvedValue(true);
    now += 6000;
    expect(boat.freeboardNowM()).toBeLessThanOrEqual(0);
    expect(await boat.reconcileFloat()).toBe(true);
    expect(sink).toHaveBeenCalledWith(boat);
  });

  it('a dry boat has nothing to bail', async () => {
    const boat = rowboat();
    lay(boat, makeStuff(() => new SeaPatch()), 0);
    const plan = await boat.planBail({} as never, { vessel: null, tool: null });
    expect(plan.kind === 'refusal' && plan.reason).toBe('dry');
  });
});
