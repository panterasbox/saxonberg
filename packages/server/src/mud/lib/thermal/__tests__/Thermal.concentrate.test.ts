/**
 * ⭐⭐ The staged boil is the plateau's (sugar D1).
 *
 * A solution's boiling point climbs as it thickens; the latent-heat
 * boil-off drives the thickening; and what the liquor BECOMES at each
 * stage is an arrow on its material — the `purifiedByBoiling` shape, keyed
 * on concentration rather than time. An arrow with a `minBand` reads the
 * vessel's grade: what will not grain is blackstrap.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Burner } from '../../fire/Burner';
import type { Stuff } from '../../stuff/Stuff';
import { chargeHot } from '../../fire/__tests__/burner-fuel';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import type { ConcentrationArrow } from '../../material/Material';
import { ThermalMixin } from '../Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { GradedMixin } from '../../craft/Graded';
import { Grade } from '../../craft/Grade';
import { ReservedMixin } from '../../reserve';
import { LightSourceMixin } from '../../perception/LightSource';
import { PlacingMixin } from '../../spatial/Placing';
import { BurnerMixin } from '../../fire/Burner';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestArch extends BurnerMixin(
  LightSourceMixin(ReservedMixin(PlacingMixin(ThermalMixin(Good)))),
) {
  static _mixinName = 'TestArchConcentrate';
}
class Copper extends GradedMixin(ThermalMixin(BulkableMixin(Good))) {
  static _mixinName = 'TestCopperConcentrate';
}
class TestRoom extends Place {}

const SCALE = 12;
let real = 0;
const tick = (gameS: number): void => {
  real += (gameS / SCALE) * 1000;
};

const SUCROSE: Array<[number, number]> = [
  [0, 0], [0.5, 1.5], [0.7, 5], [0.8, 10], [0.85, 14], [0.9, 22],
  [0.95, 32], [0.98, 50], [0.99, 60], [1, 70],
];

let seq = 0;
let P = '';
const path = (leaf: string): string => `${P}/${leaf}`;

function liquor(leaf: string, opts: {
  solids?: number;
  curve?: boolean;
  arrows?: ConcentrationArrow[];
  latent?: number;
}): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(leaf);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(opts.latent ?? 2_260_000, 'J/kg'));
    if (opts.solids) m.setSolidsKgPerL(opts.solids);
    if (opts.curve !== false) m.setBoilingPointElevation(SUCROSE);
    if (opts.arrows) m.setConcentratesTo(opts.arrows);
    return m;
  }, path(leaf)) as unknown as Material;
}

function stagedMaterials(): void {
  const arrows: ConcentrationArrow[] = [
    { fromW: 0.68, becomes: path('syrup') },
    { fromW: 0.9, becomes: path('strike'), minBand: 'fair', elseBecomes: path('blackstrap') },
    { fromW: 0.985, becomes: path('caramel') },
  ];
  liquor('raw-liquor', { solids: 0.6, arrows });
  liquor('syrup', { arrows });
  liquor('strike', { arrows });
  liquor('blackstrap', {});
  liquor('caramel', {});
}

async function arch(): Promise<TestArch> {
  const r = makeStuff(() => {
    const room = new TestRoom();
    room.setTemperature(Quantity.of(295, 'K'));
    return room;
  });
  const f = makeStuff(() => new TestArch());
  chargeHot(f as unknown as Stuff & Burner, 500);
  f.setBurnTemperatureK(470);
  f.setMaxBurnPowerW(20_000);
  f.setStampedTemperatureK(295);
  f.setLastAmbientK(295);
  await ContainmentApi.move(f, r);
  f.ignite();
  return f;
}

async function copperOf(f: TestArch, mat: string, litres: number, band = 'fine'): Promise<Copper> {
  const c = makeStuff(() => new Copper());
  c.interiorBulk = true;
  c.setInteriorCapacity(Quantity.of(120, 'L'));
  c.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(mat)!);
  c.setBulkAmount('interior', Quantity.of(litres, 'L'));
  c.setGrade(Grade.of(band));
  c.setStampedTemperatureK(373);
  c.setLastAmbientK(373);
  await ContainmentApi.move(c, f, 'on');
  await c.restamp();
  c.reconcileThermal();
  return c;
}

/** Read the pan every ten minutes until `pred` holds, up to `hours`. */
function boilUntil(c: Copper, pred: () => boolean, hours = 24): number[] {
  const temps: number[] = [];
  for (let m = 10; m <= hours * 60; m += 10) {
    tick(600);
    temps.push(c.getTemperature().rawValue());
    if (pred()) break;
  }
  return temps;
}

const matOf = (c: Copper): string => c.getBulkMaterialPath('interior') ?? '';

describe('⭐⭐ the staged boil (sugar D1)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    seq += 1;
    P = `/stuff/idea/material/_test/concentrate-${seq}`;
    stagedMaterials();
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('the boil climbs as the pan thickens, and the stages fire in order', async () => {
    const c = await copperOf(await arch(), path('raw-liquor'), 60);
    const seen: string[] = [matOf(c)];
    const temps = boilUntil(c, () => {
      const m = matOf(c);
      if (m !== seen[seen.length - 1]) seen.push(m);
      return m === path('caramel');
    });
    expect(seen).toEqual([
      path('raw-liquor'),
      path('syrup'),
      path('strike'),
      path('caramel'),
    ]);
    // The plateau CLIMBED: from a degree or two over the water's boil to
    // well past the strike's.
    expect(temps[0]!).toBeLessThan(377);
    expect(Math.max(...temps)).toBeGreaterThan(395);
    // Solids were kept: what is left is thick, and there is some of it.
    const solids = c.getBulkPayload('interior')?.dissolvedSolidsKgPerL ?? 0;
    expect(solids).toBeGreaterThan(1.3);
    expect(c.getBulkAmount('interior').rawValue()).toBeGreaterThan(20);
  });

  it('⭐ a pan below the band will not grain — the strike arrow fires blackstrap', async () => {
    const c = await copperOf(await arch(), path('raw-liquor'), 60, 'poor');
    boilUntil(c, () => matOf(c) === path('blackstrap') || matOf(c) === path('strike'));
    expect(matOf(c)).toBe(path('blackstrap'));
    // Blackstrap has no arrows: it boils on and never becomes anything.
    boilUntil(c, () => false, 2);
    expect(matOf(c)).toBe(path('blackstrap'));
  });

  it('a material with no curve plateaus at its plain boil', async () => {
    liquor('brine', { solids: 0.2, curve: false });
    const c = await copperOf(await arch(), path('brine'), 40);
    boilUntil(c, () => false, 1);
    expect(c.getTemperature().rawValue()).toBeCloseTo(373, 0);
  });

  it('a material with no latent heat still flashes', async () => {
    liquor('flash', { solids: 0.2, latent: 0, curve: false });
    const c = await copperOf(await arch(), path('flash'), 40);
    tick(600);
    c.getTemperature();
    expect(c.getBulkAmount('interior').rawValue()).toBe(0);
  });

  it('the mass fraction and the boiling point read the curve', () => {
    const m = StuffApi.findByTemplatePath<Material>(path('raw-liquor'))!;
    expect(m.solidsMassFraction(0)).toBe(0);
    // 0.6 kg/L of sucrose in what water it has not displaced.
    expect(m.solidsMassFraction(0.6)).toBeCloseTo(0.6 / (0.6 + 0.625), 6);
    expect(m.boilingPointAt(0)).toBe(373);
    expect(m.boilingPointAt(0.9)).toBeCloseTo(395, 6);
    expect(m.boilingPointAt(0.925)).toBeCloseTo(373 + 27, 6);
  });

  it('refuses a malformed curve or arrow list', () => {
    const m = StuffApi.findByTemplatePath<Material>(path('raw-liquor'))!;
    expect(() => m.setBoilingPointElevation([[0.5, 1], [0.4, 2]])).toThrow(RangeError);
    expect(() =>
      m.setConcentratesTo([{ fromW: 0.9, becomes: 'x', minBand: 'fair' } as ConcentrationArrow]),
    ).toThrow(RangeError);
    expect(() =>
      m.setConcentratesTo([{ fromW: 0.9, becomes: 'x', minBand: 'grand' as never, elseBecomes: 'y' }]),
    ).toThrow(RangeError);
  });

  it('⭐ a pour folds the solids by volume — thin juice thins a thick pan', async () => {
    const f = await arch();
    const thick = await copperOf(f, path('raw-liquor'), 10);
    thick.setBulkPayload('interior', { dissolvedSolidsKgPerL: 1.2 });
    const thin = await copperOf(f, path('raw-liquor'), 30); // fresh: 0.6
    BulkableApi.transfer(thin.getBulk('interior'), thick.getBulk('interior'), {
      kind: 'measure',
      litres: 10,
      mode: 'lenient',
    });
    expect(thick.getBulkPayload('interior')?.dissolvedSolidsKgPerL).toBeCloseTo(0.9, 6);
  });
});
