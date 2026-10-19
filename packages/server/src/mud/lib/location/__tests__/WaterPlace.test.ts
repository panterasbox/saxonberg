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
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import Good from '../../../platform/thing/Good';
import Material from '../../../platform/idea/material/Material';
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

describe('the tide reaches the place (D11, D25)', () => {
  /** A drifting plank: wood floats. */
  function plank(): Stuff {
    const mat = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('tide-test-pine');
      m.setDensity(Quantity.of(500, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/_test/tide-test-pine') as unknown as Material;
    return makeStuff(() => {
      const g = new Good();
      g.setMass(Quantity.of(4, 'kg'));
      g.setMaterial(mat);
      return g;
    }) as unknown as Stuff;
  }

  it('⭐ what floated in the channel before the last high water lies on the strandline after it', async () => {
    const channel = makeStuffAtPath(() => new Pool(), '/test/tide/channel');
    channel.setWater({ of: '/sea', depthM: 3 });
    await channel.ensureFloor();
    const { pool: strandline } = await pool({ of: '/sea', depthM: -1.3 });
    strandline.setTide({ collectsFrom: ['/test/tide/channel'] });
    const drift = plank();
    ContainmentApi.move(drift as never, channel as never);
    const arrived = channel.arrivedAtS(drift)!;
    expect(arrived).not.toBeNull();

    const read = (nextHighS: number): WaterRead => ({
      ref: 'r', atS: arrived, name: 'the sea', frozen: false,
      draw: { materialPath: '/m/salt', temperatureK: 285 }, levelM: -1,
      tide: { atS: arrived, rangeM: 3, rising: false, nextHighS, nextLowS: arrived + 3600, streamMps: -0.5 },
    });
    // High water still to come after it went in: it is still in the channel.
    vi.spyOn(strandline, 'peekWaterRead').mockReturnValue(read(arrived + 3600));
    await strandline.reconcileOccupants();
    expect((drift as unknown as { getContainer(): unknown }).getContainer()).toBe(channel);
    // A high water has come and gone since: it is on the strandline.
    vi.spyOn(strandline, 'peekWaterRead').mockReturnValue(read(arrived + 50_000));
    await strandline.reconcileOccupants();
    expect((drift as unknown as { getContainer(): unknown }).getContainer()).toBe(strandline);
  });

  it('⭐ the flood holds a disconnected body face-up, and says the water is coming in', async () => {
    const { pool: strand } = await pool({ of: '/sea', depthM: -1.3 });
    const body = walker();
    ContainmentApi.move(body as never, strand as never);
    readAt(strand, -1.5);
    const linkdead = Object.assign(body, { isLinkdead: () => true });
    void linkdead;
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((o: unknown) => o === body) as never);
    const hold = vi.spyOn(strand, 'holdAtSurface');
    await strand.reconcileOccupants();
    expect(hold).not.toHaveBeenCalled();
    readAt(strand, 4);
    expect(strand.stateNow()).toBe('swimming');
    await strand.reconcileOccupants();
    expect(hold).toHaveBeenCalledWith(body);
  });
});

describe('a basin the ebb leaves (D21, D25)', () => {
  it('⭐ below its rim a tidepool keeps its water, cut off, and its oxygen falls by the hour', async () => {
    const { pool: tidepool } = await pool({ of: '/sea', depthM: -0.5 });
    tidepool.setWater({ of: '/sea', depthM: -0.5, rimM: 0.4 } as never);
    const read = (levelM: number): WaterRead => ({
      ref: 'r', atS: 0, name: 'the sea', frozen: false,
      draw: { materialPath: '/m/salt', temperatureK: 288 }, levelM, oxygenMgL: 8,
    });
    vi.spyOn(tidepool, 'peekWaterRead').mockReturnValue(read(1.5));
    expect(tidepool.isCutOff()).toBe(false);
    expect(tidepool.oxygenNowMgL()).toBe(8);
    vi.spyOn(tidepool, 'peekWaterRead').mockReturnValue(read(-1.5));
    expect(tidepool.isCutOff()).toBe(true);
    expect(tidepool.depthNow()).toBeCloseTo(0.4, 5);
    expect(tidepool.stateNow()).toBe('wading');
    expect(tidepool.oxygenNowMgL()).toBeCloseTo(8, 5);
    WorldClockApi._advanceForTesting(5 * 3600 * 1000);
    expect(tidepool.oxygenNowMgL()!).toBeLessThan(4);
  });
});
