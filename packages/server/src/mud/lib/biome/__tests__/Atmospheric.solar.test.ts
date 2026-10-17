/**
 * ⭐⭐ **Light through matter, and the sun's heat through it** (rubber
 * build, D5 + D6).
 *
 * A layer passes `e^(−α·t)` of the light (Beer–Lambert, `α` from the
 * material row); a face passes the product over its layers; a material
 * with no `α` is opaque. And the sun that passes heats the room: a
 * glass cell at a clear noon sits above its outside, the same cell at
 * midnight falls back to it, and an opaque cell has no solar term at all.
 *
 * Written as comparisons wherever the comparison is the claim, so a
 * calibration pass can move magnitudes without breaking any of them.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Material from '../../material/Material';
import Biome from '../Biome';
import { SkyExposedMixin } from '../SkyExposed';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { CelestialApi } from '../../../api/celestial';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { RoofSpec, EnclosurePartSpec } from '../../spatial/Enclosed';
import type { Exposure } from '../../spatial/Exposure';

const SCALE = 12;
const GLASS = '/stuff/idea/material/_sol/glass';
const SLATE = '/stuff/idea/material/_sol/slate';
const BRICK = '/stuff/idea/material/_sol/brick';
const OUTDOOR = '/stuff/idea/biome/_sol/outdoor';

let real = 0;
const advance = (gameSec: number): void => {
  real += (gameSec / SCALE) * 1000;
};
const nowS = (): number => WorldClockApi.getNow().rawValue();

class SkyBiome extends SkyExposedMixin(Biome) {}

function material(path: string, k: number, rho: number, c: number, alpha?: number): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setThermalConductivity(Quantity.of(k, 'W/(m·K)'));
    m.setDensity(Quantity.of(rho, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(c, 'J/(kg·K)'));
    if (alpha !== undefined) m.setLightAbsorption(Quantity.of(alpha, '1/m'));
    return m;
  }, path);
}

type Cell = CartesianLocation & {
  setEnclosure(v: EnclosurePartSpec | null): void;
  setRoof(v: RoofSpec | null): void;
  exposure(): Exposure;
  reconcileEnvelope(): void;
  solarGainW(atS: number): number;
  envelopeTemperatureK: number | null;
  envelopeOutsideK: number | null;
};

function cell(walls: EnclosurePartSpec, roof: RoofSpec, outsideK = 280): Cell {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const r = makeStuff(() => new CartesianLocation()) as Cell;
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = OUTDOOR;
  r.setEnclosure(walls);
  r.setRoof(roof);
  r.envelopeOutsideK = outsideK;
  r.envelopeTemperatureK = outsideK;
  return r;
}

const glass = { material: GLASS, thicknessM: 0.004 };
const slate = { material: SLATE, thicknessM: 0.01 };
const brick = { material: BRICK, thicknessM: 0.23 };

/** Game-seconds from now to the brightest hour of the coming day. */
function toNoon(): number {
  const t0 = nowS();
  let best = 0;
  let bestF = -1;
  for (let h = 0; h < 24; h++) {
    const f = CelestialApi.skyFactorAt(t0 + h * 3600);
    if (f > bestF) {
      bestF = f;
      best = h;
    }
  }
  return best * 3600;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  }
  makeStuffAtPath(() => new SkyBiome(), OUTDOOR);
  material(GLASS, 1, 2500, 840, 8);
  material(SLATE, 2, 2700, 760);
  material(BRICK, 0.7, 1800, 840);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('⭐ Beer–Lambert: a face passes the product of its layers', () => {
  it('4 mm of clear glass passes ≈ 0.97; slate passes nothing', () => {
    const house = cell(glass, glass);
    const e = house.exposure();
    expect(e.faceTransmittance(e.roof!)).toBeCloseTo(Math.exp(-8 * 0.004), 6);
    const hut = cell(brick, slate);
    expect(hut.exposure().faceTransmittance(hut.exposure().roof!)).toBe(0);
  });

  it('double glazing passes the square of single', () => {
    const house = cell(glass, [glass, glass]);
    const e = house.exposure();
    expect(e.faceTransmittance(e.roof!)).toBeCloseTo(Math.exp(-8 * 0.008), 6);
  });

  it('an opaque-walled glass-roofed hall is lit by its roof; glass walls under slate by their walls', () => {
    const hall = cell(brick, glass);
    expect(hall.exposure().skyLightFraction()).toBeCloseTo(Math.exp(-0.032), 6);
    const lean = cell(glass, slate);
    // four glass walls at a quarter weight each, capped at 1
    expect(lean.exposure().skyLightFraction()).toBeCloseTo(
      Math.min(1, 4 * 0.25 * Math.exp(-0.032)),
      6,
    );
    expect(cell(brick, slate).exposure().skyVisible()).toBe(false);
  });
});

describe('⭐⭐ the sun warms a room through a transparent face', () => {
  it('an opaque cell has no solar term at all', () => {
    const hut = cell(brick, slate);
    expect(hut.solarGainW(nowS() + toNoon())).toBe(0);
  });

  it('a glass cell at a clear noon lands above its outside; at midnight it falls back to it', () => {
    const house = cell(glass, glass, 280);
    advance(toNoon() - 3 * 3600);
    house.reconcileEnvelope(); // seed the clock
    for (let i = 0; i < 6; i++) {
      advance(1800);
      house.reconcileEnvelope();
    }
    const noonK = house.envelopeTemperatureK!;
    expect(noonK).toBeGreaterThan(283);
    // and on to the middle of the night
    for (let i = 0; i < 12; i++) {
      advance(3600);
      house.reconcileEnvelope();
    }
    expect(house.envelopeTemperatureK!).toBeLessThan(noonK);
    expect(house.envelopeTemperatureK!).toBeLessThan(281);
  });

  it('the same reconcile on an opaque cell is the closed form it always was', () => {
    const hut = cell(brick, slate, 280);
    hut.envelopeTemperatureK = 290;
    advance(toNoon());
    hut.reconcileEnvelope();
    advance(3600);
    hut.reconcileEnvelope();
    expect(hut.envelopeTemperatureK!).toBeLessThan(290);
    expect(hut.envelopeTemperatureK!).toBeGreaterThan(280);
  });
});
