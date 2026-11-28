/**
 * Boat — ⭐ the leak and bailing.
 *
 * - a boat leaks from her STATE — a hole stove in her, and her seams once
 *   her tar has gone — never the calendar; ashore nothing comes in; the
 *   read is the ship's (`Bilge.hullLeakLps`) at a boat's length
 *   (matter-model-overlaps D4, D7);
 * - the water in her takes her freeboard; bailed (a bucketful a spell,
 *   more than a hole lets in) she stays up; left, she goes down with what
 *   is in her;
 * - she is a LIFT SOURCE for the platform's one `bail` (harbors review 1:
 *   the bucket over any lift source), her bilge is the kernel's
 *   `BilgeMixin`, and she takes a coat on her outside (`FacedMixin`).
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Material from '@saxonberg/server/mud/lib/material/Material';
import SeaPatch from '@saxonberg/content-water/src/place/SeaPatch';
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

/** A patch of sea as the warren mints one: its water stamped, with its depth. */
function seaWater(): SeaPatch {
  const p = makeStuff(() => new SeaPatch());
  p.setWater({ of: '/test/sea', depthM: 20 });
  return p;
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
  it('⭐ she is a lift source for the one `bail`, her bilge the kernel\'s, and her outside takes a coat', () => {
    const boat = rowboat();
    expect(typeof boat.liftInto).toBe('function');
    expect(boat.receivableL()).toBe(Infinity);
    expect(MixinApi.hasMixin(boat as unknown as Stuff, 'BilgeMixin')).toBe(true);
    expect(MixinApi.hasMixin(boat as unknown as Stuff, 'FacedMixin')).toBe(true);
    expect(boat.faces()).toContain('outside');
  });

  it('⭐ sound, nothing comes in — afloat or ashore, whatever the calendar says', () => {
    const boat = rowboat();
    const water = seaWater();
    lay(boat, water, 80);
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(true);
    boat.reconcileBilge();
    now = T0 + 365 * 86_400;
    expect(boat.leakLps()).toBe(0);
    expect(boat.bilgeNowL()).toBe(0);
  });

  it('⭐⭐ holed: she fills; bailed she stays up; left, she goes down with what is in her', async () => {
    const boat = rowboat();
    const water = seaWater();
    lay(boat, water, 80);
    vi.spyOn(MixinApi, 'isWaterPlace').mockReturnValue(true);
    boat.reconcileBilge();
    boat.addFlaw('holed', true);
    // The one hole rule: 640 L/h × √0.25 × 4.5 = 0.4 L/s.
    expect(boat.leakLps()).toBeCloseTo(0.4, 9);
    now += 1000;
    expect(boat.bilgeNowL()).toBeCloseTo(400, 6);
    expect(boat.freeboardNowM()).toBeCloseTo(0.4 - 480 / 4095, 6);
    expect(boat.describeBoat().join(' ')).toMatch(/water/);

    // Bailing: a bucketful each twenty seconds out-runs the hole (8 L in, 10 out).
    expect(await boat.bucketRefusal({} as never, null)).toBeNull();
    const before = boat.bilgeNowL();
    const hand = { isDestroyed: () => false } as never;
    for (let i = 0; i < 30; i++) {
      now += 20;
      const litres = await boat.liftInto(10, hand);
      expect(litres).toBe(10);
      if (i === 0) expect(String(await boat.bucketLanded(hand, { litres, vessel: null, tipped: 0, escaped: false }))).toMatch(/bucketful of water out over her side/);
    }
    expect(boat.bilgeNowL()).toBeLessThan(before - 50);
    expect(await boat.reconcileFloat()).toBe(false);

    // Left: the water takes the last of her freeboard and she goes down.
    const sink = vi.spyOn(water, 'sink').mockResolvedValue(true);
    now += 6000;
    expect(boat.freeboardNowM()).toBeLessThanOrEqual(0);
    expect(await boat.reconcileFloat()).toBe(true);
    expect(sink).toHaveBeenCalledWith(boat);
  });

  it('⭐ she is Durable: under her tar her seams are her fabric (D7)', () => {
    const boat = rowboat();
    expect(MixinApi.isDurable(boat as unknown as Stuff)).toBe(true);
    expect(boat.bareWearPerDay()).toBeCloseTo(0.5 / 45, 9);
    expect(boat.hullLengthM()).toBe(4.5);
    expect(boat.hullDraftM()).toBe(0.25);
  });

  it('⭐⭐ a BARE boat\'s seams open with the weather; a TARRED one\'s do not (D7)', () => {
    const pitch = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('pitch');
      return m;
    }, '/stuff/idea/material/_boat/pitch') as unknown as Material;
    const bare = rowboat();
    const tarred = rowboat();
    // The row's `coats:` door (the applier's phase-1 setter), as a shipped boat is tarred.
    void (tarred as unknown as { setCoats(v: unknown): unknown }).setCoats({
      outside: [{ material: pitch.getTemplatePath()!, thicknessM: 0.001, state: 'set' }],
    });
    // Ashore (no place to read the air from): a bare body takes the weather
    // all the same; a coat waits.
    bare.reconcileWeather();
    tarred.reconcileWeather();
    now = T0 + 60 * 86_400;
    bare.reconcileWeather();
    tarred.reconcileWeather();
    // Sixty days bare at the house's rate: 1 − 60 × 0.5/45 ≈ 0.33 → shabby.
    expect(bare.getWearCondition()).toBeCloseTo(1 - (60 * 0.5) / 45, 6);
    expect(bare.hullLeakLps()).toBeCloseTo(4.5 * 0.02, 9);
    expect(tarred.getWearCondition()).toBe(1);
    expect(tarred.hullLeakLps()).toBe(0);
  });

  it('⭐⭐ stove in on a snag she is holed; patched, she leaks only by her seams (D7, D8)', async () => {
    const boat = rowboat();
    boat.setCondition(0.6); // worn seams: 4.5 × 0.004 L/s
    boat.reconcileBilge();
    expect(boat.hullLeakLps()).toBeCloseTo(4.5 * 0.004, 9);
    // ⛔ Nothing public holes a boat by fiat: her stove-in is her own act.
    expect(() => (boat as unknown as { stoveOnSnag(): void }).stoveOnSnag()).toThrow();
    expect(boat.getFlaws()).toEqual([]);
    // A stroke carries her into a choked reach in the dark: the river says
    // what lies there, the one snag rule says struck, and she is stove in.
    const dest = seaWater();
    const river = { riverAt: async () => ({ obstruction: 1 }) };
    const rules = vi.spyOn(StuffApi, 'singleton').mockResolvedValue({ snagVerdict: () => 'struck' } as never);
    try {
      expect(await boat.enterReach(dest, river as never, false, 1)).toBe('struck');
    } finally {
      rules.mockRestore();
    }
    expect(boat.getContainer()).toBe(dest);
    expect(boat.getFlaws().map((f) => f.kind)).toEqual(['holed']);
    expect(boat.hullLeakLps()).toBeCloseTo(4.5 * 0.004 + 0.4, 9);
    now += 10;
    boat.recordMend({ at: now, by: '/test/hand', byName: 'a boatwright', band: 'competent', discipline: '', kind: 'patched', result: 'sound' });
    expect(boat.getFlaws()[0]?.mended).toBe('patched');
    expect(boat.hullLeakLps()).toBeCloseTo(4.5 * 0.004, 9);
  });

  it('a dry boat has nothing to bail', async () => {
    const boat = rowboat();
    lay(boat, seaWater(), 0);
    expect((await boat.bucketRefusal({} as never, null))?.reason).toBe('dry');
  });
});
