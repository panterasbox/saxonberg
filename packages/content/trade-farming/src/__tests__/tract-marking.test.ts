/**
 * `mark` and `unmark` (tracts build D29), the tract's half: a holder draws
 * fields on a tract by share, moves a line, takes one up — and every
 * refusal is the tract's, in words.
 *
 *   - a new field is its share of the tract, and carries the unmarked
 *     ground's soil with it; the remainder shrinks to what is left;
 *   - more than is left is refused naming what is left;
 *   - a line does not move, and a field does not come up, through a crop;
 *   - zoning: a house plot's ground takes beds, not fields; unparcelled
 *     ground is not policed; a stranger may not divide it;
 *   - unmeasured ground cannot be divided;
 *   - unmarking folds the field's soil back in and deletes its record.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Tract from '../location/Tract';
import Field from '../thing/Field';
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { SOIL_MOISTURE_RESERVE_KEY, SOIL_NITROGEN_RESERVE_KEY } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import GroundCharacter from '@saxonberg/content-ground/src/idea/GroundCharacter';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';

const EXTENT = '/world/_test/farm';
const BENCH = `${EXTENT}/location/bench`;
const SEED = 4242;

let seq = 0;

function bench(area = 1200): Tract {
  seq += 1;
  const t = makeStuffAtPath(() => new Tract(), `${BENCH}-${seq}`);
  t.setShortDescription('bench');
  t.setRegister('definite');
  t.setAreaM2(area);
  t.setGroundSpot([4, 7]);
  t.installTractReserves(GroundCharacter.resolve(null, [4, 7], SEED));
  return t;
}

const holder = (): Stuff => makeStuff(() => new Idea());

describe('marking fields on a tract', () => {
  let clone: { mock: { calls: unknown[] } };
  let deleted: string[];
  let held: string[];
  let scale: 'none' | 'bed' | 'field';
  let use: string;
  let covered: boolean;

  beforeEach(() => {
    deleted = [];
    held = [EXTENT];
    scale = 'field';
    use = 'agricultural';
    covered = true;
    clone = vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      if (path !== '/trade/farming/thing/field') throw new Error(`no row ${path}`);
      return makeStuffAtPath(() => new Field(), path);
    }) as unknown as typeof StuffApi.clone);
    vi.spyOn(PersistableApi, 'restoreOrSeed').mockResolvedValue(false);
    vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined);
    vi.spyOn(PersistableApi, 'deleteAllFor').mockImplementation(async (owner: string) => {
      deleted.push(owner);
      return 1;
    });
    vi.spyOn(ParcelApi, 'coveringParcelOf').mockImplementation((async () =>
      covered ? ({ getExtent: () => EXTENT } as never) : null) as never);
    vi.spyOn(ParcelApi, 'cultivationScaleAt').mockImplementation(() => scale);
    vi.spyOn(ParcelApi, 'landUseOf').mockImplementation(() => use as never);
    vi.spyOn(AccessApi, 'heldExtents').mockImplementation(async () => held);
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    vi.spyOn(GroundCharacter, 'forZone').mockResolvedValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⭐ a new field is its share; the unmarked ground shrinks to what is left', async () => {
    const t = bench(1200);
    const litres = t.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.capacity.rawValue();
    const r = await t.markField(holder(), 'barley field', 1 / 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.line).toMatch(/a third of the bench/);
    const field = t.fieldByKey('barley-field')!;
    expect(field).not.toBeNull();
    expect(field.getAreaM2()).toBeCloseTo(400, 6);
    expect(t.soilRemainderAreaM2()).toBeCloseTo(800, 6);
    expect(t.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.capacity.rawValue()).toBeCloseTo((litres * 800) / 1200, 3);
    expect(clone).toHaveBeenCalledTimes(1);
    expect(PersistableApi.capture).toHaveBeenCalled();
  });

  it('⭐ a field keeps its own record, keyed under its tract, and the tract owns it (D26)', async () => {
    const t = bench(1200);
    await t.markField(holder(), 'barley field', 1 / 3);
    const field = t.fieldByKey('barley-field')!;
    expect(PersistableApi.restoreOrSeed).toHaveBeenCalledWith(field, `${t.groundPath()}/barley-field`);
    expect(t.dependentPersistables()).toEqual([field]);
  });

  it('a new field carries the unmarked ground\'s soil, never fresh', async () => {
    const t = bench(1200);
    t.setSoilReserveFraction(SOIL_NITROGEN_RESERVE_KEY, 0.07);
    await t.markField(holder(), 'barley field', 1 / 3);
    expect(t.fieldByKey('barley-field')!.soilReserveFraction(SOIL_NITROGEN_RESERVE_KEY)).toBeCloseTo(0.07, 6);
  });

  it('the rest, then nothing left; more than is left names what is', async () => {
    const t = bench(1200);
    expect((await t.markField(holder(), 'barley field', 1 / 3)).ok).toBe(true);
    const over = await t.markField(holder(), 'wheat field', 0.75);
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.reason).toBe('over-the-whole');
      expect(over.line).toMatch(/Only two-thirds of the bench is unmarked/);
    }
    const rest = await t.markField(holder(), 'wheat field', null);
    expect(rest.ok).toBe(true);
    expect(t.fieldByKey('wheat-field')!.getAreaM2()).toBeCloseTo(800, 6);
    const none = await t.markField(holder(), 'oat field', null);
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.reason).toBe('all-marked');
  });

  it('a name it has moves the line; never through a standing crop', async () => {
    const t = bench(1200);
    await t.markField(holder(), 'barley field', 1 / 3);
    const moved = await t.markField(holder(), 'the barley field', 1 / 2);
    expect(moved.ok).toBe(true);
    expect(t.fieldByKey('barley-field')!.getAreaM2()).toBeCloseTo(600, 6);
    const crop = makeStuffAtPath(() => {
      const p = new Plant();
      p.setShortDescription('stand of barley');
      p.setLifecycleState('alive');
      p.setProfile({
        moistureHappyAt: 0.3,
        moistureWiltAt: 0.05,
        litresPerGameDay: 0.12,
        luxHappyAt: 120,
        luxDarkAt: 15,
        rootDemand: { seedling: 0.2, young: 1.0, established: 2.0, mature: 3.0 },
        daysToStage: { young: 14, established: 42, mature: 84 },
        seedRateKgPerM2: 0.015,
        yieldKgPerM2: 0.09,
      });
      p.setSownAreaM2(100);
      p.setGroundPart('barley-field');
      return p;
    }, '/trade/farming/thing/plant/_test-barley');
    ContainmentApi.move(crop, t as never);
    const refused = await t.markField(holder(), 'barley field', 1 / 3);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.reason).toBe('crop-stands');
      expect(refused.line).toMatch(/cannot move a boundary through standing barley/);
    }
    const kept = await t.unmarkField(holder(), t.fieldByKey('barley-field')!);
    expect(kept.ok).toBe(false);
  });

  it('⭐ a house plot takes beds, not fields — in the zoning\'s words', async () => {
    scale = 'bed';
    use = 'residential';
    const r = await bench().markField(holder(), 'barley field', 1 / 3);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('zoned-against-fields');
      expect(r.line).toMatch(/zoned residential — dwelling, companions and small cultivation — and takes beds, not fields/);
    }
  });

  it('unparcelled ground is not policed; a stranger may not divide titled ground', async () => {
    covered = false;
    expect((await bench().markField(holder(), 'barley field', 1 / 3)).ok).toBe(true);
    covered = true;
    held = [];
    const r = await bench().markField(holder(), 'barley field', 1 / 3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not-held');
  });

  it('unmeasured ground cannot be divided', async () => {
    const r = await bench(0).markField(holder(), 'barley field', 1 / 3);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unmeasured');
      expect(r.line).toMatch(/never been measured/);
    }
  });

  it('⭐ unmarking folds the field back in, by area, and deletes its record', async () => {
    const t = bench(1200);
    await t.markField(holder(), 'barley field', 1 / 3);
    const field = t.fieldByKey('barley-field')!;
    field.setPersistenceKey(`${t.groundPath()}/barley-field`);
    field.setSoilReserveFraction(SOIL_NITROGEN_RESERVE_KEY, 0.6);
    t.setSoilReserveFraction(SOIL_NITROGEN_RESERVE_KEY, 0.3);
    const r = await t.unmarkField(holder(), field);
    expect(r.ok).toBe(true);
    expect(t.getFields()).toHaveLength(0);
    expect(field.isDestroyed()).toBe(true);
    expect(deleted).toContain(`${t.groundPath()}/barley-field`);
    // 800 m² at 0.3 and 400 m² at 0.6 → 0.4 over the whole again.
    expect(t.soilReserveFraction(SOIL_NITROGEN_RESERVE_KEY)).toBeCloseTo(0.4, 6);
    expect(t.soilRemainderAreaM2()).toBe(0); // no parts: one piece again
    expect(t.tractLines().join(' ')).toMatch(/Nobody has marked a field on it/);
  });

  it('a tract read from its gate lists its fields, one line each', async () => {
    const t = bench(1200);
    await t.markField(holder(), 'barley field', 1 / 3);
    await t.markField(holder(), 'wheat field', null);
    const lines = t.tractLines().join(' ');
    expect(lines).toMatch(/At the barley field the grass is/);
    expect(lines).toMatch(/At the wheat field the grass is/);
  });
});
