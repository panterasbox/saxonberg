/**
 * ⭐⭐ Water is a STATE of a place (underwater A0/A1, D1–D3).
 *
 *  1. The one medium read: a body in the water reads water at the
 *     surface; one the floor holds up reads air; a loose thing in an
 *     ordinary room reads air.
 *  2. The place's state derives from its floor's depth and the water's
 *     level now: dry, wading, swimming, frozen — no state is moved.
 *  3. Water you can stand in bears you; water over your head does not.
 *  4. The place's own water is cited under its own key, with no feature.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Actor } from '../../creature/Actor';
import Pool from '../../../platform/location/Pool';
import WaterSurface from '../../../platform/thing/WaterSurface';
import Floor from '../../../platform/thing/Floor';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi } from '../../../api/biome';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { Quantity } from '../../quantity';
import { TemplatePaths } from '../../paths';
import { MEDIA } from '../../biome/Medium';
import type { Stuff } from '../../stuff/Stuff';
import type { WaterRead } from '../WaterSource';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Walker extends Actor {}
function walker(): Walker {
  return makeStuff(() => {
    const a = new Walker();
    a.setMass(Quantity.of(70, 'kg'));
    return a;
  });
}

async function pool(water?: { of: string; depthM: number }): Promise<{ pool: Pool; floor: WaterSurface }> {
  const p = makeStuff(() => new Pool());
  if (water) p.setWater(water);
  await p.ensureFloor();
  return { pool: p, floor: p.getFloor() as unknown as WaterSurface };
}

/** Pin the water's read to a level (and frozen or not). */
function readAt(p: Pool, levelM: number, frozen = false): void {
  const read: WaterRead = {
    ref: 'r', atS: 0, name: 'the water', frozen,
    draw: frozen ? null : { materialPath: '/m/water', temperatureK: 283 },
    levelM,
  };
  vi.spyOn(p, 'peekWaterRead').mockReturnValue(read);
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === TemplatePaths.waterSurface) return makeStuff(() => new WaterSurface());
    if (path === TemplatePaths.defaultFloor) return makeStuff(() => new Floor());
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the medium vocabulary (D2)', () => {
  it('keeps every shipped read: density, conductivity, breathable, contaminant', () => {
    expect(BiomeApi.densityOf('water').rawValue()).toBe(1000);
    expect(BiomeApi.conductivityOf('air').rawValue()).toBeCloseTo(0.026);
    expect(BiomeApi.breathableOf('water')).toBe(false);
    expect(BiomeApi.contaminantOf('smoke')).toBe('carbonMonoxide');
    expect(BiomeApi.isKnownAtmosphere('blackdamp')).toBe(true);
    expect(() => BiomeApi.densityOf('unobtanium')).toThrow(/unknown atmosphere tag/);
  });

  it('⭐ answers what every seam asks: no flame, no voice, sound without direction, red goes first', () => {
    const w = BiomeApi.mediumProps('water');
    expect(w.supportsCombustion).toBe(false);
    expect(w.carriesVoice).toBe(false);
    expect(w.soundCarriesDirection).toBe(false);
    expect(w.lightTransmittancePerM.r).toBeLessThan(w.lightTransmittancePerM.b);
    expect(BiomeApi.mediumProps('air').supportsCombustion).toBe(true);
    expect(Object.keys(MEDIA)).toContain('carbon-dioxide');
  });
});

describe('BiomeApi.mediumFor — one read, per occupant (D3)', () => {
  it('a thing in an ordinary room is in the air', () => {
    const room = makeStuff(() => new SingletonCartesianLocation());
    const w = walker();
    ContainmentApi.move(w as never, room as never);
    expect(BiomeApi.mediumFor(w as unknown as Stuff)).toMatchObject({ tag: 'air', immersed: false });
  });

  it('⭐ a body in the water reads water, at the surface; one the floor holds reads air', async () => {
    const { pool: p, floor } = await pool();
    const swimmer = walker();
    const stander = walker();
    ContainmentApi.move(swimmer as never, p as never);
    ContainmentApi.move(stander as never, p as never);
    vi.spyOn(floor, 'bears').mockReturnValue(true);
    floor.occupy(stander as never, 'ground:1');
    expect(BiomeApi.mediumFor(swimmer as unknown as Stuff)).toMatchObject({
      tag: 'water', immersed: true, atSurface: true,
    });
    expect(BiomeApi.mediumFor(stander as unknown as Stuff)).toMatchObject({ tag: 'air', immersed: false });
  });

  it('the async atmosphere read agrees: a swimmer at the surface is under the air', async () => {
    const { pool: p } = await pool();
    const swimmer = walker();
    ContainmentApi.move(swimmer as never, p as never);
    const read = BiomeApi.mediumFor(swimmer as unknown as Stuff);
    expect(read.atSurface).toBe(true);
  });
});

describe('the state is derived from the depth now (D1)', () => {
  it('⭐ dry · wading · swimming · frozen, from the floor\'s depth and the water\'s level', async () => {
    const { pool: p } = await pool({ of: 'kestrel:confluence', depthM: 0.5 });
    readAt(p, 0);
    expect(p.depthNow()).toBeCloseTo(0.5);
    expect(p.stateNow()).toBe('wading');
    vi.restoreAllMocks();
    readAt(p, 3);
    expect(p.stateNow()).toBe('swimming');
    vi.restoreAllMocks();
    readAt(p, -1);
    expect(p.stateNow()).toBe('dry');
    vi.restoreAllMocks();
    readAt(p, 0, true);
    expect(p.stateNow()).toBe('frozen');
  });

  it('a tidepool above the mean is dry at low water and deep at high, with nothing moved', async () => {
    const { pool: tidepool } = await pool({ of: '/stuff/idea/WaterExpanse/greywater', depthM: -0.5 });
    readAt(tidepool, -1.5);
    expect(tidepool.stateNow()).toBe('dry');
    vi.restoreAllMocks();
    readAt(tidepool, 1.5);
    expect(tidepool.stateNow()).toBe('wading');
  });

  it('⭐ water you can stand in bears you; water over your head does not', async () => {
    const { pool: p, floor } = await pool({ of: 'kestrel:confluence', depthM: 1 });
    readAt(p, 0);
    vi.spyOn(floor as unknown as { getAdornedTo(): Stuff }, 'getAdornedTo').mockReturnValue(p as unknown as Stuff);
    expect(floor.bears(70)).toBe(true);
    vi.spyOn(p, 'peekWaterRead').mockReturnValue({ ref: 'r', atS: 0, name: 'x', frozen: false, draw: null, levelM: 4 });
    expect(floor.bears(70)).toBe(false);
  });

  it('an uncited pool is simply water over your head', async () => {
    const { pool: p, floor } = await pool();
    expect(p.stateNow()).toBe('swimming');
    expect(floor.bears(70)).toBe(false);
  });
});

describe('the place IS the water (D1)', () => {
  it('⭐ registers its own water under its own key, and is a WaterPlace', async () => {
    const { pool: p } = await pool({ of: 'kestrel:confluence', depthM: 6 });
    expect(MixinApi.isWaterPlace(p as unknown as Stuff)).toBe(true);
    expect(p.getWaters()).toEqual({ water: 'kestrel:confluence' });
    expect(p.waterFor()).toEqual({ key: 'water', citation: 'kestrel:confluence' });
  });

  it('a water known here by a feature registers under it', async () => {
    const p = makeStuff(() => new Pool());
    p.setWater({ of: 'hollowmere:mere', depthM: 5, feature: 'mere' });
    expect(p.getWaterKey()).toBe('mere');
    expect(p.getWaters()).toEqual({ mere: 'hollowmere:mere' });
  });

  it('⭐ composes Shore and Swimmable — the class rule', () => {
    const p = makeStuff(() => new Pool());
    expect(MixinApi.isShore(p as unknown as Stuff)).toBe(true);
    expect(MixinApi.isSwimmable(p as unknown as Stuff)).toBe(true);
  });
});
