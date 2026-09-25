/**
 * ⭐⭐ **The envelope** — a room holding a state different from its
 * outside, at a cost (envelope D3b).
 *
 * Before this build an indoor room was 21 °C because one biome row said
 * so, in January, at 4 a.m., with the door standing open. Now it drifts
 * toward outside at a rate its CONSTRUCTION and its open doors set, and
 * is pushed up by whatever is burning in it.
 *
 * ⭐ The claims here are physical, and they are written as comparisons
 * rather than as pinned numbers wherever the comparison is the real
 * claim: *a timber room holds heat better than a stone one*, *an open
 * door costs warmth*, *a hearth's warmth arrives over minutes*. A
 * tuning pass may move every magnitude and must not break any of them.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../stuff/Location';
import Material from '../../material/Material';
import Biome from '../Biome';
import { SkyExposedMixin } from '../SkyExposed';
import { BiomeApi } from '../../../api/biome';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import Hearth from '../../../platform/thing/Hearth';
import Forge from '../../../platform/thing/Forge';
import { Reserve } from '../../reserve';
import { ContainmentApi } from '../../../api/containment';

const SCALE = 12;
const GRANITE = '/stuff/idea/material/_env/granite';
const OAK = '/stuff/idea/material/_env/oak';
const TIN = '/stuff/idea/material/_env/tin';
const INDOOR = '/stuff/idea/biome/_env/indoor';
const OUTDOOR = '/stuff/idea/biome/_env/outdoor';

let real = 0;
const advance = (gameSec: number): void => {
  real += (gameSec / SCALE) * 1000;
};

class SkyBiome extends SkyExposedMixin(Biome) {}

function material(
  path: string,
  k: number,
  rho: number,
  c: number,
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setThermalConductivity(Quantity.of(k, 'W/(m·K)'));
    m.setDensity(Quantity.of(rho, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(c, 'J/(kg·K)'));
    return m;
  }, path) as unknown as Material;
}

/** A 3 m cell with the given enclosure, in a fresh zone. */
function room(
  enclosure: { material: string; thicknessM: number } | null,
  outsideK = 281,
): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const r = makeStuff(() => new CartesianLocation());
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
  if (enclosure)
    (r as unknown as { setEnclosure(f: unknown): void }).setEnclosure(enclosure);
  (r as unknown as { envelopeOutsideK: number }).envelopeOutsideK = outsideK;
  (r as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK =
    outsideK;
  return r;
}

type Env = CartesianLocation & {
  envelopeApplies(): boolean;
  reconcileEnvelope(): void;
  envelopeTemperatureSync(): number | null;
  envelopeCoefficients(): { uWperK: number; capacityJPerK: number } | null;
  envelopeTemperatureK: number | null;
  envelopeOutsideK: number | null;
  openExteriorOpenings(): number;
};

const env = (r: CartesianLocation): Env => r as unknown as Env;

/** τ in hours, from the room's own coefficients. */
function tauHours(r: CartesianLocation): number {
  const c = env(r).envelopeCoefficients()!;
  return c.capacityJPerK / c.uWperK / 3600;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(
      () => new WorldClockRegistry(),
      TemplatePaths.worldClockRegistry,
    );
  }
  makeStuffAtPath(() => new Biome(), INDOOR);
  makeStuffAtPath(() => new SkyBiome(), OUTDOOR);
  material(GRANITE, 2.9, 2750, 790);
  material(OAK, 0.17, 750, 2000);
  material(TIN, 80, 7300, 450);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('when an envelope applies at all', () => {
  it('⭐ a plain Location has NO volume, so it gets none — the geometry answers, not a guard', () => {
    const bare = makeStuff(() => new Location());
    (bare as unknown as Record<string, unknown>)._biomePath = INDOOR;
    expect(bare.getVolume()).toBeNull();
    expect(env(bare as unknown as CartesianLocation).envelopeApplies()).toBe(
      false,
    );
    // ⚠ This is also why `Offstage` needs no decree and gets no
    // `if (room is Offstage)`: it extends `Location` directly.
  });

  it('a room that DECLARES its temperature wins outright — the bespoke case stays a row', () => {
    const cellar = room({ material: GRANITE, thicknessM: 1 });
    expect(env(cellar).envelopeApplies()).toBe(true);
    (cellar as unknown as { _temperature: Quantity<'K'> })._temperature =
      Quantity.of(285, 'K');
    expect(env(cellar).envelopeApplies()).toBe(false);
  });

  it('a sky-exposed room gets none — a yard IS the outside', () => {
    const yard = room({ material: GRANITE, thicknessM: 0.3 });
    (yard as unknown as Record<string, unknown>)._biomePath = OUTDOOR;
    expect(env(yard).envelopeApplies()).toBe(false);
  });
});

describe('⭐⭐ the enclosure decides, and it is a CAUSE', () => {
  it('a timber room holds its heat far better than a stone one of the same size', () => {
    const stone = room({ material: GRANITE, thicknessM: 0.3 });
    const timber = room({ material: OAK, thicknessM: 0.05 });
    const u = (r: CartesianLocation): number =>
      env(r).envelopeCoefficients()!.uWperK;
    expect(u(timber)).toBeLessThan(u(stone));
    // And it warms and cools FASTER, because it has far less mass in
    // its skin — the honest trade a timber building makes.
    expect(tauHours(timber)).toBeLessThan(tauHours(stone) * 4);
    expect(tauHours(timber)).toBeGreaterThan(0.5);
  });

  it('⚠ a tin shed is a bad building, not a hole in the world', () => {
    // Conduction ALONE would put an iron sheet at ~16 000 W/K, which is
    // not a number about anything. The still-air films either side of
    // the wall are in series with it and cap the loss at something a
    // real shed actually does.
    const shed = room({ material: TIN, thicknessM: 0.005 });
    const stone = room({ material: GRANITE, thicknessM: 0.3 });
    const u = (r: CartesianLocation): number =>
      env(r).envelopeCoefficients()!.uWperK;
    expect(u(shed)).toBeGreaterThan(u(stone));
    expect(u(shed)).toBeLessThan(1000);
  });

  it('a thicker wall of the same stuff leaks less', () => {
    const thin = room({ material: GRANITE, thicknessM: 0.2 });
    const thick = room({ material: GRANITE, thicknessM: 1.0 });
    expect(env(thick).envelopeCoefficients()!.uWperK).toBeLessThan(
      env(thin).envelopeCoefficients()!.uWperK,
    );
  });

  it('a room with no enclosure takes the universe default and still works', () => {
    const plain = room(null);
    const coeff = env(plain).envelopeCoefficients();
    expect(coeff).not.toBeNull();
    expect(coeff!.uWperK).toBeGreaterThan(0);
  });
});

describe('⭐⭐ a hearth warms its room; a forge does not', () => {
  /** A fuelled fire, lit, standing in the room. */
  type Fire = Hearth | Forge;

  function lightFireIn(r: CartesianLocation, fire: Fire): Fire {
    fire.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(100, '%'),
        'combustion',
        null,
      ),
    );
    ContainmentApi.move(fire as never, r as never);
    fire.ignite();
    return fire;
  }

  it('a lit hearth lifts the room over GAME-MINUTES, not instantly', () => {
    const r = room({ material: GRANITE, thicknessM: 0.3 }, 275);
    lightFireIn(r, makeStuff(() => new Hearth()) as Hearth);
    env(r).reconcileEnvelope();
    const readings: number[] = [];
    for (let m = 0; m < 180; m += 10) {
      advance(600);
      env(r).reconcileEnvelope();
      readings.push(env(r).envelopeTemperatureK!);
    }
    // ⭐ Acceptance 9: a player can feel the difference between
    // just-lit and long-lit. Monotone up, and still climbing at ten
    // minutes — warmth arrives, it does not appear.
    expect(readings[0]!).toBeGreaterThan(275);
    expect(readings[0]!).toBeLessThan(readings[readings.length - 1]!);
    for (let i = 1; i < readings.length; i++) {
      expect(readings[i]!).toBeGreaterThanOrEqual(readings[i - 1]!);
    }
    // And it settles well above outside rather than running away.
    const settled = readings[readings.length - 1]!;
    expect(settled).toBeGreaterThan(280);
    expect(settled).toBeLessThan(300);
  });

  it('⭐ a lit FORGE does not move the room at all — the shipped rule, kept', () => {
    // Not by a guard. `Forge` does not compose `SpaceHeatingMixin`, so
    // the envelope's contents walk never counts it, and nothing
    // anywhere asks whether something is a forge.
    const r = room({ material: GRANITE, thicknessM: 0.3 }, 275);
    const forge = lightFireIn(r, makeStuff(() => new Forge()) as Forge);
    expect(forge.isLit()).toBe(true);
    env(r).reconcileEnvelope();
    for (let m = 0; m < 180; m += 10) {
      advance(600);
      env(r).reconcileEnvelope();
    }
    expect(env(r).envelopeTemperatureK!).toBeCloseTo(275, 5);
  });

  it('a hearth that BURNS OUT stops warming, and the room drifts back', () => {
    const r = room({ material: GRANITE, thicknessM: 0.3 }, 275);
    const h = lightFireIn(
      r,
      makeStuff(() => new Hearth()) as Hearth,
    ) as Hearth;
    env(r).reconcileEnvelope();
    for (let i = 0; i < 12; i++) {
      advance(600);
      env(r).reconcileEnvelope();
    }
    const warm = env(r).envelopeTemperatureK!;
    expect(warm).toBeGreaterThan(276);

    h.adjustReserve('fuel', Quantity.of(-100, '%'));
    expect(h.spaceHeatOutputW()).toBe(0);
    for (let i = 0; i < 24; i++) {
      advance(600);
      env(r).reconcileEnvelope();
    }
    expect(env(r).envelopeTemperatureK!).toBeLessThan(warm);
  });
});

describe('the room drifts toward outside', () => {
  it('⭐ a warm room left alone goes cold — and there is NO far-past guard', () => {
    // A body's long absence is a logout and is dropped. A ROOM's is a
    // fact about the world: a room left overnight is cold in the
    // morning, and that asymmetry is deliberate.
    const r = room({ material: GRANITE, thicknessM: 0.3 }, 275);
    env(r).envelopeTemperatureK = 295;
    env(r).reconcileEnvelope();
    for (let h = 0; h < 12; h++) {
      advance(3600);
      env(r).reconcileEnvelope();
    }
    expect(env(r).envelopeTemperatureK!).toBeLessThan(280);
    expect(env(r).envelopeTemperatureK!).toBeGreaterThanOrEqual(275);
  });

  it('⭐⭐ an open exterior door costs warmth, and shutting it stops the loss', () => {
    const shut = room({ material: GRANITE, thicknessM: 0.3 }, 275);
    const uShut = env(shut).envelopeCoefficients()!.uWperK;
    // One open exterior opening, stubbed at the read the coefficients
    // use — the exit walk itself is covered by the drive.
    (shut as unknown as { openExteriorOpenings: () => number })
      .openExteriorOpenings = () => 1;
    const uOpen = env(shut).envelopeCoefficients()!.uWperK;
    expect(uOpen).toBeGreaterThan(uShut * 1.5);
    // Which is the same sentence as: it cools far faster.
    expect(tauHours(shut)).toBeLessThan(1);
  });
});
